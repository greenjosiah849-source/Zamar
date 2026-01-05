-- Extended schema additions for Zamar Platform v2.0
-- These tables extend the existing schema with new features

-- Game Versions Table (for version control)
CREATE TABLE IF NOT EXISTS game_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  files JSONB,
  is_active BOOLEAN DEFAULT FALSE,
  UNIQUE(game_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_game_versions_game_id ON game_versions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_versions_created_at ON game_versions(created_at);

-- Game Analytics Table
CREATE TABLE IF NOT EXISTS game_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  session_duration INT,
  exit_type VARCHAR(50),
  device_type VARCHAR(50),
  platform VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_game_analytics_game_id ON game_analytics(game_id);
CREATE INDEX IF NOT EXISTS idx_game_analytics_visited_at ON game_analytics(visited_at);

-- Appeal Cases Table (for moderation appeals)
CREATE TABLE IF NOT EXISTS appeal_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  moderation_case_id UUID REFERENCES moderation_cases(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  appeal_message TEXT,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution TEXT
);

CREATE INDEX IF NOT EXISTS idx_appeal_cases_user_id ON appeal_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_appeal_cases_status ON appeal_cases(status);

-- Moderation Action Logs Table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type VARCHAR(100) NOT NULL,
  moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  reason TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_logs_moderator_id ON moderation_logs(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_logs_created_at ON moderation_logs(created_at);

-- User Activity Log
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);

-- Game Passes Table
CREATE TABLE IF NOT EXISTS game_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INT NOT NULL,
  icon_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_game_passes_game_id ON game_passes(game_id);

-- User Game Passes (ownership)
CREATE TABLE IF NOT EXISTS user_game_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_pass_id UUID NOT NULL REFERENCES game_passes(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE(user_id, game_pass_id)
);

CREATE INDEX IF NOT EXISTS idx_user_game_passes_user_id ON user_game_passes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_game_passes_game_pass_id ON user_game_passes(game_pass_id);

-- Badge System Table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  icon_url VARCHAR(255),
  rarity VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Badges
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_url VARCHAR(255),
  reward_robux INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- Leaderboards Table
CREATE TABLE IF NOT EXISTS leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  score_type VARCHAR(50),
  reset_period VARCHAR(50) DEFAULT 'NEVER'
);

-- Leaderboard Entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INT NOT NULL,
  rank INT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_leaderboard_id ON leaderboard_entries(leaderboard_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_score ON leaderboard_entries(score DESC);

-- Trading System
CREATE TABLE IF NOT EXISTS trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  requester_items JSONB,
  receiver_items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trades_requester_id ON trades(requester_id);
CREATE INDEX IF NOT EXISTS idx_trades_receiver_id ON trades(receiver_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);

-- Message Reporting (for chat moderation)
CREATE TABLE IF NOT EXISTS message_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'PENDING',
  action_taken VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_message_reports_reporter_id ON message_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_message_reports_status ON message_reports(status);

-- System Settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES users(id)
);

