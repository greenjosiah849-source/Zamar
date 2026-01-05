using System;
using System.Collections.ObjectModel;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using ZamarPlayer.Models;
using ZamarPlayer.Services;
using System.Collections.Generic;
using System.Linq;

namespace ZamarPlayer.Views
{
    public partial class CompleteModerationDashboard : Window
    {
        private ClientModerationService _moderationService;
        private ObservableCollection<ModerationCase> _cases;
        private ObservableCollection<FlaggedContentItem> _flaggedContent;
        private ObservableCollection<Appeal> _appeals;
        private ObservableCollection<ViolationStat> _violationStats;
        private ObservableCollection<ModeratorStat> _moderatorStats;

        private ModerationCase _selectedCase;
        private string _reviewNotes = "";
        private int _totalCases = 0;
        private int _pendingCases = 0;
        private int _activeBans = 0;
        private int _pendingAppeals = 0;
        private double _aiAccuracy = 0;
        private string _statusMessage = "Ready";
        private bool _isLoading = false;
        private double _loadingProgress = 0;

        public CompleteModerationDashboard()
        {
            InitializeComponent();
            InitializeCollections();
            InitializeServices();
            LoadDashboardData();
        }

        private void InitializeCollections()
        {
            _cases = new ObservableCollection<ModerationCase>();
            _flaggedContent = new ObservableCollection<FlaggedContentItem>();
            _appeals = new ObservableCollection<Appeal>();
            _violationStats = new ObservableCollection<ViolationStat>();
            _moderatorStats = new ObservableCollection<ModeratorStat>();

            DataContext = new
            {
                ModerationCases = _cases,
                FlaggedContent = _flaggedContent,
                Appeals = _appeals,
                ViolationStats = _violationStats,
                ModeratorStats = _moderatorStats,
                SelectedCase = _selectedCase,
                TotalCases = _totalCases,
                PendingCases = _pendingCases,
                ActiveBans = _activeBans,
                PendingAppeals = _pendingAppeals,
                AIAccuracy = _aiAccuracy,
                ReviewNotes = _reviewNotes,
                StatusMessage = _statusMessage,
                IsLoading = _isLoading,
                LoadingProgress = _loadingProgress
            };
        }

