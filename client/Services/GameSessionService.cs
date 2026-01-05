using System;
using System.Threading.Tasks;
using RestSharp;
using Newtonsoft.Json;

namespace ZamarPlayer.Services
{
    /// <summary>
    /// Game Session Service - Manages user authentication and game sessions
    /// </summary>
    public class GameSessionService
    {
        private string _token;
        private dynamic _currentUser;
        private readonly string _apiUrl = "http://localhost:3000/api";
        private RestClient _restClient;

        public GameSessionService()
        {
            _restClient = new RestClient(_apiUrl);
            LoadSessionFromStorage();
        }

        /// <summary>
        /// Load existing session from local storage
        /// </summary>
        private void LoadSessionFromStorage()
        {
            try
            {
                var tokenPath = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "ZamarPlayer", "session.json"
                );

                if (System.IO.File.Exists(tokenPath))
                {
                    var content = System.IO.File.ReadAllText(tokenPath);
                    dynamic session = JsonConvert.DeserializeObject<dynamic>(content);
                    _token = session.token;
                    _currentUser = session.user;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading session: {ex.Message}");
            }
        }

        /// <summary>
        /// Save session to local storage
        /// </summary>
        private void SaveSessionToStorage()
        {
            try
            {
                var appDataPath = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "ZamarPlayer"
                );

                if (!System.IO.Directory.Exists(appDataPath))
                    System.IO.Directory.CreateDirectory(appDataPath);

                var sessionData = new
                {
                    token = _token,
                    user = _currentUser,
                    savedAt = DateTime.UtcNow
                };

                var json = JsonConvert.SerializeObject(sessionData, Formatting.Indented);
                var tokenPath = System.IO.Path.Combine(appDataPath, "session.json");
                System.IO.File.WriteAllText(tokenPath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error saving session: {ex.Message}");
            }
        }

        /// <summary>
        /// Authenticate user with email and password
        /// </summary>
        public async Task<AuthResult> LoginAsync(string email, string password)
        {
            try
            {
                var request = new RestRequest("/auth/login", Method.Post);
                request.AddJsonBody(new { email, password });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var result = JsonConvert.DeserializeObject<AuthResult>(response.Content);
                    _token = result.Token;
                    _currentUser = result.User;
                    SaveSessionToStorage();
                    return result;
                }

                return new AuthResult { Success = false, Error = "Login failed" };
            }
            catch (Exception ex)
            {
                return new AuthResult { Success = false, Error = ex.Message };
            }
        }

