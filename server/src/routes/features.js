/**
 * Advanced Features Routes
 * Includes: Game Passes, Badges, Achievements, Leaderboards, Trading
 */

const express = require('express');
const router = express.Router();

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

module.exports = (db) => {
  // ===== GAME PASSES =====

  /**
   * GET /features/game-passes/:gameId
   * Get game passes for a game
   */
  router.get('/game-passes/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;

      const result = await db.query(
        `SELECT id, name, description, price, icon_url, active
         FROM game_passes
         WHERE game_id = $1 AND active = true
         ORDER BY created_at`,
        [gameId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching game passes:', error);
      res.status(500).json({ error: 'Failed to fetch game passes' });
    }
  });

  /**
   * POST /features/game-passes/:gameId/buy
   * Purchase a game pass
   */
  router.post('/game-passes/:gameId/buy', verifyToken, async (req, res) => {
    try {
      const { gamePassId } = req.body;
      const { gameId } = req.params;

      if (!gamePassId) {
        return res.status(400).json({ error: 'Missing gamePassId' });
      }

      // Get game pass details
      const passResult = await db.query(
        'SELECT price FROM game_passes WHERE id = $1 AND game_id = $2',
        [gamePassId, gameId]
      );

      if (passResult.rows.length === 0) {
        return res.status(404).json({ error: 'Game pass not found' });
      }

      const price = passResult.rows[0].price;

      // Check user Robux balance (simplified - would need Robux table)
      // For now, assume user has enough

      // Check if already owned
      const ownResult = await db.query(
        'SELECT id FROM user_game_passes WHERE user_id = $1 AND game_pass_id = $2',
        [req.userId, gamePassId]
      );

      if (ownResult.rows.length > 0) {
        return res.status(400).json({ error: 'Already own this game pass' });
      }

      // Purchase the game pass
      const purchaseResult = await db.query(
        `INSERT INTO user_game_passes (user_id, game_pass_id)
         VALUES ($1, $2)
         RETURNING id, purchased_at`,
        [req.userId, gamePassId]
      );

      res.json({
        message: 'Game pass purchased',
        purchase: purchaseResult.rows[0],
        robuxDeducted: price,
      });
    } catch (error) {
      console.error('Error purchasing game pass:', error);
      res.status(500).json({ error: 'Purchase failed' });
    }
  });

  // ===== ACHIEVEMENTS =====

  /**
   * GET /features/achievements/:gameId
   * Get achievements for a game
   */
  router.get('/achievements/:gameId', async (req, res) => {
    try {
      const { gameId } = req.params;

      const result = await db.query(
        `SELECT id, name, description, icon_url, reward_robux
         FROM achievements
         WHERE game_id = $1
         ORDER BY created_at`,
        [gameId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  });

  /**
   * GET /features/achievements/user/:userId
   * Get achievements earned by a user
   */
  router.get('/achievements/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const result = await db.query(
        `SELECT a.id, a.name, a.description, a.icon_url, a.reward_robux,
                a.game_id, ua.earned_at
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = $1
         ORDER BY ua.earned_at DESC`,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching user achievements:', error);
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  });

  /**
   * POST /features/achievements/unlock
   * Unlock an achievement (called by game server)
   */
  router.post('/achievements/unlock', verifyToken, async (req, res) => {
    try {
      const { achievementId } = req.body;

      if (!achievementId) {
        return res.status(400).json({ error: 'Missing achievementId' });
      }

      // Check if already earned
      const existingResult = await db.query(
        'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
        [req.userId, achievementId]
      );

      if (existingResult.rows.length > 0) {
        return res.status(400).json({ error: 'Already earned this achievement' });
      }

      // Insert achievement
      const result = await db.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2)
         RETURNING earned_at`,
        [req.userId, achievementId]
      );

      res.json({
        message: 'Achievement unlocked',
        achievementId,
        unlockedAt: result.rows[0].earned_at,
      });
    } catch (error) {
      console.error('Error unlocking achievement:', error);
      res.status(500).json({ error: 'Failed to unlock achievement' });
    }
  });

  // ===== LEADERBOARDS =====

  /**
   * GET /features/leaderboards/:leaderboardId
   * Get top 100 leaderboard entries
   */
  router.get('/leaderboards/:leaderboardId', async (req, res) => {
    try {
      const { leaderboardId } = req.params;
      const limit = Math.min(parseInt(req.query.limit) || 100, 1000);

      const result = await db.query(
        `SELECT le.rank, le.score, u.username, u.id as user_id
         FROM leaderboard_entries le
         JOIN users u ON le.user_id = u.id
         WHERE le.leaderboard_id = $1
         ORDER BY le.score DESC, le.recorded_at DESC
         LIMIT $2`,
        [leaderboardId, limit]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });

  /**
   * POST /features/leaderboards/:leaderboardId/submit
   * Submit a score to leaderboard
   */
  router.post('/leaderboards/:leaderboardId/submit', verifyToken, async (req, res) => {
    try {
      const { leaderboardId } = req.params;
      const { score } = req.body;

      if (typeof score !== 'number') {
        return res.status(400).json({ error: 'Invalid score' });
      }

      // Insert score
      const result = await db.query(
        `INSERT INTO leaderboard_entries (leaderboard_id, user_id, score, recorded_at)
         VALUES ($1, $2, $3, NOW())
         RETURNING score, recorded_at`,
        [leaderboardId, req.userId, score]
      );

      // Calculate rank
      const rankResult = await db.query(
        `SELECT COUNT(*) as rank FROM leaderboard_entries
         WHERE leaderboard_id = $1 AND score > $2`,
        [leaderboardId, score]
      );

      const rank = parseInt(rankResult.rows[0].rank) + 1;

      res.json({
        message: 'Score submitted',
        score,
        rank,
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      res.status(500).json({ error: 'Failed to submit score' });
    }
  });

  // ===== BADGES =====

  /**
   * GET /features/badges
   * Get all available badges
   */
  router.get('/badges', async (req, res) => {
    try {
      const result = await db.query(
        `SELECT id, name, description, icon_url, rarity
         FROM badges
         ORDER BY rarity, created_at`
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  });

  /**
   * GET /features/badges/user/:userId
   * Get badges earned by a user
   */
  router.get('/badges/user/:userId', async (req, res) => {
    try {
      const { userId } = req.params;

      const result = await db.query(
        `SELECT b.id, b.name, b.description, b.icon_url, b.rarity, ub.earned_at
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = $1
         ORDER BY ub.earned_at DESC`,
        [userId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching user badges:', error);
      res.status(500).json({ error: 'Failed to fetch badges' });
    }
  });

  // ===== TRADING =====

  /**
   * POST /features/trading/initiate
   * Initiate a trade with another player
   */
  router.post('/trading/initiate', verifyToken, async (req, res) => {
    try {
      const { receiverId, requesterItems, receiverItems } = req.body;

      if (!receiverId) {
        return res.status(400).json({ error: 'Missing receiver' });
      }

      // Create trade
      const result = await db.query(
        `INSERT INTO trades (requester_id, receiver_id, requester_items, receiver_items)
         VALUES ($1, $2, $3, $4)
         RETURNING id, status, created_at`,
        [req.userId, receiverId, JSON.stringify(requesterItems || []), JSON.stringify(receiverItems || [])]
      );

      res.json({
        message: 'Trade initiated',
        tradeId: result.rows[0].id,
        status: result.rows[0].status,
      });
    } catch (error) {
      console.error('Error initiating trade:', error);
      res.status(500).json({ error: 'Failed to initiate trade' });
    }
  });

  /**
   * POST /features/trading/:tradeId/accept
   * Accept a trade
   */
  router.post('/trading/:tradeId/accept', verifyToken, async (req, res) => {
    try {
      const { tradeId } = req.params;

      // Get trade details
      const tradeResult = await db.query(
        'SELECT requester_id, receiver_id, status FROM trades WHERE id = $1',
        [tradeId]
      );

      if (tradeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      const trade = tradeResult.rows[0];

      // Verify user is receiver
      if (trade.receiver_id !== req.userId) {
        return res.status(403).json({ error: 'Only receiver can accept' });
      }

      if (trade.status !== 'PENDING') {
        return res.status(400).json({ error: 'Trade is not pending' });
      }

      // Complete trade
      const result = await db.query(
        `UPDATE trades 
         SET status = 'COMPLETED', completed_at = NOW()
         WHERE id = $1
         RETURNING id, status, completed_at`,
        [tradeId]
      );

      res.json({
        message: 'Trade completed',
        trade: result.rows[0],
      });
    } catch (error) {
      console.error('Error accepting trade:', error);
      res.status(500).json({ error: 'Failed to accept trade' });
    }
  });

  /**
   * POST /features/trading/:tradeId/decline
   * Decline a trade
   */
  router.post('/trading/:tradeId/decline', verifyToken, async (req, res) => {
    try {
      const { tradeId } = req.params;

      // Update trade status
      const result = await db.query(
        `UPDATE trades 
         SET status = 'DECLINED'
         WHERE id = $1 AND receiver_id = $2
         RETURNING id, status`,
        [tradeId, req.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Trade not found' });
      }

      res.json({
        message: 'Trade declined',
        trade: result.rows[0],
      });
    } catch (error) {
      console.error('Error declining trade:', error);
      res.status(500).json({ error: 'Failed to decline trade' });
    }
  });

  return router;
};
