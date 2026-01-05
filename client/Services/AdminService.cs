using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Threading.Tasks;

namespace ZamarPlayer.Services
{
    /// <summary>
    /// Admin user data model
    /// </summary>
    public class AdminUser
    {
        public string Username { get; set; }
        public string Email { get; set; }
        public string Role { get; set; }
        public string Status { get; set; }
        public long JoinDate { get; set; }
        public int AccountAge { get; set; }
    }

    /// <summary>
    /// Role model
    /// </summary>
    public class AdminRole
    {
        public string RoleId { get; set; }
        public string RoleName { get; set; }
        public string Description { get; set; }
        public List<string> Permissions { get; set; }
    }

    /// <summary>
    /// Moderation report
    /// </summary>
    public class ModerationReport
    {
        public string ReportId { get; set; }
        public string ReportedUser { get; set; }
        public string ReporterUser { get; set; }
        public string Reason { get; set; }
        public string Status { get; set; } // pending, in_progress, resolved, dismissed
        public long ReportDate { get; set; }
        public string Description { get; set; }
    }

    /// <summary>
    /// Game info for admin
    /// </summary>
    public class AdminGameInfo
    {
        public string GameId { get; set; }
        public string GameName { get; set; }
        public string Creator { get; set; }
        public int PlayerCount { get; set; }
        public double Rating { get; set; }
        public string Status { get; set; }
        public long CreatedDate { get; set; }
        public bool IsFeatured { get; set; }
        public bool IsBanned { get; set; }
    }

    /// <summary>
    /// Server status
    /// </summary>
    public class ServerStatusInfo
    {
        public string ServerName { get; set; }
        public string Region { get; set; }
        public string Status { get; set; } // online, offline, maintenance
        public int CurrentPlayers { get; set; }
        public int MaxPlayers { get; set; }
        public double CpuUsage { get; set; }
        public double MemoryUsage { get; set; }
    }

    /// <summary>
    /// Activity log item
    /// </summary>
    public class ActivityLogItem
    {
        public string Action { get; set; }
        public string Details { get; set; }
        public long Timestamp { get; set; }
        public string AdminName { get; set; }
    }

    /// <summary>
    /// Admin management service
    /// Handles user management, moderation, game management, etc.
    /// </summary>
    public class AdminService
    {
        private readonly GameClientService _gameClient;
        private readonly string _adminUser;
        private readonly string _apiBaseUrl = "http://localhost:3000/api";

        // Role definitions
        private static readonly Dictionary<string, List<string>> RolePermissions = new()
        {
            ["zamar"] = new()
            {
                "view_all_users",
                "edit_users",
                "ban_users",
                "manage_roles",
                "view_moderation",
                "manage_games",
                "manage_servers",
                "view_analytics",
                "delete_reports",
                "manage_admins"
            },
            ["Ke_devy"] = new()
            {
                "view_users",
                "edit_users",
                "view_moderation",
                "manage_games",
                "view_analytics"
            },
            ["games"] = new()
            {
                "view_games",
                "test_games",
                "view_server_status"
            }
        };

        public AdminService(string adminUser)
        {
            _adminUser = adminUser;
            _gameClient = new GameClientService();
        }

        /// <summary>
        /// Authenticate as admin
        /// </summary>
        public async Task<bool> AuthenticateAdminAsync(string username, string password)
        {
            try
            {
                var payload = new { username, password };
                var response = await _gameClient.PostAsync("/admin/authenticate", payload);
                
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Admin auth error: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Get dashboard statistics
        /// </summary>
        public async Task<Dictionary<string, object>> GetDashboardStatsAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/dashboard/stats");
                
                if (response != null)
                {
                    return new Dictionary<string, object>
                    {
                        ["totalUsers"] = response.ContainsKey("totalUsers") ? (long)response["totalUsers"] : 0L,
                        ["activePlayers"] = response.ContainsKey("activePlayers") ? (long)response["activePlayers"] : 0L,
                        ["totalGames"] = response.ContainsKey("totalGames") ? (long)response["totalGames"] : 0L,
                        ["pendingReports"] = response.ContainsKey("pendingReports") ? (long)response["pendingReports"] : 0L
                    };
                }

                return new Dictionary<string, object>();
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting dashboard stats: {ex.Message}");
                return new Dictionary<string, object>();
            }
        }

        /// <summary>
        /// Get recent activity log
        /// </summary>
        public async Task<ObservableCollection<ActivityLogItem>> GetRecentActivityAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/activity/recent");
                var activities = new ObservableCollection<ActivityLogItem>();

