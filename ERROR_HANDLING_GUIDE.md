# ZAMAR ERROR HANDLING SYSTEM
## Comprehensive Error Management & Recovery Guide

---

## TABLE OF CONTENTS
1. System Architecture
2. Error Code Reference
3. Server Error Handler
4. Client Error Handler
5. In-Game Error Handler
6. Error Recovery System
7. Integration Guide
8. Error Monitoring
9. Best Practices
10. Troubleshooting

---

## 1. SYSTEM ARCHITECTURE

### Overview
The Zamar error handling system consists of 4 integrated components:

```
┌─────────────────────────────────────────────────────┐
│         CLIENT ERROR HANDLER                        │
│  - UI error dialogs                                 │
│  - Network error recovery                           │
│  - Memory error handling                            │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│    GLOBAL ERROR RECOVERY SERVICE                    │
│  - Exponential backoff retry                        │
│  - Circuit breaker pattern                          │
│  - Fallback strategies                              │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│    IN-GAME ERROR HANDLER                            │
│  - Physics error recovery                           │
│  - Script error handling                            │
│  - Game state rollback                              │
└──────────────┬──────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────┐
│    SERVER ERROR HANDLER                             │
│  - Exception mapping                                │
│  - Request validation                               │
│  - Structured logging                               │
└─────────────────────────────────────────────────────┘
```

### Error Flow

```
Exception Occurs
    │
    ├─→ Client Error (ClientErrorHandler)
    │   ├─→ Classify error type
    │   ├─→ Attempt recovery
    │   └─→ Show user message
    │
    ├─→ Game Error (InGameErrorHandler)
    │   ├─→ Physics/Script analysis
    │   ├─→ State recovery
    │   └─→ Continue gameplay
    │
    ├─→ Network Error (ErrorRecoveryService)
    │   ├─→ Exponential backoff retry
    │   ├─→ Circuit breaker check
    │   └─→ Fallback operation
    │
    └─→ Server Error (ServerErrorHandler)
        ├─→ Exception mapping
        ├─→ Validation errors
        └─→ Standardized response
```

---

## 2. ERROR CODE REFERENCE

### Authentication Errors (AUTH_XXX)
- **AUTH_001** [401]: Invalid credentials
- **AUTH_002** [401]: Account locked
- **AUTH_003** [401]: Token expired
- **AUTH_004** [401]: Token invalid
- **AUTH_005** [401]: Insufficient permissions
- **AUTH_006** [401]: Session expired
- **AUTH_007** [403]: Access denied
- **AUTH_008** [401]: Two-factor required
- **AUTH_009** [401]: Password reset required
- **AUTH_010** [401]: Account suspended

### Server Errors (SRV_XXX)
- **SRV_001** [500]: Internal server error
- **SRV_002** [503]: Service unavailable
- **SRV_003** [500]: Database error
- **SRV_004** [503]: Server overloaded
- **SRV_005** [500]: Configuration error
- **SRV_006** [500]: Memory allocation failed
- **SRV_007** [400]: Invalid request parameter
- **SRV_008** [400]: Malformed request
- **SRV_009** [404]: Resource not found
- **SRV_010** [500]: Unexpected error

### Game Session Errors (GAME_XXX)
- **GAME_001** [400]: Invalid game session
- **GAME_002** [400]: Game already started
- **GAME_003** [400]: Game not found
- **GAME_004** [500]: Game state corrupted
- **GAME_005** [500]: Physics simulation error
- **GAME_006** [400]: Invalid player action
- **GAME_007** [429]: Too many requests
- **GAME_008** [500]: Null reference error
- **GAME_009** [500]: Index out of range
- **GAME_999** [500]: Unknown game error

### Multiplayer Errors (MP_XXX)
- **MP_001** [503]: Multiplayer service unavailable
- **MP_002** [503]: Game server disconnected
- **MP_003** [400]: Player not in game
- **MP_004** [429]: Sync message flood
- **MP_005** [400]: Invalid team assignment
- **MP_006** [403]: Cannot join team
- **MP_007** [500]: Synchronization failed
- **MP_008** [400]: Invalid player position
- **MP_009** [503]: Regional server overloaded
- **MP_010** [500]: Multiplayer state error