        /// <summary>
        /// Register new user
        /// </summary>
        public async Task<AuthResult> RegisterAsync(string username, string email, string password)
        {
            try
            {
                var request = new RestRequest("/auth/register", Method.Post);
                request.AddJsonBody(new { username, email, password });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var result = JsonConvert.DeserializeObject<AuthResult>(response.Content);
                    _token = result.Token;
                    _currentUser = result.User;
                    SaveSessionToStorage();
                    return result;
                }

                return new AuthResult { Success = false, Error = "Registration failed" };
            }
            catch (Exception ex)
            {
                return new AuthResult { Success = false, Error = ex.Message };
            }
        }

        /// <summary>
        /// Get current user
        /// </summary>
        public async Task<dynamic> GetCurrentUserAsync()
        {
            if (_currentUser != null)
                return _currentUser;

            try
            {
                if (string.IsNullOrEmpty(_token))
                    return null;

                var request = new RestRequest("/users/me", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_token}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    _currentUser = JsonConvert.DeserializeObject<dynamic>(response.Content);
                    return _currentUser;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting current user: {ex.Message}");
            }

            return null;
        }

        /// <summary>
        /// Check if user is authenticated
        /// </summary>
        public bool IsAuthenticated()
        {
            return !string.IsNullOrEmpty(_token) && _currentUser != null;
        }

        /// <summary>
        /// Get authentication token
        /// </summary>
        public string GetToken() => _token;

        /// <summary>
        /// Clear session
        /// </summary>
        public void ClearSession()
        {
            _token = null;
            _currentUser = null;

            try
            {
                var tokenPath = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                    "ZamarPlayer", "session.json"
                );
                if (System.IO.File.Exists(tokenPath))
                    System.IO.File.Delete(tokenPath);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error clearing session: {ex.Message}");
            }
        }
    }

    public class AuthResult
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }

        [JsonProperty("token")]
        public string Token { get; set; }

        [JsonProperty("user")]
        public dynamic User { get; set; }
    }

    /// <summary>
    /// Multiplayer Service - Manages real-time game sessions and server communication
    /// </summary>
    public class MultiplayerService
    {
        private readonly string _apiUrl = "http://localhost:3000/api";
        private RestClient _restClient;
        private GameSessionService _sessionService;
        private WebSocketClient _wsClient;

        public MultiplayerService(GameSessionService sessionService)
        {
            _sessionService = sessionService;
            _restClient = new RestClient(_apiUrl);
            _wsClient = new WebSocketClient();
        }

        /// <summary>
        /// Get platform metrics (server info, player counts, latency)
        /// </summary>
        public async Task<PlatformMetrics> GetPlatformMetricsAsync()
        {
            try
            {
                var request = new RestRequest("/game-servers/metrics", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<PlatformMetrics>(response.Content);
                }

                return new PlatformMetrics { Success = false };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting platform metrics: {ex.Message}");
                return new PlatformMetrics { Success = false };
            }
        }

        /// <summary>
        /// Get best server based on location
        /// </summary>
        public async Task<ServerMetric> GetBestServerAsync()
        {
            try
            {
                var metrics = await GetPlatformMetricsAsync();
                if (metrics?.Servers == null || metrics.Servers.Count == 0)
                    return null;

                // Find server with lowest latency and good capacity
                ServerMetric bestServer = null;
                int bestScore = int.MaxValue;

                foreach (var server in metrics.Servers)
                {
                    if (server.PlayersOnline >= server.MaxCapacity * 0.9) continue;

                    int score = server.EstimatedLatency + (int)(server.LoadPercentage * 10);
                    if (score < bestScore)
                    {
                        bestScore = score;
                        bestServer = server;
                    }
                }

                return bestServer;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error finding best server: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Connect to game server WebSocket
        /// </summary>
        public async Task<bool> ConnectToGameAsync(string serverUrl, string joinToken)
        {
            try
            {
                var wsUrl = $"ws://{serverUrl}?token={joinToken}";
                return await _wsClient.ConnectAsync(wsUrl);
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
        public void SendPlayerInput(Controllers.PlayerInput input)
        {
            try
            {
                var message = JsonConvert.SerializeObject(new
                {
                    type = "player_input",
                    data = input,
                    timestamp = DateTime.UtcNow.Ticks
                });

                _wsClient.Send(message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending player input: {ex.Message}");
            }
        }

        /// <summary>
        /// Subscribe to player state updates
        /// </summary>
        public void SubscribeToUpdates(Action<dynamic> callback)
        {
            _wsClient.OnMessage += (message) =>
            {
                try
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(message);
                    if (data.type == "player_update")
                    {
                        callback(data.data);
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error processing update: {ex.Message}");
                }
            };
        }

        /// <summary>
        /// Disconnect from game
        /// </summary>
        public void Disconnect()
        {
            _wsClient?.Disconnect();
        }
    }

    public class PlatformMetrics
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("totalPlayers")]
        public int TotalPlayers { get; set; }

        [JsonProperty("servers")]
        public System.Collections.Generic.List<ServerMetric> Servers { get; set; }
    }

    public class ServerMetric
    {
        [JsonProperty("serverId")]
        public string ServerId { get; set; }

        [JsonProperty("region")]
        public string Region { get; set; }

        [JsonProperty("country")]
        public string Country { get; set; }

        [JsonProperty("city")]
        public string City { get; set; }

        [JsonProperty("playersOnline")]
        public int PlayersOnline { get; set; }

        [JsonProperty("maxCapacity")]
        public int MaxCapacity { get; set; }

        [JsonProperty("estimatedLatency")]
        public int EstimatedLatency { get; set; }

        [JsonProperty("loadPercentage")]
        public float LoadPercentage { get; set; }

        [JsonProperty("uptime")]
        public int Uptime { get; set; }
    }

    /// <summary>
    /// WebSocket Client for real-time game communication
    /// </summary>
    public class WebSocketClient
    {
        private System.Net.WebSockets.ClientWebSocket _ws;
        public event Action<string> OnMessage;
        public event Action OnConnected;
        public event Action OnDisconnected;

        public async Task<bool> ConnectAsync(string url)
        {
            try
            {
                _ws = new System.Net.WebSockets.ClientWebSocket();
                await _ws.ConnectAsync(new Uri(url), System.Threading.CancellationToken.None);
                OnConnected?.Invoke();
                await ReceiveLoopAsync();
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket connection error: {ex.Message}");
                return false;
            }
        }

        private async Task ReceiveLoopAsync()
        {
            var buffer = new byte[1024 * 4];
            try
            {
                while (_ws.State == System.Net.WebSockets.WebSocketState.Open)
                {
                    var result = await _ws.ReceiveAsync(
                        new ArraySegment<byte>(buffer),
                        System.Threading.CancellationToken.None
                    );

                    if (result.MessageType == System.Net.WebSockets.WebSocketMessageType.Text)
                    {
                        var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
                        OnMessage?.Invoke(message);
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket receive error: {ex.Message}");
            }
        }

        public void Send(string message)
        {
            try
            {
                var bytes = System.Text.Encoding.UTF8.GetBytes(message);
                _ws.SendAsync(
                    new ArraySegment<byte>(bytes),
                    System.Net.WebSockets.WebSocketMessageType.Text,
                    true,
                    System.Threading.CancellationToken.None
                ).Wait();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket send error: {ex.Message}");
            }
        }

        public void Disconnect()
        {
            try
            {
                if (_ws?.State == System.Net.WebSockets.WebSocketState.Open)
                {
                    _ws.CloseAsync(
                        System.Net.WebSockets.WebSocketCloseStatus.NormalClosure,
                        "Closing",
                        System.Threading.CancellationToken.None
                    ).Wait();
                }
                _ws?.Dispose();
                OnDisconnected?.Invoke();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"WebSocket disconnect error: {ex.Message}");
            }
        }
    }
}
