using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Zamar.GameEngine
{
    /// <summary>
    /// In-game error handler for runtime, physics, and script errors
    /// Handles game logic failures with graceful recovery
    /// </summary>
    public class InGameErrorHandler
    {
        private readonly IGameErrorLogger _errorLogger;
        private readonly GameState _gameState;
        private List<GameErrorRecoveryStrategy> _recoveryStrategies;
        private Dictionary<string, ErrorRecord> _errorHistory = new();

        public event EventHandler<GameErrorEventArgs> GameErrorOccurred;
        public event EventHandler<PhysicsErrorEventArgs> PhysicsErrorOccurred;
        public event EventHandler<ScriptErrorEventArgs> ScriptErrorOccurred;

        public InGameErrorHandler(IGameErrorLogger errorLogger, GameState gameState)
        {
            _errorLogger = errorLogger;
            _gameState = gameState;
            _recoveryStrategies = InitializeRecoveryStrategies();
        }

        // =====================================================================
        // Main Game Error Handling
        // =====================================================================

        /// <summary>
        /// Handles general game errors
        /// </summary>
        public async Task<GameErrorResult> HandleGameErrorAsync(Exception exception, GameObject gameObject = null)
        {
            var errorCode = DetermineGameErrorCode(exception);
            var result = new GameErrorResult
            {
                ErrorCode = errorCode,
                Exception = exception,
                Timestamp = DateTime.UtcNow,
                GameObject = gameObject
            };

            try
            {
                await _errorLogger.LogGameErrorAsync(new GameErrorLogEntry
                {
                    ErrorCode = errorCode,
                    Message = exception.Message,
                    GameObject = gameObject?.Name,
                    Scene = _gameState.CurrentScene,
                    PlayerPosition = gameObject?.Position,
                    Timestamp = DateTime.UtcNow
                });

                // Attempt recovery
                var strategy = FindRecoveryStrategy(errorCode);
                if (strategy != null)
                {
                    result.RecoveryAttempted = true;
                    result.RecoverySuccessful = await strategy.RecoverAsync(_gameState, gameObject, exception);
                }

                // Record error
                RecordError(errorCode, exception);

                OnGameErrorOccurred(new GameErrorEventArgs
                {
                    ErrorCode = errorCode,
                    Message = exception.Message,
                    CanRecover = result.RecoverySuccessful
                });
            }
            catch (Exception ex)
            {
                await _errorLogger.LogGameErrorAsync(new GameErrorLogEntry
                {
                    ErrorCode = "GAME_999",
                    Message = $"Game error handler failed: {ex.Message}",
                    Timestamp = DateTime.UtcNow
                });
            }

            return result;
        }

        /// <summary>
        /// Handles physics simulation errors
        /// </summary>
        public async Task<GameErrorResult> HandlePhysicsErrorAsync(Exception exception, GameObject affectedObject)
        {
            var errorCode = "GAME_005"; // Physics error
            var result = new GameErrorResult
            {
                ErrorCode = errorCode,
                Exception = exception,
                GameObject = affectedObject,
                IsPhysicsError = true
            };

            try
            {
                await _errorLogger.LogGameErrorAsync(new GameErrorLogEntry
                {
                    ErrorCode = errorCode,
                    Message = $"Physics error in {affectedObject.Name}: {exception.Message}",
                    GameObject = affectedObject.Name,
                    Scene = _gameState.CurrentScene
                });

                // Reset physics state
                if (affectedObject.Rigidbody != null)
                {
                    affectedObject.Rigidbody.ResetPhysicsState();
                    affectedObject.Rigidbody.Velocity = Vector3.Zero;
                    result.RecoverySuccessful = true;
                }

                OnPhysicsErrorOccurred(new PhysicsErrorEventArgs
                {
                    ErrorCode = errorCode,
                    AffectedObject = affectedObject.Name,
                    Recovered = result.RecoverySuccessful
                });
            }
            catch (Exception ex)
            {
                await _errorLogger.LogGameErrorAsync(new GameErrorLogEntry
                {
                    ErrorCode = "GAME_999",
                    Message = $"Physics error recovery failed: {ex.Message}"
                });
            }

            return result;
        }

        /// <summary>
        /// Handles script execution errors
        /// </summary>
        public async Task<GameErrorResult> HandleScriptErrorAsync(Exception exception, GameScript script)
        {
            var errorCode = DetermineScriptErrorCode(exception);
            var result = new GameErrorResult
            {
                ErrorCode = errorCode,
                Exception = exception,
                ScriptName = script?.Name,
                IsScriptError = true
            };

            try
            {
                await _errorLogger.LogGameErrorAsync(new GameErrorLogEntry
                {
                    ErrorCode = errorCode,
                    Message = $"Script error in {script.Name}: {exception.Message}",
                    ScriptName = script.Name,
                    LineNumber = ExtractLineNumber(exception),
                    Timestamp = DateTime.UtcNow
                });

                // Disable script to prevent cascade errors
                script.IsEnabled = false;
                result.RecoverySuccessful = true;

                // Try to recover if error is minor
                if (IsPotentiallyRecoverable(exception))
                {
                    // TODO: Attempt script reload/reset
                    result.RecoverySuccessful = true;
                }

                OnScriptErrorOccurred(new ScriptErrorEventArgs
                {
                    ErrorCode = errorCode,
                    ScriptName = script.Name,
                    LineNumber = ExtractLineNumber(exception),
                    ScriptDisabled = true
                });
            }
            catch (Exception ex)
            {
                await _errorLogger.LogGameErrorAsync(new GameErrorLogEntry
                {
                    ErrorCode = "GAME_999",
                    Message = $"Script error recovery failed: {ex.Message}"
                });
            }

            return result;
        }

        // =====================================================================
        // Error Detection & Classification
        // =====================================================================

        private string DetermineGameErrorCode(Exception exception)
        {
            return exception switch
            {
                ArgumentNullException => "GAME_001",
                InvalidOperationException => "GAME_004",
                NullReferenceException => "GAME_008",
                IndexOutOfRangeException => "GAME_009",
                _ => "GAME_999"
            };
        }

        private string DetermineScriptErrorCode(Exception exception)
        {
            return exception switch
            {
                ArgumentNullException => "LOGIC_002",
                DivideByZeroException => "LOGIC_005",
                InvalidOperationException => "LOGIC_004",
                TimeoutException => "LOGIC_001",
                _ => "LOGIC_999"
            };
        }

        private bool IsPotentiallyRecoverable(Exception exception)
        {
            return !(exception is StackOverflowException ||
                     exception is OutOfMemoryException);
        }

        private int ExtractLineNumber(Exception exception)
        {
            var stackTrace = new System.Diagnostics.StackTrace(exception, true);
            if (stackTrace.FrameCount > 0)
            {
                return stackTrace.GetFrame(0).GetFileLineNumber();
            }
            return -1;
        }

        // =====================================================================
        // Recovery Strategies
        // =====================================================================

        private List<GameErrorRecoveryStrategy> InitializeRecoveryStrategies()
        {
            return new List<GameErrorRecoveryStrategy>
            {
                new ResetPhysicsStrategy { TargetErrorCode = "GAME_005" },
                new ReloadScriptStrategy { TargetErrorCode = "LOGIC_002" },
                new RestartGameObjectStrategy { TargetErrorCode = "GAME_001" },
                new RollbackStateStrategy { TargetErrorCode = "GAME_004" },
                new DisableGameObjectStrategy { TargetErrorCode = "GAME_999" }
            };
        }

        private GameErrorRecoveryStrategy FindRecoveryStrategy(string errorCode)
        {
            return _recoveryStrategies.FirstOrDefault(s => s.TargetErrorCode == errorCode);
        }

        // =====================================================================
        // Error History & Analysis
        // =====================================================================

        private void RecordError(string errorCode, Exception exception)
        {
            var key = errorCode + "_" + DateTime.UtcNow.Ticks;
            _errorHistory[key] = new ErrorRecord
            {
                ErrorCode = errorCode,
                Exception = exception,
                Timestamp = DateTime.UtcNow
            };

            // Keep only recent errors (limit to 500)
            if (_errorHistory.Count > 500)
            {
                var oldestKey = _errorHistory.OrderBy(x => x.Value.Timestamp).First().Key;
                _errorHistory.Remove(oldestKey);
            }
        }

        public List<ErrorRecord> GetErrorHistory(string errorCode, int count = 20)
        {
            return _errorHistory
                .Where(x => x.Value.ErrorCode == errorCode)
                .OrderByDescending(x => x.Value.Timestamp)
                .Take(count)
                .Select(x => x.Value)
                .ToList();
        }

        public bool IsErrorRecurring(string errorCode, int withinSeconds = 60)
        {
            var cutoff = DateTime.UtcNow.AddSeconds(-withinSeconds);
            var recentErrors = _errorHistory
                .Where(x => x.Value.ErrorCode == errorCode && x.Value.Timestamp > cutoff)
                .Count();

            return recentErrors >= 3; // 3+ errors in timeframe = recurring
        }

        // =====================================================================
        // Event Handlers
        // =====================================================================

        protected virtual void OnGameErrorOccurred(GameErrorEventArgs e)
        {
            GameErrorOccurred?.Invoke(this, e);
        }

        protected virtual void OnPhysicsErrorOccurred(PhysicsErrorEventArgs e)
        {
            PhysicsErrorOccurred?.Invoke(this, e);
        }

        protected virtual void OnScriptErrorOccurred(ScriptErrorEventArgs e)
        {
            ScriptErrorOccurred?.Invoke(this, e);
        }
    }

    // =========================================================================
    // Recovery Strategies
    // =========================================================================

    public abstract class GameErrorRecoveryStrategy
    {
        public string TargetErrorCode { get; set; }

        public abstract Task<bool> RecoverAsync(GameState gameState, GameObject gameObject, Exception exception);
    }

    public class ResetPhysicsStrategy : GameErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(GameState gameState, GameObject gameObject, Exception exception)
        {
            try
            {
                if (gameObject?.Rigidbody != null)
                {
                    gameObject.Rigidbody.ResetPhysicsState();
                    gameObject.Rigidbody.Velocity = Vector3.Zero;
                    await Task.Delay(100);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }
    }

    public class ReloadScriptStrategy : GameErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(GameState gameState, GameObject gameObject, Exception exception)
        {
            try
            {
                // TODO: Implement script reload logic
                await Task.Delay(500);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class RestartGameObjectStrategy : GameErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(GameState gameState, GameObject gameObject, Exception exception)
        {
            try
            {
                if (gameObject != null)
                {
                    gameObject.Reset();
                    await Task.Delay(200);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }
    }

    public class RollbackStateStrategy : GameErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(GameState gameState, GameObject gameObject, Exception exception)
        {
            try
            {
                // TODO: Implement state rollback to last valid checkpoint
                await Task.Delay(300);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class DisableGameObjectStrategy : GameErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(GameState gameState, GameObject gameObject, Exception exception)
        {
            try
            {
                if (gameObject != null)
                {
                    gameObject.IsActive = false;
                    await Task.Delay(100);
                    return true;
                }
                return false;
            }
            catch
            {
                return false;
            }
        }
    }

    // =========================================================================
    // Result & Event Models
    // =========================================================================

    public class GameErrorResult
    {
        public string ErrorCode { get; set; }
        public Exception Exception { get; set; }
        public DateTime Timestamp { get; set; }
        public GameObject GameObject { get; set; }
        public string ScriptName { get; set; }
        public bool RecoveryAttempted { get; set; }
        public bool RecoverySuccessful { get; set; }
        public bool IsPhysicsError { get; set; }
        public bool IsScriptError { get; set; }
    }

    public class GameErrorEventArgs : EventArgs
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public bool CanRecover { get; set; }
    }

    public class PhysicsErrorEventArgs : EventArgs
    {
        public string ErrorCode { get; set; }
        public string AffectedObject { get; set; }
        public bool Recovered { get; set; }
    }

    public class ScriptErrorEventArgs : EventArgs
    {
        public string ErrorCode { get; set; }
        public string ScriptName { get; set; }
        public int LineNumber { get; set; }
        public bool ScriptDisabled { get; set; }
    }

    public class ErrorRecord
    {
        public string ErrorCode { get; set; }
        public Exception Exception { get; set; }
        public DateTime Timestamp { get; set; }
    }

    // =========================================================================
    // Game State Models
    // =========================================================================

    public class GameState
    {
        public string CurrentScene { get; set; }
        public List<GameObject> GameObjects { get; set; } = new();
        public Vector3 LastCheckpointPosition { get; set; }
    }

    public class GameObject
    {
        public string Name { get; set; }
        public Vector3 Position { get; set; }
        public bool IsActive { get; set; }
        public Rigidbody Rigidbody { get; set; }

        public void Reset()
        {
            // Reset to default state
        }
    }

    public class Rigidbody
    {
        public Vector3 Velocity { get; set; }

        public void ResetPhysicsState()
        {
            Velocity = Vector3.Zero;
        }
    }

    public class GameScript
    {
        public string Name { get; set; }
        public bool IsEnabled { get; set; }
    }

    public struct Vector3
    {
        public float X { get; set; }
        public float Y { get; set; }
        public float Z { get; set; }

        public static Vector3 Zero => new Vector3 { X = 0, Y = 0, Z = 0 };
    }

    // =========================================================================
    // Error Logging
    // =========================================================================

    public interface IGameErrorLogger
    {
        Task LogGameErrorAsync(GameErrorLogEntry entry);
        Task<List<GameErrorLogEntry>> GetRecentErrorsAsync(int count = 50);
    }

    public class GameErrorLogEntry
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public string GameObject { get; set; }
        public string ScriptName { get; set; }
        public string Scene { get; set; }
        public Vector3? PlayerPosition { get; set; }
        public int LineNumber { get; set; }
        public DateTime Timestamp { get; set; }
    }

    public class GameErrorLogger : IGameErrorLogger
    {
        private readonly List<GameErrorLogEntry> _errors = new();

        public Task LogGameErrorAsync(GameErrorLogEntry entry)
        {
            _errors.Add(entry);

            // Keep only last 200 errors
            if (_errors.Count > 200)
                _errors.RemoveAt(0);

            // TODO: Save to local storage
            // TODO: Send critical errors to server
            return Task.CompletedTask;
        }

        public Task<List<GameErrorLogEntry>> GetRecentErrorsAsync(int count = 50)
        {
            return Task.FromResult(_errors.TakeLast(count).ToList());
        }
    }
}
