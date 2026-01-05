/**
 * Game Publishing Routes
 * Endpoints for game upload, management, and publishing
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Middleware for verifying JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET || 'zamar-secret-key'
    );
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Setup file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/games'));
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.zproj', '.zmap', '.lua', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

module.exports = (db) => {
  /**
   * POST /publishing/upload
   * Upload game project files
   */
  router.post('/upload', verifyToken, upload.array('files'), async (req, res) => {
    try {
      const { gameId, version } = req.body;

      if (!gameId) {
        return res.status(400).json({ error: 'Missing gameId' });
      }

      // Check authorization
      const gameResult = await db.query(
        'SELECT creator_id FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (gameResult.rows[0].creator_id !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Store file references
      const files = req.files.map(f => ({
        filename: f.filename,
        size: f.size,
        mimetype: f.mimetype,
      }));

      res.json({
        message: 'Files uploaded successfully',
        gameId,
        version: version || 1,
        files,
      });
    } catch (error) {
      console.error('Error uploading files:', error);
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  /**
   * POST /publishing/publish
   * Publish game to Zamar platform
   */
  router.post('/publish', verifyToken, async (req, res) => {
    try {
      const { gameId, description, thumbnail, isPublic } = req.body;

      if (!gameId) {
        return res.status(400).json({ error: 'Missing gameId' });
      }

      // Check authorization
      const gameResult = await db.query(
        'SELECT creator_id, published FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      if (gameResult.rows[0].creator_id !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Update game with publish info
      await db.query(
        `UPDATE games 
         SET published = true, 
             description = $1, 
             thumbnail_url = $2, 
             is_public = $3,
             published_at = NOW()
         WHERE id = $4`,
        [description, thumbnail, isPublic !== false, gameId]
      );

      res.json({
        message: 'Game published successfully',
        gameId,
        url: `https://zamar.com/games/${gameId}`,
      });
    } catch (error) {
      console.error('Error publishing game:', error);
      res.status(500).json({ error: 'Publishing failed' });
    }
  });

  /**
   * POST /publishing/versions
   * Create new game version
   */
  router.post('/versions', verifyToken, async (req, res) => {
    try {
      const { gameId, description } = req.body;

      if (!gameId) {
        return res.status(400).json({ error: 'Missing gameId' });
      }

      // Get current version
      const gameResult = await db.query(
        'SELECT version FROM games WHERE id = $1 AND creator_id = $2',
        [gameId, req.userId]
      );

      if (gameResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game not found' });
      }

      const newVersion = (gameResult.rows[0].version || 0) + 1;

      // Insert version record
      const versionResult = await db.query(
        `INSERT INTO game_versions (game_id, version_number, description, created_by)
         VALUES ($1, $2, $3, $4)
         RETURNING id, version_number, created_at`,
        [gameId, newVersion, description, req.userId]
      );

      res.json({
        message: 'New version created',
        version: versionResult.rows[0],
      });
    } catch (error) {
      console.error('Error creating version:', error);
      res.status(500).json({ error: 'Version creation failed' });
    }
  });

  /**
   * GET /publishing/versions/:gameId
   * Get game version history
   */
  router.get('/versions/:gameId', verifyToken, async (req, res) => {
    try {
      const { gameId } = req.params;

      // Verify authorization
      const gameResult = await db.query(
        'SELECT creator_id FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0 || gameResult.rows[0].creator_id !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      const versions = await db.query(
        `SELECT id, version_number, description, created_at
         FROM game_versions
         WHERE game_id = $1
         ORDER BY version_number DESC`,
        [gameId]
      );

      res.json(versions.rows);
    } catch (error) {
      console.error('Error fetching versions:', error);
      res.status(500).json({ error: 'Failed to fetch versions' });
    }
  });

  /**
   * POST /publishing/rollback
   * Rollback to previous game version
   */
  router.post('/rollback', verifyToken, async (req, res) => {
    try {
      const { gameId, versionNumber } = req.body;

      if (!gameId || !versionNumber) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Verify authorization
      const gameResult = await db.query(
        'SELECT creator_id FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0 || gameResult.rows[0].creator_id !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Update game version
      await db.query(
        'UPDATE games SET version = $1 WHERE id = $2',
        [versionNumber, gameId]
      );

      res.json({
        message: 'Rolled back successfully',
        gameId,
        versionNumber,
      });
    } catch (error) {
      console.error('Error rolling back:', error);
      res.status(500).json({ error: 'Rollback failed' });
    }
  });

  /**
   * GET /publishing/analytics/:gameId
   * Get game analytics and statistics
   */
  router.get('/analytics/:gameId', verifyToken, async (req, res) => {
    try {
      const { gameId } = req.params;

      // Verify authorization
      const gameResult = await db.query(
        'SELECT creator_id FROM games WHERE id = $1',
        [gameId]
      );

      if (gameResult.rows.length === 0 || gameResult.rows[0].creator_id !== req.userId) {
        return res.status(403).json({ error: 'Not authorized' });
      }

      // Get analytics
      const analytics = await db.query(
        `SELECT 
           COUNT(*) as total_visits,
           COUNT(DISTINCT user_id) as unique_players,
           AVG(session_duration) as avg_session_duration
         FROM game_analytics
         WHERE game_id = $1
         AND visited_at > NOW() - INTERVAL '7 days'`,
        [gameId]
      );

      res.json({
        gameId,
        period: 'last_7_days',
        analytics: analytics.rows[0],
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  return router;
};
