using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Zamar.Services
{
    /// <summary>
    /// Client-side error handler with recovery strategies
    /// Handles all client exceptions and connection errors
    /// </summary>
    public class ClientErrorHandler
    {
        private readonly IClientErrorLogger _errorLogger;
        private readonly List<ErrorRecoveryStrategy> _recoveryStrategies;
        private int _errorCount = 0;
        private Dictionary<string, ErrorContext> _errorContexts = new();

        public event EventHandler<ErrorEventArgs> ErrorOccurred;
        public event EventHandler<RecoveryEventArgs> RecoveryAttempted;
        public event EventHandler<FatalErrorEventArgs> FatalErrorOccurred;

        public ClientErrorHandler(IClientErrorLogger errorLogger)
        {
            _errorLogger = errorLogger;
            _recoveryStrategies = InitializeRecoveryStrategies();
        }

        // =====================================================================
        // Main Error Handling
        // =====================================================================

        /// <summary>
        /// Handles a client error with automatic recovery
        /// </summary>
        public async Task<ErrorHandlingResult> HandleErrorAsync(Exception exception, string context = "")
        {
            _errorCount++;
            var errorCode = DetermineErrorCode(exception);
            
            var result = new ErrorHandlingResult
            {
                ErrorCode = errorCode,
                Exception = exception,
                Timestamp = DateTime.UtcNow,
                Context = context
            };

            try
            {
                // Log error
                await _errorLogger.LogErrorAsync(new ClientErrorLogEntry
                {
                    ErrorCode = errorCode,
                    Message = exception.Message,
                    Exception = exception,
                    Context = context,
                    Timestamp = DateTime.UtcNow
                });

                // Find applicable recovery strategy
                var strategy = FindRecoveryStrategy(exception);
                if (strategy != null)
                {
                    result.RecoveryAttempted = true;
                    result.RecoverySuccessful = await strategy.RecoverAsync(exception);

                    OnRecoveryAttempted(new RecoveryEventArgs
                    {
                        ErrorCode = errorCode,
                        Strategy = strategy.Name,
                        Successful = result.RecoverySuccessful
                    });
                }

                // Check if error is fatal
                if (IsFatalError(exception))
                {
                    result.IsFatal = true;
                    OnFatalError(new FatalErrorEventArgs
                    {
                        ErrorCode = errorCode,
                        Message = exception.Message,
                        CanRecovery = result.RecoverySuccessful
                    });
                }

                OnErrorOccurred(new ErrorEventArgs
                {
                    ErrorCode = errorCode,
                    Message = exception.Message,
                    IsFatal = result.IsFatal
                });
            }
            catch (Exception ex)
            {
                // Error in error handler itself
                await _errorLogger.LogErrorAsync(new ClientErrorLogEntry
                {
                    ErrorCode = "CLIENT_999",
                    Message = $"Error handler failed: {ex.Message}",
                    Exception = ex,
                    Timestamp = DateTime.UtcNow
                });
            }

            return result;
        }

        /// <summary>
        /// Handles network errors specifically
        /// </summary>
        public async Task<ErrorHandlingResult> HandleNetworkErrorAsync(Exception exception)
        {
            var errorCode = DetermineNetworkErrorCode(exception);
            var strategy = _recoveryStrategies.FirstOrDefault(s => s.TargetErrorCode == errorCode);

            if (strategy != null)
            {
                var result = await HandleErrorAsync(exception, "Network");
                result.ErrorCode = errorCode;
                return result;
            }

            return await HandleErrorAsync(exception, "Network");
        }

        /// <summary>
        /// Handles game-specific errors
        /// </summary>
        public async Task<ErrorHandlingResult> HandleGameErrorAsync(Exception exception)
        {
            return await HandleErrorAsync(exception, "Game");
        }

        // =====================================================================
        // Error Detection & Classification
        // =====================================================================

        private string DetermineErrorCode(Exception exception)
        {
            return exception switch
            {
                ArgumentNullException => "CLIENT_001",
                OutOfMemoryException => "CLIENT_001",
                AccessViolationException => "CLIENT_002",
                InvalidOperationException => "CLIENT_008",
                TimeoutException => "NET_002",
                IOException => "CLIENT_004",
                _ => "SYS_001"
            };
        }

        private string DetermineNetworkErrorCode(Exception exception)
        {
            return exception switch
            {
                System.Net.WebException we => we.Status switch
                {
                    System.Net.WebExceptionStatus.ConnectFailure => "NET_003",
                    System.Net.WebExceptionStatus.Timeout => "NET_002",
                    System.Net.WebExceptionStatus.NameResolutionFailure => "NET_002",
                    System.Net.WebExceptionStatus.ConnectionClosed => "NET_004",
                    _ => "NET_001"
                },
                System.Net.Sockets.SocketException => "NET_005",
                System.Net.Http.HttpRequestException => "NET_001",
                _ => "NET_001"
            };
        }

        private ErrorRecoveryStrategy FindRecoveryStrategy(Exception exception)
        {
            var errorCode = DetermineErrorCode(exception);
            return _recoveryStrategies.FirstOrDefault(s => s.TargetErrorCode == errorCode) ??
                   _recoveryStrategies.FirstOrDefault(s => s.TargetErrorType == exception.GetType());
        }

        // =====================================================================
        // Recovery Strategies
        // =====================================================================

        private List<ErrorRecoveryStrategy> InitializeRecoveryStrategies()
        {
            return new List<ErrorRecoveryStrategy>
            {
                new RetryStrategy { TargetErrorCode = "NET_001", MaxRetries = 3 },
                new RetryStrategy { TargetErrorCode = "NET_002", MaxRetries = 5 },
                new RetryStrategy { TargetErrorCode = "NET_003", MaxRetries = 3 },
                new RetryStrategy { TargetErrorCode = "SRV_004", MaxRetries = 3 },
                new ClearCacheStrategy { TargetErrorCode = "CLIENT_009" },
                new RestartStrategy { TargetErrorCode = "CLIENT_006" },
                new ReconnectStrategy { TargetErrorCode = "MP_002" }
            };
        }

        // =====================================================================
        // Error Classification
        // =====================================================================

        private bool IsFatalError(Exception exception)
        {
            return exception is OutOfMemoryException ||
                   exception is StackOverflowException ||
                   (exception is UnauthorizedAccessException && _errorCount > 5);
        }

        // =====================================================================
        // Event Handlers
        // =====================================================================

        protected virtual void OnErrorOccurred(ErrorEventArgs e)
        {
            ErrorOccurred?.Invoke(this, e);
        }

        protected virtual void OnRecoveryAttempted(RecoveryEventArgs e)
        {
            RecoveryAttempted?.Invoke(this, e);
        }

        protected virtual void OnFatalError(FatalErrorEventArgs e)
        {
            FatalErrorOccurred?.Invoke(this, e);
        }

        // =====================================================================
        // Error Context Management
        /// </summary>
        public void CaptureErrorContext(string key, object value)
        {
            _errorContexts[key] = new ErrorContext { Key = key, Value = value, CapturedAt = DateTime.UtcNow };
        }

        public object GetErrorContext(string key)
        {
            return _errorContexts.TryGetValue(key, out var context) ? context.Value : null;
        }
    }

    // =========================================================================
    // Recovery Strategies
    // =========================================================================

    public abstract class ErrorRecoveryStrategy
    {
        public string Name { get; set; }
        public string TargetErrorCode { get; set; }
        public Type TargetErrorType { get; set; }

        public abstract Task<bool> RecoverAsync(Exception exception);
    }

    public class RetryStrategy : ErrorRecoveryStrategy
    {
        public int MaxRetries { get; set; } = 3;
        private int _retryCount = 0;

        public override async Task<bool> RecoverAsync(Exception exception)
        {
            while (_retryCount < MaxRetries)
            {
                _retryCount++;
                await Task.Delay(1000 * _retryCount); // Exponential backoff

                try
                {
                    // Retry logic here
                    return true;
                }
                catch
                {
                    if (_retryCount >= MaxRetries)
                        return false;
                }
            }
            return false;
        }
    }

    public class ClearCacheStrategy : ErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(Exception exception)
        {
            try
            {
                // Clear application cache
                // TODO: Implement cache clearing
                await Task.Delay(100);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class RestartStrategy : ErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(Exception exception)
        {
            try
            {
                // Restart application component
                // TODO: Implement restart logic
                await Task.Delay(500);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }

    public class ReconnectStrategy : ErrorRecoveryStrategy
    {
        public override async Task<bool> RecoverAsync(Exception exception)
        {
            try
            {
                // Reconnect to game server
                // TODO: Implement reconnection logic
                await Task.Delay(2000);
                return true;
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

    public class ErrorHandlingResult
    {
        public string ErrorCode { get; set; }
        public Exception Exception { get; set; }
        public DateTime Timestamp { get; set; }
        public string Context { get; set; }
        public bool RecoveryAttempted { get; set; }
        public bool RecoverySuccessful { get; set; }
        public bool IsFatal { get; set; }
        public string UserMessage => GetUserFriendlyMessage(ErrorCode);

        private string GetUserFriendlyMessage(string errorCode)
        {
            return errorCode switch
            {
                "NET_001" => "No internet connection detected. Please check your connection.",
                "NET_002" => "Connection timeout. Please check your internet connection.",
                "CLIENT_001" => "Application is running low on memory. Please close other applications.",
                "CLIENT_002" => "Graphics error occurred. Please update your GPU drivers.",
                "SRV_004" => "Server is temporarily unavailable. Please try again later.",
                "SYS_001" => "An unexpected error occurred. Please try again.",
                _ => "An error occurred. Please try again."
            };
        }
    }

    public class ErrorEventArgs : EventArgs
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public bool IsFatal { get; set; }
    }

    public class RecoveryEventArgs : EventArgs
    {
        public string ErrorCode { get; set; }
        public string Strategy { get; set; }
        public bool Successful { get; set; }
    }

    public class FatalErrorEventArgs : EventArgs
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public bool CanRecovery { get; set; }
    }

    public class ErrorContext
    {
        public string Key { get; set; }
        public object Value { get; set; }
        public DateTime CapturedAt { get; set; }
    }

    // =========================================================================
    // Error Logging
    // =========================================================================

    public interface IClientErrorLogger
    {
        Task LogErrorAsync(ClientErrorLogEntry entry);
        Task<List<ClientErrorLogEntry>> GetRecentErrorsAsync(int count = 50);
        Task SendTelemetryAsync(ClientErrorLogEntry entry);
    }

    public class ClientErrorLogEntry
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public Exception Exception { get; set; }
        public string Context { get; set; }
        public DateTime Timestamp { get; set; }
        public Dictionary<string, object> ContextData { get; set; } = new();
    }

    public class ClientErrorLogger : IClientErrorLogger
    {
        private readonly List<ClientErrorLogEntry> _errors = new();

        public Task LogErrorAsync(ClientErrorLogEntry entry)
        {
            _errors.Add(entry);

            // Keep only last 100 errors
            if (_errors.Count > 100)
                _errors.RemoveAt(0);

            // TODO: Save to local storage
            // TODO: Send to server if critical
            return Task.CompletedTask;
        }

        public Task<List<ClientErrorLogEntry>> GetRecentErrorsAsync(int count = 50)
        {
            return Task.FromResult(_errors.TakeLast(count).ToList());
        }

        public async Task SendTelemetryAsync(ClientErrorLogEntry entry)
        {
            // TODO: Send to telemetry service
            await Task.CompletedTask;
        }
    }
}
