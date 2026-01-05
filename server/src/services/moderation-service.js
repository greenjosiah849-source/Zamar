/**
 * Moderation Service
 * 
 * Handles:
 * - Asset scanning and flagging
 * - Violation tracking
 * - Punishment enforcement
 * - Appeal management
 */

const ZamarAI = require('./zamar-ai');
const crypto = require('crypto');

class ModerationService {
  constructor(pool, redisClient) {
    this.pool = pool;
    this.redis = redisClient;
    this.ai = new ZamarAI();
    
    // Violation points system
    this.violationPoints = {
      LOW: 5,
      MEDIUM: 15,
      HIGH: 30,
      CRITICAL: 50
    };

    // Actions for violation points
    this.punishments = {
      5: 'WARNING',
      15: 'MUTE_24H',
      30: 'SUSPEND_7D',
      50: 'SUSPEND_30D',
      100: 'BAN'
    };
  }

  /**
   * SCAN ASSET
   * Scan any content (image, video, audio, text, username)
   */
  async scanAsset(assetData) {
    try {
      const { type, content, userId, gameId, metadata } = assetData;

      if (!type || !content) {
        throw new Error('Missing type or content');
      }

      // Generate hash for caching
      const contentHash = await this.ai.hashContent(content);

      // Check cache first
      const cached = await this._getCachedPrediction(contentHash);
      if (cached) {
        console.log(`[Moderation] Cache hit for hash: ${contentHash.substring(0, 8)}`);
        return cached;
      }

      // Run AI analysis
      let analysis;
      switch (type) {
        case 'image':
          analysis = await this.ai.analyzeImage(content);
          break;
        case 'video':
          analysis = await this.ai.analyzeVideo(content);
          break;
        case 'audio':
          analysis = await this.ai.analyzeAudio(content);
          break;
        case 'text':
        case 'chat':
        case 'description':
          analysis = await this.ai.analyzeText(content, metadata);
          break;
        case 'username':
          analysis = await this.ai.analyzeUsername(content);
          break;
        case 'game_metadata':
          analysis = await this.ai.analyzeGameMetadata(content);
          break;
        default:
          throw new Error(`Unsupported asset type: ${type}`);
      }

      // Cache the prediction
      await this._cachePrediction(contentHash, analysis);

      // Store in database for training
      await this._storeAIPrediction(contentHash, type, analysis, userId, gameId);

      // Flag if necessary
      if (analysis.isFlagged) {
        await this._createFlaggedContent({
          contentHash,
          type,
          userId,
          gameId,
          category: analysis.category,
          confidence: analysis.confidence,
          metadata
        });
      }

      return {
        ...analysis,
        hash: contentHash,
        flagged: analysis.isFlagged
      };
    } catch (error) {
      console.error('[Moderation] Scan error:', error);
      throw error;
    }
  }

