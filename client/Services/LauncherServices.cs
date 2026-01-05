using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RestSharp;
using Newtonsoft.Json;

namespace ZamarPlayer.Services
{
    /// <summary>
    /// Game discovery service for launcher
    /// </summary>
    public class GameDiscoveryService
    {
        private readonly string _apiUrl = "http://localhost:3000/api";
        private readonly RestClient _restClient;
        private string _userToken;

        public event EventHandler<GameDiscoveredEventArgs> OnGameDiscovered;
        public event EventHandler<ErrorEventArgs> OnError;

        public GameDiscoveryService(string userToken)
        {
            _userToken = userToken;
            _restClient = new RestClient(_apiUrl);
        }

        /// <summary>
        /// Get all available games
        /// </summary>
        public async Task<List<GameInfo>> GetGamesAsync()
        {
            try
            {
                var request = new RestRequest("/games", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_userToken}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var games = JsonConvert.DeserializeObject<List<GameInfo>>(response.Content);
                    return games ?? new List<GameInfo>();
                }
                return new List<GameInfo>();
            }
            catch (Exception ex)
            {
                OnError?.Invoke(this, new ErrorEventArgs { Message = ex.Message });
                return new List<GameInfo>();
            }
        }

        /// <summary>
        /// Search games by name
        /// </summary>
        public async Task<List<GameInfo>> SearchGamesAsync(string searchTerm)
        {
            try
            {
                var request = new RestRequest("/games/search", Method.Get);
                request.AddParameter("q", searchTerm);
                request.AddHeader("Authorization", $"Bearer {_userToken}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<GameInfo>>(response.Content) ?? new List<GameInfo>();
                }
                return new List<GameInfo>();
            }
            catch (Exception ex)
            {
                OnError?.Invoke(this, new ErrorEventArgs { Message = ex.Message });
                return new List<GameInfo>();
            }
        }

