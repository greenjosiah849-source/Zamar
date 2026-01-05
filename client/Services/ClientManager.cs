using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Net.Http;
using System.Net.WebSockets;
using Newtonsoft.Json;
using ZamarPlayer.Models;
using log4net;

namespace ZamarPlayer.Services
{
    public class ClientManager
    {
        private readonly AuthService _authService;
        private readonly GameService _gameService;
        private readonly UserService _userService;
        private readonly MarketplaceService _marketplaceService;
        private readonly ChatService _chatService;
        private static readonly ILog log = LogManager.GetLogger(typeof(ClientManager));

        public bool IsLoggedIn { get; set; }
        public User CurrentUser { get; set; }

        public ClientManager(AuthService authService)
        {
            _authService = authService;
            _gameService = new GameService("https://api.zamar.com", authService);
            _userService = new UserService("https://api.zamar.com", authService);
            _marketplaceService = new MarketplaceService("https://api.zamar.com", authService);
            _chatService = new ChatService("wss://chat.zamar.com", authService);
        }

        public async Task<bool> AuthenticateAsync(string username, string password)
        {
            try
            {
                var response = await _authService.LoginAsync(username, password);
                CurrentUser = response.User;
                IsLoggedIn = true;
                log.Info($"Client authenticated as {username}");
                return true;
            }
            catch (Exception ex)
            {
                log.Error($"Authentication failed: {ex.Message}");
                IsLoggedIn = false;
                return false;
            }
        }

        public async Task<List<Game>> GetGamesAsync()
        {
            return await _gameService.GetGamesAsync();
        }

        public async Task<Game> GetGameAsync(string gameId)
        {
            return await _gameService.GetGameAsync(gameId);
        }

        public async Task<Avatar> GetAvatarAsync(string userId)
        {
            return await _userService.GetAvatarAsync(userId);
        }

        public async Task<List<CatalogItem>> GetCatalogItemsAsync(string category = null)
        {
            return await _marketplaceService.GetCatalogItemsAsync(category);
        }

        public async Task<List<InventoryItem>> GetInventoryAsync(string userId)
        {
            return await _userService.GetInventoryAsync(userId);
        }

        public async Task<bool> PurchaseItemAsync(string itemId, int price)
        {
            return await _marketplaceService.PurchaseItemAsync(itemId, price);
        }

        public void ConnectToChat()
        {
            _chatService.Connect();
        }

        public void DisconnectFromChat()
        {
            _chatService.Disconnect();
        }

        public void Shutdown()
        {
            log.Info("Client shutting down");
            DisconnectFromChat();
            _authService.Logout();
            IsLoggedIn = false;
        }
    }

    public class GameService
    {
        private readonly HttpClient _httpClient;
        private readonly AuthService _authService;
        private readonly string _baseUrl;
        private static readonly ILog log = LogManager.GetLogger(typeof(GameService));

        public GameService(string baseUrl, AuthService authService)
        {
            _baseUrl = baseUrl;
            _authService = authService;
            _httpClient = new HttpClient();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "ZamarPlayer/1.0.0");
        }

