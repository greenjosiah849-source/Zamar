/**
 * Advanced Analytics Service
 * Detailed moderation statistics and trends
 */

class AnalyticsService {
  constructor(pool, redisClient) {
    this.pool = pool;
    this.redis = redisClient;
  }

  /**
   * Get dashboard overview
   */
  async getDashboardOverview(timeRange = '7d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [cases, violations, bans, appeals, actions] = await Promise.all([
      this.pool.query(
        'SELECT COUNT(*) as count FROM moderation_cases WHERE created_at > $1',
        [since]
      ),
      this.pool.query(
        'SELECT COUNT(*) as count FROM user_violations WHERE created_at > $1',
        [since]
      ),
      this.pool.query(
        'SELECT COUNT(*) as count FROM user_bans WHERE created_at > $1',
        [since]
      ),
      this.pool.query(
        'SELECT COUNT(*) as count FROM moderation_appeals WHERE created_at > $1',
        [since]
      ),
      this.pool.query(
        'SELECT COUNT(*) as count FROM moderation_actions_log WHERE timestamp > $1',
        [since]
      )
    ]);

    return {
      timeRange,
      totalCases: parseInt(cases.rows[0].count),
      totalViolations: parseInt(violations.rows[0].count),
      totalBans: parseInt(bans.rows[0].count),
      pendingAppeals: parseInt(appeals.rows[0].count),
      actionsPerformed: parseInt(actions.rows[0].count)
    };
  }

  /**
   * Get violation statistics
   */
  async getViolationStats(timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // By category
    const byCategory = await this.pool.query(
      `SELECT ai_category as category, COUNT(*) as count, AVG(ai_confidence) as avg_confidence
       FROM user_violations WHERE created_at > $1 GROUP BY ai_category ORDER BY count DESC`,
      [since]
    );

    // By severity
    const bySeverity = await this.pool.query(
      `SELECT severity, COUNT(*) as count FROM user_violations 
       WHERE created_at > $1 GROUP BY severity ORDER BY severity DESC`,
      [since]
    );

    // Trend over time
    const trend = await this.pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM user_violations 
       WHERE created_at > $1 GROUP BY DATE(created_at) ORDER BY date`,
      [since]
    );

    return {
      byCategory: byCategory.rows,
      bySeverity: bySeverity.rows,
      trend: trend.rows
    };
  }

  /**
   * Get ban statistics
   */
  async getBanStats(timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Active bans
    const activeBans = await this.pool.query(
      'SELECT COUNT(*) as count FROM user_bans WHERE active = true AND created_at > $1',
      [since]
    );

    // By type
    const byType = await this.pool.query(
      `SELECT ban_type, COUNT(*) as count FROM user_bans 
       WHERE created_at > $1 GROUP BY ban_type`,
      [since]
    );

    // Ban duration distribution
    const duration = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN ban_until IS NULL THEN 1 END) as permanent,
        COUNT(CASE WHEN ban_until IS NOT NULL THEN 1 END) as temporary
       FROM user_bans WHERE created_at > $1`,
      [since]
    );

    return {
      activeBans: parseInt(activeBans.rows[0].count),
      byType: byType.rows,
      duration: duration.rows[0]
    };
  }

  /**
   * Get appeal statistics
   */
  async getAppealStats(timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Overall stats
    const overall = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending,
        COUNT(CASE WHEN decision = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN decision = 'REJECTED' THEN 1 END) as rejected
       FROM moderation_appeals WHERE created_at > $1`,
      [since]
    );

    // Approval rate
    const approvalRate = await this.pool.query(
      `SELECT 
        ROUND(COUNT(CASE WHEN decision = 'APPROVED' THEN 1 END)::numeric / 
              COUNT(*)::numeric * 100, 2) as approval_rate
       FROM moderation_appeals WHERE decision IS NOT NULL AND created_at > $1`,
      [since]
    );

    // Average review time
    const avgTime = await this.pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric as avg_hours
       FROM moderation_appeals WHERE decision IS NOT NULL AND created_at > $1`,
      [since]
    );

    return {
      stats: overall.rows[0],
      approvalRate: parseFloat(approvalRate.rows[0].approval_rate),
      avgReviewHours: parseFloat(avgTime.rows[0].avg_hours)
    };
  }

  /**
   * Get user-specific statistics
   */
  async getUserStats(userId) {
    const [violations, bans, appeals] = await Promise.all([
      this.pool.query(
        `SELECT COUNT(*) as count, MAX(created_at) as latest FROM user_violations WHERE user_id = $1`,
        [userId]
      ),
      this.pool.query(
        'SELECT COUNT(*) as count FROM user_bans WHERE user_id = $1 AND active = true',
        [userId]
      ),
      this.pool.query(
        `SELECT COUNT(*) as count, MAX(created_at) as latest FROM moderation_appeals WHERE user_id = $1`,
        [userId]
      )
    ]);

    return {
      violations: {
        count: parseInt(violations.rows[0].count),
        lastViolation: violations.rows[0].latest
      },
      activeBans: parseInt(bans.rows[0].count),
      appeals: {
        count: parseInt(appeals.rows[0].count),
        lastAppeal: appeals.rows[0].latest
      }
    };
  }

  /**
   * Get moderator performance
   */
  async getModeratorPerformance(moderatorId = null, timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    let query = `
      SELECT 
        created_by as moderator_id,
        COUNT(*) as cases_reviewed,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'DISMISSED' THEN 1 END) as dismissed,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric as avg_time_hours
      FROM moderation_cases 
      WHERE created_at > $1`;

    const params = [since];

    if (moderatorId) {
      query += ' AND created_by = $2';
      params.push(moderatorId);
    }

    query += ' GROUP BY created_by ORDER BY cases_reviewed DESC';

    const result = await this.pool.query(query, params);

    return result.rows.map(row => ({
      moderatorId: row.moderator_id,
      casesReviewed: parseInt(row.cases_reviewed),
      approved: parseInt(row.approved),
      dismissed: parseInt(row.dismissed),
      avgTimeHours: parseFloat(row.avg_time_hours)
    }));
  }

  /**
   * Get AI performance metrics
   */
  async getAIPerformanceMetrics(timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Average confidence scores
    const confidence = await this.pool.query(
      `SELECT 
        ai_category,
        AVG(ai_confidence) as avg_confidence,
        MIN(ai_confidence) as min_confidence,
        MAX(ai_confidence) as max_confidence,
        COUNT(*) as sample_size
       FROM moderation_cases WHERE created_at > $1 GROUP BY ai_category`,
      [since]
    );

    // Accuracy (when moderator agreed with AI)
    const accuracy = await this.pool.query(
      `SELECT 
        COUNT(CASE WHEN ai_recommendation = review_result THEN 1 END)::numeric / COUNT(*)::numeric * 100 as accuracy
       FROM moderation_cases WHERE review_result IS NOT NULL AND created_at > $1`,
      [since]
    );

    // False positive rate
    const falsePositives = await this.pool.query(
      `SELECT 
        COUNT(CASE WHEN ai_recommendation = 'VIOLATION' AND review_result = 'NO_VIOLATION' THEN 1 END)::numeric / 
        COUNT(CASE WHEN ai_recommendation = 'VIOLATION' THEN 1 END)::numeric * 100 as false_positive_rate
       FROM moderation_cases WHERE review_result IS NOT NULL AND created_at > $1`,
      [since]
    );

    return {
      confidence: confidence.rows,
      accuracy: parseFloat(accuracy.rows[0].accuracy),
      falsePositiveRate: parseFloat(falsePositives.rows[0].false_positive_rate)
    };
  }

  /**
   * Get flagged content heat map
   */
  async getFlaggedContentHeatmap(timeRange = '7d', limit = 20) {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.pool.query(
      `SELECT 
        reason,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved
       FROM flagged_content WHERE created_at > $1 
       GROUP BY reason ORDER BY count DESC LIMIT $2`,
      [since, limit]
    );

    return result.rows;
  }

  /**
   * Get content type distribution
   */
  async getContentTypeDistribution(timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.pool.query(
      `SELECT 
        content_type,
        COUNT(*) as count,
        AVG(ai_confidence) as avg_confidence
       FROM flagged_content WHERE created_at > $1 
       GROUP BY content_type ORDER BY count DESC`,
      [since]
    );

    return result.rows;
  }

  /**
   * Export analytics report
   */
  async exportAnalyticsReport(timeRange = '30d') {
    const [overview, violations, bans, appeals, moderators, ai] = await Promise.all([
      this.getDashboardOverview(timeRange),
      this.getViolationStats(timeRange),
      this.getBanStats(timeRange),
      this.getAppealStats(timeRange),
      this.getModeratorPerformance(null, timeRange),
      this.getAIPerformanceMetrics(timeRange)
    ]);

    return {
      reportDate: new Date(),
      timeRange,
      overview,
      violations,
      bans,
      appeals,
      moderators,
      ai
    };
  }

  /**
   * Generate trend analysis
   */
  async getTrendAnalysis(timeRange = '90d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Daily trend
    const dailyTrend = await this.pool.query(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as cases,
        COUNT(CASE WHEN status = 'APPROVED' THEN 1 END) as approved
       FROM moderation_cases WHERE created_at > $1 
       GROUP BY DATE(created_at) ORDER BY date`,
      [since]
    );

    // Calculate trend direction
    const trends = {
      cases: this._calculateTrend(dailyTrend.rows.map(r => r.cases)),
      approved: this._calculateTrend(dailyTrend.rows.map(r => r.approved))
    };

    return {
      dailyData: dailyTrend.rows,
      trends,
      prediction: this._predictTrend(dailyTrend.rows)
    };
  }

  /**
   * Calculate trend direction
   */
  _calculateTrend(values) {
    if (values.length < 2) return 'STABLE';

    const first = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b) / Math.floor(values.length / 2);
    const last = values.slice(Math.floor(values.length / 2)).reduce((a, b) => a + b) / (values.length - Math.floor(values.length / 2));

    const change = ((last - first) / first) * 100;

    if (change > 10) return 'INCREASING';
    if (change < -10) return 'DECREASING';
    return 'STABLE';
  }

  /**
   * Predict future trend
   */
  _predictTrend(data) {
    if (data.length < 3) return null;

    // Simple linear regression prediction
    const n = data.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = data.map(d => d.cases);

    const sumX = x.reduce((a, b) => a + b);
    const sumY = y.reduce((a, b) => a + b);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Predict next value
    const nextValue = intercept + slope * (n + 1);

    return {
      predictedValue: Math.round(nextValue),
      confidence: 0.75,
      trend: slope > 0 ? 'UP' : 'DOWN'
    };
  }

  /**
   * Parse time range to days
   */
  _parseDays(timeRange) {
    const match = timeRange.match(/(\d+)([dhmy])/);
    if (!match) return 7;

    const [, num, unit] = match;
    const days = {
      d: 1,
      h: 1 / 24,
      m: 30,
      y: 365
    };

    return parseInt(num) * (days[unit] || 1);
  }

  /**
   * Get top violators
   */
  async getTopViolators(limit = 10, timeRange = '30d') {
    const days = this._parseDays(timeRange);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await this.pool.query(
      `SELECT 
        user_id,
        COUNT(*) as violation_count,
        MAX(severity) as max_severity,
        COUNT(CASE WHEN severity >= 4 THEN 1 END) as serious_violations
       FROM user_violations WHERE created_at > $1 
       GROUP BY user_id ORDER BY violation_count DESC LIMIT $2`,
      [since, limit]
    );

    return result.rows;
  }
}

module.exports = AnalyticsService;
