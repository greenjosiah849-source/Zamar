using System;
using System.Collections.ObjectModel;
using System.Windows.Input;
using System.Windows.Media;

namespace ZamarPlayer.ViewModels
{
    /// <summary>
    /// Game list item for launcher display
    /// </summary>
    public class GameListItem
    {
        public string GameId { get; set; }
        public string GameName { get; set; }
        public string Creator { get; set; }
        public string ThumbnailUrl { get; set; }
        public int PlayerCount { get; set; }
        public double Rating { get; set; }
        public long Plays { get; set; }
        public string Status { get; set; } // "trending", "new", "featured"
    }

    /// <summary>
    /// Main Hub Window View Model
    /// Manages game discovery, user profile, and navigation
    /// </summary>
    public class MainHubViewModel
    {
        // Collections
        public ObservableCollection<GameListItem> FeaturedGames { get; set; }
        public ObservableCollection<GameListItem> TrendingGames { get; set; }
        public ObservableCollection<GameListItem> MyGames { get; set; }
        public ObservableCollection<GameListItem> SearchResults { get; set; }

        // Current User
        public string CurrentUsername { get; set; }
        public string UserAvatar { get; set; }
        public int UserLevel { get; set; }
        public long UserExperience { get; set; }
        public int Robux { get; set; }

        // UI State
        public string CurrentTab { get; set; } // "home", "games", "profile", "servers", "studio"
        public bool IsLoading { get; set; }
        public string SearchQuery { get; set; }
        public string SelectedGame { get; set; }

        // Server Info
        public string SelectedServer { get; set; }
        public string ServerRegion { get; set; }
        public int PlayerCount { get; set; }
        public double ServerLatency { get; set; }

        public MainHubViewModel()
        {
            FeaturedGames = new ObservableCollection<GameListItem>();
            TrendingGames = new ObservableCollection<GameListItem>();
            MyGames = new ObservableCollection<GameListItem>();
            SearchResults = new ObservableCollection<GameListItem>();

            CurrentTab = "home";
            IsLoading = false;
            CurrentUsername = "Player";
            UserLevel = 1;
            UserExperience = 0;
            Robux = 0;
        }

        public void LoadFeaturedGames()
        {
            IsLoading = true;
            FeaturedGames.Clear();

            // Simulate loading
            FeaturedGames.Add(new GameListItem
            {
                GameId = "game_001",
                GameName = "Sky Island Adventure",
                Creator = "DevStudio",
                PlayerCount = 1250,
                Rating = 4.8,
                Plays = 50000,
                Status = "featured"
            });

            FeaturedGames.Add(new GameListItem
            {
                GameId = "game_002",
                GameName = "Zombie Survival",
                Creator = "GameMakers",
                PlayerCount = 3200,
                Rating = 4.6,
                Plays = 125000,
                Status = "featured"
            });

            IsLoading = false;
        }

        public void LoadTrendingGames()
        {
            IsLoading = true;
            TrendingGames.Clear();

            TrendingGames.Add(new GameListItem
            {
                GameId = "game_003",
                GameName = "Battle Royale Elite",
                Creator = "ProGames",
                PlayerCount = 5600,
                Rating = 4.7,
                Plays = 320000,
                Status = "trending"
            });

            TrendingGames.Add(new GameListItem
            {
                GameId = "game_004",
                GameName = "Tycoon Empire",
                Creator = "BusinessGames",
                PlayerCount = 2800,
                Rating = 4.5,
                Plays = 180000,
                Status = "trending"
            });

            IsLoading = false;
        }

        public void LoadMyGames()
        {
            IsLoading = true;
            MyGames.Clear();

            MyGames.Add(new GameListItem
            {
                GameId = "game_005",
                GameName = "My First Game",
                Creator = CurrentUsername,
                PlayerCount = 45,
                Rating = 4.2,
                Plays = 512,
                Status = "new"
            });

            IsLoading = false;
        }

        public void SearchGames(string query)
        {
            SearchQuery = query;
            IsLoading = true;
            SearchResults.Clear();

            // Simulate search
            if (!string.IsNullOrEmpty(query))
            {
                SearchResults.Add(new GameListItem
                {
                    GameId = "game_search_001",
                    GameName = query + " Game",
                    Creator = "SearchResult",
                    PlayerCount = 100,
                    Rating = 4.0,
                    Plays = 1000,
                    Status = "search"
                });
            }

            IsLoading = false;
        }

        public void SelectGame(string gameId)
        {
            SelectedGame = gameId;
        }