### Payment/Robux Errors (PAY_XXX)
- **PAY_001** [400]: Insufficient Robux
- **PAY_002** [400]: Invalid transaction
- **PAY_003** [503]: Payment service unavailable
- **PAY_004** [400]: Transaction expired
- **PAY_005** [429]: Rate limit exceeded
- **PAY_006** [403]: Region not supported
- **PAY_007** [400]: Invalid item ID
- **PAY_008** [500]: Transaction failed
- **PAY_009** [400]: Duplicate transaction
- **PAY_010** [403]: User banned from purchases

### Network Errors (NET_XXX)
- **NET_001** [503]: No internet connection
- **NET_002** [503]: Connection timeout
- **NET_003** [503]: Connection refused
- **NET_004** [503]: Connection lost
- **NET_005** [503]: DNS resolution failed
- **NET_006** [503]: Network unreachable
- **NET_007** [429]: Bandwidth limit exceeded
- **NET_008** [503]: Proxy error
- **NET_009** [503]: SSL certificate error
- **NET_010** [503]: Network interface error

### Client/App Errors (CLIENT_XXX)
- **CLIENT_001** [500]: Out of memory
- **CLIENT_002** [500]: Graphics error
- **CLIENT_003** [400]: Invalid user input
- **CLIENT_004** [500]: File I/O error
- **CLIENT_005** [500]: Corrupted data
- **CLIENT_006** [500]: Critical crash
- **CLIENT_007** [400]: Missing dependency
- **CLIENT_008** [500]: Invalid operation
- **CLIENT_009** [500]: Cache error
- **CLIENT_010** [500]: Driver error

### Game Logic Errors (LOGIC_XXX)
- **LOGIC_001** [500]: Script timeout
- **LOGIC_002** [500]: Null reference in script
- **LOGIC_003** [500]: Division by zero
- **LOGIC_004** [500]: Invalid operation
- **LOGIC_005** [500]: Math overflow
- **LOGIC_006** [500]: Index out of bounds
- **LOGIC_007** [400]: Invalid argument
- **LOGIC_008** [500]: Stack overflow
- **LOGIC_009** [500]: Recursion too deep
- **LOGIC_999** [500]: Unknown logic error

### Admin/Moderation Errors (ADMIN_XXX)
- **ADMIN_001** [403]: Admin access required
- **ADMIN_002** [403]: Insufficient admin level
- **ADMIN_003** [400]: Invalid moderation action
- **ADMIN_004** [400]: User already banned
- **ADMIN_005** [400]: User not found
- **ADMIN_006** [429]: Moderation rate limit
- **ADMIN_007** [400]: Invalid reason
- **ADMIN_008** [403]: Cannot moderate user
- **ADMIN_009** [400]: Invalid duration
- **ADMIN_010** [500]: Moderation failed

### System Errors (SYS_XXX)
- **SYS_001** [500]: Generic system error
- **SYS_002** [408]: Request timeout
- **SYS_003** [500]: File system error
- **SYS_004** [500]: Registry error (Windows)
- **SYS_005** [500]: Permission denied
- **SYS_006** [500]: Directory error
- **SYS_007** [500]: Thread error
- **SYS_008** [500]: Process error
- **SYS_009** [500]: Memory error
- **SYS_010** [500]: Resource exhausted

### File Upload Errors (FILE_XXX)
- **FILE_001** [413]: File too large
- **FILE_002** [400]: Invalid file type
- **FILE_003** [400]: Corrupted file
- **FILE_004** [403]: File upload blocked
- **FILE_005** [500]: File storage error
- **FILE_006** [400]: Malware detected
- **FILE_007** [429]: Upload rate limit
- **FILE_008** [400]: Invalid filename
- **FILE_009** [403]: User quota exceeded
- **FILE_010** [500]: File processing failed

---

## 3. SERVER ERROR HANDLER

### Location
`server/src/services/ServerErrorHandler.cs`