        public async Task<List<Game>> GetGamesAsync()
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authService.AccessToken);

                var response = await _httpClient.GetAsync($"{_baseUrl}/games");
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    throw new Exception($"Failed to fetch games: {content}");

                return JsonConvert.DeserializeObject<List<Game>>(content) ?? new List<Game>();
            }
            catch (Exception ex)
            {
                log.Error($"GetGamesAsync error: {ex.Message}");
                return new List<Game>();
            }
        }

        public async Task<Game> GetGameAsync(string gameId)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authService.AccessToken);

                var response = await _httpClient.GetAsync($"{_baseUrl}/games/{gameId}");
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    throw new Exception($"Failed to fetch game: {content}");

                return JsonConvert.DeserializeObject<Game>(content);
            }
            catch (Exception ex)
            {
                log.Error($"GetGameAsync error: {ex.Message}");
                return null;
            }
        }
    }

    public class UserService
    {
        private readonly HttpClient _httpClient;
        private readonly AuthService _authService;
        private readonly string _baseUrl;
        private static readonly ILog log = LogManager.GetLogger(typeof(UserService));

        public UserService(string baseUrl, AuthService authService)
        {
            _baseUrl = baseUrl;
            _authService = authService;
            _httpClient = new HttpClient();
        }

        public async Task<Avatar> GetAvatarAsync(string userId)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authService.AccessToken);

                var response = await _httpClient.GetAsync($"{_baseUrl}/users/{userId}/avatar");
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    throw new Exception($"Failed to fetch avatar: {content}");

                return JsonConvert.DeserializeObject<Avatar>(content);
            }
            catch (Exception ex)
            {
                log.Error($"GetAvatarAsync error: {ex.Message}");
                return null;
            }
        }

        public async Task<List<InventoryItem>> GetInventoryAsync(string userId)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authService.AccessToken);

                var response = await _httpClient.GetAsync($"{_baseUrl}/users/{userId}/inventory");
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    throw new Exception($"Failed to fetch inventory: {content}");

                return JsonConvert.DeserializeObject<List<InventoryItem>>(content) ?? new List<InventoryItem>();
            }
            catch (Exception ex)
            {
                log.Error($"GetInventoryAsync error: {ex.Message}");
                return new List<InventoryItem>();
            }
        }
    }

    public class MarketplaceService
    {
        private readonly HttpClient _httpClient;
        private readonly AuthService _authService;
        private readonly string _baseUrl;
        private static readonly ILog log = LogManager.GetLogger(typeof(MarketplaceService));

        public MarketplaceService(string baseUrl, AuthService authService)
        {
            _baseUrl = baseUrl;
            _authService = authService;
            _httpClient = new HttpClient();
        }

        public async Task<List<CatalogItem>> GetCatalogItemsAsync(string category = null)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authService.AccessToken);

                var url = category != null ? $"{_baseUrl}/catalog?category={category}" : $"{_baseUrl}/catalog";
                var response = await _httpClient.GetAsync(url);
                var content = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                    throw new Exception($"Failed to fetch catalog: {content}");

                return JsonConvert.DeserializeObject<List<CatalogItem>>(content) ?? new List<CatalogItem>();
            }
            catch (Exception ex)
            {
                log.Error($"GetCatalogItemsAsync error: {ex.Message}");
                return new List<CatalogItem>();
            }
        }

        public async Task<bool> PurchaseItemAsync(string itemId, int price)
        {
            try
            {
                _httpClient.DefaultRequestHeaders.Authorization = 
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _authService.AccessToken);

                var purchaseRequest = new { itemId, price };
                var content = new StringContent(
                    JsonConvert.SerializeObject(purchaseRequest),
                    System.Text.Encoding.UTF8,
                    "application/json"
                );

                var response = await _httpClient.PostAsync($"{_baseUrl}/catalog/purchase", content);

                if (!response.IsSuccessStatusCode)
                {
                    log.Warn($"Purchase failed for item {itemId}");
                    return false;
                }

                log.Info($"Purchase successful for item {itemId}");
                return true;
            }
            catch (Exception ex)
            {
                log.Error($"PurchaseItemAsync error: {ex.Message}");
                return false;
            }
        }
    }

    public class ChatService
    {
        private readonly string _wsUrl;
        private readonly AuthService _authService;
        private ClientWebSocket _webSocket;
        private static readonly ILog log = LogManager.GetLogger(typeof(ChatService));

        public event Action<ChatMessage> OnMessageReceived;

        public ChatService(string wsUrl, AuthService authService)
        {
            _wsUrl = wsUrl;
            _authService = authService;
        }

        public async void Connect()
        {
            try
            {
                _webSocket = new ClientWebSocket();
                await _webSocket.ConnectAsync(new Uri(_wsUrl), System.Threading.CancellationToken.None);
                log.Info("Connected to chat service");
                _ = ReceiveMessagesAsync();
            }
            catch (Exception ex)
            {
                log.Error($"Chat connection failed: {ex.Message}");
            }
        }

        private async Task ReceiveMessagesAsync()
        {
            try
            {
                var buffer = new byte[1024 * 4];
                while (_webSocket.State == WebSocketState.Open)
                {
                    var result = await _webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), System.Threading.CancellationToken.None);
                    if (result.MessageType == WebSocketMessageType.Text)
                    {
                        var message = System.Text.Encoding.UTF8.GetString(buffer, 0, result.Count);
                        var chatMessage = JsonConvert.DeserializeObject<ChatMessage>(message);
                        OnMessageReceived?.Invoke(chatMessage);
                    }
                }
            }
            catch (Exception ex)
            {
                log.Error($"ReceiveMessagesAsync error: {ex.Message}");
            }
        }

        public async Task SendMessageAsync(string content, string chatType)
        {
            try
            {
                var message = new ChatMessage
                {
                    SenderId = _authService.CurrentUser.UserId,
                    SenderUsername = _authService.CurrentUser.Username,
                    Content = content,
                    ChatType = chatType,
                    Timestamp = DateTime.UtcNow
                };

                var json = JsonConvert.SerializeObject(message);
                var bytes = System.Text.Encoding.UTF8.GetBytes(json);
                await _webSocket.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, System.Threading.CancellationToken.None);
            }
            catch (Exception ex)
            {
                log.Error($"SendMessageAsync error: {ex.Message}");
            }
        }

        public void Disconnect()
        {
            try
            {
                if (_webSocket?.State == WebSocketState.Open)
                {
                    _webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, "Client disconnecting", System.Threading.CancellationToken.None).Wait();
                    _webSocket.Dispose();
                }
                log.Info("Disconnected from chat service");
            }
            catch (Exception ex)
            {
                log.Error($"Disconnect error: {ex.Message}");
            }
        }
    }
}