        /// <summary>
        /// Get featured games
        /// </summary>
        public async Task<List<GameInfo>> GetFeaturedGamesAsync()
        {
            try
            {
                var request = new RestRequest("/games/featured", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_userToken}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<GameInfo>>(response.Content) ?? new List<GameInfo>();
                }
                return new List<GameInfo>();
            }
            catch (Exception ex)
            {
                OnError?.Invoke(this, new ErrorEventArgs { Message = ex.Message });
                return new List<GameInfo>();
            }
        }

        /// <summary>
        /// Get user's played games
        /// </summary>
        public async Task<List<GameInfo>> GetMyGamesAsync()
        {
            try
            {
                var request = new RestRequest("/games/my-games", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_userToken}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<GameInfo>>(response.Content) ?? new List<GameInfo>();
                }
                return new List<GameInfo>();
            }
            catch (Exception ex)
            {
                OnError?.Invoke(this, new ErrorEventArgs { Message = ex.Message });
                return new List<GameInfo>();
            }
        }
    }

    /// <summary>
    /// User session service
    /// </summary>
    public class UserSessionService
    {
        private readonly string _apiUrl = "http://localhost:3000/api";
        private readonly RestClient _restClient;
        public string CurrentUserId { get; set; }
        public string CurrentUserToken { get; set; }

        public event EventHandler<SessionChangedEventArgs> OnSessionChanged;

        public UserSessionService()
        {
            _restClient = new RestClient(_apiUrl);
        }

        /// <summary>
        /// Login user
        /// </summary>
        public async Task<bool> LoginAsync(string username, string password)
        {
            try
            {
                var request = new RestRequest("/auth/login", Method.Post);
                request.AddJsonBody(new { username, password });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(response.Content);
                    CurrentUserId = data?.user?.id;
                    CurrentUserToken = data?.token;

                    OnSessionChanged?.Invoke(this, new SessionChangedEventArgs
                    {
                        IsLoggedIn = true,
                        UserId = CurrentUserId,
                        Timestamp = DateTime.UtcNow
                    });

                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Login error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Logout user
        /// </summary>
        public async Task LogoutAsync()
        {
            try
            {
                var request = new RestRequest("/auth/logout", Method.Post);
                request.AddHeader("Authorization", $"Bearer {CurrentUserToken}");

                await _restClient.ExecuteAsync(request);
                
                CurrentUserId = null;
                CurrentUserToken = null;

                OnSessionChanged?.Invoke(this, new SessionChangedEventArgs
                {
                    IsLoggedIn = false,
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Logout error: {ex.Message}");
            }
        }

        /// <summary>
        /// Get user profile
        /// </summary>
        public async Task<UserProfile> GetProfileAsync()
        {
            try
            {
                var request = new RestRequest($"/users/{CurrentUserId}", Method.Get);
                request.AddHeader("Authorization", $"Bearer {CurrentUserToken}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<UserProfile>(response.Content);
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Get profile error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Check if user is logged in
        /// </summary>
        public bool IsLoggedIn => !string.IsNullOrEmpty(CurrentUserToken);

        /// <summary>
        /// Refresh token
        /// </summary>
        public async Task<bool> RefreshTokenAsync()
        {
            try
            {
                var request = new RestRequest("/auth/refresh", Method.Post);
                request.AddHeader("Authorization", $"Bearer {CurrentUserToken}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(response.Content);
                    CurrentUserToken = data?.token;
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Token refresh error: {ex.Message}");
                return false;
            }
        }
    }

    /// <summary>
    /// Game session management
    /// </summary>
    public class GameSessionService
    {
        private readonly string _apiUrl = "http://localhost:3000/api";
        private readonly RestClient _restClient;
        private string _userToken;
        public string CurrentGameId { get; set; }
        public string CurrentSessionId { get; set; }

        public event EventHandler<SessionStartedEventArgs> OnSessionStarted;
        public event EventHandler<SessionEndedEventArgs> OnSessionEnded;

        public GameSessionService(string userToken)
        {
            _userToken = userToken;
            _restClient = new RestClient(_apiUrl);
        }

        /// <summary>
        /// Start new game session
        /// </summary>
        public async Task<GameSession> StartSessionAsync(string gameId)
        {
            try
            {
                var request = new RestRequest("/game-sessions/start", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_userToken}");
                request.AddJsonBody(new { gameId });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var session = JsonConvert.DeserializeObject<GameSession>(response.Content);
                    CurrentGameId = gameId;
                    CurrentSessionId = session.SessionId;

                    OnSessionStarted?.Invoke(this, new SessionStartedEventArgs
                    {
                        GameId = gameId,
                        SessionId = session.SessionId,
                        StartTime = DateTime.UtcNow
                    });

                    return session;
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Start session error: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// End game session
        /// </summary>
        public async Task<bool> EndSessionAsync()
        {
            try
            {
                var request = new RestRequest("/game-sessions/end", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_userToken}");
                request.AddJsonBody(new { sessionId = CurrentSessionId });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    OnSessionEnded?.Invoke(this, new SessionEndedEventArgs
                    {
                        SessionId = CurrentSessionId,
                        EndTime = DateTime.UtcNow
                    });

                    CurrentGameId = null;
                    CurrentSessionId = null;
                    return true;
                }
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"End session error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Update session progress
        /// </summary>
        public async Task<bool> UpdateProgressAsync(int level, int score)
        {
            try
            {
                var request = new RestRequest("/game-sessions/update", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_userToken}");
                request.AddJsonBody(new { sessionId = CurrentSessionId, level, score });

                var response = await _restClient.ExecuteAsync(request);
                return response.IsSuccessful;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Update progress error: {ex.Message}");
                return false;
            }
        }
    }

    // Event Args
    public class GameDiscoveredEventArgs : EventArgs
    {
        public GameInfo Game { get; set; }
    }

    public class SessionChangedEventArgs : EventArgs
    {
        public bool IsLoggedIn { get; set; }
        public string UserId { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class SessionStartedEventArgs : EventArgs
    {
        public string GameId { get; set; }
        public string SessionId { get; set; }
        public DateTime StartTime { get; set; }
    }

    public class SessionEndedEventArgs : EventArgs
    {
        public string SessionId { get; set; }
        public DateTime EndTime { get; set; }
    }

    public class ErrorEventArgs : EventArgs
    {
        public string Message { get; set; }
    }

    // Data models
    public class GameInfo
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("description")]
        public string Description { get; set; }

        [JsonProperty("thumbnail")]
        public string Thumbnail { get; set; }

        [JsonProperty("creator")]
        public string Creator { get; set; }

        [JsonProperty("playerCount")]
        public int PlayerCount { get; set; }

        [JsonProperty("maxPlayers")]
        public int MaxPlayers { get; set; }

        [JsonProperty("rating")]
        public float Rating { get; set; }

        [JsonProperty("plays")]
        public int Plays { get; set; }
    }

    public class UserProfile
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("username")]
        public string Username { get; set; }

        [JsonProperty("displayName")]
        public string DisplayName { get; set; }

        [JsonProperty("avatar")]
        public string Avatar { get; set; }

        [JsonProperty("bio")]
        public string Bio { get; set; }

        [JsonProperty("level")]
        public int Level { get; set; }

        [JsonProperty("experience")]
        public int Experience { get; set; }

        [JsonProperty("joinDate")]
        public DateTime JoinDate { get; set; }
    }

    public class GameSession
    {
        [JsonProperty("sessionId")]
        public string SessionId { get; set; }

        [JsonProperty("gameId")]
        public string GameId { get; set; }

        [JsonProperty("userId")]
        public string UserId { get; set; }

        [JsonProperty("startTime")]
        public DateTime StartTime { get; set; }

        [JsonProperty("lastHeartbeat")]
        public DateTime LastHeartbeat { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }
    }
}
