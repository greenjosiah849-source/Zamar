# Zamar Moderation System

## Overview

The Zamar Moderation System is a comprehensive, fully custom AI-powered content moderation platform with **no external APIs**. It's designed to keep the Zamar platform safe by automatically detecting and handling violations across all content types.

## Features

### 🤖 Zamar AI Core Model
- **Custom ML Model**: No reliance on external APIs or third-party services
- **Multi-Modal Analysis**:
  - **Text Analysis**: Chat, usernames, descriptions, tags
  - **Image Analysis**: Detect explicit, violent, or suspicious content
  - **Audio Analysis**: Speech analysis and inappropriate content detection
  - **Video Analysis**: Frame-based analysis
  - **Game Metadata**: Analyze game names, descriptions, tags

### 📋 Content Types Monitored
- Usernames
- User profiles & bios
- Game names & descriptions
- Game tags
- Chat messages
- User-uploaded images
- User-uploaded videos
- User-uploaded audio
- Game assets
- All forum/community content

### 🎯 Violation Categories
1. **Explicit Content** (0.75 confidence threshold)
   - Nudity, pornography, adult content
   
2. **Violence** (0.70 threshold)
   - Gore, assault, weapons, aggression
   
3. **Hate Speech** (0.80 threshold)
   - Slurs, discrimination, harassment
   
4. **Spam** (0.65 threshold)
   - Repetitive content, scams, ads
   
5. **Drug References** (0.78 threshold)
   - Illegal substances
   
6. **Harassment** (0.72 threshold)
   - Bullying, threats, personal attacks
   
7. **Unsafe Usernames** (0.70 threshold)
   - Admin impersonation, reserved names

### 🛡️ Punishment System
Tiered enforcement based on violation severity and history:

**Violation Points:**
- LOW: 5 points
- MEDIUM: 15 points
- HIGH: 30 points
- CRITICAL: 50 points

**Actions:**
- **WARNING**: Formal notice to user (5 points)
- **MUTE**: 24 hours chat suspension (15 points)
- **SUSPEND**: 7-30 day account suspension (30+ points)
- **TEMPORARY_BAN**: 30-90 day ban (50+ points)
- **PERMANENT_BAN**: Permanent account termination (100+ points)
- **CONTENT_REMOVAL**: Delete violating content immediately

### 📊 Moderation Dashboard
Admin interface for:
- Viewing pending moderation cases
- Reviewing flagged content
- Managing user bans and suspensions
- Processing appeals
- Monitoring AI performance
- Viewing statistics and trends

### 🔄 Appeal System
Users can appeal bans/suspensions with:
- Custom appeal message
- Right to explain their case
- Moderator review process
- Automatic unsuspend on appeal approval

## Architecture

### Database Schema

```sql
-- AI predictions and training data
ai_predictions         -- Cache of AI scan results
ai_training_data       -- Training data for model improvement

-- Moderation cases and violations
moderation_cases       -- Formal moderation cases
user_violations        -- Individual violation records
user_bans              -- Ban/suspension tracking
flagged_content        -- Content requiring review

-- Appeals and logs
moderation_appeals     -- User appeals of bans
moderation_actions_log -- All moderator actions
```

### Server Architecture

```
server/src/
├── services/
│   ├── zamar-ai.js                 -- AI model core
│   └── moderation-service.js        -- Moderation business logic
│
└── routes/
    └── moderation.js               -- Moderation API endpoints
```

### Client Architecture

```
client/Services/
├── ClientModerationService.cs      -- Client moderation service
└── ClientManager.cs                -- Integrated with main manager

client/Views/
└── ModerationDashboardWindow.xaml.cs -- Admin dashboard UI
```

## API Endpoints

### Scan Content
```
POST /moderation/scan
{
  "type": "text|image|audio|video|username|game_metadata",
  "content": "...",
  "metadata": {}
}

Response:
{
  "scanned": true,
  "flagged": false,
  "category": "clean",
  "confidence": 0.1234,
  "hash": "sha256_hash",
  "predictions": { ... }
}
```

### Scan Game Metadata
```
POST /moderation/scan-game
{
  "name": "My Game",
  "description": "...",
  "tags": ["tag1", "tag2"]
}
```

### Report Content
```
POST /moderation/report
{
  "reportedUserId": "user_id",  // or reportedGameId
  "reason": "Inappropriate content",
  "description": "..."
}
```

### Get Moderation Cases (Admin)
```
GET /moderation/cases?status=PENDING&page=1&limit=50
```

### Review Case (Admin)
```
POST /moderation/cases/:caseId/review
{
  "action": "BAN|MUTE|SUSPEND|WARNING|CONTENT_REMOVAL",
  "status": "APPROVED|DISMISSED|REVIEWED",
  "notes": "..."
}
```

### Check User Status
```
GET /moderation/user/:userId/status

Response:
{
  "status": "ACTIVE|BANNED|MUTED|SUSPENDED",
  "type": "BAN|MUTE|SUSPENSION",
  "until": "2025-01-15T...",
  "reason": "...",
  "appealable": true
}
```

### Appeal Ban
```
POST /moderation/appeals
{
  "banId": "ban_id",
  "message": "I would like to appeal my ban because..."
}
```

