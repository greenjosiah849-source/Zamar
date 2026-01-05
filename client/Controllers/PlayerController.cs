using System;
using System.Numerics;

namespace ZamarPlayer.Controllers
{
    /// <summary>
    /// Player state enumeration
    /// </summary>
    public enum PlayerState
    {
        Idle,
        Running,
        Jumping,
        Falling,
        Attacking,
        Dead,
        Respawning,
        Loading
    }

    /// <summary>
    /// Represents a player character in multiplayer
    /// </summary>
    public class PlayerCharacter
    {
        public string PlayerId { get; set; }
        public string PlayerName { get; set; }
        public Vector3 Position { get; set; }
        public Vector3 Velocity { get; set; }
        public Vector3 Rotation { get; set; }
        public PlayerState State { get; set; }
        public int Health { get; set; }
        public int MaxHealth { get; set; }
        public float Speed { get; set; }
        public float JumpForce { get; set; }
        public bool IsLocalPlayer { get; set; }
        public DateTime LastUpdateTime { get; set; }
        public int[] EquippedItems { get; set; }
        public string AvatarUrl { get; set; }

        public PlayerCharacter()
        {
            PlayerId = Guid.NewGuid().ToString();
            Position = Vector3.Zero;
            Velocity = Vector3.Zero;
            Rotation = Vector3.Zero;
            State = PlayerState.Idle;
            Health = 100;
            MaxHealth = 100;
            Speed = 16f;
            JumpForce = 50f;
            LastUpdateTime = DateTime.UtcNow;
            EquippedItems = new int[5];
        }
    }

    /// <summary>
    /// Controls player movement and actions
    /// </summary>
    public class PlayerMovementController
    {
        private PlayerCharacter _player;
        private const float GRAVITY = 9.81f;
        private const float FRICTION = 0.95f;
        private const float ACCELERATION = 2f;

        public PlayerMovementController(PlayerCharacter player)
        {
            _player = player;
        }

        /// <summary>
        /// Update player movement based on input
        /// </summary>
        public void UpdateMovement(Vector3 inputDirection, bool isJumping, float deltaTime)
        {
            // Apply gravity
            if (_player.Velocity.Y > -200)
            {
                _player.Velocity = new Vector3(
                    _player.Velocity.X,
                    _player.Velocity.Y - (GRAVITY * deltaTime),
                    _player.Velocity.Z
                );
            }

            // Apply movement acceleration
            if (inputDirection.Length() > 0)
            {
                var normalizedInput = Vector3.Normalize(inputDirection);
                _player.Velocity = new Vector3(
                    normalizedInput.X * _player.Speed,
                    _player.Velocity.Y,
                    normalizedInput.Z * _player.Speed
                );
                _player.State = PlayerState.Running;
            }
            else
            {
                // Apply friction
                _player.Velocity = new Vector3(
                    _player.Velocity.X * FRICTION,
                    _player.Velocity.Y,
                    _player.Velocity.Z * FRICTION
                );
                _player.State = PlayerState.Idle;
            }

            // Handle jumping
            if (isJumping && _player.State == PlayerState.Idle || _player.State == PlayerState.Running)
            {
                _player.Velocity = new Vector3(
                    _player.Velocity.X,
                    _player.JumpForce,
                    _player.Velocity.Z
                );
                _player.State = PlayerState.Jumping;
            }

            // Update position
            _player.Position = new Vector3(
                _player.Position.X + (_player.Velocity.X * deltaTime),
                _player.Position.Y + (_player.Velocity.Y * deltaTime),
                _player.Position.Z + (_player.Velocity.Z * deltaTime)
            );

            // Clamp to ground
            if (_player.Position.Y < 0)
            {
                _player.Position = new Vector3(_player.Position.X, 0, _player.Position.Z);
                _player.Velocity = new Vector3(_player.Velocity.X, 0, _player.Velocity.Z);
                if (_player.State == PlayerState.Jumping || _player.State == PlayerState.Falling)
                    _player.State = PlayerState.Idle;
            }
            else if (_player.Velocity.Y < 0)
            {
                _player.State = PlayerState.Falling;
            }

            _player.LastUpdateTime = DateTime.UtcNow;
        }

        /// <summary>
        /// Apply damage to player
        /// </summary>
        public void TakeDamage(int damage)
        {
            _player.Health = Math.Max(0, _player.Health - damage);
            if (_player.Health == 0)
            {
                _player.State = PlayerState.Dead;
            }
        }

