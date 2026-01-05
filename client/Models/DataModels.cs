using System;
using System.Collections.Generic;

namespace ZamarPlayer.Models
{
    public class User
    {
        public string UserId { get; set; }
        public string Username { get; set; }
        public string Email { get; set; }
        public string AvatarUrl { get; set; }
        public DateTime JoinDate { get; set; }
        public int OnlineStatus { get; set; } // 0: offline, 1: online, 2: in-game
        public List<string> Badges { get; set; } = new();
    }

    public class GameServer
    {
        public string ServerId { get; set; }
        public string GameId { get; set; }
        public string GameName { get; set; }
        public int MaxPlayers { get; set; }
        public int CurrentPlayers { get; set; }
        public string ServerAddress { get; set; }
        public int ServerPort { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Game
    {
        public string GameId { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string CreatorId { get; set; }
        public string CreatorName { get; set; }
        public string ThumbnailUrl { get; set; }
        public int PlayerCount { get; set; }
        public double LikeRatio { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsFavorited { get; set; }
    }

    public class Avatar
    {
        public string AvatarId { get; set; }
        public string UserId { get; set; }
        public string RigType { get; set; } // R6 or R15
        public Dictionary<string, string> EquippedItems { get; set; } = new();
        public string SkinTone { get; set; }
        public double Scale { get; set; }
    }

    public class CatalogItem
    {
        public string ItemId { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public int Price { get; set; }
        public string CreatorId { get; set; }
        public string ThumbnailUrl { get; set; }
        public bool IsLimited { get; set; }
        public int? LimitedSupply { get; set; }
        public int? RemainingSupply { get; set; }
    }

    public class InventoryItem
    {
        public string ItemId { get; set; }
        public string UserId { get; set; }
        public string ItemName { get; set; }
        public DateTime AcquiredDate { get; set; }
        public bool IsEquipped { get; set; }
    }

    public class ChatMessage
    {
        public string MessageId { get; set; }
        public string SenderId { get; set; }
        public string SenderUsername { get; set; }
        public string Content { get; set; }
        public DateTime Timestamp { get; set; }
        public string ChatType { get; set; } // global, game, party, dm
    }

    public class Friend
    {
        public string FriendId { get; set; }
        public string FriendName { get; set; }
        public string AvatarUrl { get; set; }
        public int OnlineStatus { get; set; }
        public string CurrentGame { get; set; }
    }

    public class Group
    {
        public string GroupId { get; set; }
        public string GroupName { get; set; }
        public string Description { get; set; }
        public string OwnerId { get; set; }
        public string IconUrl { get; set; }
        public int MemberCount { get; set; }
        public long GroupFunds { get; set; }
    }
}