-- Robux Transactions Extended
CREATE TABLE IF NOT EXISTS robux_transactions_extended (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  transaction_type VARCHAR(100) NOT NULL,
  reason TEXT,
  reference_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_robux_transactions_user_id ON robux_transactions_extended(user_id);
CREATE INDEX IF NOT EXISTS idx_robux_transactions_created_at ON robux_transactions_extended(created_at);
-- ============================================
-- ZAMAR AI MODERATION SYSTEM TABLES
-- ============================================

-- AI Model Training Data
CREATE TABLE IF NOT EXISTS ai_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'audio', 'text', 'username'
  content_hash VARCHAR(255) UNIQUE,
  content_url TEXT,
  category VARCHAR(100), -- 'explicit', 'violence', 'hate_speech', 'spam', 'drugs', 'harassment', 'clean'
  confidence DECIMAL(5, 4), -- 0.0 - 1.0
  features JSONB, -- extracted features for ML
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  flagged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ai_training_data_content_type ON ai_training_data(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_category ON ai_training_data(category);
CREATE INDEX IF NOT EXISTS idx_ai_training_data_content_hash ON ai_training_data(content_hash);

-- AI Model Predictions/Results Cache
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL,
  content_hash VARCHAR(255) UNIQUE NOT NULL,
  content_url TEXT,
  predictions JSONB NOT NULL, -- {category: confidence, ...}
  flagged BOOLEAN DEFAULT FALSE,
  top_category VARCHAR(100),
  confidence_score DECIMAL(5, 4),
  scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  model_version VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_ai_predictions_content_type ON ai_predictions(content_type);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_flagged ON ai_predictions(flagged);
CREATE INDEX IF NOT EXISTS idx_ai_predictions_content_hash ON ai_predictions(content_hash);

-- Moderation Cases Enhanced
CREATE TABLE IF NOT EXISTS moderation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  content_type VARCHAR(50), -- 'username', 'profile_pic', 'game_description', 'game_asset', 'chat', 'image', 'video', 'audio'
  content_hash VARCHAR(255),
  reason VARCHAR(255) NOT NULL,
  severity VARCHAR(50) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  ai_flagged BOOLEAN DEFAULT FALSE,
  ai_category VARCHAR(100),
  ai_confidence DECIMAL(5, 4),
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'REVIEWED', 'APPROVED', 'DISMISSED'
  action VARCHAR(50), -- 'WARNING', 'MUTE', 'SUSPEND', 'BAN', 'CONTENT_REMOVAL', 'NONE'
  duration_days INT, -- null for permanent
  details JSONB,
  evidence_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_cases_user_id ON moderation_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_game_id ON moderation_cases(game_id);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_status ON moderation_cases(status);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_ai_flagged ON moderation_cases(ai_flagged);
CREATE INDEX IF NOT EXISTS idx_moderation_cases_created_at ON moderation_cases(created_at);

-- User Violations & Punishment History
CREATE TABLE IF NOT EXISTS user_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES moderation_cases(id) ON DELETE CASCADE,
  violation_type VARCHAR(100) NOT NULL, -- 'username_violation', 'content_violation', 'chat_violation', 'asset_violation'
  severity VARCHAR(50), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  points INT DEFAULT 0, -- Violation points system
  action_taken VARCHAR(50), -- 'WARNING', 'MUTE', 'SUSPEND', 'BAN'
  action_duration_days INT,
  action_until TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_violations_active ON user_violations(active);
CREATE INDEX IF NOT EXISTS idx_user_violations_violation_type ON user_violations(violation_type);

-- Banned Users & Suspension List
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  case_id UUID REFERENCES moderation_cases(id),
  ban_type VARCHAR(50) NOT NULL, -- 'TEMPORARY', 'PERMANENT', 'MUTED', 'SUSPENDED'
  reason TEXT NOT NULL,
  ban_until TIMESTAMP, -- null for permanent
  active BOOLEAN DEFAULT TRUE,
  appeal_allowed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  appealed_at TIMESTAMP,
  appeal_status VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_user_bans_user_id ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(active);
CREATE INDEX IF NOT EXISTS idx_user_bans_ban_until ON user_bans(ban_until);

-- Moderation Appeals
CREATE TABLE IF NOT EXISTS moderation_appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ban_id UUID NOT NULL REFERENCES user_bans(id) ON DELETE CASCADE,
  case_id UUID REFERENCES moderation_cases(id),
  appeal_message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
  response TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_moderation_appeals_user_id ON moderation_appeals(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_appeals_status ON moderation_appeals(status);

-- Content Flagged for Review
CREATE TABLE IF NOT EXISTS flagged_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'audio', 'username', 'description'
  content_url TEXT,
  content_hash VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  reason VARCHAR(255),
  ai_category VARCHAR(100),
  ai_confidence DECIMAL(5, 4),
  manual_review BOOLEAN DEFAULT FALSE,
  reviewer_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'RESOLVED'
  action_taken VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flagged_content_content_type ON flagged_content(content_type);
CREATE INDEX IF NOT EXISTS idx_flagged_content_user_id ON flagged_content(user_id);
CREATE INDEX IF NOT EXISTS idx_flagged_content_status ON flagged_content(status);

-- Moderation Admin Settings & Thresholds
CREATE TABLE IF NOT EXISTS moderation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_name VARCHAR(255) UNIQUE NOT NULL,
  threshold_value DECIMAL(5, 4), -- confidence threshold
  enabled BOOLEAN DEFAULT TRUE,
  category VARCHAR(100), -- which violation type
  auto_action VARCHAR(50), -- AUTO_FLAG, AUTO_WARN, AUTO_SUSPEND, MANUAL_REVIEW
  details JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Moderation Actions Log
CREATE TABLE IF NOT EXISTS moderation_actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES users(id),
  action_type VARCHAR(100) NOT NULL,
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  target_game_id UUID REFERENCES games(id) ON DELETE SET NULL,
  target_content_id VARCHAR(255),
  reason TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_actions_log_moderator_id ON moderation_actions_log(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_log_created_at ON moderation_actions_log(created_at);

-- Batch Jobs Table
CREATE TABLE IF NOT EXISTS batch_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  item_count INT,
  status VARCHAR(50) DEFAULT 'PENDING',
  parameters JSONB,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  result JSONB
);

CREATE INDEX IF NOT EXISTS idx_batch_jobs_status ON batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_batch_jobs_created_at ON batch_jobs(created_at);

-- Custom Rules Table
CREATE TABLE IF NOT EXISTS custom_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger VARCHAR(50) NOT NULL,
  trigger_value JSONB,
  action VARCHAR(50) NOT NULL,
  severity INT,
  enabled BOOLEAN DEFAULT TRUE,
  scope VARCHAR(50),
  priority INT DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_rules_enabled ON custom_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_custom_rules_scope ON custom_rules(scope);

-- Mobile Reports Table
CREATE TABLE IF NOT EXISTS mobile_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  content_type VARCHAR(50),
  content_id VARCHAR(255),
  reason VARCHAR(100),
  description TEXT,
  evidence TEXT,
  metadata JSONB,
  client_version VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mobile_reports_user_id ON mobile_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_reports_created_at ON mobile_reports(created_at);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  channels VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(50),
  status VARCHAR(50),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_id ON notification_logs(notification_id);

-- User Devices Table
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL UNIQUE,
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  push_token TEXT,
  push_enabled BOOLEAN DEFAULT TRUE,
  last_seen TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);

-- ML Training Data Table
CREATE TABLE IF NOT EXISTS ml_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES moderation_cases(id),
  content_hash VARCHAR(64),
  ai_prediction JSONB,
  moderator_decision JSONB,
  agreement BOOLEAN,
  confidence DECIMAL(3, 2),
  category VARCHAR(100),
  used_for_training BOOLEAN DEFAULT FALSE,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_training_data_used ON ml_training_data(used_for_training);
CREATE INDEX IF NOT EXISTS idx_ml_training_data_recorded_at ON ml_training_data(recorded_at);

-- ML Model Versions Table
CREATE TABLE IF NOT EXISTS ml_model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version VARCHAR(50) NOT NULL UNIQUE,
  improvements JSONB,
  accuracy DECIMAL(3, 2),
  training_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE INDEX IF NOT EXISTS idx_ml_model_versions_status ON ml_model_versions(status);
CREATE INDEX IF NOT EXISTS idx_ml_model_versions_created_at ON ml_model_versions(created_at);

-- ML Error Log Table
CREATE TABLE IF NOT EXISTS ml_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type VARCHAR(100),
  category VARCHAR(100),
  confidence DECIMAL(3, 2),
  prediction JSONB,
  decision JSONB,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_error_log_error_type ON ml_error_log(error_type);
CREATE INDEX IF NOT EXISTS idx_ml_error_log_logged_at ON ml_error_log(logged_at);

-- Moderation Guidelines Table
CREATE TABLE IF NOT EXISTS moderation_guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language VARCHAR(10) DEFAULT 'en',
  category VARCHAR(100),
  description TEXT,
  examples TEXT[],
  severity INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_moderation_guidelines_language ON moderation_guidelines(language);