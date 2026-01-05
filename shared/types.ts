// Shared type definitions for the Zamar platform

export interface User {
  userId: string;
  username: string;
  email: string;
  avatarUrl?: string;
  joinDate: Date;
  onlineStatus: number; // 0: offline, 1: online, 2: in-game
  badges?: string[];
}

export interface Game {
  gameId: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  thumbnailUrl?: string;
  playerCount: number;
  likeRatio: number;
  createdAt: Date;
  updatedAt: Date;
  isFavorited?: boolean;
}

export interface GameServer {
  serverId: string;
  gameId: string;
  maxPlayers: number;
  currentPlayers: number;
  serverAddress: string;
  serverPort: number;
  createdAt: Date;
  isActive: boolean;
}

export interface Avatar {
  avatarId: string;
  userId: string;
  rigType: 'R6' | 'R15';
  equippedItems: Record<string, string>;
  skinTone: string;
  scale: number;
}

export interface CatalogItem {
  itemId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  creatorId?: string;
  creatorName?: string;
  thumbnailUrl?: string;
  isLimited: boolean;
  limitedSupply?: number;
  remainingSupply?: number;
}

export interface InventoryItem {
  itemId: string;
  userId: string;
  itemName: string;
  acquiredDate: Date;
  isEquipped: boolean;
}

export interface ChatMessage {
  messageId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  timestamp: Date;
  chatType: 'global' | 'game' | 'party' | 'dm';
  isFiltered?: boolean;
}

export interface Friend {
  friendId: string;
  friendName: string;
  avatarUrl?: string;
  onlineStatus: number;
  currentGame?: string;
}

export interface Group {
  groupId: string;
  groupName: string;
  description: string;
  ownerId: string;
  iconUrl?: string;
  memberCount: number;
  groupFunds: number;
}

export interface ModerationCase {
  caseId: string;
  userId: string;
  reason: string;
  action: 'PENDING' | 'WARNING' | 'MUTE' | 'BAN' | 'TERMINATE';
  duration?: number;
  createdAt: Date;
  expiresAt?: Date;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const CHAT_TYPES = {
  GLOBAL: 'global',
  GAME: 'game',
  PARTY: 'party',
  DM: 'dm'
} as const;

export const MODERATION_ACTIONS = {
  PENDING: 'PENDING',
  WARNING: 'WARNING',
  MUTE: 'MUTE',
  BAN: 'BAN',
  TERMINATE: 'TERMINATE'
} as const;

export const GAME_CATEGORIES = [
  'Adventure',
  'Simulation',
  'Action',
  'RPG',
  'Racing',
  'Puzzle',
  'Social',
  'Horror',
  'Comedy',
  'Sports'
] as const;
