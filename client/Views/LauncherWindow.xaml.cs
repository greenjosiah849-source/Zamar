using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using ZamarPlayer.Controllers;
using ZamarPlayer.Services;

namespace ZamarPlayer.Views
{
    public partial class LauncherWindow : Window
    {
        private GameLauncherController _launcherController;
        private GameSessionService _sessionService;
        private MultiplayerService _multiplayerService;
        private CurrentUser _currentUser;
        private ObservableCollection<GameListItem> _games;

        public LauncherWindow()
        {
            InitializeComponent();
            Loaded += async (s, e) => await InitializeAsync();
        }

        private async Task InitializeAsync()
        {
            try
            {
                // Initialize services
                _sessionService = new GameSessionService();
                _multiplayerService = new MultiplayerService();
                _launcherController = new GameLauncherController(_sessionService, _multiplayerService);

                // Load current user
                _currentUser = await _sessionService.GetCurrentUserAsync();
                if (_currentUser == null)
                {
                    MessageBox.Show("Authentication failed");
                    this.Close();
                    return;
                }

                // Update UI
                UserDisplayName.Text = _currentUser.Username;
                UserStatus.Text = "🟢 Online";

                // Load featured games
                await LoadFeaturedGamesAsync();
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Initialization error: {ex.Message}");
            }
        }

        private async Task LoadFeaturedGamesAsync()
        {
            try
            {
                PageTitle.Text = "🎮 Featured Games";
                PageSubtitle.Text = "Play with millions of players worldwide";

                var games = await _launcherController.GetFeaturedGamesAsync();
                _games = new ObservableCollection<GameListItem>();

                foreach (var game in games)
                {
                    _games.Add(new GameListItem
                    {
                        Id = game.id,
                        Name = game.name,
                        Description = game.description,
                        Players = game.playerCount ?? 0,
                        Creator = game.creator,
                        Thumbnail = game.thumbnail,
                        Updated = game.updatedAt,
                        Rating = game.rating ?? 0,
                    });
                }

                GamesListBox.ItemsSource = _games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading games: {ex.Message}");
            }
        }

        private void Home_Click(object sender, RoutedEventArgs e) => _ = LoadFeaturedGamesAsync();

        private async void Featured_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                PageTitle.Text = "⭐ Featured Games";
                PageSubtitle.Text = "Trending games this week";

                var games = await _launcherController.GetFeaturedGamesAsync();
                _games = new ObservableCollection<GameListItem>();

                foreach (var game in games.Take(10))
                {
                    _games.Add(new GameListItem
                    {
                        Id = game.id,
                        Name = game.name,
                        Description = game.description,
                        Players = game.playerCount ?? 0,
                        Rating = game.rating ?? 0,
                    });
                }

