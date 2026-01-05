using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

namespace Zamar.Services
{
    /// <summary>
    /// Client-side security module that prevents memory manipulation,
    /// script injection, and unauthorized modifications
    /// </summary>
    public class ClientSecurityModule
    {
        private List<MemoryCheckpoint> _memoryCheckpoints = new();
        private List<string> _approvedScripts = new();
        private Dictionary<string, string> _objectHashes = new();
        private bool _isIntegrityCompromised = false;
        private DateTime _lastSecurityCheck = DateTime.UtcNow;

        // =====================================================================
        // Memory Protection
        // =====================================================================

        /// <summary>
        /// Creates a checkpoint of critical game state
        /// </summary>
        public void CreateMemoryCheckpoint(object gameState, string checkpointName)
        {
            var checkpoint = new MemoryCheckpoint
            {
                Name = checkpointName,
                Timestamp = DateTime.UtcNow,
                Hash = HashObject(gameState),
                ObjectType = gameState.GetType().FullName
            };

            _memoryCheckpoints.Add(checkpoint);
        }

        /// <summary>
        /// Verifies game state hasn't been tampered with
        /// </summary>
        public bool VerifyMemoryIntegrity(object gameState, string checkpointName)
        {
            var checkpoint = _memoryCheckpoints.Find(c => c.Name == checkpointName);
            if (checkpoint == null)
                return false;

            var currentHash = HashObject(gameState);
            return currentHash == checkpoint.Hash;
        }

        private string HashObject(object obj)
        {
            try
            {
                var json = System.Text.Json.JsonSerializer.Serialize(obj);
                using (var sha = SHA256.Create())
                {
                    var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(json));
                    return Convert.ToBase64String(hash);
                }
            }
            catch
            {
                return "";
            }
        }

        // =====================================================================
        // Script Validation
        // =====================================================================

        /// <summary>
        /// Whitelist a script as safe to execute
        /// </summary>
        public void WhitelistScript(string scriptName, string scriptHash)
        {
            _approvedScripts.Add($"{scriptName}:{scriptHash}");
        }

        /// <summary>
        /// Validates script before execution
        /// </summary>
        public bool IsScriptSafe(string scriptCode)
        {
            // Check for dangerous patterns
            var dangerousPatterns = new[]
            {
                "System.Reflection",
                "System.IO.File",
                "System.Diagnostics",
                "ProcessStartInfo",
                "System.Net.Sockets",
                "eval(",
                "exec(",
                "require('child_process')",
                "__proto__",
                "constructor",
                "prototype",
                "setTimeout",
                "setInterval"
            };

            foreach (var pattern in dangerousPatterns)
            {
                if (scriptCode.Contains(pattern, StringComparison.OrdinalIgnoreCase))
                    return false;
            }

            return true;
        }

        /// <summary>
        /// Sandboxes script execution with limited capabilities
        /// </summary>
        public object ExecuteSafeScript(string scriptCode, Dictionary<string, object> context)
        {
            if (!IsScriptSafe(scriptCode))
            {
                LogSecurityEvent("DANGEROUS_SCRIPT", "Script contains forbidden patterns");
                _isIntegrityCompromised = true;
                return null;
            }

            // In real implementation, would use AppDomain sandboxing or runtime restrictions
            try
            {
                // Execute with restricted capabilities
                return ExecuteWithRestrictions(scriptCode, context);
            }
            catch (Exception ex)
            {
                LogSecurityEvent("SCRIPT_EXECUTION_ERROR", ex.Message);
                return null;
            }
        }

        private object ExecuteWithRestrictions(string code, Dictionary<string, object> context)
        {
            // Placeholder for sandboxed execution
            // Real implementation would use Roslyn analyzers or similar
            return null;
        }

        // =====================================================================
        // Object Tampering Detection
        // =====================================================================

        /// <summary>
        /// Registers an object for tampering detection
        /// </summary>
        public void RegisterObjectForProtection(string objectId, object obj)
        {
            var hash = HashObject(obj);
            _objectHashes[objectId] = hash;
        }

        /// <summary>
        /// Checks if object has been tampered with
        /// </summary>
        public bool HasObjectBeenTampered(string objectId, object currentObject)
        {
            if (!_objectHashes.TryGetValue(objectId, out var originalHash))
                return false;

            var currentHash = HashObject(currentObject);
            return originalHash != currentHash;
        }

        // =====================================================================
        // Reflection Protection
        // =====================================================================

        /// <summary>
        /// Detects if reflection is being used to modify objects
        /// </summary>
        public bool IsReflectionBeingUsed()
        {
            var stackTrace = new StackTrace();
            foreach (var frame in stackTrace.GetFrames())
            {
                var method = frame.GetMethod();
                if (method.DeclaringType?.Namespace?.Contains("System.Reflection") == true)
                    return true;

                // Check for MethodInfo.Invoke, PropertyInfo.SetValue, etc.
                if (method.Name.Contains("Invoke") || 
                    method.Name.Contains("SetValue") || 
                    method.Name.Contains("CreateInstance"))
                {
                    if (method.DeclaringType?.Namespace?.StartsWith("System") == true)
                        return true;
                }
            }
            return false;
        }

