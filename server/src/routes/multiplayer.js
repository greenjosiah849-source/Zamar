/**
 * Multiplayer API - Real-time game server communication
 */

const express = require('express');
const router = express.Router();
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// Store active game sessions
const activeSessions = new Map();
const playerStates = new Map();

/**
 * Join a game - Returns server details and join token
 */
router.post('/join', (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const { gameId, lat, lon, preferredRegion } = req.body;

    // Find best server based on location
    const bestServer = findBestServer(lat, lon, preferredRegion);

    // Create join token
    const joinToken = jwt.sign({
      userId: decoded.id,
      gameId,
      serverId: bestServer.id,
      joinedAt: Date.now()
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    res.json({
      success: true,
      server: bestServer,
      joinToken,
      gameState: {
        players: Array.from(activeSessions.values())
          .filter(s => s.gameId === gameId)
          .map(s => ({
            id: s.userId,
            name: s.username,
            position: playerStates.get(s.userId) || { x: 0, y: 0, z: 0 }
          }))
      }
    });
  } catch (err) {
    console.error('Join error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Get game metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = {
      success: true,
      totalPlayers: activeSessions.size,
      timestamp: Date.now(),
      servers: getServerMetrics()
    };
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * WebSocket handler for real-time communication
 */
function handleWebSocket(ws, req) {
  const joinToken = req.url.split('token=')[1];

  try {
    const decoded = jwt.verify(joinToken, process.env.JWT_SECRET || 'secret');
    const sessionId = decoded.userId;
    const gameId = decoded.gameId;

    // Create session
    const session = {
      id: sessionId,
      userId: decoded.userId,
      gameId,
      serverId: decoded.serverId,
      ws,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now()
    };

    activeSessions.set(sessionId, session);
    playerStates.set(sessionId, { x: 0, y: 0, z: 0 });

    console.log(`[WS] Player ${sessionId} connected to game ${gameId}`);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      data: {
        sessionId,
        gameId,
        timestamp: Date.now()
      }
    }));

    // Broadcast player joined
    broadcastToGame(gameId, {
      type: 'player_joined',
      data: {
        playerId: sessionId,
        timestamp: Date.now()
      }
    }, sessionId);

    // Handle messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        handleGameMessage(sessionId, gameId, message);
      } catch (err) {
        console.error('Message parse error:', err);
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      activeSessions.delete(sessionId);
      playerStates.delete(sessionId);
      console.log(`[WS] Player ${sessionId} disconnected`);

      broadcastToGame(gameId, {
        type: 'player_left',
        data: {
          playerId: sessionId,
          timestamp: Date.now()
        }
      });
    });

    // Handle errors
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });

    // Heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: Date.now()
        }));
        session.lastHeartbeat = Date.now();
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

  } catch (err) {
    console.error('WebSocket init error:', err);
    ws.close(4000, 'Invalid token');
  }
}

/**
 * Handle game messages
 */
function handleGameMessage(userId, gameId, message) {
  const session = activeSessions.get(userId);
  if (!session) return;

  switch (message.type) {
    case 'player_input':
      // Update player state
      const state = playerStates.get(userId) || { x: 0, y: 0, z: 0 };
      state.x += message.data.MoveX * 0.1;
      state.y += message.data.MoveY * 0.1;
      state.animation = message.data.Jump ? 'jump' : 'walk';
      playerStates.set(userId, state);

      // Broadcast to other players
      broadcastToGame(gameId, {
        type: 'player_update',
        data: {
          playerId: userId,
          position: state,
          animation: state.animation
        }
      }, userId);
      break;

    case 'player_action':
      // Handle actions (attack, use item, etc)
      broadcastToGame(gameId, {
        type: 'player_action',
        data: {
          playerId: userId,
          action: message.data.action
        }
      });
      break;

    case 'chat_message':
      // Handle chat
      broadcastToGame(gameId, {
        type: 'chat_message',
        data: {
          playerId: userId,
          playerName: session.username,
          message: message.data.message,
          timestamp: Date.now()
        }
      });
      break;

    case 'ping':
      // Respond to ping
      session.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: Date.now()
      }));
      break;
  }
}

/**
 * Broadcast message to all players in a game
 */