  /**
   * CREATE MODERATION CASE
   * Create a formal moderation case for violating content
   */
  async createModerationCase(caseData) {
    try {
      const {
        userId,
        gameId,
        contentType,
        contentHash,
        reason,
        severity,
        aiCategory,
        aiConfidence,
        evidence,
        reportedBy
      } = caseData;

      const caseId = crypto.randomUUID();

      const result = await this.pool.query(
        `INSERT INTO moderation_cases 
         (id, user_id, game_id, content_type, content_hash, reason, severity, 
          ai_flagged, ai_category, ai_confidence, evidence_url, created_by, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          caseId,
          userId,
          gameId,
          contentType,
          contentHash,
          reason,
          severity || 'MEDIUM',
          aiCategory ? true : false,
          aiCategory,
          aiConfidence,
          evidence,
          reportedBy,
          new Date()
        ]
      );

      console.log(`[Moderation] Case created: ${caseId} for user ${userId}`);

      return result.rows[0];
    } catch (error) {
      console.error('[Moderation] Create case error:', error);
      throw error;
    }
  }

  /**
   * REVIEW & RESOLVE CASE
   * Moderator reviews and takes action
   */
  async reviewCase(caseId, reviewData) {
    try {
      const { action, status, moderatorId, reviewNotes } = reviewData;

      if (!['APPROVED', 'DISMISSED', 'REVIEWED'].includes(status)) {
        throw new Error('Invalid status');
      }

      // Update case
      await this.pool.query(
        `UPDATE moderation_cases 
         SET status = $1, action = $2, reviewed_by = $3, reviewed_at = $4 
         WHERE id = $5`,
        [status, action, moderatorId, new Date(), caseId]
      );

      // If action taken, enforce punishment
      if (action && status === 'APPROVED') {
        const caseData = await this.pool.query(
          'SELECT * FROM moderation_cases WHERE id = $1',
          [caseId]
        );

        if (caseData.rows.length > 0) {
          await this._enforcePunishment(caseData.rows[0], action, moderatorId);
        }
      }

      // Log action
      await this._logModerationAction({
        moderatorId,
        actionType: action,
        caseId,
        notes: reviewNotes
      });

      console.log(`[Moderation] Case ${caseId} reviewed: ${action}`);

      return { caseId, status, action };
    } catch (error) {
      console.error('[Moderation] Review error:', error);
      throw error;
    }
  }

  /**
   * ENFORCE PUNISHMENT
   * Apply warnings, mutes, suspensions, or bans
   */
  async _enforcePunishment(moderationCase, action, moderatorId) {
    try {
      const { user_id, severity, id: caseId } = moderationCase;

      if (!user_id) return;

      const points = this.violationPoints[severity];

      // Create violation record
      const violationId = crypto.randomUUID();
      await this.pool.query(
        `INSERT INTO user_violations 
         (id, user_id, case_id, violation_type, severity, points, action_taken, created_by, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          violationId,
          user_id,
          caseId,
          'content_violation',
          severity,
          points,
          action,
          moderatorId,
          new Date()
        ]
      );

      // Apply action
      switch (action) {
        case 'WARNING':
          await this._issueWarning(user_id, caseId, moderatorId);
          break;

        case 'MUTE':
        case 'MUTE_24H':
          await this._muteUser(user_id, 1, caseId, moderatorId);
          break;

        case 'SUSPEND':
        case 'SUSPEND_7D':
          await this._suspendUser(user_id, 7, caseId, moderatorId);
          break;

        case 'SUSPEND_30D':
          await this._suspendUser(user_id, 30, caseId, moderatorId);
          break;

        case 'BAN':
          await this._banUser(user_id, null, caseId, moderatorId); // null = permanent
          break;

        case 'CONTENT_REMOVAL':
          await this._removeContent(moderationCase, moderatorId);
          break;
      }

      console.log(`[Moderation] Punishment enforced: ${action} for user ${user_id}`);
    } catch (error) {
      console.error('[Moderation] Enforcement error:', error);
      throw error;
    }
  }

  /**
   * ISSUE WARNING
   * Record warning for user
   */
  async _issueWarning(userId, caseId, moderatorId) {
    const warningId = crypto.randomUUID();

    await this.pool.query(
      `INSERT INTO user_bans (id, user_id, case_id, ban_type, reason, active, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        warningId,
        userId,
        caseId,
        'WARNING',
        'Content moderation violation',
        false,
        moderatorId,
        new Date()
      ]
    );

    // Notify user
    await this._notifyUser(userId, 'warning', {
      message: 'Your content violated community guidelines.',
      caseId
    });
  }

  /**
   * MUTE USER
   * Prevent user from chatting for duration
   */
  async _muteUser(userId, durationDays, caseId, moderatorId) {
    const banId = crypto.randomUUID();
    const until = new Date();
    until.setDate(until.getDate() + durationDays);

    await this.pool.query(
      `INSERT INTO user_bans (id, user_id, case_id, ban_type, reason, ban_until, active, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        banId,
        userId,
        caseId,
        'MUTED',
        'Temporary mute from moderation violation',
        until,
        true,
        moderatorId,
        new Date()
      ]
    );

    // Cache in Redis for quick checks
    await this.redis.setEx(`mute:${userId}`, durationDays * 86400, '1');

    // Notify user
    await this._notifyUser(userId, 'mute', {
      message: `You have been muted for ${durationDays} day(s)`,
      until: until.toISOString(),
      caseId,
      appeal: true
    });
  }

