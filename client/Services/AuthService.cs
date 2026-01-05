using System;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;
using ZamarPlayer.Models;
using log4net;

namespace ZamarPlayer.Services
{
    public class AuthService
    {
        private readonly string _baseUrl;
        private readonly HttpClient _httpClient;
        private static readonly ILog log = LogManager.GetLogger(typeof(AuthService));
        
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
        public User CurrentUser { get; set; }

        public AuthService(string baseUrl)
        {
            _baseUrl = baseUrl;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "ZamarPlayer/1.0.0");
        }

        public async Task<LoginResponse> LoginAsync(string username, string password)
        {
            try
            {
                var loginRequest = new LoginRequest
                {
                    Username = username,
                    Password = password
                };

                var content = new StringContent(
                    JsonConvert.SerializeObject(loginRequest),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync(
                    $"{_baseUrl}/auth/login",
                    content
                );

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    log.Error($"Login failed: {responseBody}");
                    throw new Exception($"Login failed: {responseBody}");
                }

                var loginResponse = JsonConvert.DeserializeObject<LoginResponse>(responseBody);
                AccessToken = loginResponse.AccessToken;
                RefreshToken = loginResponse.RefreshToken;
                CurrentUser = loginResponse.User;

                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", AccessToken);

                log.Info($"User {username} logged in successfully");
                return loginResponse;
            }
            catch (Exception ex)
            {
                log.Error($"LoginAsync error: {ex.Message}");
                throw;
            }
        }

        public async Task<RegisterResponse> RegisterAsync(string username, string email, string password)
        {
            try
            {
                var registerRequest = new RegisterRequest
                {
                    Username = username,
                    Email = email,
                    Password = password
                };

                var content = new StringContent(
                    JsonConvert.SerializeObject(registerRequest),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync(
                    $"{_baseUrl}/auth/register",
                    content
                );

                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    log.Error($"Registration failed: {responseBody}");
                    throw new Exception($"Registration failed: {responseBody}");
                }

                var registerResponse = JsonConvert.DeserializeObject<RegisterResponse>(responseBody);
                log.Info($"User {username} registered successfully");
                return registerResponse;
            }
            catch (Exception ex)
            {
                log.Error($"RegisterAsync error: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> RefreshTokenAsync()
        {
            try
            {
                var refreshRequest = new RefreshTokenRequest { RefreshToken = RefreshToken };
                var content = new StringContent(
                    JsonConvert.SerializeObject(refreshRequest),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync(
                    $"{_baseUrl}/auth/refresh",
                    content
                );

                if (!response.IsSuccessStatusCode)
                    return false;

                var responseBody = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonConvert.DeserializeObject<TokenResponse>(responseBody);

                AccessToken = tokenResponse.AccessToken;
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", AccessToken);

                log.Info("Token refreshed successfully");
                return true;
            }
            catch (Exception ex)
            {
                log.Error($"RefreshTokenAsync error: {ex.Message}");
                return false;
            }
        }

        public void Logout()
        {
            AccessToken = null;
            RefreshToken = null;
            CurrentUser = null;
            _httpClient.DefaultRequestHeaders.Authorization = null;
            log.Info("User logged out");
        }
    }

    public class LoginRequest
    {
        [JsonProperty("username")]
        public string Username { get; set; }

        [JsonProperty("password")]
        public string Password { get; set; }
    }

    public class RegisterRequest
    {
        [JsonProperty("username")]
        public string Username { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; }

        [JsonProperty("password")]
        public string Password { get; set; }
    }

    public class RefreshTokenRequest
    {
        [JsonProperty("refreshToken")]
        public string RefreshToken { get; set; }
    }

    public class TokenResponse
    {
        [JsonProperty("accessToken")]
        public string AccessToken { get; set; }
    }

    public class LoginResponse
    {
        [JsonProperty("accessToken")]
        public string AccessToken { get; set; }

        [JsonProperty("refreshToken")]
        public string RefreshToken { get; set; }

        [JsonProperty("user")]
        public User User { get; set; }
    }

    public class RegisterResponse
    {
        [JsonProperty("userId")]
        public string UserId { get; set; }

        [JsonProperty("username")]
        public string Username { get; set; }

        [JsonProperty("email")]
        public string Email { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }
    }
}
