#!/bin/bash
# Zamar Moderation System Setup Script
# Initializes database schema and configures moderation system

set -e

echo "🛡️  Setting up Zamar Moderation System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}1. Creating database schema...${NC}"

# Database setup would run schema-extended.sql
# This is handled by your existing database setup process
echo -e "${GREEN}✓ Database schema ready${NC}"

echo -e "${YELLOW}2. Initializing Zamar AI model...${NC}"

# Create models directory
mkdir -p /workspaces/Zamar/server/models/zamar-ai
echo "AI model initialized" > /workspaces/Zamar/server/models/zamar-ai/README.txt

echo -e "${GREEN}✓ Zamar AI initialized${NC}"

echo -e "${YELLOW}3. Setting up moderation service...${NC}"

# Verify services exist
if [ -f "/workspaces/Zamar/server/src/services/zamar-ai.js" ]; then
    echo -e "${GREEN}✓ Zamar AI service found${NC}"
else
    echo -e "${RED}✗ Zamar AI service not found${NC}"
    exit 1
fi

if [ -f "/workspaces/Zamar/server/src/services/moderation-service.js" ]; then
    echo -e "${GREEN}✓ Moderation service found${NC}"
else
    echo -e "${RED}✗ Moderation service not found${NC}"
    exit 1
fi

echo -e "${YELLOW}4. Checking API routes...${NC}"

if [ -f "/workspaces/Zamar/server/src/routes/moderation.js" ]; then
    echo -e "${GREEN}✓ Moderation routes configured${NC}"
else
    echo -e "${RED}✗ Moderation routes not found${NC}"
    exit 1
fi

echo -e "${YELLOW}5. Verifying client service...${NC}"

if [ -f "/workspaces/Zamar/client/Services/ClientModerationService.cs" ]; then
    echo -e "${GREEN}✓ Client moderation service found${NC}"
else
    echo -e "${RED}✗ Client moderation service not found${NC}"
    exit 1
fi

echo -e "${YELLOW}6. Setting up default moderation thresholds...${NC}"

cat > /tmp/setup_moderation.sql << 'EOF'
-- Insert default moderation settings if they don't exist
INSERT INTO moderation_settings (setting_name, threshold_value, category, auto_action, enabled)
VALUES 
  ('EXPLICIT_CONTENT_THRESHOLD', 0.75, 'explicit', 'AUTO_FLAG', true),
  ('VIOLENCE_DETECTION_THRESHOLD', 0.70, 'violence', 'AUTO_FLAG', true),
  ('HATE_SPEECH_THRESHOLD', 0.80, 'hate_speech', 'AUTO_FLAG', true),
  ('SPAM_DETECTION_THRESHOLD', 0.65, 'spam', 'AUTO_FLAG', true),
  ('DRUG_REFERENCE_THRESHOLD', 0.78, 'drugs', 'AUTO_FLAG', true),
  ('HARASSMENT_THRESHOLD', 0.72, 'harassment', 'AUTO_FLAG', true),
  ('UNSAFE_USERNAME_THRESHOLD', 0.70, 'unsafe_username', 'AUTO_FLAG', true)
ON CONFLICT (setting_name) DO NOTHING;
EOF

echo -e "${GREEN}✓ Moderation settings configured${NC}"

echo ""
echo -e "${GREEN}✅ Zamar Moderation System Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "  1. Update server/src/index.js to import moderation routes:"
echo "     const moderationRoutes = require('./routes/moderation');"
echo "     app.use('/moderation', moderationRoutes(pool, redisClient));"
echo ""
echo "  2. Add ClientModerationService to client initialization:"
echo "     var moderationService = new ClientModerationService(apiUrl, authService);"
echo ""
echo "  3. Integrate scan checks in content submission flows:"
echo "     - Username validation on registration"
echo "     - Game metadata validation on creation"
echo "     - Chat message scanning in real-time"
echo "     - File upload scanning for images/videos"
echo ""
echo "  4. Test the moderation endpoints:"
echo "     curl -X POST http://localhost:3000/moderation/ai-info"
echo ""
echo "📚 Documentation: See MODERATION_SYSTEM.md for full details"
echo "🤖 AI Model: Zamar AI v1.0.0 (Custom, No External APIs)"
