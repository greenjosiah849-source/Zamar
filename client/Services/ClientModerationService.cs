using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Net.Http;
using Newtonsoft.Json;
using log4net;

namespace ZamarPlayer.Services
{
    /// <summary>
    /// Client-side Moderation Service
    /// Integrates with Zamar AI moderation system
    /// </summary>
    public class ClientModerationService
    {
        private readonly string _apiUrl;
        private readonly AuthService _authService;
        private readonly HttpClient _httpClient;
        private static readonly ILog log = LogManager.GetLogger(typeof(ClientModerationService));

        public ClientModerationService(string apiUrl, AuthService authService)
        {
            _apiUrl = apiUrl;
            _authService = authService;
            _httpClient = new HttpClient();
        }

        /// <summary>
        /// Scan content with Zamar AI
        /// </summary>
        public async Task<ScanResult> ScanContentAsync(string contentType, string content, Dictionary<string, object> metadata = null)
        {
            try
            {
                var request = new
                {
                    type = contentType,
                    content = content,
                    metadata = metadata
                };

                var json = JsonConvert.SerializeObject(request);
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/moderation/scan")
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                };

                // Add auth header
                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonConvert.DeserializeObject<ScanResult>(responseContent);
                    log.Info($"Content scanned: {contentType} - Flagged: {result.Flagged}");
                    return result;
                }

                log.Error($"Scan failed: {response.StatusCode}");
                return new ScanResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Scan error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Scan game metadata (name, description, tags)
        /// </summary>
        public async Task<GameScanResult> ScanGameMetadataAsync(string name, string description, List<string> tags)
        {
            try
            {
                var request = new
                {
                    name = name,
                    description = description,
                    tags = tags
                };

                var json = JsonConvert.SerializeObject(request);
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/moderation/scan-game")
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                };

                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonConvert.DeserializeObject<GameScanResult>(responseContent);
                    log.Info($"Game metadata scanned - Flagged: {result.Flagged}");
                    return result;
                }

                log.Error($"Game scan failed: {response.StatusCode}");
                return new GameScanResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Game scan error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Report content or user
        /// </summary>
        public async Task<ReportResult> ReportContentAsync(string reportType, string reportedId, string reason, string description = null)
        {
            try
            {
                var request = new
                {
                    reportedUserId = reportType == "user" ? reportedId : null,
                    reportedGameId = reportType == "game" ? reportedId : null,
                    reason = reason,
                    description = description
                };

                var json = JsonConvert.SerializeObject(request);
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/moderation/report")
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                };

                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonConvert.DeserializeObject<ReportResult>(responseContent);
                    log.Info($"Report submitted: {result.CaseId}");
                    return result;
                }

                log.Error($"Report failed: {response.StatusCode}");
                return new ReportResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Report error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Check user's moderation status (banned, muted, suspended)
        /// </summary>
        public async Task<UserStatusResult> CheckUserStatusAsync(string userId)
        {
            try
            {
                var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"{_apiUrl}/moderation/user/{userId}/status");
                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    var result = JsonConvert.DeserializeObject<UserStatusResult>(responseContent);
                    return result;
                }

                log.Error($"Status check failed: {response.StatusCode}");
                return new UserStatusResult { Status = "ERROR" };
            }
            catch (Exception ex)
            {
                log.Error($"Status check error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Get user's violations
        /// </summary>
        public async Task<UserViolationsResult> GetUserViolationsAsync(string userId)
        {
            try
            {
                var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"{_apiUrl}/moderation/user/{userId}/violations");
                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<UserViolationsResult>(responseContent);
                }

                return new UserViolationsResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Get violations error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Appeal a ban
        /// </summary>
        public async Task<AppealResult> AppealBanAsync(string banId, string message)
        {
            try
            {
                var request = new { banId, message };
                var json = JsonConvert.SerializeObject(request);
                var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{_apiUrl}/moderation/appeals")
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                };

                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<AppealResult>(responseContent);
                }

                return new AppealResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Appeal error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Get user appeals
        /// </summary>
        public async Task<UserAppealsResult> GetUserAppealsAsync(string userId)
        {
            try
            {
                var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"{_apiUrl}/moderation/user/{userId}/appeals");
                var token = await _authService.GetTokenAsync();
                httpRequest.Headers.Add("Authorization", $"Bearer {token}");

                var response = await _httpClient.SendAsync(httpRequest);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<UserAppealsResult>(responseContent);
                }

                return new UserAppealsResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Get appeals error: {ex.Message}");
                throw;
            }
        }

