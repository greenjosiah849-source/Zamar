using System;
using System.Collections.ObjectModel;
using System.Windows;
using System.Windows.Controls;

namespace ZamarPlayer.Views
{
    public partial class AdminWindow : Window
    {
        private AdminService _adminService;
        private string _currentAdminRole;
        private string _currentAdminUser;

        public AdminWindow(string adminUser, string adminRole)
        {
            InitializeComponent();
            _currentAdminUser = adminUser;
            _currentAdminRole = adminRole;
            _adminService = new AdminService(adminUser);
            
            AdminNameBlock.Text = adminUser;
            LoadDashboard();
        }

        private void NavButton_Click(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            string tag = btn.Tag.ToString();

            HideAllPanels();

            switch (tag)
            {
                case "dashboard":
                    DashboardPanel.Visibility = Visibility.Visible;
                    LoadDashboard();
                    break;
                case "users":
                    UsersPanel.Visibility = Visibility.Visible;
                    LoadUsers();
                    break;
                case "roles":
                    RolesPanel.Visibility = Visibility.Visible;
                    LoadRoles();
                    break;
                case "moderation":
                    ModerationPanel.Visibility = Visibility.Visible;
                    LoadReports();
                    break;
                case "games":
                    GamesPanel.Visibility = Visibility.Visible;
                    LoadGames();
                    break;
                case "servers":
                    ServersPanel.Visibility = Visibility.Visible;
                    LoadServers();
                    break;
                case "analytics":
                    AnalyticsPanel.Visibility = Visibility.Visible;
                    LoadAnalytics();
                    break;
                case "logout":
                    LogoutAdmin();
                    break;
            }
        }

        private void HideAllPanels()
        {
            DashboardPanel.Visibility = Visibility.Collapsed;
            UsersPanel.Visibility = Visibility.Collapsed;
            RolesPanel.Visibility = Visibility.Collapsed;
            ModerationPanel.Visibility = Visibility.Collapsed;
            GamesPanel.Visibility = Visibility.Collapsed;
            ServersPanel.Visibility = Visibility.Collapsed;
            AnalyticsPanel.Visibility = Visibility.Collapsed;
        }

        private async void LoadDashboard()
        {
            try
            {
                var stats = await _adminService.GetDashboardStatsAsync();
                TotalUsersBlock.Text = stats.ContainsKey("totalUsers") ? stats["totalUsers"].ToString() : "0";
                ActivePlayersBlock.Text = stats.ContainsKey("activePlayers") ? stats["activePlayers"].ToString() : "0";
                TotalGamesBlock.Text = stats.ContainsKey("totalGames") ? stats["totalGames"].ToString() : "0";
                ReportsBlock.Text = stats.ContainsKey("pendingReports") ? stats["pendingReports"].ToString() : "0";

                var activity = await _adminService.GetRecentActivityAsync();
                RecentActivityList.ItemsSource = activity;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading dashboard: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadUsers()
        {
            try
            {
                var users = await _adminService.GetAllUsersAsync();
                UsersGrid.ItemsSource = users;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading users: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadRoles()
        {
            try
            {
                var roles = await _adminService.GetAllRolesAsync();
                RolesItemsControl.ItemsSource = roles;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading roles: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadReports()
        {
            try
            {
                var reports = await _adminService.GetModerationReportsAsync();
                ReportsGrid.ItemsSource = reports;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading reports: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadGames()
        {
            try
            {
                var games = await _adminService.GetAllGamesAsync();
                GamesGrid.ItemsSource = games;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading games: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadServers()
        {
            try
            {
                var servers = await _adminService.GetServerStatusAsync();
                ServersItemsControl.ItemsSource = servers;
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading servers: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadAnalytics()
        {
            try
            {
                var analytics = await _adminService.GetAnalyticsAsync();
                DailyActiveBlock.Text = analytics.ContainsKey("dailyActive") ? analytics["dailyActive"].ToString() : "0";
                GamesPlayedBlock.Text = analytics.ContainsKey("gamesPlayed") ? analytics["gamesPlayed"].ToString() : "0";
                AvgSessionBlock.Text = analytics.ContainsKey("avgSessionTime") ? analytics["avgSessionTime"].ToString() : "0 min";
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Error loading analytics: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void SearchUsers_Click(object sender, RoutedEventArgs e)
        {
            string query = UserSearchBox.Text;
            if (string.IsNullOrEmpty(query)) return;

            LoadUsers();
        }

        private void CreateUser_Click(object sender, RoutedEventArgs e)
        {
            CreateUserDialog dialog = new CreateUserDialog();
            if (dialog.ShowDialog() == true)
            {
                LoadUsers();
            }
        }

        private void EditUser_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Edit user functionality", "Not Implemented");
        }

        private void BanUser_Click(object sender, RoutedEventArgs e)
        {
            if (MessageBox.Show("Ban this user?", "Confirm", MessageBoxButton.YesNo) == MessageBoxResult.Yes)
            {
                LoadUsers();
            }
        }

        private void CreateRole_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Create role functionality", "Not Implemented");
        }

        private void SearchGames_Click(object sender, RoutedEventArgs e)
        {
            LoadGames();
        }

        private void ViewGame_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("View game functionality", "Not Implemented");
        }

        private void BanGame_Click(object sender, RoutedEventArgs e)
        {
            if (MessageBox.Show("Ban this game?", "Confirm", MessageBoxButton.YesNo) == MessageBoxResult.Yes)
            {
                LoadGames();
            }
        }

        private void ReviewReport_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Review report functionality", "Not Implemented");
        }

        private void TakeAction_Click(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Take action functionality", "Not Implemented");
        }

        private void LogoutAdmin()
        {
            this.Close();
        }
    }
}
