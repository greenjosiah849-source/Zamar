using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace Zamar.Services
{
    /// <summary>
    /// Global error handler for server-side errors with standardized responses
    /// </summary>
    public class ServerErrorHandler
    {
        private readonly IErrorLogger _errorLogger;
        private const string ERROR_CODE_PREFIX = "SRV_";

        public ServerErrorHandler(IErrorLogger errorLogger)
        {
            _errorLogger = errorLogger;
        }

        /// <summary>
        /// Handles all server exceptions and returns standardized error response
        /// </summary>
        public async Task HandleExceptionAsync(HttpContext context, Exception exception)
        {
            var response = context.Response;
            response.ContentType = "application/json";

            var errorResponse = BuildErrorResponse(exception);
            
            // Log error
            await _errorLogger.LogErrorAsync(new ErrorLogEntry
            {
                ErrorCode = errorResponse.Code,
                Message = errorResponse.Message,
                Exception = exception,
                Timestamp = DateTime.UtcNow,
                Severity = GetSeverity(exception)
            });

            // Set status code
            response.StatusCode = errorResponse.StatusCode;

            // Send response
            await response.WriteAsJsonAsync(errorResponse);
        }

        private ErrorResponse BuildErrorResponse(Exception exception)
        {
            return exception switch
            {
                UnauthorizedAccessException => new ErrorResponse
                {
                    Code = "AUTH_006",
                    Message = "Invalid authentication token",
                    StatusCode = 401
                },
                ArgumentNullException ex => new ErrorResponse
                {
                    Code = "SRV_007",
                    Message = $"Missing required field: {ex.ParamName}",
                    StatusCode = 400
                },
                ArgumentException ex => new ErrorResponse
                {
                    Code = "SRV_008",
                    Message = $"Invalid value: {ex.Message}",
                    StatusCode = 400
                },
                InvalidOperationException => new ErrorResponse
                {
                    Code = "LOGIC_004",
                    Message = "This operation is not allowed",
                    StatusCode = 400
                },
                KeyNotFoundException => new ErrorResponse
                {
                    Code = "SRV_009",
                    Message = "Resource not found",
                    StatusCode = 404
                },
                TimeoutException => new ErrorResponse
                {
                    Code = "SYS_002",
                    Message = "Operation timed out",
                    StatusCode = 408
                },
                OperationCanceledException => new ErrorResponse
                {
                    Code = "SRV_001",
                    Message = "Operation was cancelled",
                    StatusCode = 500
                },
                DbUpdateException => new ErrorResponse
                {
                    Code = "SRV_003",
                    Message = "Failed to update database",
                    StatusCode = 500
                },
                _ => new ErrorResponse
                {
                    Code = "SYS_001",
                    Message = "An unknown error occurred",
                    StatusCode = 500
                }
            };
        }

        private ErrorSeverity GetSeverity(Exception exception)
        {
            return exception switch
            {
                UnauthorizedAccessException => ErrorSeverity.Medium,
                ArgumentException => ErrorSeverity.Low,
                TimeoutException => ErrorSeverity.Medium,
                _ => ErrorSeverity.High
            };
        }
    }

    /// <summary>
    /// Error handler middleware for ASP.NET Core
    /// </summary>
    public class ErrorHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IErrorLogger _logger;

        public ErrorHandlingMiddleware(RequestDelegate next, IErrorLogger logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Validate request
                ValidateRequest(context);

                // Continue pipeline
                await _next(context);

                // Check for error status codes
                if (context.Response.StatusCode >= 400)
                {
                    await HandleErrorResponse(context);
                }
            }
            catch (Exception ex)
            {
                var errorHandler = new ServerErrorHandler(_logger);
                await errorHandler.HandleExceptionAsync(context, ex);
            }
        }

        private void ValidateRequest(HttpContext context)
        {
            // Check for required headers
            if (!context.Request.Headers.ContainsKey("Authorization") && 
                !IsPublicEndpoint(context.Request.Path))
            {
                throw new UnauthorizedAccessException("Missing authorization header");
            }
        }

        private async Task HandleErrorResponse(HttpContext context)
        {
            // Convert error status to error response
            var statusCode = context.Response.StatusCode;
            var errorCode = statusCode switch
            {
                400 => "SRV_006",
                401 => "AUTH_006",
                403 => "SRV_010",
                404 => "SRV_009",
                429 => "SRV_005",
                500 => "SRV_001",
                503 => "SRV_004",
                _ => "SYS_001"
            };

            var errorResponse = new ErrorResponse
            {
                Code = errorCode,
                Message = GetErrorMessage(statusCode),
                StatusCode = statusCode
            };

            await context.Response.WriteAsJsonAsync(errorResponse);
        }

        private bool IsPublicEndpoint(PathString path)
        {
            var publicPaths = new[] { "/api/auth/login", "/api/auth/register", "/api/health" };
            var pathValue = path.Value.ToLower();
            
            foreach (var publicPath in publicPaths)
            {
                if (pathValue.Contains(publicPath))
                    return true;
            }
            return false;
        }

        private string GetErrorMessage(int statusCode)
        {
            return statusCode switch
            {
                400 => "Invalid request format",
                401 => "Authentication required",
                403 => "Access forbidden",
                404 => "Resource not found",
                429 => "Too many requests",
                500 => "Internal server error",
                503 => "Service unavailable",
                _ => "Unknown error"
            };
        }
    }

    /// <summary>
    /// Validates API requests and returns standardized error responses
    /// </summary>
    public class RequestValidator
    {
        /// <summary>
        /// Validates required fields in request
        /// </summary>
        public ValidationResult ValidateRequired(object obj, params string[] fieldNames)
        {
            var errors = new List<ValidationError>();

            foreach (var fieldName in fieldNames)
            {
                var property = obj.GetType().GetProperty(fieldName);
                if (property == null)
                {
                    errors.Add(new ValidationError
                    {
                        Code = "SRV_007",
                        Field = fieldName,
                        Message = $"Missing required field: {fieldName}"
                    });
                    continue;
                }

                var value = property.GetValue(obj);
                if (value == null || (value is string str && string.IsNullOrWhiteSpace(str)))
                {
                    errors.Add(new ValidationError
                    {
                        Code = "SRV_007",
                        Field = fieldName,
                        Message = $"Missing required field: {fieldName}"
                    });
                }
            }

            return new ValidationResult { Errors = errors, IsValid = errors.Count == 0 };
        }

        /// <summary>
        /// Validates field lengths
        /// </summary>
        public ValidationResult ValidateLength(string value, string fieldName, int minLength, int maxLength)
        {
            var errors = new List<ValidationError>();

            if (value == null)
                return new ValidationResult { Errors = errors, IsValid = true };

            if (value.Length < minLength || value.Length > maxLength)
            {
                errors.Add(new ValidationError
                {
                    Code = "SRV_008",
                    Field = fieldName,
                    Message = $"{fieldName} must be between {minLength} and {maxLength} characters"
                });
            }

            return new ValidationResult { Errors = errors, IsValid = errors.Count == 0 };
        }

        /// <summary>
        /// Validates email format
        /// </summary>
        public ValidationResult ValidateEmail(string email)
        {
            var errors = new List<ValidationError>();

            if (string.IsNullOrWhiteSpace(email) || !email.Contains("@"))
            {
                errors.Add(new ValidationError
                {
                    Code = "SRV_008",
                    Field = "email",
                    Message = "Invalid email format"
                });
            }

            return new ValidationResult { Errors = errors, IsValid = errors.Count == 0 };
        }

        /// <summary>
        /// Validates password strength
        /// </summary>
        public ValidationResult ValidatePassword(string password)
        {
            var errors = new List<ValidationError>();

            if (string.IsNullOrWhiteSpace(password))
            {
                errors.Add(new ValidationError
                {
                    Code = "SRV_007",
                    Field = "password",
                    Message = "Password is required"
                });
                return new ValidationResult { Errors = errors, IsValid = false };
            }

            if (password.Length < 8)
            {
                errors.Add(new ValidationError
                {
                    Code = "SRV_008",
                    Field = "password",
                    Message = "Password must be at least 8 characters"
                });
            }

            if (!password.Any(char.IsUpper))
            {
                errors.Add(new ValidationError
                {
                    Code = "SRV_008",
                    Field = "password",
                    Message = "Password must contain uppercase letter"
                });
            }

            if (!password.Any(char.IsDigit))
            {
                errors.Add(new ValidationError
                {
                    Code = "SRV_008",
                    Field = "password",
                    Message = "Password must contain digit"
                });
            }

            return new ValidationResult { Errors = errors, IsValid = errors.Count == 0 };
        }
    }

    /// <summary>
    /// Result validation response
    /// </summary>
    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<ValidationError> Errors { get; set; } = new();

        public void ThrowIfInvalid()
        {
            if (!IsValid)
                throw new ValidationException($"Validation failed: {string.Join(", ", Errors.Select(e => e.Message))}");
        }
    }

    public class ValidationError
    {
        public string Code { get; set; }
        public string Field { get; set; }
        public string Message { get; set; }
    }

    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }

    public class DbUpdateException : Exception
    {
        public DbUpdateException(string message) : base(message) { }
    }

    /// <summary>
    /// Standardized error response format
    /// </summary>
    public class ErrorResponse
    {
        public string Code { get; set; }
        public string Message { get; set; }
        public int StatusCode { get; set; }
        public Dictionary<string, object> Details { get; set; } = new();
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string TraceId { get; set; }
    }

    /// <summary>
    /// Error logging interface and implementation
    /// </summary>
    public interface IErrorLogger
    {
        Task LogErrorAsync(ErrorLogEntry entry);
        Task<List<ErrorLogEntry>> GetErrorsAsync(string errorCode, int limit = 100);
    }

    public class ErrorLogEntry
    {
        public string ErrorCode { get; set; }
        public string Message { get; set; }
        public Exception Exception { get; set; }
        public DateTime Timestamp { get; set; }
        public ErrorSeverity Severity { get; set; }
        public string StackTrace { get; set; }
        public Dictionary<string, object> Context { get; set; } = new();
    }

    public enum ErrorSeverity
    {
        Low,      // Can be ignored
        Medium,   // Should be handled
        High,     // Critical, needs attention
        Critical  // System down
    }

    /// <summary>
    /// Database error logger implementation
    /// </summary>
    public class DatabaseErrorLogger : IErrorLogger
    {
        private readonly List<ErrorLogEntry> _errors = new(); // In-memory for demo

        public Task LogErrorAsync(ErrorLogEntry entry)
        {
            entry.StackTrace = entry.Exception?.StackTrace;
            _errors.Add(entry);

            // TODO: Save to database
            // TODO: Send alert if critical
            // TODO: Send to monitoring service

            return Task.CompletedTask;
        }

        public Task<List<ErrorLogEntry>> GetErrorsAsync(string errorCode, int limit = 100)
        {
            var errors = _errors
                .Where(e => e.ErrorCode == errorCode)
                .OrderByDescending(e => e.Timestamp)
                .Take(limit)
                .ToList();

            return Task.FromResult(errors);
        }
    }
}