        private void InitializeServices()
        {
            try
            {
                _moderationService = new ClientModerationService("http://localhost:3000/api");
                UpdateStatus("Services initialized");
            }
            catch (Exception ex)
            {
                MessageBox.Show($"Failed to initialize services: {ex.Message}", "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private async void LoadDashboardData()
        {
            try
            {
                _isLoading = true;
                UpdateStatus("Loading dashboard data...");

                // Load statistics
                var casesTask = LoadCases();
                var contentTask = LoadFlaggedContent();
                var appealsTask = LoadAppeals();
                var statsTask = LoadStatistics();

                await Task.WhenAll(casesTask, contentTask, appealsTask, statsTask);

                UpdateStatus("Dashboard loaded successfully");
            }
            catch (Exception ex)
            {
                UpdateStatus($"Error loading dashboard: {ex.Message}");
                MessageBox.Show($"Failed to load dashboard: {ex.Message}", "Error");
            }
            finally
            {
                _isLoading = false;
            }
        }

        private async Task LoadCases()
        {
            try
            {
                _loadingProgress = 25;

                // This would call your actual API
                // var cases = await _moderationService.GetCasesAsync();

                // Mock data for now
                var mockCases = new List<ModerationCase>
                {
                    new ModerationCase 
                    { 
                        CaseId = "CASE-001", 
                        UserId = "user-123", 
                        Reason = "Hate Speech", 
                        Severity = 5, 
                        Status = "PENDING",
                        AIConfidence = 0.95
                    },
                    new ModerationCase 
                    { 
                        CaseId = "CASE-002", 
                        UserId = "user-456", 
                        Reason = "Spam", 
                        Severity = 2, 
                        Status = "PENDING",
                        AIConfidence = 0.87
                    }
                };

                foreach (var case_ in mockCases)
                {
                    _cases.Add(case_);
                }

                _pendingCases = _cases.Count(c => c.Status == "PENDING");
                _totalCases = _cases.Count;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading cases: {ex.Message}");
            }
        }

        private async Task LoadFlaggedContent()
        {
            try
            {
                _loadingProgress = 50;

                var mockContent = new List<FlaggedContentItem>
                {
                    new FlaggedContentItem 
                    { 
                        ContentId = "IMG-001", 
                        ContentType = "IMAGE", 
                        Reason = "NSFW", 
                        ReportCount = 3 
                    }
                };

                foreach (var content in mockContent)
                {
                    _flaggedContent.Add(content);
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading flagged content: {ex.Message}");
            }
        }

        private async Task LoadAppeals()
        {
            try
            {
                _loadingProgress = 75;

                var mockAppeals = new List<Appeal>
                {
                    new Appeal 
                    { 
                        AppealId = "APPEAL-001", 
                        UserId = "user-789", 
                        Reason = "Case dismissed was unfair", 
                        CreatedAt = DateTime.Now.AddDays(-2) 
                    }
                };

                foreach (var appeal in mockAppeals)
                {
                    _appeals.Add(appeal);
                }

                _pendingAppeals = _appeals.Count;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading appeals: {ex.Message}");
            }
        }

        private async Task LoadStatistics()
        {
            try
            {
                _loadingProgress = 90;

                _violationStats.Add(new ViolationStat { Category = "Hate Speech", Count = 12 });
                _violationStats.Add(new ViolationStat { Category = "Harassment", Count = 8 });
                _violationStats.Add(new ViolationStat { Category = "Spam", Count = 15 });

                _moderatorStats.Add(new ModeratorStat { ModeratorId = "mod-1", CasesReviewed = 42, AvgTimeHours = 1.5 });
                _moderatorStats.Add(new ModeratorStat { ModeratorId = "mod-2", CasesReviewed = 38, AvgTimeHours = 2.1 });

                _activeBans = 5;
                _aiAccuracy = 0.87;
                _loadingProgress = 100;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error loading statistics: {ex.Message}");
            }
        }

        private void OnRefreshClick(object sender, RoutedEventArgs e)
        {
            _cases.Clear();
            _flaggedContent.Clear();
            _appeals.Clear();
            LoadDashboardData();
        }

        private void OnSettingsClick(object sender, RoutedEventArgs e)
        {
            MessageBox.Show("Settings dialog would open here", "Settings");
        }

        private void OnReviewCaseClick(object sender, RoutedEventArgs e)
        {
            var button = sender as Button;
            if (button?.DataContext is ModerationCase case_)
            {
                _selectedCase = case_;
                MessageBox.Show($"Reviewing case: {case_.CaseId}", "Case Review");
            }
        }

        private void OnReviewContentClick(object sender, RoutedEventArgs e)
        {
            var button = sender as Button;
            if (button?.DataContext is FlaggedContentItem content)
            {
                MessageBox.Show($"Reviewing content: {content.ContentId}", "Content Review");
            }
        }

        private void OnReviewAppealClick(object sender, RoutedEventArgs e)
        {
            var button = sender as Button;
            if (button?.DataContext is Appeal appeal)
            {
                MessageBox.Show($"Reviewing appeal: {appeal.AppealId}", "Appeal Review");
            }
        }

        private void OnApproveCaseClick(object sender, RoutedEventArgs e)
        {
            if (_selectedCase != null)
            {
                UpdateStatus($"Case {_selectedCase.CaseId} approved");
                _selectedCase.Status = "APPROVED";
            }
        }

        private void OnDismissCaseClick(object sender, RoutedEventArgs e)
        {
            if (_selectedCase != null)
            {
                UpdateStatus($"Case {_selectedCase.CaseId} dismissed");
                _selectedCase.Status = "DISMISSED";
            }
        }

        private void OnBanUserClick(object sender, RoutedEventArgs e)
        {
            if (_selectedCase != null)
            {
                UpdateStatus($"User {_selectedCase.UserId} banned");
            }
        }

        private void OnSaveNotesClick(object sender, RoutedEventArgs e)
        {
            if (_selectedCase != null)
            {
                UpdateStatus($"Notes saved for case {_selectedCase.CaseId}");
            }
        }

        private void UpdateStatus(string message)
        {
            _statusMessage = message;
        }
    }

    // Helper classes for data binding
    public class ModerationCase
    {
        public string CaseId { get; set; }
        public string UserId { get; set; }
        public string Reason { get; set; }
        public int Severity { get; set; }
        public string Status { get; set; }
        public double AIConfidence { get; set; }
    }

    public class FlaggedContentItem
    {
        public string ContentId { get; set; }
        public string ContentType { get; set; }
        public string Reason { get; set; }
        public int ReportCount { get; set; }
    }

    public class Appeal
    {
        public string AppealId { get; set; }
        public string UserId { get; set; }
        public string Reason { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class ViolationStat
    {
        public string Category { get; set; }
        public int Count { get; set; }
    }

    public class ModeratorStat
    {
        public string ModeratorId { get; set; }
        public int CasesReviewed { get; set; }
        public double AvgTimeHours { get; set; }
    }
}
