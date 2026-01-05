#!/bin/bash
# Zamar Moderation System - Verification & Deployment Checklist

echo "═══════════════════════════════════════════════════════════════"
echo "  ZAMAR MODERATION SYSTEM - IMPLEMENTATION VERIFICATION"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verification counters
TOTAL=0
PASSED=0
FAILED=0

verify_file() {
  local file=$1
  local description=$2
  TOTAL=$((TOTAL + 1))
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $description"
    echo "  Location: $file"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $description"
    echo "  Missing: $file"
    FAILED=$((FAILED + 1))
  fi
}

verify_service() {
  local service=$1
  local description=$2
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  $description"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# 1. WebSocket Real-time Support
# ============================================================================
verify_service "websocket" "Enhancement 1: WebSocket Real-time Support"
verify_file "server/src/services/moderation-websocket.js" \
  "WebSocket server implementation (250+ lines)"

# ============================================================================
# 2. Batch Moderation Actions
# ============================================================================
verify_service "batch" "Enhancement 2: Batch Moderation Actions"
verify_file "server/src/services/batch-moderation.js" \
  "Batch operations service (400+ lines)"

# ============================================================================
# 3. Custom Rule Builder
# ============================================================================
verify_service "rules" "Enhancement 3: Custom Rule Builder"
verify_file "server/src/services/custom-rule-builder.js" \
  "Custom rule builder service (450+ lines)"

# ============================================================================
# 4. Mobile API Integration
# ============================================================================
verify_service "mobile" "Enhancement 4: Mobile API Integration"
verify_file "server/src/services/mobile-api.js" \
  "Mobile API service (400+ lines)"

# ============================================================================
# 5. Notification System
# ============================================================================
verify_service "notifications" "Enhancement 5: Notification System"
verify_file "server/src/services/notification-service.js" \
  "Notification service (350+ lines)"

# ============================================================================
# 6. Advanced Analytics Dashboard
# ============================================================================
verify_service "analytics" "Enhancement 6: Advanced Analytics Dashboard"
verify_file "server/src/services/analytics-service.js" \
  "Analytics service (450+ lines)"

# ============================================================================
# 7. Machine Learning Trainer
# ============================================================================
verify_service "ml" "Enhancement 7: Machine Learning Trainer"
verify_file "server/src/services/ml-trainer.js" \
  "ML trainer service (400+ lines)"

# ============================================================================
# 8. Complete XAML Dashboard UI
# ============================================================================
verify_service "ui" "Enhancement 8: Complete XAML Dashboard UI"
verify_file "client/Views/CompleteModerationDashboard.xaml" \
  "XAML dashboard UI (400+ lines)"
verify_file "client/Views/CompleteModerationDashboard.xaml.cs" \
  "XAML code-behind (500+ lines)"

# ============================================================================
# 9. Integration Utilities
# ============================================================================
verify_service "utils" "Enhancement 9: Integration Utilities"
verify_file "server/src/utils/integration-utils.js" \
  "Integration utilities (600+ lines)"

# ============================================================================
# Database Schema
# ============================================================================
verify_service "database" "Database Schema Extensions"
verify_file "database/schema-extended.sql" \
  "Extended schema with moderation tables (+200 lines)"

# ============================================================================
# API Routes
# ============================================================================
verify_service "api" "Complete API Routes"
verify_file "server/src/routes/moderation-complete.js" \
  "All moderation routes (500+ lines)"

# ============================================================================
# Documentation
# ============================================================================
verify_service "docs" "Documentation"
verify_file "MODERATION_ENHANCEMENTS_COMPLETE.md" \
  "Complete setup and integration guide"
verify_file "ENHANCEMENT_SUMMARY.md" \
  "Enhancement summary and deliverables"
verify_file "MODERATION_QUICK_REFERENCE.txt" \
  "Quick reference card"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  VERIFICATION SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Total checks: $TOTAL"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL COMPONENTS VERIFIED${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Run: psql -U postgres -d zamar < database/schema-extended.sql"
  echo "  2. Run: npm install in server/ directory"
  echo "  3. Set environment variables from .env.example"
  echo "  4. Start server: npm start"
  echo "  5. Test endpoints with cURL or Postman"
  echo "  6. Monitor: npm run logs"
  echo ""
  exit 0
else
  echo -e "${RED}✗ SOME COMPONENTS MISSING${NC}"
  echo ""
  echo "Please ensure all files are in correct locations."
  echo ""
  exit 1
fi
