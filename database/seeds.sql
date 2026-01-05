-- Zamar Database Seed Data
-- Run after schema.sql to populate sample data

-- Insert sample games
INSERT INTO games (id, title, description, creator_id, creator_name, player_count, like_ratio, created_at, updated_at) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Zombie Apocalypse', 'Survive the zombie horde!', '00000000-0000-0000-0000-000000000001', 'Zamar', 1250, 0.87, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440002', 'Treasure Hunt', 'Find the hidden treasure before others!', '00000000-0000-0000-0000-000000000001', 'Zamar', 890, 0.92, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440003', 'Sky Wars', 'Battle your way to victory on floating islands!', '00000000-0000-0000-0000-000000000001', 'Zamar', 2340, 0.91, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440004', 'Speed Racer', 'Race against other players!', '00000000-0000-0000-0000-000000000002', 'games', 1500, 0.88, NOW(), NOW()),
  ('550e8400-e29b-41d4-a716-446655440005', 'Sword Fighting Arena', 'Test your sword skills!', '00000000-0000-0000-0000-000000000001', 'Zamar', 3200, 0.89, NOW(), NOW());

-- Insert sample catalog items
INSERT INTO catalog_items (id, name, description, category, price, creator_id, creator_name, is_limited, limited_supply, created_at, updated_at) VALUES
  ('650e8400-e29b-41d4-a716-446655440001', 'Royal Crown', 'A majestic golden crown fit for a king', 'Hats', 500, '00000000-0000-0000-0000-000000000001', 'Zamar', false, null, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440002', 'Fire Hair', 'Flaming hot hair that never gets old', 'Hair', 350, '00000000-0000-0000-0000-000000000001', 'Zamar', false, null, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440003', 'Cool Shades', 'Look cool with these sunglasses', 'Faces', 200, '00000000-0000-0000-0000-000000000001', 'Zamar', false, null, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440004', 'Neon Shirt', 'A bright neon colored shirt', 'Shirts', 150, '00000000-0000-0000-0000-000000000001', 'Zamar', false, null, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440005', 'Black Jeans', 'Classic black jeans', 'Pants', 100, '00000000-0000-0000-0000-000000000001', 'Zamar', false, null, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440006', 'Diamond Ring', 'Limited edition diamond ring', 'Accessories', 5000, '00000000-0000-0000-0000-000000000001', 'Zamar', true, 100, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440007', 'Gold Chain', 'Exclusive gold chain necklace', 'Accessories', 3000, '00000000-0000-0000-0000-000000000002', 'games', true, 50, NOW(), NOW()),
  ('650e8400-e29b-41d4-a716-446655440008', 'Avatar Bundle', 'Complete outfit bundle', 'Bundles', 1000, '00000000-0000-0000-0000-000000000001', 'Zamar', false, null, NOW(), NOW());

-- Insert sample game servers
INSERT INTO game_servers (id, game_id, max_players, current_players, server_address, server_port, created_at, is_active) VALUES
  ('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 50, 45, '192.168.1.100', 8001, NOW(), true),
  ('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 50, 38, '192.168.1.101', 8002, NOW(), true),
  ('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 100, 67, '192.168.1.102', 8003, NOW(), true),
  ('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 200, 156, '192.168.1.103', 8004, NOW(), true);

-- Create avatars for admin accounts
INSERT INTO avatars (id, user_id, rig_type, skin_tone, scale, created_at, updated_at) VALUES
  ('850e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000001', 'R15', 'Medium', 1.0, NOW(), NOW()),
  ('850e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000002', 'R15', 'Medium', 1.0, NOW(), NOW());

-- Sample transaction data
INSERT INTO transactions (id, user_id, amount, transaction_type, description, created_at) VALUES
  ('950e8400-e29b-41d4-a716-446655440001', '00000000-0000-0000-0000-000000000001', 1000, 'PURCHASE', 'Bought Royal Crown', NOW()),
  ('950e8400-e29b-41d4-a716-446655440002', '00000000-0000-0000-0000-000000000001', 500, 'EARN', 'Earned from game wins', NOW());
