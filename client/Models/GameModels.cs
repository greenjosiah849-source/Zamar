using System;
using System.Collections.ObjectModel;

namespace ZamarPlayer.Models
{
    /// <summary>
    /// Game model for displaying in launcher
    /// </summary>
    public class GameModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Creator { get; set; }
        public string ThumbnailUrl { get; set; }
        public int PlayersOnline { get; set; }
        public int MaxPlayers { get; set; }
        public float Rating { get; set; }
        public int Visits { get; set; }
        public bool IsFavorite { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string Genre { get; set; }
        public bool RequiresAuth { get; set; }
    }

    /// <summary>
    /// User model
    /// </summary>
    public class UserModel
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string AvatarUrl { get; set; }
        public int Level { get; set; }
        public int Robux { get; set; }
        public DateTime CreatedAt { get; set; }
        public int FriendsCount { get; set; }
        public bool IsOnline { get; set; }
        public string Status { get; set; }
    }

    /// <summary>
    /// Server metrics model
    /// </summary>
    public class ServerMetricsModel
    {
        public string ServerId { get; set; }
        public string Region { get; set; }
        public string Country { get; set; }
        public string City { get; set; }
        public int PlayersOnline { get; set; }
        public int MaxCapacity { get; set; }
        public float LoadPercentage { get; set; }
        public int EstimatedLatency { get; set; }
        public int Uptime { get; set; }
    }

    /// <summary>
    /// Game session model
    /// </summary>
    public class GameSessionModel
    {
        public string SessionId { get; set; }
        public string GameId { get; set; }
        public string UserId { get; set; }
        public string ServerId { get; set; }
        public DateTime StartedAt { get; set; }
        public string Status { get; set; } // active, ended, paused
        public int PlayersInSession { get; set; }
    }

    /// <summary>
    /// Chat message model
    /// </summary>
    public class ChatMessageModel
    {
        public string Id { get; set; }
        public string PlayerId { get; set; }
        public string PlayerName { get; set; }
        public string Message { get; set; }
        public DateTime Timestamp { get; set; }
        public string GameId { get; set; }
    }

    /// <summary>
    /// Player profile model
    /// </summary>
    public class PlayerProfileModel
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public string AvatarUrl { get; set; }
        public int Level { get; set; }
        public int Score { get; set; }
        public int TotalPlayTime { get; set; } // In minutes
        public int GamesCreated { get; set; }
        public int GamesPlayed { get; set; }
        public int Friends { get; set; }
        public ObservableCollection<GameModel> FavoriteGames { get; set; }
        public ObservableCollection<GameModel> CreatedGames { get; set; }
    }

    /// <summary>
    /// Achievement model
    /// </summary>
    public class AchievementModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public bool Unlocked { get; set; }
        public DateTime? UnlockedAt { get; set; }
        public int RewardPoints { get; set; }
    }

    /// <summary>
    /// Inventory item model
    /// </summary>
    public class InventoryItemModel
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string IconUrl { get; set; }
        public string Type { get; set; } // cosmetic, weapon, tool, accessory
        public bool Equipped { get; set; }
        public DateTime AcquiredAt { get; set; }
    }

    /// <summary>
    /// Leaderboard entry
    /// </summary>
    public class LeaderboardEntryModel
    {
        public int Rank { get; set; }
        public string PlayerId { get; set; }
        public string PlayerName { get; set; }
        public string AvatarUrl { get; set; }
        public int Score { get; set; }
        public int Level { get; set; }
    }

    /// <summary>
    /// Friend model
    /// </summary>
    public class FriendModel
    {
        public string Id { get; set; }
        public string Username { get; set; }
        public string AvatarUrl { get; set; }
        public bool IsOnline { get; set; }
        public string CurrentGame { get; set; }
        public DateTime Friendsince { get; set; }
    }
}