function broadcastToGame(gameId, message, excludeUserId = null) {
  const data = JSON.stringify(message);

  activeSessions.forEach((session) => {
    if (session.gameId === gameId && 
        session.ws.readyState === WebSocket.OPEN &&
        session.userId !== excludeUserId) {
      session.ws.send(data);
    }
  });
}

/**
 * Find best server based on location
 */
function findBestServer(lat, lon, preferredRegion) {
  // List of game servers with regions
  const servers = [
    { id: 'us-east-1', region: 'US East', country: 'USA', city: 'Virginia', 
      lat: 38.13, lon: -78.45, port: 8081, maxCapacity: 250, currentPlayers: 120 },
    { id: 'us-west-1', region: 'US West', country: 'USA', city: 'California', 
      lat: 36.78, lon: -119.41, port: 8082, maxCapacity: 250, currentPlayers: 140 },
    { id: 'eu-west-1', region: 'EU West', country: 'Germany', city: 'Frankfurt', 
      lat: 50.11, lon: 8.68, port: 8083, maxCapacity: 250, currentPlayers: 180 },
    { id: 'ap-southeast-1', region: 'Asia', country: 'Australia', city: 'Sydney', 
      lat: -33.95, lon: 151.17, port: 8084, maxCapacity: 250, currentPlayers: 95 },
    { id: 'ap-northeast-1', region: 'Asia', country: 'Japan', city: 'Tokyo', 
      lat: 35.68, lon: 139.69, port: 8085, maxCapacity: 250, currentPlayers: 160 }
  ];

  // Calculate latency based on distance
  let bestServer = servers[0];
  let bestLatency = 9999;

  servers.forEach(server => {
    if (server.currentPlayers >= server.maxCapacity * 0.9) return;

    const distance = Math.sqrt(
      Math.pow(lat - server.lat, 2) + Math.pow(lon - server.lon, 2)
    );
    const estimatedLatency = Math.round(distance * 0.5 + 20); // Rough estimate

    if (estimatedLatency < bestLatency) {
      bestLatency = estimatedLatency;
      bestServer = server;
    }
  });

  return {
    id: bestServer.id,
    region: bestServer.region,
    country: bestServer.country,
    city: bestServer.city,
    host: 'localhost',
    port: bestServer.port,
    estimatedLatency: bestLatency,
    currentPlayers: bestServer.currentPlayers,
    maxCapacity: bestServer.maxCapacity
  };
}

/**
 * Get metrics for all servers
 */
function getServerMetrics() {
  const servers = [
    { id: 'us-east-1', region: 'US East', country: 'USA', city: 'Virginia', 
      maxCapacity: 250, currentPlayers: 120 },
    { id: 'us-west-1', region: 'US West', country: 'USA', city: 'California', 
      maxCapacity: 250, currentPlayers: 140 },
    { id: 'eu-west-1', region: 'EU West', country: 'Germany', city: 'Frankfurt', 
      maxCapacity: 250, currentPlayers: 180 },
    { id: 'eu-north-1', region: 'EU North', country: 'Sweden', city: 'Stockholm', 
      maxCapacity: 250, currentPlayers: 85 },
    { id: 'ap-southeast-1', region: 'Asia', country: 'Australia', city: 'Sydney', 
      maxCapacity: 250, currentPlayers: 95 },
    { id: 'ap-northeast-1', region: 'Asia', country: 'Japan', city: 'Tokyo', 
      maxCapacity: 250, currentPlayers: 160 },
    { id: 'ap-south-1', region: 'Asia', country: 'India', city: 'Mumbai', 
      maxCapacity: 250, currentPlayers: 110 },
    { id: 'sa-east-1', region: 'South America', country: 'Brazil', city: 'São Paulo', 
      maxCapacity: 250, currentPlayers: 75 }
  ];

  return servers.map(server => ({
    serverId: server.id,
    region: server.region,
    country: server.country,
    city: server.city,
    playersOnline: server.currentPlayers,
    maxCapacity: server.maxCapacity,
    loadPercentage: (server.currentPlayers / server.maxCapacity) * 100,
    estimatedLatency: Math.random() * 50 + 10,
    uptime: Math.floor(Math.random() * 86400 * 30)
  }));
}

module.exports = {
  router,
  handleWebSocket
};