        /// <summary>
        /// Get Zamar AI info
        /// </summary>
        public async Task<AIInfoResult> GetAIInfoAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_apiUrl}/moderation/ai-info");
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return JsonConvert.DeserializeObject<AIInfoResult>(responseContent);
                }

                return new AIInfoResult { Error = response.ReasonPhrase };
            }
            catch (Exception ex)
            {
                log.Error($"Get AI info error: {ex.Message}");
                return new AIInfoResult { Error = ex.Message };
            }
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }

    // ============================================
    // RESPONSE MODELS
    // ============================================

    public class ScanResult
    {
        [JsonProperty("scanned")]
        public bool Scanned { get; set; }

        [JsonProperty("flagged")]
        public bool Flagged { get; set; }

        [JsonProperty("category")]
        public string Category { get; set; }

        [JsonProperty("confidence")]
        public decimal Confidence { get; set; }

        [JsonProperty("hash")]
        public string Hash { get; set; }

        [JsonProperty("predictions")]
        public Dictionary<string, decimal> Predictions { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class GameScanResult
    {
        [JsonProperty("scanned")]
        public bool Scanned { get; set; }

        [JsonProperty("flagged")]
        public bool Flagged { get; set; }

        [JsonProperty("confidence")]
        public decimal Confidence { get; set; }

        [JsonProperty("details")]
        public Dictionary<string, object> Details { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class ReportResult
    {
        [JsonProperty("caseId")]
        public string CaseId { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class UserStatusResult
    {
        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("type")]
        public string Type { get; set; }

        [JsonProperty("until")]
        public string Until { get; set; }

        [JsonProperty("reason")]
        public string Reason { get; set; }

        [JsonProperty("appealable")]
        public bool Appealable { get; set; }

        [JsonProperty("clean")]
        public bool Clean { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class UserViolationsResult
    {
        [JsonProperty("userId")]
        public string UserId { get; set; }

        [JsonProperty("violations")]
        public List<Violation> Violations { get; set; }

        [JsonProperty("totalPoints")]
        public int TotalPoints { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class Violation
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("violation_type")]
        public string ViolationType { get; set; }

        [JsonProperty("severity")]
        public string Severity { get; set; }

        [JsonProperty("points")]
        public int Points { get; set; }

        [JsonProperty("action_taken")]
        public string ActionTaken { get; set; }

        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    public class AppealResult
    {
        [JsonProperty("appealId")]
        public string AppealId { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("message")]
        public string Message { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class UserAppealsResult
    {
        [JsonProperty("userId")]
        public string UserId { get; set; }

        [JsonProperty("appeals")]
        public List<Appeal> Appeals { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }

    public class Appeal
    {
        [JsonProperty("id")]
        public string Id { get; set; }

        [JsonProperty("ban_id")]
        public string BanId { get; set; }

        [JsonProperty("status")]
        public string Status { get; set; }

        [JsonProperty("appeal_message")]
        public string AppealMessage { get; set; }

        [JsonProperty("response")]
        public string Response { get; set; }

        [JsonProperty("created_at")]
        public DateTime CreatedAt { get; set; }

        [JsonProperty("reviewed_at")]
        public DateTime? ReviewedAt { get; set; }
    }

    public class AIInfoResult
    {
        [JsonProperty("name")]
        public string Name { get; set; }

        [JsonProperty("version")]
        public string Version { get; set; }

        [JsonProperty("capabilities")]
        public List<string> Capabilities { get; set; }

        [JsonProperty("categories")]
        public List<string> Categories { get; set; }

        [JsonProperty("thresholds")]
        public Dictionary<string, decimal> Thresholds { get; set; }

        [JsonProperty("error")]
        public string Error { get; set; }
    }
}
