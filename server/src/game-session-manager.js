/**
 * Game Session Manager - Manages all active game sessions and player states
 * Handles real-time synchronization and game logic
 */

class GameSessionManager {
  constructor() {
    this.sessions = new Map();
    this.games = new Map();
    this.playerStates = new Map();
  }

  /**
   * Create a new game session
   */
  createSession(sessionId, userId, gameId, serverId) {
    const session = {
      id: sessionId,
      userId,
      gameId,
      serverId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: 'active',
      players: new Set([userId]),
      worldState: this.initializeWorldState()
    };

    this.sessions.set(sessionId, session);
    
    if (!this.games.has(gameId)) {
      this.games.set(gameId, {
        id: gameId,
        sessions: new Set(),
        players: new Map(),
        startedAt: Date.now()
      });
    }

    const game = this.games.get(gameId);
    game.sessions.add(sessionId);
    game.players.set(userId, {
      id: userId,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      state: 'spawning',
      health: 100,
      score: 0
    });

    return session;
  }

  /**
   * Initialize world state
   */
  initializeWorldState() {
    return {
      time: 0,
      weather: 'clear',
      gravity: 9.81,
      objects: [],
      events: []
    };
  }

  /**
   * Update player state
   */
  updatePlayerState(userId, input) {
    const playerData = this.playerStates.get(userId) || {};
    
    return {
      ...playerData,
      position: {
        x: (playerData.position?.x || 0) + input.MoveX * 0.1,
        y: (playerData.position?.y || 0) + (input.Jump ? 5 : 0),
        z: (playerData.position?.z || 0) + input.MoveY * 0.1
      },
      rotation: {
        x: (playerData.rotation?.x || 0) + input.LookY * 0.01,
        y: (playerData.rotation?.y || 0) + input.LookX * 0.01,
        z: 0
      },
      animation: input.Jump ? 'jump' : (input.MoveX !== 0 || input.MoveY !== 0 ? 'walk' : 'idle'),
      velocity: {
        x: input.MoveX * 5,
        y: input.Jump ? 10 : 0,
        z: input.MoveY * 5
      },
      isSprinting: input.Sprint,
      isAttacking: input.Attack,
      timestamp: Date.now()
    };
  }

  /**
   * Get all players in a game
   */
  getGamePlayers(gameId) {
    const game = this.games.get(gameId);
    if (!game) return [];
    return Array.from(game.players.values());
  }

  /**
   * Remove player from game
   */
  removePlayer(userId, gameId) {
    const game = this.games.get(gameId);
    if (game) {
      game.players.delete(userId);
      this.playerStates.delete(userId);
    }
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId);
  }

  /**
   * Close session
   */
  closeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.state = 'closed';
      this.removePlayer(session.userId, session.gameId);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Get world state
   */
  getWorldState(gameId) {
    const game = this.games.get(gameId);
    if (!game) return null;

    return {
      gameId,
      players: this.getGamePlayers(gameId),
      worldState: this.worldState,
      timestamp: Date.now()
    };
  }
}

/**
 * Matchmaking Service - Handles game session queuing and matching
 */
class MatchmakingService {
  constructor(gameSessionManager) {
    this.sessionManager = gameSessionManager;
    this.queues = new Map();
    this.activeMatches = new Map();
  }

  /**
   * Add player to matchmaking queue
   */
  queuePlayer(userId, gameId, skillRating = 1000) {
    if (!this.queues.has(gameId)) {
      this.queues.set(gameId, []);
    }

    const queue = this.queues.get(gameId);
    queue.push({
      userId,
      gameId,
      skillRating,
      queuedAt: Date.now()
    });

    // Check if we can start a match
    if (queue.length >= 2) {
      return this.tryMatchPlayers(gameId);
    }

    return null;
  }

