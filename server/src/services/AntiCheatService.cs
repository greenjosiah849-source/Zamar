using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Zamar.Services
{
    /// <summary>
    /// Server-side anti-cheat system that validates all player actions
    /// and detects suspicious behavior patterns
    /// </summary>
    public class AntiCheatService
    {
        private readonly Dictionary<string, PlayerSessionData> _activeSessions = new();
        private readonly Dictionary<string, SuspiciousActivityLog> _activityLogs = new();
        private const double SPEED_HACK_THRESHOLD = 1.5; // 50% faster than possible
        private const double POSITION_VALIDATION_RANGE = 100.0; // Max units per action
        private const int MAX_ACTIONS_PER_SECOND = 20;
        private const double JUMP_HEIGHT_LIMIT = 50.0;

        // =====================================================================
        // Session Management
        // =====================================================================

        /// <summary>
        /// Registers a new player session and creates anti-cheat profile
        /// </summary>
        public void RegisterPlayerSession(string playerId, string sessionId, string gameId)
        {
            _activeSessions[sessionId] = new PlayerSessionData
            {
                PlayerId = playerId,
                SessionId = sessionId,
                GameId = gameId,
                StartTime = DateTime.UtcNow,
                ActionLog = new List<PlayerAction>(),
                Warnings = 0,
                IsSuspicious = false
            };

            _activityLogs[sessionId] = new SuspiciousActivityLog
            {
                PlayerId = playerId,
                SessionId = sessionId,
                Alerts = new List<CheatAlert>()
            };
        }

        /// <summary>
        /// Validates and records a player action
        /// Returns false if action is detected as cheating
        /// </summary>
        public bool ValidatePlayerAction(string sessionId, PlayerAction action)
        {
            if (!_activeSessions.TryGetValue(sessionId, out var session))
                return false;

            // Check for action spam
            if (!ValidateActionFrequency(session, action))
            {
                LogCheatAlert(sessionId, "ACTION_SPAM", $"Player sent {MAX_ACTIONS_PER_SECOND}+ actions/sec");
                return false;
            }

            // Check for position hacks
            if (!ValidatePosition(session, action))
            {
                LogCheatAlert(sessionId, "POSITION_HACK", $"Impossible position change detected");
                return false;
            }

            // Check for speed hacks
            if (!ValidateSpeed(session, action))
            {
                LogCheatAlert(sessionId, "SPEED_HACK", $"Movement speed exceeds threshold");
                return false;
            }

            // Check for height hacks
            if (!ValidateJump(session, action))
            {
                LogCheatAlert(sessionId, "HEIGHT_HACK", $"Jump height exceeds limit: {action.JumpHeight}");
                return false;
            }

            // Check for script injection
            if (!ValidateScript(action))
            {
                LogCheatAlert(sessionId, "SCRIPT_INJECTION", "Malicious script detected in action");
                return false;
            }

            // Check for collision bypass
            if (!ValidateCollisions(session, action))
            {
                LogCheatAlert(sessionId, "COLLISION_BYPASS", "Player passed through solid object");
                return false;
            }

            // Record valid action
            session.ActionLog.Add(action);
            action.Timestamp = DateTime.UtcNow;
            action.IsValidated = true;

            return true;
        }

        // =====================================================================
        // Validation Methods
        // =====================================================================

        private bool ValidateActionFrequency(PlayerSessionData session, PlayerAction action)
        {
            var recentActions = session.ActionLog
                .Where(a => (DateTime.UtcNow - a.Timestamp).TotalSeconds < 1)
                .Count();

            return recentActions < MAX_ACTIONS_PER_SECOND;
        }

        private bool ValidatePosition(PlayerSessionData session, PlayerAction action)
        {
            if (session.ActionLog.Count == 0)
                return true;

            var lastAction = session.ActionLog.Last();
            var distance = CalculateDistance(lastAction.Position, action.Position);
            var timeDelta = (DateTime.UtcNow - lastAction.Timestamp).TotalSeconds;

            // If same position, always valid
            if (distance < 0.1)
                return true;

            // Check if distance exceeds reasonable range
            return distance <= POSITION_VALIDATION_RANGE;
        }

        private bool ValidateSpeed(PlayerSessionData session, PlayerAction action)
        {
            if (session.ActionLog.Count < 2)
                return true;

            var lastAction = session.ActionLog.Last();
            var previousAction = session.ActionLog[session.ActionLog.Count - 2];

            var distance = CalculateDistance(lastAction.Position, action.Position);
            var timeDelta = (DateTime.UtcNow - lastAction.Timestamp).TotalSeconds;

            if (timeDelta <= 0)
                return true;

            var currentSpeed = distance / timeDelta;
            var previousSpeed = CalculateDistance(previousAction.Position, lastAction.Position) / 
                               (lastAction.Timestamp - previousAction.Timestamp).TotalSeconds;

            // Check if speed increased abnormally
            var speedMultiplier = previousSpeed > 0 ? currentSpeed / previousSpeed : 1.0;

            return speedMultiplier <= SPEED_HACK_THRESHOLD;
        }

        private bool ValidateJump(PlayerSessionData session, PlayerAction action)
        {
            // Check jump height is within limits
            if (action.ActionType == "jump" && action.JumpHeight > JUMP_HEIGHT_LIMIT)
                return false;

            return true;
        }

        private bool ValidateScript(PlayerAction action)
        {
            if (string.IsNullOrEmpty(action.ScriptCode))
                return true;

            // Detect common cheat scripts
            var blacklistedPatterns = new[]
            {
                "setPosition",
                "modifyStats",
                "removeCollision",
                "infiniteJump",
                "speedBoost",
                "godMode",
                "teleport",
                "noClip",
                "wallHack",
                "aimbot",
                "esp",
                "clearLogs"
            };

            return !blacklistedPatterns.Any(pattern => 
                action.ScriptCode.ToLower().Contains(pattern.ToLower()));
        }

        private bool ValidateCollisions(PlayerSessionData session, PlayerAction action)
        {
            // Check if player moved through solid object
            if (action.Position.Y < 0) // Below ground
                return false;

            // Server maintains collision map - verify position is valid
            // This would check against actual game world geometry
            return true;
        }

        // =====================================================================
        // Detection Methods
        // =====================================================================

        /// <summary>
        /// Checks for behavioral patterns that indicate cheating
        /// </summary>
        public CheatDetectionResult AnalyzeSession(string sessionId)
        {
            if (!_activeSessions.TryGetValue(sessionId, out var session))
                return null;

            var result = new CheatDetectionResult
            {
                PlayerId = session.PlayerId,
                SessionId = sessionId,
                CheatProbability = 0.0,
                DetectedCheats = new List<string>()
            };

            // Analyze action patterns
            if (session.ActionLog.Count > 10)
            {
                var avgSpeed = CalculateAverageSpeed(session);
                if (avgSpeed > 30.0)
                {
                    result.CheatProbability += 0.3;
                    result.DetectedCheats.Add("Speed Hacking");
                }

                var actionFrequency = session.ActionLog.Count / 
                    (DateTime.UtcNow - session.StartTime).TotalSeconds;
                if (actionFrequency > MAX_ACTIONS_PER_SECOND)
                {
                    result.CheatProbability += 0.3;
                    result.DetectedCheats.Add("Action Spam");
                }

                if (HasUnusualPositionJumps(session))
                {
                    result.CheatProbability += 0.2;
                    result.DetectedCheats.Add("Teleportation");
                }
            }

            return result;
        }

        private double CalculateAverageSpeed(PlayerSessionData session)
        {
            if (session.ActionLog.Count < 2)
                return 0;

            double totalDistance = 0;
            double totalTime = 0;

            for (int i = 1; i < session.ActionLog.Count; i++)
            {
                totalDistance += CalculateDistance(
                    session.ActionLog[i - 1].Position,
                    session.ActionLog[i].Position);
                totalTime += (session.ActionLog[i].Timestamp - session.ActionLog[i - 1].Timestamp).TotalSeconds;
            }

            return totalTime > 0 ? totalDistance / totalTime : 0;
        }

        private bool HasUnusualPositionJumps(PlayerSessionData session)
        {
            for (int i = 1; i < session.ActionLog.Count; i++)
            {
                var distance = CalculateDistance(
                    session.ActionLog[i - 1].Position,
                    session.ActionLog[i].Position);
                var time = (session.ActionLog[i].Timestamp - session.ActionLog[i - 1].Timestamp).TotalSeconds;

                if (distance > POSITION_VALIDATION_RANGE && time < 0.5)
                    return true;
            }
            return false;
        }

        private double CalculateDistance((double X, double Y, double Z) p1, (double X, double Y, double Z) p2)
        {
            var dx = p1.X - p2.X;
            var dy = p1.Y - p2.Y;
            var dz = p1.Z - p2.Z;
            return Math.Sqrt(dx * dx + dy * dy + dz * dz);
        }

        // =====================================================================
        // Alerting & Logging
        // =====================================================================

        private void LogCheatAlert(string sessionId, string alertType, string details)
        {
            if (_activityLogs.TryGetValue(sessionId, out var log))
            {
                log.Alerts.Add(new CheatAlert
                {
                    Timestamp = DateTime.UtcNow,
                    AlertType = alertType,
                    Details = details
                });

                // Mark session as suspicious if too many alerts
                if (_activeSessions.TryGetValue(sessionId, out var session))
                {
                    session.Warnings++;
                    if (session.Warnings >= 5)
                        session.IsSuspicious = true;
                }
            }
        }

        /// <summary>
        /// Gets all alerts for a session
        /// </summary>
        public List<CheatAlert> GetSessionAlerts(string sessionId)
        {
            return _activityLogs.TryGetValue(sessionId, out var log) ? log.Alerts : new List<CheatAlert>();
        }

        /// <summary>
        /// Closes a session and returns final analysis
        /// </summary>
        public CheatDetectionResult EndSession(string sessionId)
        {
            var result = AnalyzeSession(sessionId);

            if (result != null && result.CheatProbability > 0.7)
            {
                // Ban or flag player
                result.IsCheatConfirmed = true;
            }

            _activeSessions.Remove(sessionId);
            return result;
        }
    }

    // =========================================================================
    // Data Models
    // =========================================================================

    public class PlayerSessionData
    {
        public string PlayerId { get; set; }
        public string SessionId { get; set; }
        public string GameId { get; set; }
        public DateTime StartTime { get; set; }
        public List<PlayerAction> ActionLog { get; set; }
        public int Warnings { get; set; }
        public bool IsSuspicious { get; set; }
    }

    public class PlayerAction
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public (double X, double Y, double Z) Position { get; set; }
        public (double X, double Y, double Z) Rotation { get; set; }
        public (double X, double Y, double Z) Velocity { get; set; }
        public string ActionType { get; set; } // "move", "jump", "attack", "interact"
        public double JumpHeight { get; set; }
        public string ScriptCode { get; set; }
        public DateTime Timestamp { get; set; }
        public bool IsValidated { get; set; }
    }

    public class CheatAlert
    {
        public DateTime Timestamp { get; set; }
        public string AlertType { get; set; }
        public string Details { get; set; }
    }

    public class SuspiciousActivityLog
    {
        public string PlayerId { get; set; }
        public string SessionId { get; set; }
        public List<CheatAlert> Alerts { get; set; }
    }

    public class CheatDetectionResult
    {
        public string PlayerId { get; set; }
        public string SessionId { get; set; }
        public double CheatProbability { get; set; }
        public List<string> DetectedCheats { get; set; }
        public bool IsCheatConfirmed { get; set; }
    }
}
