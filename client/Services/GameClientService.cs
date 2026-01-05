using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using RestSharp;

namespace ZamarPlayer.Services
{
    public class GameClientService
    {
        private readonly string _apiUrl = "http://localhost:3000/api";
        private readonly RestClient _restClient;
        private ClientWebSocket _webSocket;
        private string _userId;
        private string _token;
        
        public event EventHandler<PlayerUpdateEventArgs> OnPlayerUpdate;
        public event EventHandler<ChatMessageEventArgs> OnChatMessage;
        public event EventHandler<ServerDisconnectedEventArgs> OnServerDisconnected;

        public GameClientService(string userId, string token)
        {
            _userId = userId;
            _token = token;
            _restClient = new RestClient(_apiUrl);
        }

        /// <summary>
        /// Get the best game server based on player location
        /// </summary>
        public async Task<GameServerInfo> GetBestServerAsync(double latitude, double longitude)
        {
            try
            {
                var request = new RestRequest("/game-servers/best-region", Method.Get);
                request.AddParameter("lat", latitude);
                request.AddParameter("lon", longitude);
                request.AddParameter("count", 5);
                request.AddHeader("Authorization", $"Bearer {_token}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(response.Content);
                    return new GameServerInfo
                    {
                        Region = data.recommended.region,
                        Country = data.recommended.country,
                        City = data.recommended.city,
                        Port = data.recommended.port,
                        Latency = (int)data.recommended.estimatedLatency,
                    };
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting best server: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Get all available servers by continent
        /// </summary>
        public async Task<Dictionary<string, List<GameServerInfo>>> GetServersByContinentAsync()
        {
            try
            {
                var request = new RestRequest("/game-servers/continents", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_token}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(response.Content);
                    var continents = new Dictionary<string, List<GameServerInfo>>();

                    foreach (var continent in data.continents)
                    {
                        var servers = new List<GameServerInfo>();
                        // Parse server data
                        continents[continent.Key] = servers;
                    }
                    return continents;
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting servers by continent: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Join a game server
        /// </summary>
        public async Task<JoinServerResult> JoinServerAsync(string gameId, double latitude, double longitude)
        {
            try
            {
                var request = new RestRequest("/game-servers/join", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_token}");
                request.AddJsonBody(new
                {
                    gameId,
                    lat = latitude,
                    lon = longitude,
                });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var data = JsonConvert.DeserializeObject<JoinServerResult>(response.Content);
                    return data;
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error joining server: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Connect to game server via WebSocket
        /// </summary>
        public async Task<bool> ConnectToGameAsync(string host, int port, string joinToken)
        {
            try
            {
                _webSocket = new ClientWebSocket();
                var uri = new Uri($"ws://{host}:{port}");
                
                await _webSocket.ConnectAsync(uri, CancellationToken.None);
                
                // Send authentication
                var authMessage = JsonConvert.SerializeObject(new
                {
                    type = "AUTH",
                    userId = _userId,
                    token = joinToken,
                });

                await SendGameMessageAsync(authMessage);
                
                // Start receiving messages
                _ = ReceiveGameMessagesAsync();
                
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error connecting to game: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Send player input to server
        /// </summary>
        public async Task SendPlayerInputAsync(PlayerInput input)
        {
            try
            {
                var message = JsonConvert.SerializeObject(new
                {
                    type = "INPUT",
                    userId = _userId,
                    position = input.Position,
                    rotation = input.Rotation,
                    velocity = input.Velocity,
                    actions = input.Actions,
                    timestamp = DateTime.UtcNow.Ticks,
                });

                await SendGameMessageAsync(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending player input: {ex.Message}");
            }
        }

        /// <summary>
        /// Send chat message to all players
        /// </summary>
        public async Task SendChatMessageAsync(string message)
        {
            try
            {
                var msg = JsonConvert.SerializeObject(new
                {
                    type = "CHAT",
                    userId = _userId,
                    message,
                    timestamp = DateTime.UtcNow,
                });

                await SendGameMessageAsync(msg);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending chat message: {ex.Message}");
            }
        }

        /// <summary>
        /// Leave the game server
        /// </summary>
        public async Task LeaveGameAsync()
        {
            try
            {
                if (_webSocket?.State == WebSocketState.Open)
                {
                    var message = JsonConvert.SerializeObject(new
                    {
                        type = "DISCONNECT",
                        userId = _userId,
                    });

                    await SendGameMessageAsync(message);
                    await _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Game ended", CancellationToken.None);
                }

                var request = new RestRequest("/game-servers/leave", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_token}");
                await _restClient.ExecuteAsync(request);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error leaving game: {ex.Message}");
            }
        }

        private async Task SendGameMessageAsync(string message)
        {
            if (_webSocket?.State == WebSocketState.Open)
            {
                var bytes = Encoding.UTF8.GetBytes(message);
                await _webSocket.SendAsync(
                    new ArraySegment<byte>(bytes),
                    WebSocketMessageType.Text,
                    true,
                    CancellationToken.None
                );
            }
        }

        private async Task ReceiveGameMessagesAsync()
        {
            try
            {
                var buffer = new byte[1024 * 4];

                while (_webSocket.State == WebSocketState.Open)
                {
                    var result = await _webSocket.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        CancellationToken.None
                    );

                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = Encoding.UTF8.GetString(buffer, 0, result.Count);
                        ProcessGameMessage(message);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error receiving game messages: {ex.Message}");
                OnServerDisconnected?.Invoke(this, new ServerDisconnectedEventArgs { Reason = ex.Message });
            }
        }

        private void ProcessGameMessage(string message)
        {
            try
            {
                var data = JsonConvert.DeserializeObject<dynamic>(message);
                string type = data?.type;

                switch (type)
                {
                    case "PLAYER_UPDATE":
                        OnPlayerUpdate?.Invoke(this, new PlayerUpdateEventArgs
                        {
                            PlayerId = data.playerId,
                            Position = data.position,
                            Rotation = data.rotation,
                            Health = data.health,
                        });
                        break;

                    case "CHAT":
                        OnChatMessage?.Invoke(this, new ChatMessageEventArgs
                        {
                            PlayerId = data.playerId,
                            PlayerName = data.playerName,
                            Message = data.message,
                            Timestamp = DateTime.Parse(data.timestamp.ToString()),
                        });
                        break;

                    case "DISCONNECT":
                        OnServerDisconnected?.Invoke(this, new ServerDisconnectedEventArgs
                        {
                            Reason = data.reason ?? "Server closed connection",
                        });
                        break;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error processing game message: {ex.Message}");
            }
        }

        /// <summary>
        /// Get game server health status
        /// </summary>
        public async Task<ServerHealth> GetServerHealthAsync()
        {
            try
            {
                var request = new RestRequest("/game-servers/health", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_token}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<ServerHealth>(response.Content);
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting server health: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Get platform metrics
        /// </summary>
        public async Task<PlatformMetrics> GetPlatformMetricsAsync()
        {
            try
            {
                var request = new RestRequest("/game-servers/metrics", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_token}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<PlatformMetrics>(response.Content);
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting metrics: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Ping test for latency
        /// </summary>
        public async Task<long> PingAsync()
        {
            try
            {
                var startTime = DateTime.UtcNow.Ticks;
                
                var request = new RestRequest("/game-servers/ping", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_token}");

                var response = await _restClient.ExecuteAsync(request);
                
                var endTime = DateTime.UtcNow.Ticks;
                return (endTime - startTime) / 10000; // Convert to milliseconds
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during ping: {ex.Message}");
                return -1;
            }
        }
    }

    // Event args
    public class PlayerUpdateEventArgs : EventArgs
    {
        public string PlayerId { get; set; }
        public dynamic Position { get; set; }
        public dynamic Rotation { get; set; }
        public int Health { get; set; }
    }

    public class ChatMessageEventArgs : EventArgs
    {
        public string PlayerId { get; set; }
        public string PlayerName { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class ServerDisconnectedEventArgs : EventArgs
    {
        public string Reason { get; set; }
    }

    // Data models
    public class GameServerInfo
    {
        public string Region { get; set; }
        public string Country { get; set; }
        public string City { get; set; }
        public int Port { get; set; }
        public int Latency { get; set; }
    }

    public class JoinServerResult
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("server")]
        public GameServerInfo Server { get; set; }

        [JsonProperty("joinToken")]
        public string JoinToken { get; set; }

        [JsonProperty("connectionInfo")]
        public ConnectionInfo ConnectionInfo { get; set; }
    }

    public class ConnectionInfo
    {
        [JsonProperty("protocol")]
        public string Protocol { get; set; }

        [JsonProperty("address")]
        public string Address { get; set; }

        [JsonProperty("compression")]
        public string Compression { get; set; }

        [JsonProperty("reconnectDelay")]
        public int ReconnectDelay { get; set; }
    }

    public class PlayerInput
    {
        public dynamic Position { get; set; }
        public dynamic Rotation { get; set; }
        public dynamic Velocity { get; set; }
        public List<string> Actions { get; set; }
    }

    public class ServerHealth
    {
        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("timestamp")]
        public long Timestamp { get; set; }

        [JsonProperty("servers")]
        public List<dynamic> Servers { get; set; }
    }

    public class PlatformMetrics
    {
        [JsonProperty("totalRegions")]
        public int TotalRegions { get; set; }

        [JsonProperty("totalPlayers")]
        public int TotalPlayers { get; set; }

        [JsonProperty("totalCapacity")]
        public int TotalCapacity { get; set; }

        [JsonProperty("averageUtilization")]
        public string AverageUtilization { get; set; }

        [JsonProperty("uptime")]
        public string Uptime { get; set; }

        [JsonProperty("requestsProcessed")]
        public int RequestsProcessed { get; set; }

        [JsonProperty("regions")]
        public List<dynamic> Regions { get; set; }

        [JsonProperty("byContinent")]
        public Dictionary<string, dynamic> ByContinents { get; set; }
    }
}
