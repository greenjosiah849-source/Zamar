# Zamar Moderation System Integration Guide

## Quick Start - 5 Steps to Activate

### Step 1: Update Server Index

Add the moderation routes to your main server file (`server/src/index.js`):

```javascript
// Add this import at the top
const moderationRoutes = require('./routes/moderation');

// Add this line with other route initialization (around where other routes are mounted)
app.use('/moderation', moderationRoutes(pool, redisClient));

// Complete example of route mounting section:
app.use('/api/auth', authRoutes(pool, redisClient, jwtSecret));
app.use('/api/users', userRoutes(pool, redisClient));
app.use('/api/games', gameRoutes(pool, redisClient));
app.use('/moderation', moderationRoutes(pool, redisClient));  // ADD THIS
```

### Step 2: Initialize Client Service

In your client code (e.g., `client/Services/ClientManager.cs`):

```csharp
public class ClientManager
{
    // ... existing fields ...
    private ClientModerationService _moderationService;
    
    public ClientManager(AuthService authService)
    {
        _authService = authService;
        // ... existing initialization ...
        
        // ADD THIS
        _moderationService = new ClientModerationService("https://api.zamar.com", authService);
    }
    
    public ClientModerationService ModerationService => _moderationService;
}
```

### Step 3: Validate Usernames on Registration

```csharp
// In registration flow
private async void RegisterButton_Click(object sender, RoutedEventArgs e)
{
    string username = UsernameTextBox.Text;
    
    // Scan username with Zamar AI
    var scanResult = await _clientManager.ModerationService.ScanContentAsync(
        "username", 
        username
    );
    
    if (scanResult.Flagged)
    {
        MessageBox.Show(
            $"This username violates our guidelines.\n" +
            $"Category: {scanResult.Category}\n" +
            $"Please choose another username.",
            "Invalid Username"
        );
        return;
    }
    
    // Continue with registration...
}
```

### Step 4: Scan Game Metadata on Creation

```csharp
// In game creation/upload flow
private async void CreateGameButton_Click(object sender, RoutedEventArgs e)
{
    string gameName = GameNameTextBox.Text;
    string description = GameDescriptionTextBox.Text;
    var tags = GameTagsTextBox.Text.Split(',').ToList();
    
    // Scan all game metadata
    var scanResult = await _clientManager.ModerationService.ScanGameMetadataAsync(
        gameName, 
        description, 
        tags
    );
    
    if (scanResult.Flagged)
    {
        MessageBox.Show(
            $"Your game metadata contains inappropriate content.\n" +
            $"Please review: {string.Join(", ", scanResult.Details.Keys)}",
            "Invalid Game Content"
        );
        return;
    }
    
    // Continue with game creation...
}
```

### Step 5: Check User Status on Login

```csharp
// In authentication flow
private async void LoginButton_Click(object sender, RoutedEventArgs e)
{
    // ... authenticate user ...
    
    var userId = _clientManager.CurrentUser.Id;
    
    // Check if user is banned/suspended/muted
    var status = await _clientManager.ModerationService.CheckUserStatusAsync(userId);
    
    if (status.Status != "ACTIVE")
    {
        string message = status.Status switch
        {
            "BANNED" => $"Your account has been permanently banned.\nReason: {status.Reason}",
            "SUSPENDED" => $"Your account is suspended until {status.Until}.",
            "MUTED" => $"You are muted until {status.Until}.",
            _ => "Your account has restrictions."
        };
        
        MessageBox.Show(message, "Account Restricted");
        
        if (status.Appealable)
        {
            MessageBox.Show("You can appeal this action. Contact support.");
        }
        
        return;
    }
    
    // User can proceed
}
```

## Comprehensive Integration Points

### 1. Chat Message Filtering (Real-Time)

```javascript
// Server-side: In chat/message route
router.post('/chat/send', authenticateToken, async (req, res) => {
    const { message, recipientId } = req.body;
    
    // Scan message with Zamar AI
    const scanResult = await moderationService.scanAsset({
        type: 'text',
        content: message,
        userId: req.user.userId,
        metadata: { source: 'chat' }
    });
    
    if (scanResult.isFlagged) {
        // Log violation
        await moderationService.createModerationCase({
            userId: req.user.userId,
            contentType: 'chat',
            reason: `Chat: ${scanResult.category}`,
            severity: 'MEDIUM',
            aiCategory: scanResult.category,
            aiConfidence: scanResult.confidence
        });
        
        return res.status(400).json({
            blocked: true,
            reason: 'Message contains inappropriate content'
        });
    }
    
    // Message approved - save it
    // ... continue with message storage ...
});
```

### 2. Profile Picture Upload Scanning

```csharp
// Client-side: When user uploads profile picture
private async void UploadProfilePictureButton_Click(object sender, RoutedEventArgs e)
{
    var fileDialog = new Microsoft.Win32.OpenFileDialog
    {
        Filter = "Image files|*.jpg;*.jpeg;*.png;*.gif"
    };
    
    if (fileDialog.ShowDialog() == true)
    {
        // Read image file
        byte[] imageBytes = File.ReadAllBytes(fileDialog.FileName);
        
        // Scan with Zamar AI
        var scanResult = await _clientManager.ModerationService.ScanContentAsync(
            "image",
            imageBytes
        );
        
        if (scanResult.Flagged)
        {
            MessageBox.Show(
                "This image is not appropriate for your profile picture.",
                "Image Rejected"
            );
            return;
        }
        
        // Upload image
        await UploadProfilePictureAsync(imageBytes);
    }
}
```

### 3. Game Asset Validation

