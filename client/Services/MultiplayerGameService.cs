using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;
using System.Net.Http;
using System.Text.Json;

namespace ZamarPlayer.Services
{
    /// <summary>
    /// Multiplayer game session data
    /// </summary>
    public class MultiplayerSession
    {
        public string SessionId { get; set; }
        public string GameId { get; set; }
        public string SessionName { get; set; }
        public int MaxPlayers { get; set; }
        public int CurrentPlayers { get; set; }
        public List<string> Players { get; set; }
        public string Status { get; set; } // "waiting", "active", "finished"
        public long CreatedAt { get; set; }
    }

    /// <summary>
    /// Remote player data in game
    /// </summary>
    public class RemotePlayer
    {
        public string UserId { get; set; }
        public string PlayerName { get; set; }
        public Vector3 Position { get; set; }
        public Vector3 Velocity { get; set; }
        public Vector3 Rotation { get; set; }
        public int Health { get; set; }
        public string State { get; set; }
        public long LastUpdate { get; set; }
    }

    /// <summary>
    /// Vector3 struct for positions
    /// </summary>
    public struct Vector3
    {
        public float X { get; set; }
        public float Y { get; set; }
        public float Z { get; set; }

        public Vector3(float x = 0, float y = 0, float z = 0)
        {
            X = x;
            Y = y;
            Z = z;
        }

        public override string ToString() => $"({X}, {Y}, {Z})";
    }

    /// <summary>
    /// Multiplayer game networking service
    /// Handles player synchronization, session management, and real-time updates
    /// </summary>
    public class MultiplayerGameService
    {
        private readonly string _serverUrl;
        private readonly HttpClient _httpClient;
        private readonly GameClientService _gameClient;
        private string _currentSessionId;
        private string _currentUserId;

        // Active players in current session
        public Dictionary<string, RemotePlayer> RemotePlayers { get; private set; }
        public ObservableCollection<MultiplayerSession> AvailableSessions { get; private set; }

        // Events
        public event EventHandler<RemotePlayer> PlayerJoined;
        public event EventHandler<string> PlayerLeft;
        public event EventHandler<RemotePlayer> PlayerUpdated;
        public event EventHandler<(string attackerId, string targetId, int damage)> PlayerAttacked;
        public event EventHandler<(string playerId, string killedBy)> PlayerDied;
        public event EventHandler<string> SessionStarted;
        public event EventHandler<string> SessionEnded;

        public MultiplayerGameService(GameClientService gameClient, string userId)
        {
            _gameClient = gameClient;
            _currentUserId = userId;
            _serverUrl = "http://localhost:3000/api";
            _httpClient = new HttpClient();
            RemotePlayers = new Dictionary<string, RemotePlayer>();
            AvailableSessions = new ObservableCollection<MultiplayerSession>();
        }