        public void ChangeTab(string tab)
        {
            CurrentTab = tab;
        }

        public void UpdateServerInfo(string server, string region, int players, double latency)
        {
            SelectedServer = server;
            ServerRegion = region;
            PlayerCount = players;
            ServerLatency = latency;
        }

        public void AddRobux(int amount)
        {
            Robux += amount;
        }

        public void UpdateUserLevel(int newLevel)
        {
            UserLevel = newLevel;
        }

        public void UpdateUserExperience(long newExp)
        {
            UserExperience = newExp;
        }
    }

    /// <summary>
    /// Profile Page ViewModel
    /// Manages user profile display and settings
    /// </summary>
    public class ProfileViewModel
    {
        public string Username { get; set; }
        public string DisplayName { get; set; }
        public string Bio { get; set; }
        public string AvatarUrl { get; set; }
        public int Level { get; set; }
        public long Experience { get; set; }
        public int Robux { get; set; }
        public int Friends { get; set; }
        public int Followers { get; set; }
        public long JoinDate { get; set; }

        public ObservableCollection<string> Achievement { get; set; }
        public ObservableCollection<GameListItem> PlayedGames { get; set; }

        public ProfileViewModel()
        {
            Achievement = new ObservableCollection<string>();
            PlayedGames = new ObservableCollection<GameListItem>();
            JoinDate = DateTime.Now.Ticks;
        }

        public void UpdateBio(string newBio)
        {
            Bio = newBio;
        }

        public void UpdateAvatar(string newAvatarUrl)
        {
            AvatarUrl = newAvatarUrl;
        }

        public void AddAchievement(string achievement)
        {
            Achievement.Add(achievement);
        }
    }

    /// <summary>
    /// Settings ViewModel
    /// Manages launcher and gameplay settings
    /// </summary>
    public class SettingsViewModel
    {
        // Graphics Settings
        public string GraphicsQuality { get; set; } // "Low", "Medium", "High", "Ultra"
        public int ResolutionWidth { get; set; }
        public int ResolutionHeight { get; set; }
        public int TargetFps { get; set; }
        public bool VSync { get; set; }

        // Audio Settings
        public float MasterVolume { get; set; } // 0.0 - 1.0
        public float MusicVolume { get; set; }
        public float SfxVolume { get; set; }
        public float VoiceVolume { get; set; }

        // Gameplay Settings
        public string ControlScheme { get; set; } // "WASD", "Arrow Keys", "Custom"
        public float MouseSensitivity { get; set; } // 0.1 - 2.0
        public bool InvertMouseY { get; set; }
        public bool ShowHud { get; set; }
        public bool EnableParticles { get; set; }

        // Network Settings
        public string CurrentServer { get; set; }
        public string PreferredRegion { get; set; }
        public int NetworkLatency { get; set; }
        public bool AutoConnect { get; set; }

        // Privacy Settings
        public bool ShowOnlineStatus { get; set; }
        public bool AllowFriendRequests { get; set; }
        public bool AllowMessages { get; set; }
        public bool AllowPartyInvites { get; set; }

        public SettingsViewModel()
        {
            GraphicsQuality = "High";
            ResolutionWidth = 1920;
            ResolutionHeight = 1080;
            TargetFps = 60;
            VSync = true;

            MasterVolume = 0.8f;
            MusicVolume = 0.6f;
            SfxVolume = 0.8f;
            VoiceVolume = 0.9f;

            ControlScheme = "WASD";
            MouseSensitivity = 1.0f;
            InvertMouseY = false;
            ShowHud = true;
            EnableParticles = true;

            CurrentServer = "US-EAST";
            PreferredRegion = "US";
            NetworkLatency = 0;
            AutoConnect = true;

            ShowOnlineStatus = true;
            AllowFriendRequests = true;
            AllowMessages = true;
            AllowPartyInvites = true;
        }

        public void ApplyGraphicsSettings()
        {
            // Apply to game engine
        }

        public void ApplyAudioSettings()
        {
            // Apply to audio system
        }

        public void ApplyGameplaySettings()
        {
            // Apply to input system
        }

        public void ApplyNetworkSettings()
        {
            // Reconnect to server if needed
        }

        public void SaveSettings()
        {
            // Persist to local storage/config file
        }

        public void LoadSettings()
        {
            // Load from local storage/config file
        }

        public void ResetToDefaults()
        {
            GraphicsQuality = "High";
            ResolutionWidth = 1920;
            ResolutionHeight = 1080;
            TargetFps = 60;
            VSync = true;
        }
    }

