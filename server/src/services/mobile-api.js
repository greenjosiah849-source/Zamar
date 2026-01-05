/**
 * Mobile API Service
 * Complete mobile moderation features
 */

const crypto = require('crypto');

class MobileAPIService {
  constructor(pool, redisClient, moderationService) {
    this.pool = pool;
    this.redis = redisClient;
    this.modService = moderationService;
  }

  /**
   * Report content from mobile (optimized)
   */
  async reportContentMobile(userId, reportData) {
    const report = {
      id: crypto.randomUUID(),
      userId,
      contentType: reportData.contentType,
      contentId: reportData.contentId,
      reason: reportData.reason,
      description: reportData.description,
      evidence: reportData.evidence, // URL to image/video etc
      metadata: reportData.metadata || {},
      clientVersion: reportData.clientVersion,
      timestamp: new Date()
    };

    // Quick validation
    if (!['TEXT', 'PROFILE', 'IMAGE', 'VIDEO', 'AUDIO', 'GAME_CONTENT'].includes(report.contentType)) {
      throw new Error('Invalid content type');
    }

    // Store in database
    await this.pool.query(
      `INSERT INTO mobile_reports (id, user_id, content_type, content_id, reason, description, 
       evidence, metadata, client_version, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        report.id, userId, report.contentType, report.contentId, report.reason,
        report.description, report.evidence, JSON.stringify(report.metadata),
        report.clientVersion, report.timestamp
      ]
    );

    // Cache report
    await this.redis.setEx(`mobile_report:${report.id}`, 86400, JSON.stringify(report));

    return {
      reportId: report.id,
      status: 'SUBMITTED',
      timestamp: report.timestamp
    };
  }

  /**
   * Get user violations on mobile
   */
  async getUserViolationsMobile(userId) {
    const cacheKey = `mobile_user_violations:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.pool.query(
      `SELECT id, reason, severity, ai_category, status, created_at FROM user_violations 
       WHERE user_id = $1 AND status != 'RESOLVED' ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    const violations = result.rows.map(v => ({
      id: v.id,
      reason: v.reason,
      severity: v.severity,
      category: v.ai_category,
      status: v.status,
      date: v.created_at
    }));

    await this.redis.setEx(cacheKey, 3600, JSON.stringify(violations));

    return violations;
  }

  /**
   * Check if user is banned on mobile
   */
  async checkBanStatusMobile(userId) {
    const cacheKey = `mobile_ban_status:${userId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.pool.query(
      `SELECT id, ban_type, ban_until, reason FROM user_bans 
       WHERE user_id = $1 AND active = true LIMIT 1`,
      [userId]
    );

    const status = {
      isBanned: result.rows.length > 0,
      banType: result.rows[0]?.ban_type || null,
      banUntil: result.rows[0]?.ban_until || null,
      reason: result.rows[0]?.reason || null
    };

    await this.redis.setEx(cacheKey, 300, JSON.stringify(status));

    return status;
  }

  /**
   * Get moderation guidelines for mobile app
   */
  async getModerationGuidelinesMobile(language = 'en') {
    const cacheKey = `mobile_guidelines:${language}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.pool.query(
      `SELECT * FROM moderation_guidelines WHERE language = $1`,
      [language]
    );

    const guidelines = {
      language,
      categories: [
        {
          id: 'HATE_SPEECH',
          name: 'Hate Speech',
          description: 'Content that attacks people based on race, ethnicity, religion, etc.',
          examples: [],
          severity: 5
        },
        {
          id: 'HARASSMENT',
          name: 'Harassment',
          description: 'Targeted attacks or bullying of another user',
          examples: [],
          severity: 4
        },
        {
          id: 'VIOLENCE',
          name: 'Violence',
          description: 'Content promoting or glorifying violence',
          examples: [],
          severity: 5
        },
        {
          id: 'SELF_HARM',
          name: 'Self-Harm',
          description: 'Content promoting self-harm or suicide',
          examples: [],
          severity: 5
        },
        {
          id: 'SPAM',
          name: 'Spam',
          description: 'Repetitive, unsolicited messages',
          examples: [],
          severity: 1
        },
        {
          id: 'MISINFORMATION',
          name: 'Misinformation',
          description: 'False or misleading information',
          examples: [],
          severity: 2
        }
      ],
      lastUpdated: new Date()
    };

    await this.redis.setEx(cacheKey, 86400, JSON.stringify(guidelines));

    return guidelines;
  }

  /**
   * Get appeal status for mobile
   */
  async getAppealStatusMobile(userId) {
    const result = await this.pool.query(
      `SELECT id, status, decision, response, created_at, updated_at FROM moderation_appeals 
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [userId]
    );

    return result.rows.map(a => ({
      id: a.id,
      status: a.status,
      decision: a.decision,
      response: a.response,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));
  }

  /**
   * Submit appeal from mobile
   */
  async submitAppealMobile(userId, appealData) {
    const appeal = {
      id: crypto.randomUUID(),
      userId,
      caseId: appealData.caseId,
      banId: appealData.banId,
      reason: appealData.reason,
      message: appealData.message,
      evidence: appealData.evidence, // URL to file
      createdAt: new Date(),
      status: 'PENDING'
    };

    await this.pool.query(
      `INSERT INTO moderation_appeals (id, user_id, case_id, ban_id, reason, message, 
       evidence, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        appeal.id, userId, appeal.caseId, appeal.banId, appeal.reason,
        appeal.message, appeal.evidence, appeal.status, appeal.createdAt
      ]
    );

    return {
      appealId: appeal.id,
      status: 'SUBMITTED',
      estimatedReviewTime: '24-48 hours'
    };
  }

  /**
   * Get moderation status dashboard for mobile
   */
  async getModerationStatusMobile(userId) {
    const [violations, bans, appeals] = await Promise.all([
      this.pool.query(
        'SELECT COUNT(*) FROM user_violations WHERE user_id = $1',
        [userId]
      ),
      this.pool.query(
        'SELECT COUNT(*) FROM user_bans WHERE user_id = $1 AND active = true',
        [userId]
      ),
      this.pool.query(
        'SELECT COUNT(*) FROM moderation_appeals WHERE user_id = $1 AND status = $2',
        [userId, 'PENDING']
      )
    ]);

    return {
      userId,
      stats: {
        totalViolations: parseInt(violations.rows[0].count),
        activeBans: parseInt(bans.rows[0].count),
        pendingAppeals: parseInt(appeals.rows[0].count)
      },
      timestamp: new Date()
    };
  }

  /**
   * Get nearby moderation issues for community
   */
  async getCommunityModerationIssues(communityId, limit = 20) {
    const cacheKey = `community_issues:${communityId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.pool.query(
      `SELECT id, reason, severity, ai_category, reported_count, created_at 
       FROM flagged_content WHERE community_id = $1 AND status = 'PENDING' 
       ORDER BY reported_count DESC LIMIT $2`,
      [communityId, limit]
    );

    const issues = result.rows.map(i => ({
      id: i.id,
      reason: i.reason,
      severity: i.severity,
      category: i.ai_category,
      reports: i.reported_count,
      date: i.created_at
    }));

    await this.redis.setEx(cacheKey, 1800, JSON.stringify(issues));

    return issues;
  }

  /**
   * Sync moderation data to mobile
   */
  async getSyncData(userId, lastSyncTime) {
    const since = new Date(lastSyncTime);

    const [violations, bans, appeals, guidelines] = await Promise.all([
      this.pool.query(
        'SELECT id, reason, severity FROM user_violations WHERE user_id = $1 AND created_at > $2',
        [userId, since]
      ),
      this.pool.query(
        'SELECT id, ban_type, reason FROM user_bans WHERE user_id = $1 AND created_at > $2',
        [userId, since]
      ),
      this.pool.query(
        'SELECT id, status, decision FROM moderation_appeals WHERE user_id = $1 AND updated_at > $2',
        [userId, since]
      ),
      this.getModerationGuidelinesMobile()
    ]);

    return {
      timestamp: new Date(),
      changes: {
        violations: violations.rows,
        bans: bans.rows,
        appeals: appeals.rows
      },
      guidelines
    };
  }

  /**
   * Create quick report template
   */
  getQuickReportTemplates() {
    return [
      {
        id: 'HATE_SPEECH',
        label: 'Hate Speech',
        icon: 'alert-circle',
        color: '#FF0000'
      },
      {
        id: 'HARASSMENT',
        label: 'Harassment',
        icon: 'user-x',
        color: '#FF4500'
      },
      {
        id: 'SPAM',
        label: 'Spam',
        icon: 'mail-x',
        color: '#FFA500'
      },
      {
        id: 'NSFW',
        label: 'Inappropriate',
        icon: 'image-off',
        color: '#FF1493'
      },
      {
        id: 'MISINFORMATION',
        label: 'Misinformation',
        icon: 'alert',
        color: '#FFD700'
      },
      {
        id: 'SCAM',
        label: 'Scam/Fraud',
        icon: 'alert-triangle',
        color: '#DC143C'
      }
    ];
  }

  /**
   * Get moderation history export
   */
  async getModerationHistoryExport(userId, format = 'json') {
    const result = await this.pool.query(
      `SELECT * FROM user_violations WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const data = {
      userId,
      exportDate: new Date(),
      violations: result.rows
    };

    if (format === 'csv') {
      return this._convertToCSV(data);
    }

    return data;
  }

  /**
   * Convert to CSV
   */
  _convertToCSV(data) {
    const headers = ['ID', 'Reason', 'Severity', 'Category', 'Status', 'Date'];
    const rows = data.violations.map(v => [
      v.id,
      v.reason,
      v.severity,
      v.ai_category,
      v.status,
      v.created_at
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Get app version info
   */
  getAppVersionInfo() {
    return {
      currentVersion: '1.0.0',
      minSupportedVersion: '0.9.0',
      latestVersion: '1.0.0',
      features: {
        reporting: true,
        appeals: true,
        guidelines: true,
        banStatus: true,
        violations: true
      }
    };
  }
}

module.exports = MobileAPIService;
