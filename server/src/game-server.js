// Game Server Logic
const express = require('express');
const http = require('http');
const WebSocket = require('ws');

class GameServer {
  constructor(config = {}) {
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    this.config = {
      port: config.port || 3100,
      maxPlayers: config.maxPlayers || 100,
      tickRate: config.tickRate || 60, // Updates per second
      ...config
    };

    this.players = new Map();
    this.gameState = {
      tick: 0,
      entities: new Map(),
      physics: [],
      lighting: { brightness: 0.8, time: 'day' }
    };

    this.initializeRoutes();
    this.initializeWebSocket();
  }

  initializeRoutes() {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'online',
        players: this.players.size,
        maxPlayers: this.config.maxPlayers,
        tick: this.gameState.tick,
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/game-state', (req, res) => {
      res.json(this.getGameState());
    });

    this.app.post('/join', express.json(), (req, res) => {
      const { userId, username, token } = req.body;

      if (!this.validateToken(token)) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      if (this.players.size >= this.config.maxPlayers) {
        return res.status(503).json({ error: 'Server full' });
      }

      const playerId = userId;
      res.json({
        playerId,
        serverId: this.config.serverId,
        gameState: this.getGameState(),
        welcomeMessage: `Welcome to ${this.config.gameName}, ${username}!`
      });
    });
  }

  initializeWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const playerId = this.generatePlayerId();
      const player = {
        id: playerId,
        position: { x: 0, y: 5, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        character: null,
        inputs: {},
        lastUpdate: Date.now()
      };

      this.players.set(playerId, player);
      console.log(`Player ${playerId} connected. Total: ${this.players.size}`);

      ws.send(JSON.stringify({
        type: 'PLAYER_JOINED',
        playerId,
        gameState: this.getGameState()
      }));

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.handlePlayerMessage(playerId, message, ws);
        } catch (e) {
          console.error('Invalid message:', e);
        }
      });

      ws.on('close', () => {
        this.players.delete(playerId);
        console.log(`Player ${playerId} disconnected. Total: ${this.players.size}`);
        this.broadcastToAll({
          type: 'PLAYER_LEFT',
          playerId
        });
      });
    });

    // Game loop
    setInterval(() => this.tick(), 1000 / this.config.tickRate);
  }

  handlePlayerMessage(playerId, message, ws) {
    const player = this.players.get(playerId);
    if (!player) return;

    switch (message.type) {
      case 'INPUT':
        player.inputs = message.inputs;
        break;
      case 'MOVE':
        player.position = message.position;
        player.rotation = message.rotation;
        break;
      case 'CHAT':
        this.broadcastToAll({
          type: 'CHAT',
          playerId,
          playerName: message.playerName,
          message: message.text,
          timestamp: new Date().toISOString()
        });
        break;
    }
  }

  tick() {
    this.gameState.tick++;

    // Update player positions based on inputs
    this.players.forEach((player, playerId) => {
      this.updatePlayerPhysics(player);
    });

    // Broadcast state to all players
    if (this.gameState.tick % 2 === 0) {
      this.broadcastGameState();
    }
  }

  updatePlayerPhysics(player) {
    // Simple gravity
    player.velocity.y = Math.max(-9.81, player.velocity.y - 0.5);

    // Apply velocity
    player.position.x += player.velocity.x * 0.016;
    player.position.y += player.velocity.y * 0.016;
    player.position.z += player.velocity.z * 0.016;

    // Floor collision
    if (player.position.y < 0) {
      player.position.y = 0;
      player.velocity.y = 0;
    }

    // Handle input
    if (player.inputs) {
      const moveSpeed = 20;
      if (player.inputs.w) player.position.z += moveSpeed * 0.016;
      if (player.inputs.s) player.position.z -= moveSpeed * 0.016;
      if (player.inputs.a) player.position.x -= moveSpeed * 0.016;
      if (player.inputs.d) player.position.x += moveSpeed * 0.016;
      if (player.inputs.space) player.velocity.y = 15;
    }
  }

  broadcastGameState() {
    const stateUpdate = {
      type: 'STATE_UPDATE',
      tick: this.gameState.tick,
      players: Array.from(this.players.entries()).map(([id, player]) => ({
        id,
        position: player.position,
        rotation: player.rotation
      }))
    };

    this.broadcastToAll(stateUpdate);
  }

  broadcastToAll(message) {
    const data = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  getGameState() {
    return {
      tick: this.gameState.tick,
      players: this.players.size,
      maxPlayers: this.config.maxPlayers,
      entities: Array.from(this.gameState.entities.values()),
      lighting: this.gameState.lighting
    };
  }

  validateToken(token) {
    // Implement token validation
    return !!token;
  }

  generatePlayerId() {
    return Math.random().toString(36).substr(2, 9);
  }

  start() {
    this.server.listen(this.config.port, () => {
      console.log(`Game Server running on port ${this.config.port}`);
      console.log(`Game: ${this.config.gameName}`);
      console.log(`Max Players: ${this.config.maxPlayers}`);
    });
  }
}

module.exports = GameServer;