  /**
   * SUSPEND USER
   * Prevent user from accessing platform for duration
   */
  async _suspendUser(userId, durationDays, caseId, moderatorId) {
    const banId = crypto.randomUUID();
    const until = new Date();
    until.setDate(until.getDate() + durationDays);

    await this.pool.query(
      `INSERT INTO user_bans (id, user_id, case_id, ban_type, reason, ban_until, active, appeal_allowed, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        banId,
        userId,
        caseId,
        'SUSPENDED',
        'Account suspension from moderation violation',
        until,
        true,
        true,
        moderatorId,
        new Date()
      ]
    );

    // Cache in Redis
    await this.redis.setEx(`suspend:${userId}`, durationDays * 86400, '1');

    // Notify user
    await this._notifyUser(userId, 'suspension', {
      message: `Your account has been suspended for ${durationDays} day(s)`,
      until: until.toISOString(),
      caseId,
      appeal: true
    });
  }

  /**
   * BAN USER
   * Permanent or temporary ban
   */
  async _banUser(userId, durationDays, caseId, moderatorId) {
    const banId = crypto.randomUUID();
    const until = durationDays
      ? new Date(Date.now() + durationDays * 86400000)
      : null;

    await this.pool.query(
      `INSERT INTO user_bans (id, user_id, case_id, ban_type, reason, ban_until, active, appeal_allowed, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        banId,
        userId,
        caseId,
        'PERMANENT',
        'Account ban from moderation violation',
        until,
        true,
        true,
        moderatorId,
        new Date()
      ]
    );

    // Cache in Redis
    if (durationDays) {
      await this.redis.setEx(`ban:${userId}`, durationDays * 86400, '1');
    } else {
      await this.redis.set(`ban:${userId}`, '1');
    }

    // Disable user account
    await this.pool.query(
      'UPDATE users SET disabled = true WHERE id = $1',
      [userId]
    );

    // Notify user
    await this._notifyUser(userId, 'ban', {
      message: durationDays
        ? `Your account has been banned for ${durationDays} day(s)`
        : 'Your account has been permanently banned',
      until: until?.toISOString(),
      caseId,
      appeal: true
    });
  }

  /**
   * REMOVE CONTENT
   * Remove flagged content
   */
  async _removeContent(moderationCase, moderatorId) {
    const { game_id, content_hash } = moderationCase;

    if (content_hash) {
      await this.pool.query(
        `UPDATE flagged_content SET status = 'RESOLVED', action_taken = 'REMOVED' 
         WHERE content_hash = $1`,
        [content_hash]
      );
    }

    if (game_id) {
      // Remove game or mark as under review
      await this.pool.query(
        `UPDATE games SET status = 'UNDER_REVIEW' WHERE id = $1`,
        [game_id]
      );
    }
  }

