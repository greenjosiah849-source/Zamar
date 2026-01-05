using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using RestSharp;
using Newtonsoft.Json;

namespace ZamarPlayer.Controllers
{
    /// <summary>
    /// Game Launcher Controller - Manages game discovery, filtering, and launching
    /// </summary>
    public class GameLauncherController
    {
        private readonly string _apiUrl = "http://localhost:3000/api";
        private readonly RestClient _restClient;
        private GameSessionService _sessionService;
        private MultiplayerService _multiplayerService;

        public GameLauncherController(GameSessionService sessionService, MultiplayerService multiplayerService)
        {
            _sessionService = sessionService;
            _multiplayerService = multiplayerService;
            _restClient = new RestClient(_apiUrl);
        }

        /// <summary>
        /// Get featured/trending games
        /// </summary>
        public async Task<List<dynamic>> GetFeaturedGamesAsync()
        {
            try
            {
                var request = new RestRequest("/games/featured", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<dynamic>>(response.Content) ?? new List<dynamic>();
                }
                return new List<dynamic>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting featured games: {ex.Message}");
                return new List<dynamic>();
            }
        }

        /// <summary>
        /// Get user's favorite games
        /// </summary>
        public async Task<List<dynamic>> GetFavoriteGamesAsync(string userId)
        {
            try
            {
                var request = new RestRequest($"/users/{userId}/favorites", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<dynamic>>(response.Content) ?? new List<dynamic>();
                }
                return new List<dynamic>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting favorites: {ex.Message}");
                return new List<dynamic>();
            }
        }

        /// <summary>
        /// Get recently played games
        /// </summary>
        public async Task<List<dynamic>> GetRecentGamesAsync(string userId)
        {
            try
            {
                var request = new RestRequest($"/users/{userId}/recent-games", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<dynamic>>(response.Content) ?? new List<dynamic>();
                }
                return new List<dynamic>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting recent games: {ex.Message}");
                return new List<dynamic>();
            }
        }

        /// <summary>
        /// Search for games
        /// </summary>
        public async Task<List<dynamic>> SearchGamesAsync(string query)
        {
            try
            {
                var request = new RestRequest("/games/search", Method.Get);
                request.AddParameter("q", query);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<List<dynamic>>(response.Content) ?? new List<dynamic>();
                }
                return new List<dynamic>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error searching games: {ex.Message}");
                return new List<dynamic>();
            }
        }

