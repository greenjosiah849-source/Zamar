/**
 * Moderation Routes
 * 
 * Complete moderation system with Zamar AI
 * Handles: asset scanning, case management, punishments, appeals
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const ModerationService = require('../services/moderation-service');

module.exports = (pool, redisClient) => {
  const router = express.Router();
  const modService = new ModerationService(pool, redisClient);

  /**
   * SCAN ASSET - Analyze content with Zamar AI
   * POST /moderation/scan
   */
  router.post('/scan', authenticateToken, async (req, res) => {
    try {
      const { type, content, metadata } = req.body;
      const userId = req.user.userId;

      if (!type || !content) {
        return res.status(400).json({ error: 'Missing type or content' });
      }

      const result = await modService.scanAsset({
        type,
        content,
        userId,
        metadata
      });

      res.json({
        scanned: true,
        flagged: result.isFlagged,
        category: result.category,
        confidence: result.confidence,
        hash: result.hash,
        predictions: result.predictions
      });
    } catch (error) {
      console.error('Scan error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * SCAN GAME METADATA
   * POST /moderation/scan-game
   */
  router.post('/scan-game', authenticateToken, async (req, res) => {
    try {
      const { name, description, tags } = req.body;
      const userId = req.user.userId;

      const result = await modService.scanAsset({
        type: 'game_metadata',
        content: { name, description, tags },
        userId
      });

      res.json({
        scanned: true,
        flagged: result.isFlagged,
        confidence: result.confidence,
        details: result.predictions
      });
    } catch (error) {
      console.error('Game scan error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * REPORT CONTENT
   * POST /moderation/report
   */
  router.post('/report', authenticateToken, async (req, res) => {
    try {
      const { reportedUserId, reportedGameId, reason, description } = req.body;
      const reportedBy = req.user.userId;

      if (!reportedUserId && !reportedGameId) {
        return res.status(400).json({ error: 'Must report user or game' });
      }

      if (!reason) {
        return res.status(400).json({ error: 'Reason required' });
      }

      const moderationCase = await modService.createModerationCase({
        userId: reportedUserId,
        gameId: reportedGameId,
        contentType: reportedGameId ? 'game_report' : 'user_report',
        reason,
        severity: 'MEDIUM',
        reportedBy
      });

      res.status(201).json({
        caseId: moderationCase.id,
        status: 'submitted',
        message: 'Report submitted for review'
      });
    } catch (error) {
      console.error('Report error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET MODERATION CASES (Admin Only)
   * GET /moderation/cases
   */
  router.get('/cases', authenticateToken, async (req, res) => {
    try {
      // Admin check
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status, page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      let query = 'SELECT * FROM moderation_cases WHERE 1=1';
      const params = [];

      if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);

      res.json({
        cases: result.rows,
        page,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Get cases error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET SINGLE CASE
   * GET /moderation/cases/:caseId
   */
  router.get('/cases/:caseId', authenticateToken, async (req, res) => {
    try {
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const result = await pool.query(
        'SELECT * FROM moderation_cases WHERE id = $1',
        [req.params.caseId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Case not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Get case error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * REVIEW & RESOLVE CASE (Admin Only)
   * POST /moderation/cases/:caseId/review
   */
  router.post('/cases/:caseId/review', authenticateToken, async (req, res) => {
    try {
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { action, status, notes } = req.body;
      const caseId = req.params.caseId;

      if (!['APPROVED', 'DISMISSED', 'REVIEWED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const result = await modService.reviewCase(caseId, {
        action,
        status,
        moderatorId: req.user.userId,
        reviewNotes: notes
      });

      res.json({
        message: 'Case reviewed',
        caseId: result.caseId,
        action: result.action,
        status: result.status
      });
    } catch (error) {
      console.error('Review case error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * CHECK USER STATUS
   * GET /moderation/user/:userId/status
   */
  router.get('/user/:userId/status', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.userId;

      // Users can check their own status, admins can check anyone
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin && req.user.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const status = await modService.checkUserStatus(userId);

      res.json(status);
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET USER VIOLATIONS
   * GET /moderation/user/:userId/violations
   */
  router.get('/user/:userId/violations', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.userId;

      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin && req.user.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await pool.query(
        `SELECT * FROM user_violations 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        userId,
        violations: result.rows,
        totalPoints: result.rows.reduce((sum, v) => sum + v.points, 0)
      });
    } catch (error) {
      console.error('Get violations error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * APPEAL BAN
   * POST /moderation/appeals
   */
  router.post('/appeals', authenticateToken, async (req, res) => {
    try {
      const { banId, message } = req.body;
      const userId = req.user.userId;

      if (!banId || !message) {
        return res.status(400).json({ error: 'Missing banId or message' });
      }

      // Verify ban exists and belongs to user
      const banCheck = await pool.query(
        'SELECT * FROM user_bans WHERE id = $1 AND user_id = $2',
        [banId, userId]
      );

      if (banCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Ban not found' });
      }

      const appeal = await modService.appealBan(userId, banId, message);

      res.status(201).json({
        appealId: appeal.id,
        status: appeal.status,
        message: 'Appeal submitted for review'
      });
    } catch (error) {
      console.error('Appeal error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET USER APPEALS
   * GET /moderation/user/:userId/appeals
   */
  router.get('/user/:userId/appeals', authenticateToken, async (req, res) => {
    try {
      const userId = req.params.userId;

      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin && req.user.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await pool.query(
        `SELECT * FROM moderation_appeals 
         WHERE user_id = $1 
         ORDER BY created_at DESC`,
        [userId]
      );

      res.json({
        userId,
        appeals: result.rows
      });
    } catch (error) {
      console.error('Get appeals error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * REVIEW APPEAL (Admin Only)
   * POST /moderation/appeals/:appealId/review
   */
  router.post('/appeals/:appealId/review', authenticateToken, async (req, res) => {
    try {
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { decision, response } = req.body;

      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        return res.status(400).json({ error: 'Invalid decision' });
      }

      const result = await modService.reviewAppeal(req.params.appealId, {
        decision,
        response,
        moderatorId: req.user.userId
      });

      res.json({
        appealId: result.id,
        decision: result.status,
        message: `Appeal ${decision.toLowerCase()}`
      });
    } catch (error) {
      console.error('Review appeal error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET FLAGGED CONTENT
   * GET /moderation/flagged
   */
  router.get('/flagged', authenticateToken, async (req, res) => {
    try {
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status = 'PENDING', limit = 50 } = req.query;

      const result = await pool.query(
        `SELECT * FROM flagged_content 
         WHERE status = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [status, limit]
      );

      res.json({
        flaggedContent: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Get flagged error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET ZAMAR AI INFO
   * GET /moderation/ai-info
   */
  router.get('/ai-info', (req, res) => {
    try {
      const aiInfo = modService.getAIInfo();

      res.json({
        name: aiInfo.name,
        version: aiInfo.version,
        capabilities: aiInfo.capabilities,
        categories: aiInfo.categories,
        thresholds: aiInfo.thresholds
      });
    } catch (error) {
      console.error('AI info error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET MODERATION STATS
   * GET /moderation/stats
   */
  router.get('/stats', authenticateToken, async (req, res) => {
    try {
      const isAdmin = await _isAdmin(pool, req.user.userId);
      if (!isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const caseStats = await pool.query(
        `SELECT status, COUNT(*) as count FROM moderation_cases GROUP BY status`
      );

      const banStats = await pool.query(
        `SELECT ban_type, COUNT(*) as count FROM user_bans WHERE active = true GROUP BY ban_type`
      );

      const flaggedStats = await pool.query(
        `SELECT content_type, COUNT(*) as count FROM flagged_content GROUP BY content_type`
      );

      res.json({
        cases: {
          byStatus: caseStats.rows.reduce((acc, row) => {
            acc[row.status] = parseInt(row.count);
            return acc;
          }, {})
        },
        bans: {
          byType: banStats.rows.reduce((acc, row) => {
            acc[row.ban_type] = parseInt(row.count);
            return acc;
          }, {})
        },
        flagged: {
          byType: flaggedStats.rows.reduce((acc, row) => {
            acc[row.content_type] = parseInt(row.count);
            return acc;
          }, {})
        }
      });
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};

// ============================================
// HELPER FUNCTIONS
// ============================================

async function _isAdmin(pool, userId) {
  try {
    const result = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role IN ('admin', 'moderator')`,
      [userId]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Admin check error:', error);
    return false;
  }
}