    /// <summary>
    /// Server Browser ViewModel
    /// Manages available game servers and regions
    /// </summary>
    public class ServerInfo
    {
        public string ServerId { get; set; }
        public string ServerName { get; set; }
        public string Region { get; set; }
        public string Country { get; set; }
        public int CurrentPlayers { get; set; }
        public int MaxPlayers { get; set; }
        public double Latency { get; set; }
        public string Status { get; set; } // "online", "offline", "maintenance"
        public double UploadSpeed { get; set; } // Mbps
        public double DownloadSpeed { get; set; }
    }

    public class ServerBrowserViewModel
    {
        public ObservableCollection<ServerInfo> AllServers { get; set; }
        public ObservableCollection<ServerInfo> FilteredServers { get; set; }
        public string SelectedRegion { get; set; }
        public ServerInfo RecommendedServer { get; set; }
        public bool ShowOnlineOnly { get; set; }
        public string SortBy { get; set; } // "latency", "players", "name"

        public ServerBrowserViewModel()
        {
            AllServers = new ObservableCollection<ServerInfo>();
            FilteredServers = new ObservableCollection<ServerInfo>();
            ShowOnlineOnly = true;
            SortBy = "latency";
            SelectedRegion = "All";

            InitializeServers();
        }

        private void InitializeServers()
        {
            // North America
            AllServers.Add(new ServerInfo
            {
                ServerId = "us-east-1",
                ServerName = "Eastern US #1",
                Region = "US-East",
                Country = "United States",
                CurrentPlayers = 4250,
                MaxPlayers = 5000,
                Latency = 25.3,
                Status = "online",
                DownloadSpeed = 450.5,
                UploadSpeed = 380.2
            });

            AllServers.Add(new ServerInfo
            {
                ServerId = "us-west-1",
                ServerName = "Western US #1",
                Region = "US-West",
                Country = "United States",
                CurrentPlayers = 3890,
                MaxPlayers = 5000,
                Latency = 35.7,
                Status = "online",
                DownloadSpeed = 420.3,
                UploadSpeed = 365.1
            });

            // Europe
            AllServers.Add(new ServerInfo
            {
                ServerId = "eu-west-1",
                ServerName = "Western Europe #1",
                Region = "EU-West",
                Country = "Germany",
                CurrentPlayers = 5000,
                MaxPlayers = 5000,
                Latency = 45.2,
                Status = "online",
                DownloadSpeed = 520.8,
                UploadSpeed = 480.1
            });

            // Asia-Pacific
            AllServers.Add(new ServerInfo
            {
                ServerId = "ap-southeast-1",
                ServerName = "Australia #1",
                Region = "AP-SouthEast",
                Country = "Australia",
                CurrentPlayers = 2150,
                MaxPlayers = 5000,
                Latency = 95.4,
                Status = "online",
                DownloadSpeed = 380.2,
                UploadSpeed = 320.5
            });

            AllServers.Add(new ServerInfo
            {
                ServerId = "ap-northeast-1",
                ServerName = "Japan #1",
                Region = "AP-NorthEast",
                Country = "Japan",
                CurrentPlayers = 3200,
                MaxPlayers = 5000,
                Latency = 75.8,
                Status = "online",
                DownloadSpeed = 500.3,
                UploadSpeed = 450.2
            });

            RefreshFilters();
            FindRecommendedServer();
        }

        public void RefreshFilters()
        {
            FilteredServers.Clear();

            foreach (var server in AllServers)
            {
                bool matches = true;

                if (ShowOnlineOnly && server.Status != "online")
                    matches = false;

                if (SelectedRegion != "All" && server.Region != SelectedRegion)
                    matches = false;

                if (matches)
                    FilteredServers.Add(server);
            }

            SortServers();
        }

        private void SortServers()
        {
            // Sort by selected criteria
            // Implementation depends on sort parameter
        }

        public void FindRecommendedServer()
        {
            // Find lowest latency server that's online
            ServerInfo best = null;
            double bestLatency = double.MaxValue;

            foreach (var server in FilteredServers)
            {
                if (server.Status == "online" && server.Latency < bestLatency)
                {
                    best = server;
                    bestLatency = server.Latency;
                }
            }

            RecommendedServer = best;
        }

        public void SelectServer(string serverId)
        {
            // Prepare to connect to server
        }

        public void SetRegionFilter(string region)
        {
            SelectedRegion = region;
            RefreshFilters();
        }

        public void ToggleOnlineFilter()
        {
            ShowOnlineOnly = !ShowOnlineOnly;
            RefreshFilters();
        }
    }
}
