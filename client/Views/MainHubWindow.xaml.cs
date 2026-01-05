using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using ZamarPlayer.Services;

namespace ZamarPlayer.Views
{
    public partial class MainHubWindow : Window
    {
        private ClientManager _clientManager;
        private GameClientService _gameService;
        private AuthService _authService;
        private ObservableCollection<GameItem> _games;
        private string _currentUserId;
        private string _userToken;

        public MainHubWindow()
        {
            InitializeComponent();
            Loaded += async (s, e) => await InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            try
            {
                _authService = new AuthService();
                _clientManager = new ClientManager();
                
                // Get current user
                var user = await _authService.GetCurrentUserAsync();
                if (user != null)
                {
                    _currentUserId = user.Id;
                    _userToken = user.Token;
                    _gameService = new GameClientService(_currentUserId, _userToken);

                    UserInfoText.Text = $"Welcome, {user.Username}!";
                    LoadGamesAsync();
                }
                else
                {
                    MessageBox.Show("Not authenticated");
                    this.Close();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Initialization error: {ex.Message}");
            }
        }

        private async void LoadGamesAsync()
        {
            try
            {
                var games = await _clientManager.GetGamesAsync();
                _games = new ObservableCollection<GameItem>();

                foreach (var game in games)
                {
                    _games.Add(new GameItem
                    {
                        Id = game.id,
                        Name = game.name,
                        Description = game.description,
                        Players = game.playerCount ?? 0,
                        MaxPlayers = 100,
                        Creator = game.creator,
                        Thumbnail = game.thumbnail,
                        Updated = game.updatedAt,
                    });
                }

                GamesListBox.ItemsSource = _games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading games: {ex.Message}");
            }
        }

        private async void PlayButton_Click(object sender, RoutedEventArgs e)
        {
            if (GamesListBox.SelectedItem is GameItem selectedGame)
            {
                try
                {
                    // Get best server based on user location
                    // In production, use actual geolocation
                    double latitude = 40.7128; // Default to New York
                    double longitude = -74.006;

                    var server = await _gameService.GetBestServerAsync(latitude, longitude);
                    if (server != null)
                    {
                        // Show region dialog
                        var result = MessageBox.Show(
                            $"Connecting to {server.Country} ({server.Region})\nLatency: {server.Latency}ms\n\nContinue?",
                            "Server Selection",
                            MessageBoxButton.YesNo
                        );

                        if (result == MessageBoxResult.Yes)
                        {
                            // Join game
                            var joinResult = await _gameService.JoinServerAsync(
                                selectedGame.Id,
                                latitude,
                                longitude
                            );

                            if (joinResult?.Success == true)
                            {
                                // Connect to game
                                bool connected = await _gameService.ConnectToGameAsync(
                                    joinResult.Server.Port.ToString(),
                                    joinResult.Server.Port,
                                    joinResult.JoinToken
                                );

                                if (connected)
                                {
                                    MessageBox.Show($"Connected to {selectedGame.Name}!");
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error joining game: {ex.Message}");
                }
            }
        }

        private void ServersButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var serversWindow = new Window
                {
                    Title = "Global Game Servers",
                    Width = 700,
                    Height = 500,
                    WindowStartupLocation = WindowStartupLocation.CenterOwner,
                    Owner = this,
                };

                var grid = new Grid();
                var textBlock = new TextBlock
                {
                    Text = "Loading server information...",
                    Margin = new Thickness(10),
                };
                grid.Children.Add(textBlock);
                serversWindow.Content = grid;
                serversWindow.Show();

                // Load servers async
                LoadServersAsync(textBlock);
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error opening servers window: {ex.Message}");
            }
        }

        private async void LoadServersAsync(TextBlock textBlock)
        {
            try
            {
                var metrics = await _gameService.GetPlatformMetricsAsync();
                if (metrics != null)
                {
                    string info = $@"
ZAMAR GLOBAL GAME SERVER NETWORK
==================================

Total Regions: {metrics.TotalRegions}
Active Players: {metrics.TotalPlayers}
Total Capacity: {metrics.TotalCapacity}
Average Utilization: {metrics.AverageUtilization}
Platform Uptime: {metrics.Uptime}

Servers by Continent:
{string.Join("\n", metrics.ByContinents.Keys)}
";
                    textBlock.Text = info;
                }
            }
            catch (Exception ex)
            {
                textBlock.Text = $"Error: {ex.Message}";
            }
        }

        private async void SettingsButton_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                var latency = await _gameService.PingAsync();
                MessageBox.Show(
                    $"Server latency: {latency}ms\n\nSettings coming soon!",
                    "Client Settings"
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}");
            }
        }
    }

    public class GameItem
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int Players { get; set; }
        public int MaxPlayers { get; set; }
        public string Creator { get; set; }
        public string Thumbnail { get; set; }
        public DateTime Updated { get; set; }
        public string DisplayText => $"{Name} - {Players}/{MaxPlayers} playing";
    }
}
