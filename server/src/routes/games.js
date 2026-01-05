const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = (pool, redisClient) => {
  const router = express.Router();

  // Get all games
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const games = await pool.query(
        'SELECT id, title, description, creator_id, creator_name, thumbnail_url, player_count, like_ratio, created_at, updated_at FROM games LIMIT 50'
      );

      res.json(games.rows.map(game => ({
        gameId: game.id,
        title: game.title,
        description: game.description,
        creatorId: game.creator_id,
        creatorName: game.creator_name,
        thumbnailUrl: game.thumbnail_url,
        playerCount: game.player_count,
        likeRatio: game.like_ratio,
        createdAt: game.created_at,
        updatedAt: game.updated_at,
        isFavorited: false
      })));
    } catch (error) {
      console.error('Get games error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get specific game
  router.get('/:gameId', authenticateToken, async (req, res) => {
    try {
      const game = await pool.query(
        'SELECT id, title, description, creator_id, creator_name, thumbnail_url, player_count, like_ratio, created_at, updated_at FROM games WHERE id = $1',
        [req.params.gameId]
      );

      if (game.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const gameData = game.rows[0];
      res.json({
        gameId: gameData.id,
        title: gameData.title,
        description: gameData.description,
        creatorId: gameData.creator_id,
        creatorName: gameData.creator_name,
        thumbnailUrl: gameData.thumbnail_url,
        playerCount: gameData.player_count,
        likeRatio: gameData.like_ratio,
        createdAt: gameData.created_at,
        updatedAt: gameData.updated_at,
        isFavorited: false
      });
    } catch (error) {
      console.error('Get game error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create game
  router.post('/create', authenticateToken, async (req, res) => {
    try {
      const { title, description } = req.body;
      const { userId } = req.user;

      if (!title || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const user = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
      const creator = user.rows[0];

      const gameId = require('crypto').randomUUID();
      await pool.query(
        'INSERT INTO games (id, title, description, creator_id, creator_name, player_count, like_ratio, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [gameId, title, description, userId, creator.username, 0, 0.5, new Date(), new Date()]
      );

      res.status(201).json({ gameId, title, description, message: 'Game created' });
    } catch (error) {
      console.error('Create game error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