### Review Appeal (Admin)
```
POST /moderation/appeals/:appealId/review
{
  "decision": "APPROVED|REJECTED",
  "response": "..."
}
```

### Get AI Info
```
GET /moderation/ai-info

Response:
{
  "name": "Zamar AI",
  "version": "1.0.0",
  "capabilities": ["text_analysis", ...],
  "categories": ["explicit", "violence", ...],
  "thresholds": { ... }
}
```

## Usage Examples

### Server-Side (Node.js)

```javascript
const ModerationService = require('./services/moderation-service');
const ZamarAI = require('./services/zamar-ai');

// Create service
const modService = new ModerationService(pool, redis);

// Scan content
const result = await modService.scanAsset({
  type: 'text',
  content: userMessage,
  userId: userId,
  metadata: { source: 'chat' }
});

if (result.isFlagged) {
  // Create moderation case
  const case = await modService.createModerationCase({
    userId: userId,
    contentType: 'chat',
    reason: result.category,
    severity: 'MEDIUM',
    aiCategory: result.category,
    aiConfidence: result.confidence
  });
}

// Check user status
const status = await modService.checkUserStatus(userId);
if (status.status === 'BANNED') {
  // Reject user access
}
```

### Client-Side (C#)

```csharp
var modService = new ClientModerationService(apiUrl, authService);

// Scan username before registration
var result = await modService.ScanContentAsync("username", newUsername);
if (result.Flagged) {
  MessageBox.Show($"This username violates guidelines: {result.Category}");
  return;
}

// Report inappropriate content
var report = await modService.ReportContentAsync(
  "user",
  suspiciousUserId,
  "Hate speech",
  "User posted discriminatory content in chat"
);

// Check if user can play
var status = await modService.CheckUserStatusAsync(userId);
if (status.Status != "ACTIVE") {
  MessageBox.Show($"Account {status.Status}. {status.Reason}");
}

// Appeal a ban
var appeal = await modService.AppealBanAsync(banId, 
  "I apologize for my behavior. I understand now why my content was inappropriate.");
```

## Configuration

### AI Model Thresholds

Edit in `server/src/services/zamar-ai.js`:

```javascript
this.thresholds = {
  explicit: 0.75,      // 75% confidence required
  violence: 0.70,
  hate_speech: 0.80,   // Higher threshold = fewer false positives
  spam: 0.65,
  drugs: 0.78,
  harassment: 0.72,
  unsafe_username: 0.70
};
```

Lower thresholds = more aggressive (more false positives)
Higher thresholds = more lenient (miss more violations)

### Moderation Settings

Update via database:

```sql
INSERT INTO moderation_settings 
  (setting_name, threshold_value, category, auto_action, enabled)
VALUES 
  ('EXPLICIT_CONTENT', 0.75, 'explicit', 'AUTO_FLAG', true),
  ('VIOLENCE_DETECTION', 0.70, 'violence', 'AUTO_FLAG', true);
```

## Monitoring & Analytics

### Check Statistics
```
GET /moderation/stats

Response:
{
  "cases": {
    "byStatus": { "PENDING": 12, "REVIEWED": 45, "APPROVED": 120 }
  },
  "bans": {
    "byType": { "MUTED": 5, "SUSPENDED": 8, "PERMANENT": 3 }
  },
  "flagged": {
    "byType": { "text": 234, "image": 45, "username": 12 }
  }
}
```

### Get Flagged Content Queue
```
GET /moderation/flagged?status=PENDING&limit=50
```

## Training & Improvement

The AI model improves over time through:

1. **Feedback Loop**: Moderator decisions update training data
2. **Hash-Based Caching**: Common violations are cached for instant detection
3. **Pattern Recognition**: New patterns added based on moderator feedback
4. **Manual Training**: Admins can mark content to improve model

```sql
-- Add training data
INSERT INTO ai_training_data (content_type, content_hash, category, confidence, verified)
VALUES ('text', 'hash', 'hate_speech', 0.95, true);
```

## Security Considerations

1. **No External APIs**: All processing stays on-platform
2. **Privacy**: Content hashes, not storage of actual inappropriate content
3. **Admin Only**: All moderation actions require admin role
4. **Audit Trail**: All actions logged in `moderation_actions_log`
5. **Appeal Rights**: Users can appeal any action
6. **Rate Limiting**: Prevent spam appeals and false reports

## Scaling

For high-volume deployments:

1. **Database Indexing**: Pre-indexed by content_type, status, created_at
2. **Redis Caching**: Predictions cached for 30 days
3. **Batch Processing**: Queue long-running analyses
4. **Regional Moderators**: Support multiple timezones

## Future Enhancements

- [ ] Advanced video/image fingerprinting
- [ ] Machine learning retraining pipeline
- [ ] Multi-language support
- [ ] Community/peer moderation
- [ ] Automated content quarantine
- [ ] Webhook notifications
- [ ] Detailed moderation reports

## Support

For issues or questions about the moderation system:
1. Check `ModerationDashboardWindow` for UI issues
2. Review server logs in console
3. Check database for edge cases
4. Contact admin team

---

**Zamar AI Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production Ready