        /// <summary>
        /// Join a game
        /// </summary>
        public async Task<GameJoinResult> JoinGameAsync(string userId, string gameId)
        {
            try
            {
                // Get best server
                var server = await _multiplayerService.GetBestServerAsync();

                // Join game
                var request = new RestRequest("/game-servers/join", Method.Post);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");
                request.AddJsonBody(new
                {
                    gameId,
                    lat = 40.7128, // Get actual location
                    lon = -74.006,
                    preferredRegion = server.Region,
                });

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    var result = JsonConvert.DeserializeObject<GameJoinResult>(response.Content);
                    result.Success = true;
                    return result;
                }

                return new GameJoinResult { Success = false, Error = "Failed to join game" };
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error joining game: {ex.Message}");
                return new GameJoinResult { Success = false, Error = ex.Message };
            }
        }

        /// <summary>
        /// Get game details
        /// </summary>
        public async Task<dynamic> GetGameDetailsAsync(string gameId)
        {
            try
            {
                var request = new RestRequest($"/games/{gameId}", Method.Get);
                request.AddHeader("Authorization", $"Bearer {_sessionService.GetToken()}");

                var response = await _restClient.ExecuteAsync(request);
                if (response.IsSuccessful)
                {
                    return JsonConvert.DeserializeObject<dynamic>(response.Content);
                }
                return null;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error getting game details: {ex.Message}");
                return null;
            }
        }
    }

    public class GameJoinResult
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }

        [JsonProperty("server")]
        public ServerInfo Server { get; set; }

        [JsonProperty("joinToken")]
        public string JoinToken { get; set; }
    }

    public class ServerInfo
    {
        [JsonProperty("region")]
        public string Region { get; set; }

        [JsonProperty("country")]
        public string Country { get; set; }

        [JsonProperty("city")]
        public string City { get; set; }

        [JsonProperty("port")]
        public int Port { get; set; }

        [JsonProperty("estimatedLatency")]
        public int EstimatedLatency { get; set; }
    }

    /// <summary>
    /// Player Controller - Manages player actions in-game
    /// </summary>
    public class PlayerController
    {
        private PlayerMovementState _movementState;
        private PlayerAnimationState _animationState;
        private dynamic _playerData;

        public PlayerController(dynamic playerData)
        {
            _playerData = playerData;
            _movementState = new PlayerMovementState();
            _animationState = new PlayerAnimationState();
        }

        /// <summary>
        /// Update player input
        /// </summary>
        public void UpdateInput(PlayerInput input)
        {
            _movementState.IsMoving = input.MoveX != 0 || input.MoveY != 0;
            _movementState.VelocityX = input.MoveX * 5.0f;
            _movementState.VelocityY = input.MoveY * 5.0f;
            _movementState.IsJumping = input.Jump;
            _movementState.Rotation = input.LookX;
        }

        /// <summary>
        /// Update player animation state
        /// </summary>
        public void UpdateAnimation(float deltaTime)
        {
            if (_movementState.IsMoving)
            {
                _animationState.CurrentAnimation = "Walk";
                _animationState.AnimationSpeed = 1.0f;
            }
            else if (_movementState.IsJumping)
            {
                _animationState.CurrentAnimation = "Jump";
                _animationState.AnimationSpeed = 1.2f;
            }
            else
            {
                _animationState.CurrentAnimation = "Idle";
                _animationState.AnimationSpeed = 0.5f;
            }

            _animationState.ElapsedTime += deltaTime;
        }

        /// <summary>
        /// Get current movement state
        /// </summary>
        public PlayerMovementState GetMovementState() => _movementState;

        /// <summary>
        /// Get current animation state
        /// </summary>
        public PlayerAnimationState GetAnimationState() => _animationState;
    }

    public class PlayerMovementState
    {
        public bool IsMoving { get; set; }
        public bool IsJumping { get; set; }
        public float VelocityX { get; set; }
        public float VelocityY { get; set; }
        public float Rotation { get; set; }
        public float PositionX { get; set; }
        public float PositionY { get; set; }
        public float PositionZ { get; set; }
    }

    public class PlayerAnimationState
    {
        public string CurrentAnimation { get; set; } = "Idle";
        public float AnimationSpeed { get; set; } = 1.0f;
        public float ElapsedTime { get; set; }
    }

    public class PlayerInput
    {
        public float MoveX { get; set; }
        public float MoveY { get; set; }
        public float LookX { get; set; }
        public float LookY { get; set; }
        public bool Jump { get; set; }
        public bool Sprint { get; set; }
        public bool Attack { get; set; }
    }

    /// <summary>
    /// Camera Controller - Manages camera positioning and rotation
    /// </summary>
    public class CameraController
    {
        public float PositionX { get; set; }
        public float PositionY { get; set; }
        public float PositionZ { get; set; }
        public float LookX { get; set; }
        public float LookY { get; set; }
        public float FOV { get; set; } = 60.0f;
        public float Distance { get; set; } = 5.0f;
        public float Height { get; set; } = 2.0f;

        /// <summary>
        /// Update camera position to follow player
        /// </summary>
        public void UpdatePosition(float playerX, float playerY, float playerZ, float deltaTime)
        {
            // Smooth follow
            PositionX += (playerX - PositionX) * 0.1f;
            PositionY += (playerY + Height - PositionY) * 0.1f;
            PositionZ += (playerZ - Distance - PositionZ) * 0.1f;
        }

        /// <summary>
        /// Rotate camera
        /// </summary>
        public void Rotate(float deltaX, float deltaY)
        {
            LookX += deltaX * 0.5f;
            LookY = Math.Max(-89, Math.Min(89, LookY + deltaY * 0.5f));
        }

        /// <summary>
        /// Zoom camera
        /// </summary>
        public void Zoom(float delta)
        {
            Distance = Math.Max(1, Math.Min(20, Distance - delta));
        }
    }
}