### Features
- **Exception Mapping**: Converts C# exceptions to standardized error codes
- **Request Validation**: Validates required fields, email, password
- **Status Code Handling**: Maps error codes to HTTP status codes
- **Error Logging**: Structured logging with severity levels
- **Public Endpoints**: Special handling for auth/public routes

### Exception Mappings

| Exception | Error Code | Status |
|-----------|-----------|--------|
| UnauthorizedAccessException | AUTH_006 | 401 |
| ArgumentNullException | SRV_007 | 400 |
| ArgumentException | SRV_008 | 400 |
| InvalidOperationException | LOGIC_004 | 400 |
| KeyNotFoundException | SRV_009 | 404 |
| TimeoutException | SYS_002 | 408 |
| DbUpdateException | SRV_003 | 500 |
| OutOfMemoryException | CLIENT_001 | 500 |
| Default | SYS_001 | 500 |

### Integration

```csharp
// In Startup.cs or Program.cs
public void Configure(IApplicationBuilder app)
{
    app.UseMiddleware<ErrorHandlingMiddleware>();
    
    // ... rest of configuration
}
```

### Validation Methods

```csharp
// Validate required fields
handler.ValidateRequired(user, "username", "email", "password");

// Validate string length
handler.ValidateLength(username, "username", 3, 20);

// Validate email format
handler.ValidateEmail(email);

// Validate password strength
handler.ValidatePassword(password); // Must be 8+ chars, have uppercase and digits
```

### Error Response Format

```json
{
  "error": {
    "code": "AUTH_006",
    "message": "Session expired. Please log in again.",
    "status": 401,
    "details": "User session token has expired",
    "timestamp": "2024-01-15T10:30:45.123Z",
    "traceId": "0HN1GH7K5L9M2P0Q"
  }
}
```

---

## 4. CLIENT ERROR HANDLER

### Location
`client/Services/ClientErrorHandler.cs`

### Features
- **Automatic Recovery**: Attempts to recover from errors
- **Error Classification**: Categorizes errors by type
- **User Messages**: Displays user-friendly error messages
- **Error Context**: Captures context for debugging
- **Event System**: Raises events for UI integration

### Error Recovery Strategies

#### Network Errors
- **Retry Strategy**: Exponential backoff (1s, 2s, 4s...)
- **Max Retries**: 3-5 attempts
- **User Message**: "Connection timeout. Please check your internet."

#### Memory Errors
- **Clear Cache Strategy**: Clears application cache
- **Max Attempts**: 1
- **User Message**: "Application is running low on memory."

#### Graphics Errors
- **Driver Update Message**: Suggests GPU driver update
- **Fallback**: Disable advanced graphics
- **User Message**: "Graphics error occurred. Please update your GPU drivers."

### Usage

```csharp
var errorHandler = new ClientErrorHandler(new ClientErrorLogger());

try
{
    // Some operation
}
catch (Exception ex)
{
    var result = await errorHandler.HandleErrorAsync(ex, "Operation context");
    
    if (result.RecoverySuccessful)
    {
        // Show success message
        MessageBox.Show("Recovered: " + result.UserMessage);
    }
    else
    {
        // Show error message
        MessageBox.Show("Error: " + result.UserMessage);
    }
}
```

### Event Handling

```csharp
errorHandler.ErrorOccurred += (s, e) => 
{
    Console.WriteLine($"Error {e.ErrorCode}: {e.Message}");
};

errorHandler.RecoveryAttempted += (s, e) => 
{
    Console.WriteLine($"Recovery using {e.Strategy}: {e.Successful}");
};

errorHandler.FatalErrorOccurred += (s, e) => 
{
    Console.WriteLine($"FATAL: {e.ErrorCode} - {e.Message}");
};
```

---

## 5. IN-GAME ERROR HANDLER

### Location
`client/Services/InGameErrorHandler.cs`

### Features
- **Physics Error Recovery**: Resets physics state
- **Script Error Handling**: Disables faulty scripts
- **State Rollback**: Returns to last valid state
- **Error History**: Tracks recurring errors
- **Graceful Degradation**: Continues game with reduced functionality