        /// <summary>
        /// Protects against reflection-based attacks
        /// </summary>
        public void GuardAgainstReflection()
        {
            if (IsReflectionBeingUsed())
            {
                LogSecurityEvent("REFLECTION_DETECTED", "Unauthorized reflection attempt");
                _isIntegrityCompromised = true;
            }
        }

        // =====================================================================
        // Input Validation
        // =====================================================================

        /// <summary>
        /// Validates player input to prevent injection
        /// </summary>
        public bool ValidatePlayerInput(string input, string inputType)
        {
            // Prevent command injection
            if (input.Contains(";") || input.Contains("&&") || input.Contains("||"))
                return false;

            // Prevent path traversal
            if (input.Contains("..\\") || input.Contains("../"))
                return false;

            // Prevent SQL injection patterns
            if (input.Contains("'") || input.Contains("\"") || input.Contains("--"))
                return false;

            // Limit input length
            if (input.Length > 1000)
                return false;

            return true;
        }

        /// <summary>
        /// Sanitizes user-provided strings
        /// </summary>
        public string SanitizeInput(string input)
        {
            if (string.IsNullOrEmpty(input))
                return "";

            var dangerous = new[] { "<", ">", "\"", "'", "&", ";", "--", "/*", "*/" };
            var sanitized = input;

            foreach (var pattern in dangerous)
            {
                sanitized = sanitized.Replace(pattern, "");
            }

            return sanitized.Trim();
        }

        // =====================================================================
        // Network Security
        // =====================================================================

        /// <summary>
        /// Validates server communication
        /// </summary>
        public bool ValidateServerResponse(byte[] data, string expectedHash)
        {
            using (var sha = SHA256.Create())
            {
                var actualHash = Convert.ToBase64String(sha.ComputeHash(data));
                return actualHash == expectedHash;
            }
        }

        /// <summary>
        /// Encrypts outgoing data for transmission
        /// </summary>
        public byte[] EncryptOutgoingData(string data, byte[] key, byte[] iv)
        {
            using (var aes = System.Security.Cryptography.Aes.Create())
            {
                aes.Key = key;
                aes.IV = iv;

                using (var encryptor = aes.CreateEncryptor(aes.Key, aes.IV))
                using (var ms = new System.IO.MemoryStream())
                {
                    using (var cs = new System.Security.Cryptography.CryptoStream(ms, encryptor, System.Security.Cryptography.CryptoStreamMode.Write))
                    {
                        var dataBytes = Encoding.UTF8.GetBytes(data);
                        cs.Write(dataBytes, 0, dataBytes.Length);
                        cs.FlushFinalBlock();
                        return ms.ToArray();
                    }
                }
            }
        }

        // =====================================================================
        // Security Monitoring
        // =====================================================================

        /// <summary>
        /// Logs security events for monitoring
        /// </summary>
        public void LogSecurityEvent(string eventType, string details)
        {
            var evt = new SecurityEvent
            {
                Timestamp = DateTime.UtcNow,
                EventType = eventType,
                Details = details,
                ProcessId = Process.GetCurrentProcess().Id
            };

            // Send to server for analysis
            SendToServer(evt);
        }

        private void SendToServer(SecurityEvent evt)
        {
            // TODO: Send to server's security logging endpoint
        }

        /// <summary>
        /// Gets overall security status
        /// </summary>
        public SecurityStatus GetSecurityStatus()
        {
            PerformSecurityCheck();

            return new SecurityStatus
            {
                IsCompromised = _isIntegrityCompromised,
                LastCheckTime = _lastSecurityCheck,
                MemoryCheckpointCount = _memoryCheckpoints.Count,
                DetectedTampering = _isIntegrityCompromised
            };
        }

        private void PerformSecurityCheck()
        {
            _lastSecurityCheck = DateTime.UtcNow;

            // Check for unauthorized processes
            var currentProcess = Process.GetCurrentProcess();
            if (IsDebuggerAttached())
            {
                LogSecurityEvent("DEBUGGER_DETECTED", "Debugger attached to process");
                _isIntegrityCompromised = true;
            }

            // Check for memory tampering
            if (IsReflectionBeingUsed())
            {
                LogSecurityEvent("REFLECTION_DETECTED", "Reflection detected");
                _isIntegrityCompromised = true;
            }
        }

        private bool IsDebuggerAttached()
        {
            return Debugger.IsAttached;
        }

        // =====================================================================
        // Anti-Debugging
        // =====================================================================

        /// <summary>
        /// Detects if code is being debugged and takes action
        /// </summary>
        public bool CheckForDebugger()
        {
            if (Debugger.IsAttached)
            {
                LogSecurityEvent("DEBUGGING_DETECTED", "Debugger attached");
                _isIntegrityCompromised = true;
                return true;
            }

            return false;
        }
    }

    // =========================================================================
    // Security Data Models
    // =========================================================================

    public class MemoryCheckpoint
    {
        public string Name { get; set; }
        public DateTime Timestamp { get; set; }
        public string Hash { get; set; }
        public string ObjectType { get; set; }
    }

    public class SecurityEvent
    {
        public DateTime Timestamp { get; set; }
        public string EventType { get; set; }
        public string Details { get; set; }
        public int ProcessId { get; set; }
    }

    public class SecurityStatus
    {
        public bool IsCompromised { get; set; }
        public DateTime LastCheckTime { get; set; }
        public int MemoryCheckpointCount { get; set; }
        public bool DetectedTampering { get; set; }
    }
}