        /// <summary>
        /// Respawn player at position
        /// </summary>
        public void Respawn(Vector3 spawnPosition)
        {
            _player.Position = spawnPosition;
            _player.Velocity = Vector3.Zero;
            _player.Health = _player.MaxHealth;
            _player.State = PlayerState.Respawning;
        }

        /// <summary>
        /// Get player state as string
        /// </summary>
        public string GetStateString() => _player.State.ToString();

        /// <summary>
        /// Check if player is alive
        /// </summary>
        public bool IsAlive() => _player.Health > 0;
    }

    /// <summary>
    /// Controls player animation
    /// </summary>
    public class PlayerAnimationController
    {
        private PlayerCharacter _player;
        private int _currentAnimationId;
        private float _animationTime;

        public enum AnimationType
        {
            Idle = 0,
            Running = 1,
            Jumping = 2,
            Falling = 3,
            Attack = 4,
            Hit = 5,
            Death = 6,
            Respawn = 7
        }

        public PlayerAnimationController(PlayerCharacter player)
        {
            _player = player;
        }

        /// <summary>
        /// Update animation based on player state
        /// </summary>
        public void UpdateAnimation(float deltaTime)
        {
            _animationTime += deltaTime;

            switch (_player.State)
            {
                case PlayerState.Idle:
                    PlayAnimation(AnimationType.Idle);
                    break;
                case PlayerState.Running:
                    PlayAnimation(AnimationType.Running);
                    break;
                case PlayerState.Jumping:
                    PlayAnimation(AnimationType.Jumping);
                    break;
                case PlayerState.Falling:
                    PlayAnimation(AnimationType.Falling);
                    break;
                case PlayerState.Attacking:
                    PlayAnimation(AnimationType.Attack);
                    break;
                case PlayerState.Dead:
                    PlayAnimation(AnimationType.Death);
                    break;
                case PlayerState.Respawning:
                    PlayAnimation(AnimationType.Respawn);
                    break;
            }
        }

        /// <summary>
        /// Play animation
        /// </summary>
        public void PlayAnimation(AnimationType animationType)
        {
            _currentAnimationId = (int)animationType;
            _animationTime = 0;
        }

        /// <summary>
        /// Get current animation
        /// </summary>
        public int GetCurrentAnimation() => _currentAnimationId;

        /// <summary>
        /// Get animation time
        /// </summary>
        public float GetAnimationTime() => _animationTime;
    }

    /// <summary>
    /// Handles player combat
    /// </summary>
    public class PlayerCombatController
    {
        private PlayerCharacter _player;
        private DateTime _lastAttackTime;
        private const int ATTACK_COOLDOWN = 500; // milliseconds
        private const int ATTACK_DAMAGE = 10;
        private const float ATTACK_RANGE = 5f;

        public event EventHandler<PlayerAttackEventArgs> OnAttack;

        public PlayerCombatController(PlayerCharacter player)
        {
            _player = player;
        }

        /// <summary>
        /// Perform attack
        /// </summary>
        public bool PerformAttack(Vector3 targetPosition)
        {
            var timeSinceLastAttack = DateTime.UtcNow - _lastAttackTime;
            if (timeSinceLastAttack.TotalMilliseconds < ATTACK_COOLDOWN)
                return false;

            var distance = Vector3.Distance(_player.Position, targetPosition);
            if (distance > ATTACK_RANGE)
                return false;

            _lastAttackTime = DateTime.UtcNow;
            _player.State = PlayerState.Attacking;

            OnAttack?.Invoke(this, new PlayerAttackEventArgs
            {
                AttackerId = _player.PlayerId,
                TargetPosition = targetPosition,
                Damage = ATTACK_DAMAGE,
                Timestamp = DateTime.UtcNow
            });

            return true;
        }

        /// <summary>
        /// Check if attack is available
        /// </summary>
        public bool IsAttackReady()
        {
            var timeSinceLastAttack = DateTime.UtcNow - _lastAttackTime;
            return timeSinceLastAttack.TotalMilliseconds >= ATTACK_COOLDOWN;
        }

        /// <summary>
        /// Get attack cooldown percentage (0-100)
        /// </summary>
        public float GetCooldownPercentage()
        {
            var timeSinceLastAttack = DateTime.UtcNow - _lastAttackTime;
            var percentage = (float)(timeSinceLastAttack.TotalMilliseconds / ATTACK_COOLDOWN) * 100;
            return Math.Min(100, percentage);
        }
    }

    /// <summary>
    /// Event args for player attack
    /// </summary>
    public class PlayerAttackEventArgs : EventArgs
    {
        public string AttackerId { get; set; }
        public Vector3 TargetPosition { get; set; }
        public int Damage { get; set; }
        public DateTime Timestamp { get; set; }
    }
}