        /// <summary>
        /// Register player as active in a game
        /// </summary>
        public async Task<bool> RegisterPlayerAsync(string gameId, string playerName)
        {
            try
            {
                var payload = new
                {
                    playerName = playerName,
                    gameId = gameId,
                    position = new { x = 0, y = 0, z = 0 }
                };

                var response = await _gameClient.PostAsync(
                    "/multiplayer/player/register",
                    payload
                );

                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error registering player: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Unregister player (disconnect from game)
        /// </summary>
        public async Task UnregisterPlayerAsync()
        {
            try
            {
                await _gameClient.PostAsync("/multiplayer/player/unregister", new { });
                RemotePlayers.Clear();
                _currentSessionId = null;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error unregistering player: {ex.Message}");
            }
        }

        /// <summary>
        /// Update player position and state (sync with server)
        /// </summary>
        public async Task UpdatePlayerPositionAsync(Vector3 position, Vector3 velocity, Vector3 rotation, int health, string state)
        {
            try
            {
                var payload = new
                {
                    position = new { x = position.X, y = position.Y, z = position.Z },
                    velocity = new { x = velocity.X, y = velocity.Y, z = velocity.Z },
                    rotation = new { x = rotation.X, y = rotation.Y, z = rotation.Z },
                    health = health,
                    state = state
                };

                var response = await _gameClient.PostAsync(
                    "/multiplayer/player/update",
                    payload
                );

                if (response != null)
                {
                    PlayerUpdated?.Invoke(this, new RemotePlayer
                    {
                        UserId = _currentUserId,
                        Position = position,
                        Velocity = velocity,
                        Health = health,
                        State = state
                    });
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error updating player position: {ex.Message}");
            }
        }

        /// <summary>
        /// Get all players currently in a game
        /// </summary>
        public async Task<List<RemotePlayer>> GetGamePlayersAsync(string gameId)
        {
            try
            {
                var response = await _gameClient.GetAsync($"/multiplayer/players/{gameId}");

                if (response != null && response.ContainsKey("players"))
                {
                    var players = new List<RemotePlayer>();
                    var playersArray = response["players"] as JsonElement?;

                    if (playersArray.HasValue)
                    {
                        foreach (var playerJson in playersArray.Value.EnumerateArray())
                        {
                            players.Add(new RemotePlayer
                            {
                                UserId = playerJson.GetProperty("userId").GetString(),
                                PlayerName = playerJson.GetProperty("playerName").GetString(),
                                Position = ParseVector3(playerJson.GetProperty("position")),
                                Health = playerJson.GetProperty("health").GetInt32(),
                                State = playerJson.GetProperty("state").GetString(),
                            });
                        }
                    }

                    RemotePlayers.Clear();
                    foreach (var player in players)
                    {
                        RemotePlayers[player.UserId] = player;
                    }

                    return players;
                }

                return new List<RemotePlayer>();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error fetching game players: {ex.Message}");
                return new List<RemotePlayer>();
            }
        }

        /// <summary>
        /// Send attack to another player
        /// </summary>
        public async Task<bool> AttackPlayerAsync(string targetUserId, int damage, Vector3 position)
        {
            try
            {
                var payload = new
                {
                    targetUserId = targetUserId,
                    damage = damage,
                    position = new { x = position.X, y = position.Y, z = position.Z }
                };

                var response = await _gameClient.PostAsync(
                    "/multiplayer/attack",
                    payload
                );

                if (response != null)
                {
                    PlayerAttacked?.Invoke(this, (
                        _currentUserId,
                        targetUserId,
                        response.ContainsKey("damage") ? (int)(long)response["damage"] : damage
                    ));

                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error attacking player: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Create a new game session
        /// </summary>
        public async Task<MultiplayerSession> CreateSessionAsync(string gameId, int maxPlayers = 4, string sessionName = null)
        {
            try
            {
                var payload = new
                {
                    gameId = gameId,
                    maxPlayers = maxPlayers,
                    sessionName = sessionName ?? $"Game Session"
                };

                var response = await _gameClient.PostAsync(
                    "/multiplayer/session/create",
                    payload
                );

                if (response?.ContainsKey("sessionId") == true)
                {
                    var sessionId = response["sessionId"].ToString();
                    _currentSessionId = sessionId;

                    var session = new MultiplayerSession
                    {
                        SessionId = sessionId,
                        GameId = gameId,
                        SessionName = sessionName ?? "Game Session",
                        MaxPlayers = maxPlayers,
                        CurrentPlayers = 1,
                        Players = new List<string> { _currentUserId },
                        Status = "waiting",
                        CreatedAt = DateTime.Now.Ticks
                    };

                    SessionStarted?.Invoke(this, sessionId);
                    return session;
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error creating session: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Join an existing game session
        /// </summary>
        public async Task<bool> JoinSessionAsync(string sessionId)
        {
            try
            {
                var payload = new { sessionId = sessionId };

                var response = await _gameClient.PostAsync(
                    "/multiplayer/session/join",
                    payload
                );

                if (response?.ContainsKey("success") == true)
                {
                    _currentSessionId = sessionId;
                    SessionStarted?.Invoke(this, sessionId);
                    return true;
                }

                return false;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error joining session: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Get all active sessions for a game
        /// </summary>
        public async Task<List<MultiplayerSession>> GetGameSessionsAsync(string gameId)
        {
            try
            {
                var response = await _gameClient.GetAsync($"/multiplayer/sessions/{gameId}");

                if (response != null && response.ContainsKey("sessions"))
                {
                    var sessions = new List<MultiplayerSession>();
                    var sessionsArray = response["sessions"] as JsonElement?;

                    if (sessionsArray.HasValue)
                    {
                        foreach (var sessionJson in sessionsArray.Value.EnumerateArray())
                        {
                            sessions.Add(new MultiplayerSession
                            {
                                SessionId = sessionJson.GetProperty("sessionId").GetString(),
                                SessionName = sessionJson.GetProperty("sessionName").GetString(),
                                CurrentPlayers = sessionJson.GetProperty("currentPlayers").GetInt32(),
                                MaxPlayers = sessionJson.GetProperty("maxPlayers").GetInt32(),
                                Status = "active"
                            });
                        }
                    }

                    AvailableSessions.Clear();
                    foreach (var session in sessions)
                    {
                        AvailableSessions.Add(session);
                    }

                    return sessions;
                }

                return new List<MultiplayerSession>();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error fetching sessions: {ex.Message}");
                return new List<MultiplayerSession>();
            }
        }

        /// <summary>
        /// Find a matchmade game (auto-match with other players)
        /// </summary>
        public async Task<(string status, string sessionId, int estimatedWaitSeconds)> FindMatchAsync(string gameId, string gameMode = null)
        {
            try
            {
                var payload = new
                {
                    gameId = gameId,
                    gameMode = gameMode ?? "normal",
                    skillLevel = 1
                };

                var response = await _gameClient.PostAsync(
                    "/multiplayer/matchmake",
                    payload
                );

                if (response != null)
                {
                    string status = response["status"].ToString();
                    string sessionId = null;
                    int waitTime = 0;

                    if (status == "MATCHED")
                    {
                        sessionId = response["sessionId"].ToString();
                        _currentSessionId = sessionId;
                        SessionStarted?.Invoke(this, sessionId);
                    }
                    else if (response.ContainsKey("estimatedWait"))
                    {
                        waitTime = (int)(long)response["estimatedWait"];
                    }

                    return (status, sessionId, waitTime);
                }

                return ("ERROR", null, 0);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error finding match: {ex.Message}");
                return ("ERROR", null, 0);
            }
        }

        /// <summary>
        /// Get player statistics
        /// </summary>
        public async Task<Dictionary<string, object>> GetPlayerStatsAsync(string userId)
        {
            try
            {
                var response = await _gameClient.GetAsync($"/multiplayer/stats/{userId}");
                return response ?? new Dictionary<string, object>();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error fetching player stats: {ex.Message}");
                return new Dictionary<string, object>();
            }
        }

        /// <summary>
        /// Sync game state with other players (called every frame)
        /// </summary>
        public async Task SyncGameStateAsync(
            Vector3 playerPosition,
            Vector3 playerVelocity,
            Vector3 playerRotation,
            int health,
            string state)
        {
            // Update local player position first
            await UpdatePlayerPositionAsync(playerPosition, playerVelocity, playerRotation, health, state);

            // Fetch other players' positions
            // In production, this would use WebSocket for real-time updates
            // For now, we poll periodically
        }

        /// <summary>
        /// Calculate distance between two players
        /// </summary>
        public static float DistanceBetween(Vector3 a, Vector3 b)
        {
            float dx = a.X - b.X;
            float dy = a.Y - b.Y;
            float dz = a.Z - b.Z;
            return (float)Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }

        /// <summary>
        /// Helper to parse Vector3 from JSON
        /// </summary>
        private Vector3 ParseVector3(JsonElement element)
        {
            return new Vector3(
                element.GetProperty("x").GetSingle(),
                element.GetProperty("y").GetSingle(),
                element.GetProperty("z").GetSingle()
            );
        }

        /// <summary>
        /// Cleanup resources
        /// </summary>
        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }

    /// <summary>
    /// Matchmaking service
    /// Finds appropriate matches based on skill level and game mode
    /// </summary>
    public class MatchmakingService
    {
        private readonly MultiplayerGameService _multiplayerService;
        private readonly string _currentUserId;

        public event EventHandler<string> MatchFound;
        public event EventHandler<int> QueuePositionChanged;

        public MatchmakingService(MultiplayerGameService multiplayerService, string userId)
        {
            _multiplayerService = multiplayerService;
            _currentUserId = userId;
        }

        /// <summary>
        /// Start searching for a match
        /// </summary>
        public async Task<string> SearchAsync(string gameId, string gameMode = null, int skillLevel = 1)
        {
            var (status, sessionId, waitTime) = await _multiplayerService.FindMatchAsync(gameId, gameMode);

            if (status == "MATCHED")
            {
                MatchFound?.Invoke(this, sessionId);
                return sessionId;
            }

            return null;
        }

        /// <summary>
        /// Check current queue position (in real implementation, would use WebSocket)
        /// </summary>
        public async Task<int> GetQueuePositionAsync()
        {
            // Simulate queue position
            await Task.Delay(100);
            return new Random().Next(1, 10);
        }

        /// <summary>
        /// Cancel current matchmaking search
        /// </summary>
        public void CancelSearch()
        {
            // Cancel search logic
        }
    }
}
