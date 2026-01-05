// API Route for Game Servers
const express = require('express');
const GameServer = require('../game-server');
const { authenticateToken } = require('../middleware/auth');

const gameServers = new Map();

module.exports = (pool, redisClient) => {
  const router = express.Router();

  // Get all game servers
  router.get('/servers', authenticateToken, async (req, res) => {
    try {
      const servers = await pool.query(
        'SELECT id, game_id, max_players, current_players, server_address, server_port, created_at, is_active FROM game_servers WHERE is_active = true'
      );

      res.json(servers.rows.map(server => ({
        serverId: server.id,
        gameId: server.game_id,
        maxPlayers: server.max_players,
        currentPlayers: server.current_players,
        serverAddress: server.server_address,
        serverPort: server.server_port,
        createdAt: server.created_at,
        isActive: server.is_active
      })));
    } catch (error) {
      console.error('Get servers error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific game servers
  router.get('/game/:gameId/servers', authenticateToken, async (req, res) => {
    try {
      const servers = await pool.query(
        'SELECT id, max_players, current_players, server_address, server_port FROM game_servers WHERE game_id = $1 AND is_active = true',
        [req.params.gameId]
      );

      res.json(servers.rows);
    } catch (error) {
      console.error('Get game servers error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Join server
  router.post('/:serverId/join', authenticateToken, async (req, res) => {
    try {
      const { serverId } = req.params;
      const { userId } = req.user;

      // Get server info
      const serverInfo = await pool.query(
        'SELECT id, server_address, server_port, current_players, max_players FROM game_servers WHERE id = $1',
        [serverId]
      );

      if (serverInfo.rows.length === 0) {
        return res.status(404).json({ error: 'Server not found' });
      }

      const server = serverInfo.rows[0];

      if (server.current_players >= server.max_players) {
        return res.status(503).json({ error: 'Server is full' });
      }

      // Get user info
      const userInfo = await pool.query(
        'SELECT id, username FROM users WHERE id = $1',
        [userId]
      );

      res.json({
        serverId,
        serverAddress: server.server_address,
        serverPort: server.server_port,
        userId,
        username: userInfo.rows[0].username,
        joinToken: req.headers.authorization.split(' ')[1]
      });
    } catch (error) {
      console.error('Join server error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Leave server
  router.post('/:serverId/leave', authenticateToken, async (req, res) => {
    try {
      const { userId } = req.user;

      // Decrement player count
      await pool.query(
        'UPDATE game_servers SET current_players = MAX(0, current_players - 1) WHERE id = $1',
        [req.params.serverId]
      );

      res.json({ message: 'Left server successfully' });
    } catch (error) {
      console.error('Leave server error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create game server
  router.post('/create', authenticateToken, async (req, res) => {
    try {
      const { gameId, maxPlayers, serverAddress, serverPort } = req.body;

      const serverId = require('crypto').randomUUID();
      await pool.query(
        'INSERT INTO game_servers (id, game_id, max_players, current_players, server_address, server_port, created_at, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [serverId, gameId, maxPlayers || 100, 0, serverAddress, serverPort, new Date(), true]
      );

      res.status(201).json({ serverId, message: 'Server created' });
    } catch (error) {
      console.error('Create server error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
