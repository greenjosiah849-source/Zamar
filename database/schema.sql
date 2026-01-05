-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason VARCHAR(255),
  ban_until TIMESTAMP
);

-- Avatars Table
CREATE TABLE IF NOT EXISTS avatars (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rig_type VARCHAR(10) DEFAULT 'R15',
  skin_tone VARCHAR(50) DEFAULT 'Medium',
  scale DECIMAL(3, 2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games Table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  creator_name VARCHAR(32) NOT NULL,
  thumbnail_url VARCHAR(255),
  player_count INT DEFAULT 0,
  like_ratio DECIMAL(3, 2) DEFAULT 0.5,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_published BOOLEAN DEFAULT TRUE,
  visit_count INT DEFAULT 0
);

-- Game Servers Table
CREATE TABLE IF NOT EXISTS game_servers (
  id UUID PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  max_players INT DEFAULT 100,
  current_players INT DEFAULT 0,
  server_address VARCHAR(255) NOT NULL,
  server_port INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- Catalog Items Table
CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  price INT NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  creator_name VARCHAR(32),
  thumbnail_url VARCHAR(255),
  is_limited BOOLEAN DEFAULT FALSE,
  limited_supply INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Table
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,
  acquired_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_equipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, item_id)
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_username VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  chat_type VARCHAR(50),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_filtered BOOLEAN DEFAULT FALSE
);

-- Friends Table
CREATE TABLE IF NOT EXISTS friends (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, friend_id)
);

-- Groups Table
CREATE TABLE IF NOT EXISTS groups (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  icon_url VARCHAR(255),
  member_count INT DEFAULT 1,
  group_funds BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Group Members Table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(group_id, user_id)
);

-- Moderation Cases Table
CREATE TABLE IF NOT EXISTS moderation_cases (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moderator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason VARCHAR(255) NOT NULL,
  action VARCHAR(50),
  duration_days INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  transaction_type VARCHAR(50),
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_games_creator_id ON games(creator_id);
CREATE INDEX idx_inventory_user_id ON inventory(user_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_friends_user_id ON friends(user_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);

-- Insert Admin Users
INSERT INTO users (id, username, email, password_hash, created_at) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Zamar', 'admin@zamar.com', '$2a$10$zamar_admin_hash', NOW()),
  ('00000000-0000-0000-0000-000000000002', 'games', 'games@zamar.com', '$2a$10$games_admin_hash', NOW());