                GamesListBox.ItemsSource = _games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}");
            }
        }

        private async void Favorites_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                PageTitle.Text = "❤️ Favorite Games";
                PageSubtitle.Text = "Your saved favorites";

                var favorites = await _launcherController.GetFavoriteGamesAsync(_currentUser.Id);
                _games = new ObservableCollection<GameListItem>();

                foreach (var game in favorites)
                {
                    _games.Add(new GameListItem
                    {
                        Id = game.id,
                        Name = game.name,
                        Description = game.description,
                        Players = game.playerCount ?? 0,
                    });
                }

                GamesListBox.ItemsSource = _games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}");
            }
        }

        private async void Recent_Click(object sender, RoutedEventArgs e)
        {
            try
            {
                PageTitle.Text = "⏱️ Recently Played";
                PageSubtitle.Text = "Games you've played before";

                var recent = await _launcherController.GetRecentGamesAsync(_currentUser.Id);
                _games = new ObservableCollection<GameListItem>();

                foreach (var game in recent)
                {
                    _games.Add(new GameListItem
                    {
                        Id = game.id,
                        Name = game.name,
                        Description = game.description,
                        Players = game.playerCount ?? 0,
                        Updated = game.updatedAt,
                    });
                }

                GamesListBox.ItemsSource = _games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error: {ex.Message}");
            }
        }

        private void Avatar_Click(object sender, RoutedEventArgs e)
        {
            // Open avatar customizer window
            MessageBox.Show("Avatar customizer coming soon!");
        }

        private void Inventory_Click(object sender, RoutedEventArgs e)
        {
            // Open inventory window
            MessageBox.Show("Inventory window coming soon!");
        }

        private void Achievements_Click(object sender, RoutedEventArgs e)
        {
            // Open achievements window
            MessageBox.Show("Achievements window coming soon!");
        }

        private void Settings_Click(object sender, RoutedEventArgs e)
        {
            // Open settings window
            MessageBox.Show("Settings window coming soon!");
        }

        private void SignOut_Click(object sender, RoutedEventArgs e)
        {
            if (MessageBox.Show("Sign out?", "Confirm", MessageBoxButton.YesNo) == MessageBoxResult.Yes)
            {
                _sessionService.ClearSession();
                this.Close();
            }
        }

        private async void PlayGame_Click(object sender, RoutedEventArgs e)
        {
            if (GamesListBox.SelectedItem is GameListItem selectedGame)
            {
                try
                {
                    // Launch game
                    var joinResult = await _launcherController.JoinGameAsync(
                        _currentUser.Id,
                        selectedGame.Id
                    );

                    if (joinResult.Success)
                    {
                        MessageBox.Show($"Joining {selectedGame.Name}...");
                        // TODO: Launch game window
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show($"Error joining game: {ex.Message}");
                }
            }
        }

        private async void Search_Click(object sender, RoutedEventArgs e)
        {
            await PerformSearchAsync(SearchBox.Text);
        }

        private void SearchBox_KeyDown(object sender, System.Windows.Input.KeyEventArgs e)
        {
            if (e.Key == System.Windows.Input.Key.Return)
            {
                _ = PerformSearchAsync(SearchBox.Text);
            }
        }

        private async Task PerformSearchAsync(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                await LoadFeaturedGamesAsync();
                return;
            }

            try
            {
                PageTitle.Text = "🔍 Search Results";
                PageSubtitle.Text = $"Results for \"{query}\"";

                var results = await _launcherController.SearchGamesAsync(query);
                _games = new ObservableCollection<GameListItem>();

                foreach (var game in results)
                {
                    _games.Add(new GameListItem
                    {
                        Id = game.id,
                        Name = game.name,
                        Description = game.description,
                        Players = game.playerCount ?? 0,
                    });
                }

                GamesListBox.ItemsSource = _games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Search error: {ex.Message}");
            }
        }

        private void Refresh_Click(object sender, RoutedEventArgs e)
        {
            _ = LoadFeaturedGamesAsync();
        }

        private void ServersDialog_Click(object sender, RoutedEventArgs e)
        {
            // Show global servers dialog
            var serversWindow = new Window
            {
                Title = "Global Game Servers",
                Width = 600,
                Height = 400,
                WindowStartupLocation = WindowStartupLocation.CenterOwner,
                Owner = this,
                Background = (System.Windows.Media.Brush)FindResource("DarkBgBrush"),
            };

            var textBlock = new TextBlock
            {
                Text = "Loading servers...",
                Margin = new Thickness(20),
                Foreground = System.Windows.Media.Brushes.White,
            };

            serversWindow.Content = textBlock;
            serversWindow.Show();

            // Load servers
            _ = LoadServersAsync(textBlock);
        }

        private async Task LoadServersAsync(TextBlock textBlock)
        {
            try
            {
                var metrics = await _multiplayerService.GetPlatformMetricsAsync();
                if (metrics != null)
                {
                    string info = $@"
ZAMAR GLOBAL SERVERS
====================

Regions:        {metrics.TotalRegions}
Active Players: {metrics.TotalPlayers}
Capacity:       {metrics.TotalCapacity}
Utilization:    {metrics.AverageUtilization}
Uptime:         {metrics.Uptime}

Your Best Server:
  Region: US-EAST
  Latency: ~15ms
  Players: 145/250
  Status: ONLINE ✓
";
                    textBlock.Text = info;
                    textBlock.FontFamily = new System.Windows.Media.FontFamily("Consolas");
                }
            }
            catch (Exception ex)
            {
                textBlock.Text = $"Error: {ex.Message}";
            }
        }
    }

    public class GameListItem
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public int Players { get; set; }
        public string Creator { get; set; }
        public string Thumbnail { get; set; }
        public DateTime Updated { get; set; }
        public double Rating { get; set; }
    }

    public class CurrentUser
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string Token { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