                // Simulate activity
                activities.Add(new ActivityLogItem
                {
                    Action = "User Registration",
                    Details = "New user 'TestPlayer' created",
                    Timestamp = DateTime.Now.Ticks,
                    AdminName = "System"
                });

                activities.Add(new ActivityLogItem
                {
                    Action = "Game Published",
                    Details = "Game 'Test Game' published by developer",
                    Timestamp = DateTime.Now.AddHours(-1).Ticks,
                    AdminName = "System"
                });

                return activities;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting activity: {ex.Message}");
                return new ObservableCollection<ActivityLogItem>();
            }
        }

        /// <summary>
        /// Get all users
        /// </summary>
        public async Task<ObservableCollection<AdminUser>> GetAllUsersAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/users");
                var users = new ObservableCollection<AdminUser>();

                // Simulate users with account roles
                users.Add(new AdminUser
                {
                    Username = "zamar",
                    Email = "zamar@zamarplatform.com",
                    Role = "Site Admin",
                    Status = "Active",
                    JoinDate = DateTime.Now.AddYears(-2).Ticks,
                    AccountAge = 730
                });

                users.Add(new AdminUser
                {
                    Username = "Ke_devy",
                    Email = "intern@zamarplatform.com",
                    Role = "Intern Developer",
                    Status = "Active",
                    JoinDate = DateTime.Now.AddMonths(-6).Ticks,
                    AccountAge = 180
                });

                users.Add(new AdminUser
                {
                    Username = "games",
                    Email = "testing@zamarplatform.com",
                    Role = "Game Testing",
                    Status = "Active",
                    JoinDate = DateTime.Now.AddMonths(-3).Ticks,
                    AccountAge = 90
                });

                return users;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting users: {ex.Message}");
                return new ObservableCollection<AdminUser>();
            }
        }

        /// <summary>
        /// Create new user
        /// </summary>
        public async Task<bool> CreateUserAsync(string username, string email, string password, string role)
        {
            try
            {
                var payload = new
                {
                    username,
                    email,
                    password,
                    role,
                    createdBy = _adminUser
                };

                var response = await _gameClient.PostAsync("/admin/users/create", payload);
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error creating user: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Edit user
        /// </summary>
        public async Task<bool> EditUserAsync(string userId, Dictionary<string, object> updates)
        {
            try
            {
                var payload = new { userId, updates };
                var response = await _gameClient.PostAsync("/admin/users/edit", payload);
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error editing user: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Ban user
        /// </summary>
        public async Task<bool> BanUserAsync(string userId, string reason)
        {
            try
            {
                var payload = new
                {
                    userId,
                    reason,
                    bannedBy = _adminUser,
                    bannedAt = DateTime.Now.Ticks
                };

                var response = await _gameClient.PostAsync("/admin/users/ban", payload);
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error banning user: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Unban user
        /// </summary>
        public async Task<bool> UnbanUserAsync(string userId)
        {
            try
            {
                var response = await _gameClient.PostAsync($"/admin/users/{userId}/unban", new { });
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error unbanning user: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Get all roles
        /// </summary>
        public async Task<ObservableCollection<AdminRole>> GetAllRolesAsync()
        {
            try
            {
                var roles = new ObservableCollection<AdminRole>();

                // System roles
                roles.Add(new AdminRole
                {
                    RoleId = "role_admin",
                    RoleName = "Site Admin",
                    Description = "Full platform control and management",
                    Permissions = RolePermissions["zamar"]
                });

                roles.Add(new AdminRole
                {
                    RoleId = "role_dev",
                    RoleName = "Intern Developer",
                    Description = "Internal development and testing",
                    Permissions = RolePermissions["Ke_devy"]
                });

                roles.Add(new AdminRole
                {
                    RoleId = "role_test",
                    RoleName = "Game Testing",
                    Description = "Testing games, parties, and features",
                    Permissions = RolePermissions["games"]
                });

                return roles;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting roles: {ex.Message}");
                return new ObservableCollection<AdminRole>();
            }
        }

        /// <summary>
        /// Get moderation reports
        /// </summary>
        public async Task<ObservableCollection<ModerationReport>> GetModerationReportsAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/moderation/reports");
                var reports = new ObservableCollection<ModerationReport>();

                // Simulate reports
                reports.Add(new ModerationReport
                {
                    ReportId = "report_001",
                    ReportedUser = "TestUser",
                    ReporterUser = "Reporter1",
                    Reason = "Offensive language",
                    Status = "pending",
                    ReportDate = DateTime.Now.AddHours(-2).Ticks,
                    Description = "User used inappropriate language in chat"
                });

                return reports;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting reports: {ex.Message}");
                return new ObservableCollection<ModerationReport>();
            }
        }

        /// <summary>
        /// Get all games
        /// </summary>
        public async Task<ObservableCollection<AdminGameInfo>> GetAllGamesAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/games");
                var games = new ObservableCollection<AdminGameInfo>();

                // Simulate games
                games.Add(new AdminGameInfo
                {
                    GameId = "game_001",
                    GameName = "Test Game",
                    Creator = "Developer1",
                    PlayerCount = 150,
                    Rating = 4.5,
                    Status = "Published",
                    CreatedDate = DateTime.Now.AddDays(-30).Ticks,
                    IsFeatured = true,
                    IsBanned = false
                });

                return games;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting games: {ex.Message}");
                return new ObservableCollection<AdminGameInfo>();
            }
        }

        /// <summary>
        /// Ban game
        /// </summary>
        public async Task<bool> BanGameAsync(string gameId, string reason)
        {
            try
            {
                var payload = new
                {
                    gameId,
                    reason,
                    bannedBy = _adminUser,
                    bannedAt = DateTime.Now.Ticks
                };

                var response = await _gameClient.PostAsync("/admin/games/ban", payload);
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error banning game: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Feature game on homepage
        /// </summary>
        public async Task<bool> FeatureGameAsync(string gameId)
        {
            try
            {
                var response = await _gameClient.PostAsync($"/admin/games/{gameId}/feature", new { });
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error featuring game: {ex.Message}");
                return false;
            }
        }

        /// <summary>
        /// Get server status
        /// </summary>
        public async Task<ObservableCollection<ServerStatusInfo>> GetServerStatusAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/servers/status");
                var servers = new ObservableCollection<ServerStatusInfo>();

                // Simulate servers
                servers.Add(new ServerStatusInfo
                {
                    ServerName = "US-East-1",
                    Region = "United States - East",
                    Status = "online",
                    CurrentPlayers = 3250,
                    MaxPlayers = 5000,
                    CpuUsage = 45.2,
                    MemoryUsage = 62.8
                });

                servers.Add(new ServerStatusInfo
                {
                    ServerName = "EU-Central-1",
                    Region = "Germany - Central",
                    Status = "online",
                    CurrentPlayers = 2850,
                    MaxPlayers = 5000,
                    CpuUsage = 38.5,
                    MemoryUsage = 55.3
                });

                return servers;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting server status: {ex.Message}");
                return new ObservableCollection<ServerStatusInfo>();
            }
        }

        /// <summary>
        /// Get analytics
        /// </summary>
        public async Task<Dictionary<string, object>> GetAnalyticsAsync()
        {
            try
            {
                var response = await _gameClient.GetAsync("/admin/analytics");
                
                return new Dictionary<string, object>
                {
                    ["dailyActive"] = 15420,
                    ["gamesPlayed"] = 2847,
                    ["avgSessionTime"] = "45 min",
                    ["totalRevenue"] = "$12,450"
                };
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting analytics: {ex.Message}");
                return new Dictionary<string, object>();
            }
        }

        /// <summary>
        /// Get user by username
        /// </summary>
        public async Task<AdminUser> GetUserByUsernameAsync(string username)
        {
            try
            {
                var response = await _gameClient.GetAsync($"/admin/users/{username}");
                
                if (response != null)
                {
                    return new AdminUser
                    {
                        Username = response["username"]?.ToString() ?? "",
                        Email = response["email"]?.ToString() ?? "",
                        Role = response["role"]?.ToString() ?? "",
                        Status = response["status"]?.ToString() ?? "Active"
                    };
                }

                return null;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error getting user: {ex.Message}");
                return null;
            }
        }

        /// <summary>
        /// Check if user has permission
        /// </summary>
        public bool HasPermission(string username, string permission)
        {
            if (!RolePermissions.ContainsKey(username))
                return false;

            return RolePermissions[username].Contains(permission);
        }

        /// <summary>
        /// Log admin action
        /// </summary>
        public async Task<bool> LogActionAsync(string action, string details)
        {
            try
            {
                var payload = new
                {
                    action,
                    details,
                    adminUser = _adminUser,
                    timestamp = DateTime.Now.Ticks
                };

                var response = await _gameClient.PostAsync("/admin/logs/action", payload);
                return response?.ContainsKey("success") == true;
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"Error logging action: {ex.Message}");
                return false;
            }
        }
    }
}