  /**
   * CHECK IF USER IS BANNED/MUTED/SUSPENDED
   */
  async checkUserStatus(userId) {
    try {
      // Check Redis cache first (faster)
      const redisBan = await this.redis.get(`ban:${userId}`);
      const redisMute = await this.redis.get(`mute:${userId}`);
      const redisSuspend = await this.redis.get(`suspend:${userId}`);

      if (redisBan) return { status: 'BANNED', type: 'BAN' };
      if (redisSuspend) return { status: 'SUSPENDED', type: 'SUSPENSION' };
      if (redisMute) return { status: 'MUTED', type: 'MUTE' };

      // Check database
      const activeBans = await this.pool.query(
        `SELECT * FROM user_bans 
         WHERE user_id = $1 AND active = true 
         AND (ban_until IS NULL OR ban_until > NOW())
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (activeBans.rows.length > 0) {
        const ban = activeBans.rows[0];

        // Cache it
        if (ban.ban_until) {
          const timeLeft = Math.floor(
            (new Date(ban.ban_until) - new Date()) / 1000
          );
          if (timeLeft > 0) {
            await this.redis.setEx(`${ban.ban_type.toLowerCase()}:${userId}`, timeLeft, '1');
          }
        } else {
          await this.redis.set(`${ban.ban_type.toLowerCase()}:${userId}`, '1');
        }

        return {
          status: ban.ban_type,
          type: ban.ban_type,
          until: ban.ban_until,
          reason: ban.reason,
          appealable: ban.appeal_allowed
        };
      }

      return { status: 'ACTIVE', clean: true };
    } catch (error) {
      console.error('[Moderation] Status check error:', error);
      return { status: 'ERROR', error: error.message };
    }
  }

  /**
   * APPEAL BAN
   */
  async appealBan(userId, banId, appealMessage) {
    try {
      const appealId = crypto.randomUUID();

      const result = await this.pool.query(
        `INSERT INTO moderation_appeals (id, user_id, ban_id, appeal_message, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [appealId, userId, banId, appealMessage, 'PENDING', new Date()]
      );

      console.log(`[Moderation] Appeal created: ${appealId}`);

      return result.rows[0];
    } catch (error) {
      console.error('[Moderation] Appeal error:', error);
      throw error;
    }
  }

  /**
   * REVIEW APPEAL
   */
  async reviewAppeal(appealId, reviewData) {
    try {
      const { decision, response, moderatorId } = reviewData;

      if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new Error('Invalid decision');
      }

      const result = await this.pool.query(
        `UPDATE moderation_appeals 
         SET status = $1, response = $2, reviewed_by = $3, reviewed_at = $4 
         WHERE id = $5
         RETURNING *`,
        [decision, response, moderatorId, new Date(), appealId]
      );

      if (result.rows.length > 0) {
        const appeal = result.rows[0];

        if (decision === 'APPROVED') {
          // Lift the ban
          await this.pool.query(
            'UPDATE user_bans SET active = false WHERE id = $1',
            [appeal.ban_id]
          );

          // Clear Redis cache
          const ban = await this.pool.query(
            'SELECT user_id, ban_type FROM user_bans WHERE id = $1',
            [appeal.ban_id]
          );

          if (ban.rows.length > 0) {
            await this.redis.del(`${ban.rows[0].ban_type.toLowerCase()}:${ban.rows[0].user_id}`);
          }
        }

        console.log(`[Moderation] Appeal ${appealId} reviewed: ${decision}`);
      }

      return result.rows[0];
    } catch (error) {
      console.error('[Moderation] Review appeal error:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  async _getCachedPrediction(hash) {
    try {
      const cached = await this.redis.get(`pred:${hash}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      return null;
    }
  }

  async _cachePrediction(hash, analysis) {
    try {
      await this.redis.setEx(
        `pred:${hash}`,
        30 * 86400, // 30 days
        JSON.stringify(analysis)
      );
    } catch (error) {
      console.error('[Moderation] Caching error:', error);
    }
  }

  async _storeAIPrediction(hash, type, analysis, userId, gameId) {
    try {
      await this.pool.query(
        `INSERT INTO ai_predictions (content_type, content_hash, predictions, flagged, top_category, confidence_score, model_version) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (content_hash) DO NOTHING`,
        [
          type,
          hash,
          JSON.stringify(analysis.predictions),
          analysis.isFlagged,
          analysis.category,
          analysis.confidence,
          this.ai.version
        ]
      );
    } catch (error) {
      console.error('[Moderation] Store prediction error:', error);
    }
  }

  async _createFlaggedContent(contentData) {
    try {
      const flaggedId = crypto.randomUUID();

      await this.pool.query(
        `INSERT INTO flagged_content (id, content_type, content_hash, user_id, game_id, ai_category, ai_confidence, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          flaggedId,
          contentData.type,
          contentData.contentHash,
          contentData.userId,
          contentData.gameId,
          contentData.category,
          contentData.confidence,
          'PENDING',
          new Date()
        ]
      );
    } catch (error) {
      console.error('[Moderation] Create flagged content error:', error);
    }
  }

  async _logModerationAction(actionData) {
    try {
      const { moderatorId, actionType, caseId, targetUserId, notes } = actionData;

      await this.pool.query(
        `INSERT INTO moderation_actions_log (id, moderator_id, action_type, details, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          crypto.randomUUID(),
          moderatorId,
          actionType,
          JSON.stringify({
            caseId,
            targetUserId,
            notes
          }),
          new Date()
        ]
      );
    } catch (error) {
      console.error('[Moderation] Log action error:', error);
    }
  }

  async _notifyUser(userId, type, data) {
    try {
      // Send notification to user
      // This would integrate with your notification system
      console.log(`[Moderation] Notifying user ${userId}: ${type}`, data);
    } catch (error) {
      console.error('[Moderation] Notify user error:', error);
    }
  }

  /**
   * GET MODEL INFO
   */
  getAIInfo() {
    return this.ai.getModelInfo();
  }
}

module.exports = ModerationService;