### Error Types Handled

#### Physics Errors
- Invalid velocity calculations
- Collision detection failures
- Out-of-bounds positions
- **Recovery**: Reset physics, zero velocity

#### Script Errors
- Null reference exceptions
- Division by zero
- Stack overflow
- **Recovery**: Disable script, try reload

#### Game Logic Errors
- Invalid object state
- Corrupted game data
- Out-of-range indices
- **Recovery**: Rollback to checkpoint

### Usage

```csharp
var gameState = new GameState { CurrentScene = "Level1" };
var errorHandler = new InGameErrorHandler(
    new GameErrorLogger(), 
    gameState);

// Handle physics error
try
{
    UpdatePhysics();
}
catch (Exception ex)
{
    await errorHandler.HandlePhysicsErrorAsync(ex, player);
}

// Handle script error
try
{
    ExecuteScript(script);
}
catch (Exception ex)
{
    await errorHandler.HandleScriptErrorAsync(ex, script);
}

// Check for recurring errors
if (errorHandler.IsErrorRecurring("GAME_005", 60))
{
    // Error happening 3+ times in 60 seconds
    DisableProblematicSystem();
}
```

### Recovery Strategies

| Error Type | Strategy | Recovery Time |
|-----------|----------|---------------|
| Physics Error | Reset physics state | 100ms |
| Script Error | Disable script, reload | 500ms |
| Game Object Error | Restart object | 200ms |
| State Corruption | Rollback to checkpoint | 300ms |
| Critical Error | Disable object | 100ms |

---

## 6. ERROR RECOVERY SERVICE

### Location
`server/src/services/ErrorRecoveryService.cs`

### Features
- **Exponential Backoff**: 1s, 2s, 4s, 8s, ... (max 30s)
- **Circuit Breaker**: Prevents cascading failures
- **Fallback Strategies**: Alternative operations on failure
- **Health Checking**: Monitors system health
- **Comprehensive Logging**: Tracks all recovery attempts

### Circuit Breaker States

```
Closed (Normal)
    │
    ├─→ Too many failures (5+)
    │
    ▼
Open (Failing)
    │
    ├─→ Wait 60 seconds
    │
    ▼
HalfOpen (Testing)
    │
    ├─→ 2 successes: Return to Closed
    ├─→ 1 failure: Return to Open
```

### Retry Policies

#### Network Policy (Default)
- Max Retries: 5
- Initial Delay: 1000ms
- Backoff Multiplier: 2.0
- Max Delay: 30000ms

#### Database Policy
- Max Retries: 3
- Initial Delay: 500ms
- Backoff Multiplier: 2.0
- Max Delay: 10000ms

#### File I/O Policy
- Max Retries: 2
- Initial Delay: 200ms
- Backoff Multiplier: 2.0
- Max Delay: 5000ms

### Usage

```csharp
var recovery = new ErrorRecoveryService(new ErrorRecoveryLogger());

// Simple recovery with exponential backoff
var result = await recovery.RecoverAsync(
    async () => {
        await httpClient.GetAsync(url);
    },
    "FetchData",
    maxRetries: 3,
    initialDelayMs: 1000
);

if (result.Success)
{
    Console.WriteLine($"Success after {result.Attempts} attempts");
}
else
{
    Console.WriteLine($"Failed after {result.Attempts} attempts: {result.LastException.Message}");
}

// Recovery with fallback
var data = await recovery.RecoverWithFallbackAsync(
    async () => await database.QueryAsync(),
    async () => await cache.GetAsync(),
    "LoadData"
);

// Health check
var health = await recovery.HealthCheckAsync();
Console.WriteLine($"System healthy: {health.IsHealthy}");
foreach (var state in health.CircuitBreakerStates)
{
    Console.WriteLine($"{state.Key}: {state.Value}");
}
```

### Critical Operations (Circuit Breaker Protected)
- AuthenticateUser
- LoadGameFile
- UploadGameFile
- ConnectToGameServer
- SyncPlayerData
- FetchGameList
- SubmitScore

---

