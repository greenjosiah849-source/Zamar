using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Threading;
using ZamarPlayer.Models;
using ZamarPlayer.Services;

namespace ZamarPlayer.Views
{
    /// <summary>
    /// Admin Moderation Dashboard
    /// Manage reports, cases, bans, and appeals
    /// </summary>
    public partial class ModerationDashboardWindow : Window
    {
        private ClientModerationService _moderationService;
        private DispatcherTimer _refreshTimer;
        private List<ModerationCase> _cases;
        private List<FlaggedContent> _flaggedContent;

        public ModerationDashboardWindow()
        {
            InitializeComponent();
            SetupUI();
        }

        public void SetModerationService(ClientModerationService service)
        {
            _moderationService = service;
            _refreshTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(30) };
            _refreshTimer.Tick += async (s, e) => await RefreshDataAsync();
            _refreshTimer.Start();
        }

        private void SetupUI()
        {
            this.Title = "Zamar Moderation Dashboard";
            this.Width = 1200;
            this.Height = 800;

            var mainPanel = new DockPanel { Margin = new Thickness(10) };

            // Header
            var header = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 20) };
            header.Children.Add(new Label 
            { 
                Content = "Moderation Dashboard", 
                FontSize = 24, 
                FontWeight = FontWeights.Bold 
            });

            // Stats Panel
            var statsPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 20) };
            statsPanel.Children.Add(CreateStatBox("Pending Cases", "0", "#FF9800"));
            statsPanel.Children.Add(CreateStatBox("Active Bans", "0", "#F44336"));
            statsPanel.Children.Add(CreateStatBox("Flagged Content", "0", "#2196F3"));
            statsPanel.Children.Add(CreateStatBox("Pending Appeals", "0", "#9C27B0"));

            // Tab Control for different views
            var tabControl = new TabControl();

            // Cases Tab
            var casesTab = new TabItem { Header = "Moderation Cases", IsSelected = true };
            casesTab.Content = CreateCasesPanel();
            tabControl.Items.Add(casesTab);

            // Flagged Content Tab
            var flaggedTab = new TabItem { Header = "Flagged Content" };
            flaggedTab.Content = CreateFlaggedContentPanel();
            tabControl.Items.Add(flaggedTab);

            // Appeals Tab
            var appealsTab = new TabItem { Header = "Appeals" };
            appealsTab.Content = CreateAppealsPanel();
            tabControl.Items.Add(appealsTab);

            // AI Info Tab
            var aiTab = new TabItem { Header = "Zamar AI" };
            aiTab.Content = CreateAIInfoPanel();
            tabControl.Items.Add(aiTab);

            // Layout
            DockPanel.SetDock(header, Dock.Top);
            DockPanel.SetDock(statsPanel, Dock.Top);
            DockPanel.SetDock(tabControl, Dock.Bottom);

            mainPanel.Children.Add(header);
            mainPanel.Children.Add(statsPanel);
            mainPanel.Children.Add(tabControl);

            this.Content = mainPanel;
        }

        private StackPanel CreateStatBox(string title, string value, string color)
        {
            var panel = new StackPanel 
            { 
                Margin = new Thickness(10), 
                Background = new System.Windows.Media.SolidColorBrush(
                    (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(color)
                ),
                Padding = new Thickness(15),
                Width = 200
            };

            panel.Children.Add(new Label 
            { 
                Content = title, 
                FontSize = 12, 
                Foreground = System.Windows.Media.Brushes.White 
            });

            panel.Children.Add(new TextBlock 
            { 
                Text = value, 
                FontSize = 28, 
                FontWeight = FontWeights.Bold,
                Foreground = System.Windows.Media.Brushes.White
            });

            return panel;
        }

        private StackPanel CreateCasesPanel()
        {
            var panel = new StackPanel { Margin = new Thickness(10) };

            // Filter buttons
            var filterPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 10) };
            var filterCombo = new ComboBox 
            { 
                Width = 150,
                SelectedValuePath = "Content",
                Margin = new Thickness(0, 0, 10, 0)
            };
            filterCombo.Items.Add("All");
            filterCombo.Items.Add("PENDING");
            filterCombo.Items.Add("REVIEWED");
            filterCombo.Items.Add("APPROVED");
            filterCombo.Items.Add("DISMISSED");
            filterCombo.SelectedIndex = 0;

            var refreshBtn = new Button 
            { 
                Content = "Refresh", 
                Width = 100,
                Padding = new Thickness(10, 5, 10, 5)
            };
            refreshBtn.Click += async (s, e) => await RefreshDataAsync();

            filterPanel.Children.Add(new Label { Content = "Filter:" });
            filterPanel.Children.Add(filterCombo);
            filterPanel.Children.Add(refreshBtn);

            panel.Children.Add(filterPanel);

            // Cases list (DataGrid would be ideal, using ListBox for simplicity)
            var casesList = new ListBox 
            { 
                Height = 500,
                Margin = new Thickness(0, 10, 0, 10)
            };

            panel.Children.Add(new Label { Content = "Cases:" });
            panel.Children.Add(casesList);

            // Action buttons
            var actionPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 10, 0, 0) };
            
            var approveBtn = new Button 
            { 
                Content = "Approve & Ban", 
                Width = 120,
                Padding = new Thickness(10, 5, 10, 5),
                Margin = new Thickness(0, 0, 10, 0),
                Background = System.Windows.Media.Brushes.IndianRed
            };
            approveBtn.Click += async (s, e) => await ApproveCase();

            var dismissBtn = new Button 
            { 
                Content = "Dismiss", 
                Width = 100,
                Padding = new Thickness(10, 5, 10, 5),
                Background = System.Windows.Media.Brushes.LightGreen
            };
            dismissBtn.Click += async (s, e) => await DismissCase();

            actionPanel.Children.Add(approveBtn);
            actionPanel.Children.Add(dismissBtn);

            panel.Children.Add(actionPanel);

            return panel;
        }

        private StackPanel CreateFlaggedContentPanel()
        {
            var panel = new StackPanel { Margin = new Thickness(10) };

            panel.Children.Add(new Label 
            { 
                Content = "Flagged Content by Zamar AI", 
                FontSize = 14, 
                FontWeight = FontWeights.Bold 
            });

            var contentList = new ListBox { Height = 500, Margin = new Thickness(0, 10, 0, 10) };
            panel.Children.Add(contentList);

            var actionPanel = new StackPanel { Orientation = Orientation.Horizontal };
            var removeBtn = new Button 
            { 
                Content = "Remove Content", 
                Width = 120,
                Padding = new Thickness(10, 5, 10, 5),
                Margin = new Thickness(0, 0, 10, 0),
                Background = System.Windows.Media.Brushes.IndianRed
            };
            removeBtn.Click += async (s, e) => await RemoveContent();

            var approveBtn = new Button 
            { 
                Content = "Approve", 
                Width = 100,
                Padding = new Thickness(10, 5, 10, 5),
                Background = System.Windows.Media.Brushes.LightGreen
            };
            approveBtn.Click += async (s, e) => await ApproveFlaggedContent();

            actionPanel.Children.Add(removeBtn);
            actionPanel.Children.Add(approveBtn);
            panel.Children.Add(actionPanel);

            return panel;
        }

        private StackPanel CreateAppealsPanel()
        {
            var panel = new StackPanel { Margin = new Thickness(10) };

            panel.Children.Add(new Label 
            { 
                Content = "Ban Appeals", 
                FontSize = 14, 
                FontWeight = FontWeights.Bold 
            });

            var appealsList = new ListBox { Height = 500, Margin = new Thickness(0, 10, 0, 10) };
            panel.Children.Add(appealsList);

            var actionPanel = new StackPanel { Orientation = Orientation.Horizontal };
            var approveBtn = new Button 
            { 
                Content = "Approve Appeal", 
                Width = 130,
                Padding = new Thickness(10, 5, 10, 5),
                Margin = new Thickness(0, 0, 10, 0),
                Background = System.Windows.Media.Brushes.LightGreen
            };
            approveBtn.Click += async (s, e) => await ApproveAppeal();

            var rejectBtn = new Button 
            { 
                Content = "Reject Appeal", 
                Width = 120,
                Padding = new Thickness(10, 5, 10, 5),
                Background = System.Windows.Media.Brushes.IndianRed
            };
            rejectBtn.Click += async (s, e) => await RejectAppeal();

            actionPanel.Children.Add(approveBtn);
            actionPanel.Children.Add(rejectBtn);
            panel.Children.Add(actionPanel);

            return panel;
        }

        private StackPanel CreateAIInfoPanel()
        {
            var panel = new StackPanel { Margin = new Thickness(10) };

            panel.Children.Add(new Label 
            { 
                Content = "Zamar AI Information", 
                FontSize = 14, 
                FontWeight = FontWeights.Bold 
            });

            var infoText = new TextBlock 
            { 
                TextWrapping = TextWrapping.Wrap,
                Margin = new Thickness(0, 10, 0, 0),
                FontSize = 11,
                Foreground = System.Windows.Media.Brushes.Gray
            };

            panel.Children.Add(infoText);

            var loadBtn = new Button 
            { 
                Content = "Load AI Info", 
                Width = 150,
                Padding = new Thickness(10, 5, 10, 5),
                Margin = new Thickness(0, 20, 0, 0)
            };
            loadBtn.Click += async (s, e) =>
            {
                if (_moderationService == null) return;
                
                try
                {
                    var aiInfo = await _moderationService.GetAIInfoAsync();
                    infoText.Text = $"Model: {aiInfo.Name}\n" +
                        $"Version: {aiInfo.Version}\n" +
                        $"Capabilities: {string.Join(", ", aiInfo.Capabilities)}\n" +
                        $"Categories: {string.Join(", ", aiInfo.Categories)}";
                }
                catch (Exception ex)
                {
                    infoText.Text = $"Error: {ex.Message}";
                }
            };

            panel.Children.Add(loadBtn);

            return panel;
        }

        private async Task RefreshDataAsync()
        {
            if (_moderationService == null) return;

            try
            {
                // Refresh cases, flagged content, appeals
                // Implementation depends on available endpoints
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Refresh error: {ex.Message}", "Error");
            }
        }

        private async Task ApproveCase()
        {
            MessageBox.Show("Approve case - implementation depends on case selection", "Info");
        }

        private async Task DismissCase()
        {
            MessageBox.Show("Dismiss case - implementation depends on case selection", "Info");
        }

        private async Task RemoveContent()
        {
            MessageBox.Show("Remove content - implementation depends on content selection", "Info");
        }

        private async Task ApproveFlaggedContent()
        {
            MessageBox.Show("Approve flagged content - implementation depends on selection", "Info");
        }

        private async Task ApproveAppeal()
        {
            MessageBox.Show("Approve appeal - implementation depends on appeal selection", "Info");
        }

        private async Task RejectAppeal()
        {
            MessageBox.Show("Reject appeal - implementation depends on appeal selection", "Info");
        }

        public override void OnApplyTemplate()
        {
            base.OnApplyTemplate();
        }
    }

    // ============================================
    // DATA MODELS FOR UI
    // ============================================

    public class ModerationCase
    {
        public string Id { get; set; }
        public string UserId { get; set; }
        public string Reason { get; set; }
        public string Status { get; set; }
        public string Severity { get; set; }
        public string Category { get; set; }
        public decimal Confidence { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class FlaggedContent
    {
        public string Id { get; set; }
        public string ContentType { get; set; }
        public string ContentUrl { get; set; }
        public string Category { get; set; }
        public decimal Confidence { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
