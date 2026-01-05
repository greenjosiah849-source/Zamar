using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Zamar.Services
{
    /// <summary>
    /// Error recovery service with exponential backoff, circuit breaker, and fallback strategies
    /// Handles automatic recovery from transient errors
    /// </summary>
    public class ErrorRecoveryService
    {
        private readonly IErrorRecoveryLogger _logger;
        private Dictionary<string, CircuitBreaker> _circuitBreakers = new();
        private Dictionary<string, RetryPolicy> _retryPolicies = new();

        public event EventHandler<RecoveryProgressEventArgs> RecoveryProgress;
        public event EventHandler<CircuitBreakerStateChangedEventArgs> CircuitBreakerStateChanged;

        public ErrorRecoveryService(IErrorRecoveryLogger logger)
        {
            _logger = logger;
            InitializeCircuitBreakers();
            InitializeRetryPolicies();
        }

        // =====================================================================
        // Main Recovery Methods
        // =====================================================================

        /// <summary>
        /// Executes a recovery operation with automatic retry and circuit breaker
        /// </summary>
        public async Task<RecoveryResult> RecoverAsync(
            Func<Task> operation,
            string operationName,
            int maxRetries = 3,
            int initialDelayMs = 1000)
        {
            var result = new RecoveryResult
            {
                OperationName = operationName,
                StartTime = DateTime.UtcNow
            };

            // Check circuit breaker
            var breaker = GetOrCreateCircuitBreaker(operationName);
            if (breaker.State == CircuitBreakerState.Open)
            {
                result.Success = false;
                result.Reason = "Circuit breaker is open - too many recent failures";
                await _logger.LogRecoveryAttemptAsync(new RecoveryLogEntry
                {
                    OperationName = operationName,
                    Reason = result.Reason,
                    Success = false
                });
                return result;
            }

            // Attempt recovery with exponential backoff
            for (int attempt = 1; attempt <= maxRetries; attempt++)
            {
                try
                {
                    OnRecoveryProgress(new RecoveryProgressEventArgs
                    {
                        OperationName = operationName,
                        Attempt = attempt,
                        MaxAttempts = maxRetries
                    });

                    await operation();

                    result.Success = true;
                    result.Attempts = attempt;
                    breaker.RecordSuccess();

                    await _logger.LogRecoveryAttemptAsync(new RecoveryLogEntry
                    {
                        OperationName = operationName,
                        Success = true,
                        Attempts = attempt,
                        TotalDurationMs = (int)(DateTime.UtcNow - result.StartTime).TotalMilliseconds
                    });

                    return result;
                }
                catch (Exception ex)
                {
                    result.LastException = ex;

                    if (attempt < maxRetries)
                    {
                        // Calculate exponential backoff delay
                        int delayMs = initialDelayMs * (int)Math.Pow(2, attempt - 1);
                        delayMs = Math.Min(delayMs, 30000); // Cap at 30 seconds
                        
                        await Task.Delay(delayMs);
                    }
                    else
                    {
                        // All retries exhausted
                        result.Success = false;
                        result.Attempts = attempt;
                        breaker.RecordFailure();

                        // Check if should open circuit
                        if (breaker.FailureCount >= 5)
                        {
                            breaker.Open();
                            OnCircuitBreakerStateChanged(new CircuitBreakerStateChangedEventArgs
                            {
                                OperationName = operationName,
                                NewState = CircuitBreakerState.Open
                            });
                        }

                        await _logger.LogRecoveryAttemptAsync(new RecoveryLogEntry
                        {
                            OperationName = operationName,
                            Success = false,
                            Attempts = attempt,
                            ErrorMessage = ex.Message
                        });
                    }
                }
            }

            result.EndTime = DateTime.UtcNow;
            return result;
        }

        /// <summary>
        /// Executes operation with fallback strategy
        /// </summary>
        public async Task<T> RecoverWithFallbackAsync<T>(
            Func<Task<T>> primaryOperation,
            Func<Task<T>> fallbackOperation,
            string operationName)
        {
            try
            {
                return await primaryOperation();
            }
            catch (Exception primaryEx)
            {
                await _logger.LogRecoveryAttemptAsync(new RecoveryLogEntry
                {
                    OperationName = operationName,
                    Success = false,
                    ErrorMessage = $"Primary operation failed: {primaryEx.Message}"
                });

                try
                {
                    var result = await fallbackOperation();
                    await _logger.LogRecoveryAttemptAsync(new RecoveryLogEntry
                    {
                        OperationName = operationName + "_Fallback",
                        Success = true
                    });
                    return result;
                }
                catch (Exception fallbackEx)
                {
                    await _logger.LogRecoveryAttemptAsync(new RecoveryLogEntry
                    {
                        OperationName = operationName + "_Fallback",
                        Success = false,
                        ErrorMessage = $"Fallback operation also failed: {fallbackEx.Message}"
                    });
                    throw;
                }
            }
        }

        // =====================================================================
        // Circuit Breaker Pattern
        // =====================================================================

        private void InitializeCircuitBreakers()
        {
            var operations = new[]
            {
                "AuthenticateUser",
                "LoadGameFile",
                "UploadGameFile",
                "ConnectToGameServer",
                "SyncPlayerData",
                "FetchGameList",
                "SubmitScore"
            };

            foreach (var op in operations)
            {
                _circuitBreakers[op] = new CircuitBreaker
                {
                    OperationName = op,
                    FailureThreshold = 5,
                    SuccessThreshold = 2,
                    TimeoutMs = 60000 // 1 minute
                };
            }
        }

        private CircuitBreaker GetOrCreateCircuitBreaker(string operationName)
        {
            if (!_circuitBreakers.ContainsKey(operationName))
            {
                _circuitBreakers[operationName] = new CircuitBreaker
                {
                    OperationName = operationName
                };
            }

            var breaker = _circuitBreakers[operationName];

            // Check if should transition from open to half-open
            if (breaker.State == CircuitBreakerState.Open &&
                DateTime.UtcNow - breaker.LastFailureTime > TimeSpan.FromMilliseconds(breaker.TimeoutMs))
            {
                breaker.HalfOpen();
            }

            return breaker;
        }

        // =====================================================================
        // Retry Policies
        // =====================================================================

        private void InitializeRetryPolicies()
        {
            _retryPolicies["Network"] = new RetryPolicy
            {
                Name = "Network",
                MaxRetries = 5,
                InitialDelayMs = 1000,
                BackoffMultiplier = 2.0,
                MaxDelayMs = 30000
            };

            _retryPolicies["Database"] = new RetryPolicy
            {
                Name = "Database",
                MaxRetries = 3,
                InitialDelayMs = 500,
                BackoffMultiplier = 2.0,
                MaxDelayMs = 10000
            };

            _retryPolicies["FileIO"] = new RetryPolicy
            {
                Name = "FileIO",
                MaxRetries = 2,
                InitialDelayMs = 200,
                BackoffMultiplier = 2.0,
                MaxDelayMs = 5000
            };
        }

        public RetryPolicy GetRetryPolicy(string policyName)
        {
            return _retryPolicies.ContainsKey(policyName)
                ? _retryPolicies[policyName]
                : _retryPolicies["Network"]; // Default to network policy
        }

        // =====================================================================
        // Health Check
        // =====================================================================

        public async Task<HealthCheckResult> HealthCheckAsync()
        {
            var result = new HealthCheckResult
            {
                Timestamp = DateTime.UtcNow,
                CircuitBreakerStates = new Dictionary<string, string>()
            };

            foreach (var breaker in _circuitBreakers.Values)
            {
                result.CircuitBreakerStates[breaker.OperationName] = breaker.State.ToString();
            }

            // Check critical operations
            result.IsHealthy = _circuitBreakers.Values
                .Where(b => b.IsCritical)
                .All(b => b.State != CircuitBreakerState.Open);

            await _logger.LogHealthCheckAsync(result);
            return result;
        }

        // =====================================================================
        // Event Handlers
        // =====================================================================

        protected virtual void OnRecoveryProgress(RecoveryProgressEventArgs e)
        {
            RecoveryProgress?.Invoke(this, e);
        }

        protected virtual void OnCircuitBreakerStateChanged(CircuitBreakerStateChangedEventArgs e)
        {
            CircuitBreakerStateChanged?.Invoke(this, e);
        }
    }

    // =========================================================================
    // Circuit Breaker Implementation
    // =========================================================================

    public class CircuitBreaker
    {
        public string OperationName { get; set; }
        public CircuitBreakerState State { get; set; } = CircuitBreakerState.Closed;
        public int FailureCount { get; set; }
        public int SuccessCount { get; set; }
        public int FailureThreshold { get; set; } = 5;
        public int SuccessThreshold { get; set; } = 2;
        public int TimeoutMs { get; set; } = 60000;
        public DateTime LastFailureTime { get; set; }
        public bool IsCritical { get; set; } = true;

        public void RecordSuccess()
        {
            FailureCount = 0;

            if (State == CircuitBreakerState.HalfOpen)
            {
                SuccessCount++;
                if (SuccessCount >= SuccessThreshold)
                {
                    Close();
                }
            }
        }

        public void RecordFailure()
        {
            FailureCount++;
            LastFailureTime = DateTime.UtcNow;
            SuccessCount = 0;
        }

        public void Open()
        {
            State = CircuitBreakerState.Open;
        }

        public void Close()
        {
            State = CircuitBreakerState.Closed;
            FailureCount = 0;
            SuccessCount = 0;
        }

        public void HalfOpen()
        {
            State = CircuitBreakerState.HalfOpen;
            SuccessCount = 0;
        }
    }

    public enum CircuitBreakerState
    {
        Closed,      // Normal operation
        Open,        // Failing, reject requests
        HalfOpen     // Testing if recovered
    }

    // =========================================================================
    // Retry Policy
    // =========================================================================

    public class RetryPolicy
    {
        public string Name { get; set; }
        public int MaxRetries { get; set; } = 3;
        public int InitialDelayMs { get; set; } = 1000;
        public double BackoffMultiplier { get; set; } = 2.0;
        public int MaxDelayMs { get; set; } = 30000;

        public int CalculateDelay(int attempt)
        {
            int delay = (int)(InitialDelayMs * Math.Pow(BackoffMultiplier, attempt - 1));
            return Math.Min(delay, MaxDelayMs);
        }
    }

    // =========================================================================
    // Result & Event Models
    // =========================================================================

    public class RecoveryResult
    {
        public string OperationName { get; set; }
        public bool Success { get; set; }
        public int Attempts { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Reason { get; set; }
        public Exception LastException { get; set; }

        public TimeSpan Duration => EndTime - StartTime;
    }

    public class RecoveryProgressEventArgs : EventArgs
    {
        public string OperationName { get; set; }
        public int Attempt { get; set; }
        public int MaxAttempts { get; set; }
    }

    public class CircuitBreakerStateChangedEventArgs : EventArgs
    {
        public string OperationName { get; set; }
        public CircuitBreakerState NewState { get; set; }
    }

    public class HealthCheckResult
    {
        public DateTime Timestamp { get; set; }
        public bool IsHealthy { get; set; }
        public Dictionary<string, string> CircuitBreakerStates { get; set; }
    }

    // =========================================================================
    // Error Recovery Logging
    // =========================================================================

    public interface IErrorRecoveryLogger
    {
        Task LogRecoveryAttemptAsync(RecoveryLogEntry entry);
        Task LogHealthCheckAsync(HealthCheckResult result);
        Task<List<RecoveryLogEntry>> GetRecentRecoveriesAsync(int count = 50);
    }

    public class RecoveryLogEntry
    {
        public string OperationName { get; set; }
        public bool Success { get; set; }
        public int Attempts { get; set; }
        public string ErrorMessage { get; set; }
        public string Reason { get; set; }
        public int TotalDurationMs { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }

    public class ErrorRecoveryLogger : IErrorRecoveryLogger
    {
        private readonly List<RecoveryLogEntry> _logs = new();
        private readonly List<HealthCheckResult> _healthChecks = new();

        public Task LogRecoveryAttemptAsync(RecoveryLogEntry entry)
        {
            entry.Timestamp = DateTime.UtcNow;
            _logs.Add(entry);

            // Keep only last 500 entries
            if (_logs.Count > 500)
                _logs.RemoveAt(0);

            // TODO: Save to persistent storage
            // TODO: Send critical failures to monitoring system
            return Task.CompletedTask;
        }

        public Task LogHealthCheckAsync(HealthCheckResult result)
        {
            _healthChecks.Add(result);

            // Keep only last 100 checks
            if (_healthChecks.Count > 100)
                _healthChecks.RemoveAt(0);

            // TODO: Save to persistent storage
            return Task.CompletedTask;
        }

        public Task<List<RecoveryLogEntry>> GetRecentRecoveriesAsync(int count = 50)
        {
            return Task.FromResult(_logs.TakeLast(count).ToList());
        }
    }
}