## 7. INTEGRATION GUIDE

### Server Integration

```csharp
// Startup.cs or Program.cs
public void ConfigureServices(IServiceCollection services)
{
    services.AddScoped<ServerErrorHandler>();
    services.AddScoped<ErrorRecoveryService>();
    services.AddScoped<IErrorRecoveryLogger, ErrorRecoveryLogger>();
}

public void Configure(IApplicationBuilder app)
{
    // Add error handling middleware
    app.UseMiddleware<ErrorHandlingMiddleware>();
    
    app.UseRouting();
    app.UseEndpoints(endpoints =>
    {
        endpoints.MapControllers();
    });
}
```

### Client Integration (WPF)

```csharp
// App.xaml.cs
public partial class App : Application
{
    private ClientErrorHandler _errorHandler;

    protected override void OnStartup(StartupEventArgs e)
    {
        _errorHandler = new ClientErrorHandler(new ClientErrorLogger());
        
        _errorHandler.ErrorOccurred += (s, args) =>
        {
            MessageBox.Show(args.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
        };

        _errorHandler.FatalErrorOccurred += (s, args) =>
        {
            MessageBox.Show(
                $"A critical error occurred: {args.Message}\nThe application will now close.",
                "Fatal Error",
                MessageBoxButton.OK,
                MessageBoxImage.Stop);
            
            Environment.Exit(1);
        };

        AppDomain.CurrentDomain.UnhandledException += async (s, e) =>
        {
            await _errorHandler.HandleErrorAsync(e.ExceptionObject as Exception, "AppDomain");
        };

        base.OnStartup(e);
    }
}
```

### Game Integration

```csharp
// GameLoop.cs
public class GameLoop
{
    private InGameErrorHandler _errorHandler;

    public void Initialize(GameState gameState)
    {
        _errorHandler = new InGameErrorHandler(new GameErrorLogger(), gameState);
        
        _errorHandler.GameErrorOccurred += (s, e) =>
        {
            Debug.WriteLine($"Game Error: {e.ErrorCode} - {e.Message}");
        };
    }

    public async void Update(float deltaTime)
    {
        try
        {
            UpdatePhysics(deltaTime);
            UpdateScripts(deltaTime);
            UpdateGameState(deltaTime);
        }
        catch (Exception ex)
        {
            var result = await _errorHandler.HandleGameErrorAsync(ex);
            if (!result.RecoverySuccessful)
            {
                // Pause game or show error dialog
                PauseGame();
            }
        }
    }
}
```

---

## 8. ERROR MONITORING

### What to Monitor
- Error frequency by code
- Recovery success rates
- Circuit breaker states
- Client crash reports
- Network connectivity issues

### Monitoring Endpoints (Future)

```
GET /api/admin/errors/summary
GET /api/admin/errors/codes/{code}
GET /api/admin/recovery/status
GET /api/admin/circuit-breakers
GET /api/admin/health-check
```

### Database Schema (For Error Logging)

```sql
CREATE TABLE ErrorLogs (
    Id INT PRIMARY KEY IDENTITY,
    ErrorCode NVARCHAR(20),
    Message NVARCHAR(MAX),
    StackTrace NVARCHAR(MAX),
    UserId INT,
    Context NVARCHAR(500),
    Severity NVARCHAR(20),
    Timestamp DATETIME,
    FOREIGN KEY (UserId) REFERENCES Users(Id)
);

CREATE TABLE RecoveryLogs (
    Id INT PRIMARY KEY IDENTITY,
    OperationName NVARCHAR(100),
    Success BIT,
    Attempts INT,
    DurationMs INT,
    ErrorMessage NVARCHAR(MAX),
    Timestamp DATETIME
);

CREATE TABLE CircuitBreakerStates (
    Id INT PRIMARY KEY IDENTITY,
    OperationName NVARCHAR(100),
    State NVARCHAR(20),
    FailureCount INT,
    LastFailureTime DATETIME,
    UpdatedAt DATETIME
);
```

---

## 9. BEST PRACTICES

### Error Handling Best Practices

