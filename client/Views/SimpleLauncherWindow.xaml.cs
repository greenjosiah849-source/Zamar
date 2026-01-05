using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;

namespace ZamarPlayer.Views
{
    public partial class SimpleLauncherWindow : Window
    {
        private ObservableCollection<string> _games;
        private string _username = "Player";
        private int _level = 1;

        public SimpleLauncherWindow()
        {
            InitializeComponent();
            SetupSimpleUI();
            LoadGames();
        }

        private void SetupSimpleUI()
        {
            this.Title = "Zamar Game Launcher";
            this.Width = 600;
            this.Height = 500;
            this.WindowStartupLocation = WindowStartupLocation.CenterScreen;
            this.Background = new SolidColorBrush(Color.FromRgb(240, 240, 240));
            this.Foreground = new SolidColorBrush(Colors.Black);
            this.FontSize = 14;
            this.FontFamily = new FontFamily("Arial");

            // Create simple grid layout
            var mainGrid = new Grid();
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(60) });
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(50) });
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
            mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(50) });

            // Header
            var headerPanel = new StackPanel { Background = new SolidColorBrush(Color.FromRgb(200, 200, 200)) };
            var titleText = new TextBlock { Text = "ZAMAR GAME LAUNCHER", Margin = new Thickness(10), FontSize = 18, FontWeight = FontWeights.Bold };
            var userText = new TextBlock { Text = $"Player: {_username} | Level: {_level}", Margin = new Thickness(10, 0, 10, 5), FontSize = 12 };
            headerPanel.Children.Add(titleText);
            headerPanel.Children.Add(userText);
            Grid.SetRow(headerPanel, 0);

            // Navigation buttons
            var navPanel = new StackPanel { Orientation = Orientation.Horizontal, Background = new SolidColorBrush(Color.FromRgb(220, 220, 220)), Padding = new Thickness(5) };
            navPanel.Children.Add(CreateNavButton("Games", GamesBtn_Click));
            navPanel.Children.Add(CreateNavButton("Servers", ServersBtn_Click));
            navPanel.Children.Add(CreateNavButton("Profile", ProfileBtn_Click));
            navPanel.Children.Add(CreateNavButton("Settings", SettingsBtn_Click));
            navPanel.Children.Add(CreateNavButton("Exit", ExitBtn_Click));
            Grid.SetRow(navPanel, 1);

            // Games list
            var listBox = new ListBox { Name = "GamesList", Background = new SolidColorBrush(Colors.White), Margin = new Thickness(10) };
            _games = new ObservableCollection<string>
            {
                "Sky Island Adventure (1250 players) ⭐ 4.8",
                "Zombie Survival (3200 players) ⭐ 4.6",
                "Battle Royale Elite (5600 players) ⭐ 4.7",
                "Tycoon Empire (2800 players) ⭐ 4.5",
                "Parkour Master (1800 players) ⭐ 4.4"
            };
            listBox.ItemsSource = _games;
            listBox.SelectionChanged += GamesList_SelectionChanged;
            Grid.SetRow(listBox, 2);

            // Action buttons
            var actionPanel = new StackPanel { Orientation = Orientation.Horizontal, Background = new SolidColorBrush(Color.FromRgb(220, 220, 220)), Padding = new Thickness(5) };
            actionPanel.Children.Add(CreateActionButton("Play Selected", PlayBtn_Click));
            actionPanel.Children.Add(CreateActionButton("Refresh", RefreshBtn_Click));
            Grid.SetRow(actionPanel, 3);

            mainGrid.Children.Add(headerPanel);
            mainGrid.Children.Add(navPanel);
            mainGrid.Children.Add(listBox);
            mainGrid.Children.Add(actionPanel);

            this.Content = mainGrid;
        }

        private Button CreateNavButton(string text, RoutedEventHandler onClick)
        {
            return new Button
            {
                Content = text,
                Width = 80,
                Height = 40,
                Margin = new Thickness(3),
                Background = new SolidColorBrush(Color.FromRgb(200, 200, 200)),
                Foreground = new SolidColorBrush(Colors.Black),
                Click = onClick
            };
        }

        private Button CreateActionButton(string text, RoutedEventHandler onClick)
        {
            return new Button
            {
                Content = text,
                Width = 150,
                Height = 40,
                Margin = new Thickness(3),
                Background = new SolidColorBrush(Color.FromRgb(100, 150, 200)),
                Foreground = new SolidColorBrush(Colors.White),
                Click = onClick
            };
        }

        private void LoadGames()
        {
            // Games already loaded in SetupSimpleUI
        }

        private void GamesList_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // Game selected
        }

        private void PlayBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Launching selected game...");
        }

        private void RefreshBtn_Click(object sender, RoutedEventArgs e)
        {
            LoadGames();
            MessageBox.Show("Games refreshed!");
        }

        private void GamesBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Games Library\n\n5 games available");
        }

        private void ServersBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Global Servers\n\nUS-East: 2450 players (15ms)\nUS-West: 1890 players (35ms)\nEU-West: 3100 players (45ms)\nAP-Southeast: 890 players (85ms)");
        }

        private void ProfileBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show($"Player Profile\n\nUsername: {_username}\nLevel: {_level}\nFriends: 0\nRobux: 0");
        }

        private void SettingsBtn_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Settings\n\nGraphics: High\nResolution: 1920x1080\nVolume: 100%");
        }

        private void ExitBtn_Click(object sender, RoutedEventArgs e)
        {
            this.Close();
        }
    }
}
