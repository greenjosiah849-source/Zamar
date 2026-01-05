/**
 * Advanced Game Server - Zamar Platform
 * Custom in-house game server with physics, networking, and regional support
 * No external APIs - pure Node.js WebSocket implementation
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

class PhysicsEngine {
  constructor() {
    this.gravity = 9.81;
    this.maxVelocity = 50;
    this.friction = 0.95;
  }

  updatePlayer(player, deltaTime) {
    // Apply gravity
    if (!player.onGround) {
      player.velocity.y -= this.gravity * deltaTime;
    }

    // Clamp velocity
    const velocityMagnitude = Math.sqrt(
      player.velocity.x ** 2 + player.velocity.y ** 2 + player.velocity.z ** 2
    );
    if (velocityMagnitude > this.maxVelocity) {
      const scale = this.maxVelocity / velocityMagnitude;
      player.velocity.x *= scale;
      player.velocity.y *= scale;
      player.velocity.z *= scale;
    }

    // Apply friction on ground
    if (player.onGround) {
      player.velocity.x *= this.friction;
      player.velocity.z *= this.friction;
    }

    // Update position
    player.position.x += player.velocity.x * deltaTime;
    player.position.y += player.velocity.y * deltaTime;
    player.position.z += player.velocity.z * deltaTime;

    // Ground collision (y = 0 is ground)
    if (player.position.y <= 0) {
      player.position.y = 0;
      player.velocity.y = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    return player;
  }

  handleCollision(player1, player2) {
    const dx = player2.position.x - player1.position.x;
    const dy = player2.position.y - player1.position.y;
    const dz = player2.position.z - player1.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minDistance = 2; // Player collision radius

    if (distance < minDistance) {
      // Simple separation
      const overlap = minDistance - distance;
      const normal = {
        x: dx / distance || 0,
        y: dy / distance || 0,
        z: dz / distance || 0,
      };

      player1.position.x -= normal.x * overlap * 0.5;
      player1.position.y -= normal.y * overlap * 0.5;
      player1.position.z -= normal.z * overlap * 0.5;

      player2.position.x += normal.x * overlap * 0.5;
      player2.position.y += normal.y * overlap * 0.5;
      player2.position.z += normal.z * overlap * 0.5;

      return true;
    }
    return false;
  }
}

class GameServer extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      port: config.port || 8080,
      region: config.region || 'US-EAST',
      maxPlayers: config.maxPlayers || 100,
      tickRate: config.tickRate || 60,
      ...config,
    };

    this.players = new Map();
    this.gameState = {};
    this.physics = new PhysicsEngine();
    this.running = false;
    this.lastTick = Date.now();
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.config.port });

    this.wss.on('connection', (ws) => {
      this.handleNewPlayer(ws);
    });

    // Start game loop
    this.gameLoopInterval = setInterval(() => {
      this.tick();
    }, 1000 / this.config.tickRate);

    this.running = true;
    console.log(`🎮 Game Server started on port ${this.config.port} (${this.config.region})`);
    this.emit('started');
  }

  handleNewPlayer(ws) {
    const playerId = 'player_' + Math.random().toString(36).substr(2, 9);
    const player = {
      id: playerId,
      position: { x: 0, y: 5, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      inputState: { w: false, a: false, s: false, d: false, space: false },
      onGround: true,
      health: 100,
      team: 0,
      joinedAt: Date.now(),
      ws,
    };

    this.players.set(playerId, player);

    // Send initial state
    ws.send(
      JSON.stringify({
        type: 'INIT',
        playerId,
        region: this.config.region,
        players: Array.from(this.players.values()).map(p => ({
          id: p.id,
          position: p.position,
          rotation: p.rotation,
        })),
      })
    );

    // Broadcast join
    this.broadcast(
      {
        type: 'PLAYER_JOINED',
        player: {
          id: playerId,
          position: player.position,
        },
      },
      playerId
    );

    // Handle messages
    ws.on('message', (data) => {
      this.handlePlayerMessage(playerId, JSON.parse(data));
    });

    // Handle disconnect
    ws.on('close', () => {
      this.players.delete(playerId);
      this.broadcast({
        type: 'PLAYER_LEFT',
        playerId,
      });
    });
  }

  handlePlayerMessage(playerId, message) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (message.type) {
      case 'INPUT':
        player.inputState = message.input;
        break;

      case 'JUMP':
        if (player.onGround) {
          player.velocity.y = 15;
          player.onGround = false;
        }
        break;

      case 'CHAT':
        this.broadcast({
          type: 'CHAT',
          playerId,
          message: message.message,
          timestamp: Date.now(),
        });
        break;

      case 'FIRE':
        // Handle shooting/attacking
        this.handlePlayerAttack(playerId, message.direction);
        break;
    }
  }

  handlePlayerAttack(playerId, direction) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Raycast for hit detection
    const ray = {
      origin: player.position,
      direction,
      maxDistance: 100,
    };

    let closestHit = null;
    let closestDistance = ray.maxDistance;

    for (const [id, target] of this.players) {
      if (id === playerId) continue;

      const distance = this.distanceToSphere(ray, target.position, 2);
      if (distance >= 0 && distance < closestDistance) {
        closestDistance = distance;
        closestHit = target;
      }
    }

    if (closestHit) {
      closestHit.health -= 25;
      this.broadcast({
        type: 'DAMAGE',
        shooter: playerId,
        target: closestHit.id,
        damage: 25,
      });

      if (closestHit.health <= 0) {
        this.handlePlayerDeath(closestHit.id, playerId);
      }
    }
  }

  distanceToSphere(ray, sphereCenter, radius) {
    const dx = sphereCenter.x - ray.origin.x;
    const dy = sphereCenter.y - ray.origin.y;
    const dz = sphereCenter.z - ray.origin.z;

    const dotProduct =
      dx * ray.direction.x + dy * ray.direction.y + dz * ray.direction.z;

    if (dotProduct < 0) return -1;

    const closestPoint = {
      x: ray.origin.x + ray.direction.x * dotProduct,
      y: ray.origin.y + ray.direction.y * dotProduct,
      z: ray.origin.z + ray.direction.z * dotProduct,
    };

    const distToPoint = Math.sqrt(
      (closestPoint.x - sphereCenter.x) ** 2 +
        (closestPoint.y - sphereCenter.y) ** 2 +
        (closestPoint.z - sphereCenter.z) ** 2
    );

    return distToPoint <= radius ? dotProduct : -1;
  }

  handlePlayerDeath(playerId, killerId) {
    const player = this.players.get(playerId);
    if (!player) return;

    // Reset player
    player.health = 100;
    player.position = { x: 0, y: 5, z: 0 };
    player.velocity = { x: 0, y: 0, z: 0 };

    this.broadcast({
      type: 'PLAYER_DIED',
      playerId,
      killerId,
    });
  }

  tick() {
    const now = Date.now();
    const deltaTime = (now - this.lastTick) / 1000;
    this.lastTick = now;

    // Update physics
    for (const [, player] of this.players) {
      // Handle input
      const moveSpeed = 20;
      if (player.inputState.w) player.velocity.z += moveSpeed * deltaTime;
      if (player.inputState.s) player.velocity.z -= moveSpeed * deltaTime;
      if (player.inputState.a) player.velocity.x -= moveSpeed * deltaTime;
      if (player.inputState.d) player.velocity.x += moveSpeed * deltaTime;

      // Update physics
      this.physics.updatePlayer(player, deltaTime);
    }

    // Handle collisions
    const players = Array.from(this.players.values());
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        this.physics.handleCollision(players[i], players[j]);
      }
    }

    // Broadcast state
    this.broadcast({
      type: 'STATE_UPDATE',
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        position: p.position,
        rotation: p.rotation,
        velocity: p.velocity,
        health: p.health,
      })),
      timestamp: now,
    });
  }

  broadcast(message, exceptPlayerId = null) {
    const data = JSON.stringify(message);
    for (const [id, player] of this.players) {
      if (exceptPlayerId === id) continue;
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    }
  }

  stop() {
    clearInterval(this.gameLoopInterval);
    this.wss.close();
    this.running = false;
    console.log('Game Server stopped');
  }

  getStats() {
    return {
      region: this.config.region,
      playerCount: this.players.size,
      maxPlayers: this.config.maxPlayers,
      tickRate: this.config.tickRate,
      uptime: Date.now() - (this.startTime || Date.now()),
      status: this.running ? 'RUNNING' : 'STOPPED',
    };
  }
}

module.exports = GameServer;