1. **Always Log Context**
   ```csharp
   errorHandler.CaptureErrorContext("userId", user.Id);
   errorHandler.CaptureErrorContext("scene", gameState.CurrentScene);
   ```

2. **Use Specific Error Codes**
   - Don't use generic SYS_001 when a specific code exists
   - Use game domain-specific codes (GAME_XXX, LOGIC_XXX)

3. **Implement Exponential Backoff**
   - Don't retry immediately
   - Use ErrorRecoveryService for network calls
   - Cap delays at 30 seconds

4. **Validate Early**
   - Validate user input at API boundary
   - Use ServerErrorHandler.ValidateRequired()
   - Prevent invalid states from propagating

5. **Recovery Hierarchy**
   - Attempt auto-recovery first
   - Fall back to user prompts
   - Only crash as last resort

6. **Graceful Degradation**
   - Disable non-critical features on error
   - Continue game with limited functionality
   - Don't crash entire system for local errors

### Error Message Best Practices

1. **User-Friendly**
   - ✅ "Your connection was lost. Reconnecting..."
   - ❌ "NET_004: Connection refused"

2. **Actionable**
   - ✅ "Please check your internet connection"
   - ❌ "Network error occurred"

3. **Not Overwhelming**
   - ✅ Show 1 message at a time
   - ❌ Show 10 error dialogs

4. **Include Recovery Option**
   - ✅ "Retry" / "Ignore" / "Cancel" buttons
   - ❌ Just an OK button

---

## 10. TROUBLESHOOTING

### Common Issues & Solutions

#### Issue: "Circuit breaker is open"
**Cause**: Too many recent failures
**Solution**:
```csharp
// Wait 60 seconds or
var breaker = recovery.GetOrCreateCircuitBreaker("OperationName");
breaker.Close(); // Manual reset (admin only)
```

#### Issue: "Recovery took too long"
**Cause**: Max delays too high or infinite retry
**Solution**:
```csharp
var policy = recovery.GetRetryPolicy("Network");
policy.MaxDelayMs = 10000; // Reduce from 30s to 10s
policy.MaxRetries = 2;      // Reduce retry attempts
```

#### Issue: "Memory error after recovery"
**Cause**: Cache not cleared properly
**Solution**:
```csharp
// Ensure ClearCacheStrategy properly clears all collections
_gameObjects.Clear();
_textures.UnloadUnused();
GC.Collect();
```

#### Issue: "Scripts still running after error"
**Cause**: Script not properly disabled
**Solution**:
```csharp
// In InGameErrorHandler.HandleScriptErrorAsync()
script.IsEnabled = false;
script.StopAllCoroutines();
script.CancelInvoke();
```

#### Issue: "Error handler itself throws exception"
**Cause**: Unhandled exception in recovery
**Solution**:
```csharp
// All error handlers have try-catch blocks
// If inner catch fails, emergency log to console:
Console.Error.WriteLine($"CRITICAL: {ex.Message}");
// Then exit gracefully
Environment.Exit(1);
```

### Debug Commands

```csharp
// Force an error for testing
throw new InvalidOperationException("Test error");

// Check circuit breaker status
var health = await recovery.HealthCheckAsync();
foreach (var cb in health.CircuitBreakerStates)
{
    Console.WriteLine($"{cb.Key}: {cb.Value}");
}

// Get recent errors
var errors = await errorHandler.GetRecentErrorsAsync(10);
foreach (var err in errors)
{
    Console.WriteLine($"[{err.Timestamp}] {err.ErrorCode}: {err.Message}");
}

// Manually trigger recovery
await recovery.RecoverAsync(async () => /* operation */, "ManualTest");
```

---

## SUMMARY

The Zamar error handling system provides:
- ✅ Comprehensive error classification (100+ codes)
- ✅ Multi-layer error handling (client/game/server)
- ✅ Automatic recovery with exponential backoff
- ✅ Circuit breaker protection
- ✅ Structured error logging
- ✅ User-friendly error messages
- ✅ Event-driven error notifications
- ✅ Production-ready implementation

All components are designed for reliability, observability, and seamless user experience.