```javascript
// Server-side: When game assets are uploaded
router.post('/games/:gameId/assets', authenticateToken, async (req, res) => {
    const assetBuffer = req.files.asset.data;
    const assetType = req.files.asset.mimetype;
    
    // Determine content type
    const contentType = assetType.startsWith('image/') ? 'image' :
                       assetType.startsWith('video/') ? 'video' :
                       assetType.startsWith('audio/') ? 'audio' : 'unknown';
    
    if (contentType === 'unknown') {
        return res.status(400).json({ error: 'Unsupported asset type' });
    }
    
    // Scan asset
    const scanResult = await moderationService.scanAsset({
        type: contentType,
        content: assetBuffer,
        userId: req.user.userId,
        gameId: req.params.gameId
    });
    
    if (scanResult.isFlagged) {
        return res.status(400).json({
            rejected: true,
            reason: `Asset contains ${scanResult.category} content`,
            confidence: scanResult.confidence
        });
    }
    
    // Asset approved - save it
    // ... continue with asset storage ...
});
```

### 4. Report Content

```csharp
// Client-side: User reports another user or game
private async void ReportButton_Click(object sender, RoutedEventArgs e)
{
    var reportDialog = new ReportContentDialog();
    
    if (reportDialog.ShowDialog() == true)
    {
        var result = await _clientManager.ModerationService.ReportContentAsync(
            reportDialog.ReportType,  // "user" or "game"
            reportDialog.TargetId,
            reportDialog.Reason,
            reportDialog.Description
        );
        
        if (result.Error != null)
        {
            MessageBox.Show($"Failed to report: {result.Error}");
        }
        else
        {
            MessageBox.Show(
                $"Thank you for reporting. Case #{result.CaseId} has been submitted.\n" +
                "Our moderation team will review it shortly.",
                "Report Submitted"
            );
        }
    }
}
```

### 5. Admin Moderation Dashboard

```csharp
// Show moderation dashboard for admins
private void ShowModerationDashboard()
{
    var adminWindow = new AdminWindow();
    var dashboardTab = new TabItem 
    { 
        Header = "Moderation",
        Content = new ModerationDashboardWindow()
    };
    
    adminWindow.MainTabControl.Items.Add(dashboardTab);
    adminWindow.Show();
}
```

## Testing the System

### Test 1: Username Validation

```bash
curl -X POST http://localhost:3000/moderation/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "username",
    "content": "admin_impersonator"
  }'

# Expected: { "flagged": true, "category": "unsafe_username", "confidence": 0.95 }
```

### Test 2: Text Content Scan

```bash
curl -X POST http://localhost:3000/moderation/scan \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "content": "This is a normal message",
    "metadata": { "source": "chat" }
  }'

# Expected: { "flagged": false, "category": "clean", "confidence": 0.05 }
```

### Test 3: Report Content

```bash
curl -X POST http://localhost:3000/moderation/report \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reportedUserId": "user123",
    "reason": "Harassment",
    "description": "User sent harassing messages"
  }'

# Expected: { "caseId": "uuid", "status": "submitted" }
```

### Test 4: Check User Status

```bash
curl -X GET http://localhost:3000/moderation/user/user123/status \
  -H "Authorization: Bearer <token>"

# Expected: { "status": "ACTIVE", "clean": true }
```

## Migration from Old System

If you had a previous moderation system:

1. **Export existing bans/suspensions**:
   ```sql
   INSERT INTO user_bans (id, user_id, ban_type, reason, active, created_at)
   SELECT uuid_generate_v4(), id, 'PERMANENT', 'Migrated from old system', true, NOW()
   FROM old_banned_users;
   ```

2. **Import violations**:
   ```sql
   INSERT INTO user_violations (id, user_id, violation_type, severity, points, created_at)
   SELECT uuid_generate_v4(), user_id, 'legacy_violation', 'HIGH', 30, created_at
   FROM old_violations;
   ```

## Performance Optimization

### Enable Redis Caching

The system automatically caches predictions for 30 days:

```javascript
// Already configured in ModerationService
await this.redis.setEx(
    `pred:${hash}`,
    30 * 86400,  // 30 days
    JSON.stringify(analysis)
);
```

### Batch Processing

For high-volume scenarios:

```javascript
const items = [
    { type: 'text', content: 'message1' },
    { type: 'text', content: 'message2' },
    { type: 'text', content: 'message3' }
];

const results = await moderationService.ai.batchAnalyze(items);
```

## Monitoring

### Check System Status

```bash
curl http://localhost:3000/moderation/stats \
  -H "Authorization: Bearer <admin_token>"
```

### View Pending Cases

```bash
curl http://localhost:3000/moderation/cases?status=PENDING \
  -H "Authorization: Bearer <admin_token>"
```

## Common Issues & Troubleshooting

### Issue: Service not responding
- Check that routes are mounted in `server/src/index.js`
- Verify database connection
- Check Redis connection

### Issue: False positives (clean content flagged)
- Increase confidence thresholds in `zamar-ai.js`
- Example: Change `explicit: 0.75` to `explicit: 0.85`

### Issue: False negatives (bad content not flagged)
- Decrease confidence thresholds
- Add more keywords to knowledge base
- Train AI with more examples

### Issue: Performance degradation
- Ensure Redis caching is working
- Check database indexes on moderation tables
- Monitor CPU/memory on AI service

## Support & Maintenance

- **Weekly**: Review moderation statistics
- **Monthly**: Analyze AI accuracy and adjust thresholds
- **Quarterly**: Audit ban appeals and moderator actions
- **Annually**: Comprehensive system audit

---

**Created**: January 2026  
**Zamar AI Version**: 1.0.0  
**Status**: Production Ready