  /**
   * Try to match players in queue
   */
  tryMatchPlayers(gameId) {
    const queue = this.queues.get(gameId);
    if (!queue || queue.length < 2) return null;

    // Simple matching: take first two players
    const player1 = queue.shift();
    const player2 = queue.shift();

    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const match = {
      id: matchId,
      gameId,
      players: [player1.userId, player2.userId],
      status: 'active',
      startedAt: Date.now(),
      scores: {
        [player1.userId]: 0,
        [player2.userId]: 0
      }
    };

    this.activeMatches.set(matchId, match);

    return {
      matchId,
      players: [player1, player2],
      status: 'matched'
    };
  }

  /**
   * Remove player from queue
   */
  removeFromQueue(userId, gameId) {
    const queue = this.queues.get(gameId);
    if (queue) {
      const index = queue.findIndex(p => p.userId === userId);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }
  }

  /**
   * End match
   */
  endMatch(matchId) {
    const match = this.activeMatches.get(matchId);
    if (match) {
      match.status = 'completed';
      match.endedAt = Date.now();
    }
  }

  /**
   * Update match score
   */
  updateScore(matchId, userId, points) {
    const match = this.activeMatches.get(matchId);
    if (match && match.scores[userId] !== undefined) {
      match.scores[userId] += points;
    }
  }
}

/**
 * Player Synchronization Service - Keeps all clients in sync
 */
class PlayerSyncService {
  constructor(gameSessionManager) {
    this.sessionManager = gameSessionManager;
    this.syncFrequency = 60; // Hz
    this.syncInterval = 1000 / this.syncFrequency;
    this.lastSync = new Map();
  }

  /**
   * Should sync player
   */
  shouldSync(userId) {
    const lastSync = this.lastSync.get(userId) || 0;
    return Date.now() - lastSync >= this.syncInterval;
  }

  /**
   * Sync player state
   */
  syncPlayerState(userId, state) {
    this.lastSync.set(userId, Date.now());

    return {
      type: 'player_sync',
      data: {
        playerId: userId,
        position: state.position,
        rotation: state.rotation,
        animation: state.animation,
        timestamp: state.timestamp
      }
    };
  }

  /**
   * Predict player position
   */
  predictPosition(lastKnownState, timeSinceLastUpdate) {
    const deltaT = timeSinceLastUpdate / 1000; // Convert to seconds
    
    return {
      x: lastKnownState.position.x + (lastKnownState.velocity.x * deltaT),
      y: lastKnownState.position.y + (lastKnownState.velocity.y * deltaT),
      z: lastKnownState.position.z + (lastKnownState.velocity.z * deltaT)
    };
  }
}

/**
 * Game Physics Engine
 */
class PhysicsEngine {
  constructor() {
    this.gravity = 9.81;
    this.friction = 0.05;
    this.maxSpeed = 15;
  }

  /**
   * Update physics for player
   */
  updatePhysics(playerState, deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds

    // Apply gravity
    playerState.velocity.y -= this.gravity * dt;

    // Apply friction
    playerState.velocity.x *= (1 - this.friction);
    playerState.velocity.z *= (1 - this.friction);

    // Clamp speed
    const speed = Math.sqrt(
      playerState.velocity.x ** 2 + 
      playerState.velocity.z ** 2
    );
    if (speed > this.maxSpeed) {
      const ratio = this.maxSpeed / speed;
      playerState.velocity.x *= ratio;
      playerState.velocity.z *= ratio;
    }

    // Update position
    playerState.position.x += playerState.velocity.x * dt;
    playerState.position.y += playerState.velocity.y * dt;
    playerState.position.z += playerState.velocity.z * dt;

    // Ground collision
    if (playerState.position.y < 0) {
      playerState.position.y = 0;
      playerState.velocity.y = 0;
    }

    return playerState;
  }

  /**
   * Check collision between two objects
   */
  checkCollision(obj1, obj2, distance = 1.0) {
    const dx = obj1.position.x - obj2.position.x;
    const dy = obj1.position.y - obj2.position.y;
    const dz = obj1.position.z - obj2.position.z;

    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    return dist <= distance;
  }
}

module.exports = {
  GameSessionManager,
  MatchmakingService,
  PlayerSyncService,
  PhysicsEngine
};
