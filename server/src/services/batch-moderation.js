/**
 * Batch Moderation Service
 * Process multiple cases at once
 */

const crypto = require('crypto');

class BatchModerationService {
  constructor(pool, redisClient, moderationService) {
    this.pool = pool;
    this.redis = redisClient;
    this.modService = moderationService;
  }

  /**
   * Batch approve cases
   */
  async batchApproveCases(caseIds, action, moderatorId, notes) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const caseId of caseIds) {
      try {
        const result = await this.modService.reviewCase(caseId, {
          action,
          status: 'APPROVED',
          moderatorId,
          reviewNotes: notes
        });

        results.succeeded.push({ caseId, ...result });
      } catch (error) {
        results.failed.push({ caseId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    console.log(`[Batch] Processed ${caseIds.length} cases in ${results.totalTime}ms`);

    return results;
  }

  /**
   * Batch dismiss cases
   */
  async batchDismissCases(caseIds, moderatorId, reason) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const caseId of caseIds) {
      try {
        const result = await this.modService.reviewCase(caseId, {
          status: 'DISMISSED',
          action: 'NONE',
          moderatorId,
          reviewNotes: reason
        });

        results.succeeded.push({ caseId, ...result });
      } catch (error) {
        results.failed.push({ caseId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Batch approve flagged content
   */
  async batchApproveFlaggedContent(contentIds, moderatorId) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const contentId of contentIds) {
      try {
        await this.pool.query(
          `UPDATE flagged_content SET status = 'APPROVED', action_taken = 'APPROVED', 
           reviewer_id = $1, resolved_at = NOW() WHERE id = $2`,
          [moderatorId, contentId]
        );

        results.succeeded.push(contentId);
      } catch (error) {
        results.failed.push({ contentId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Batch remove flagged content
   */
  async batchRemoveFlaggedContent(contentIds, moderatorId, reason) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const contentId of contentIds) {
      try {
        await this.pool.query(
          `UPDATE flagged_content SET status = 'RESOLVED', action_taken = 'REMOVED', 
           reviewer_id = $1, resolved_at = NOW() WHERE id = $2`,
          [moderatorId, contentId]
        );

        results.succeeded.push(contentId);
      } catch (error) {
        results.failed.push({ contentId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Batch approve appeals
   */
  async batchApproveAppeals(appealIds, moderatorId, responseTemplate) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const appealId of appealIds) {
      try {
        const result = await this.modService.reviewAppeal(appealId, {
          decision: 'APPROVED',
          response: responseTemplate,
          moderatorId
        });

        results.succeeded.push({ appealId, ...result });
      } catch (error) {
        results.failed.push({ appealId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Batch reject appeals
   */
  async batchRejectAppeals(appealIds, moderatorId, responseTemplate) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const appealId of appealIds) {
      try {
        const result = await this.modService.reviewAppeal(appealId, {
          decision: 'REJECTED',
          response: responseTemplate,
          moderatorId
        });

        results.succeeded.push({ appealId, ...result });
      } catch (error) {
        results.failed.push({ appealId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Batch ban users
   */
  async batchBanUsers(userIds, reason, duration, moderatorId) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const userId of userIds) {
      try {
        const banId = crypto.randomUUID();
        const banUntil = duration ? new Date(Date.now() + duration * 86400000) : null;

        await this.pool.query(
          `INSERT INTO user_bans (id, user_id, ban_type, reason, ban_until, active, created_by, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [banId, userId, duration ? 'TEMPORARY' : 'PERMANENT', reason, banUntil, true, moderatorId, new Date()]
        );

        await this.pool.query('UPDATE users SET disabled = true WHERE id = $1', [userId]);

        results.succeeded.push({ userId, banId });
      } catch (error) {
        results.failed.push({ userId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Batch unban users
   */
  async batchUnbanUsers(banIds, moderatorId) {
    const results = {
      succeeded: [],
      failed: [],
      totalTime: 0
    };

    const startTime = Date.now();

    for (const banId of banIds) {
      try {
        const banData = await this.pool.query(
          'SELECT user_id FROM user_bans WHERE id = $1',
          [banId]
        );

        if (banData.rows.length > 0) {
          const userId = banData.rows[0].user_id;

          await this.pool.query(
            'UPDATE user_bans SET active = false WHERE id = $1',
            [banId]
          );

          await this.pool.query('UPDATE users SET disabled = false WHERE id = $1', [userId]);

          results.succeeded.push({ banId, userId });
        }
      } catch (error) {
        results.failed.push({ banId, error: error.message });
      }
    }

    results.totalTime = Date.now() - startTime;

    return results;
  }

  /**
   * Create batch job
   */
  async createBatchJob(jobData) {
    const jobId = crypto.randomUUID();

    const job = {
      id: jobId,
      type: jobData.type, // 'APPROVE_CASES', 'BAN_USERS', etc
      itemIds: jobData.itemIds,
      status: 'PENDING',
      parameters: jobData.parameters,
      createdBy: jobData.moderatorId,
      createdAt: new Date(),
      completedAt: null,
      results: null
    };

    // Store in Redis
    await this.redis.setEx(
      `batch_job:${jobId}`,
      86400, // 24 hours
      JSON.stringify(job)
    );

    // Also store in database for audit
    await this.pool.query(
      `INSERT INTO batch_jobs (id, type, item_count, status, parameters, created_by, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [jobId, job.type, job.itemIds.length, job.status, JSON.stringify(job.parameters), job.createdBy, job.createdAt]
    );

    return job;
  }

  /**
   * Get batch job status
   */
  async getBatchJobStatus(jobId) {
    const jobData = await this.redis.get(`batch_job:${jobId}`);
    if (jobData) {
      return JSON.parse(jobData);
    }

    // Check database
    const result = await this.pool.query(
      'SELECT * FROM batch_jobs WHERE id = $1',
      [jobId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    return null;
  }

  /**
   * Get batch jobs list
   */
  async getBatchJobs(filters = {}) {
    let query = 'SELECT * FROM batch_jobs WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(filters.status);
    }

    if (filters.type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(filters.type);
    }

    query += ' ORDER BY created_at DESC LIMIT 100';

    const result = await this.pool.query(query, params);

    return result.rows;
  }

  /**
   * Export cases to CSV
   */
  async exportCasesToCSV(caseIds) {
    const result = await this.pool.query(
      `SELECT id, user_id, reason, severity, ai_category, ai_confidence, status, created_at 
       FROM moderation_cases WHERE id = ANY($1)`,
      [caseIds]
    );

    // Convert to CSV
    const headers = ['Case ID', 'User ID', 'Reason', 'Severity', 'Category', 'Confidence', 'Status', 'Created'];
    const rows = result.rows.map(r => [
      r.id,
      r.user_id,
      r.reason,
      r.severity,
      r.ai_category,
      r.ai_confidence,
      r.status,
      r.created_at
    ]);

    const csv = [headers, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');

    return csv;
  }

  /**
   * Import cases from file
   */
  async importCasesFromFile(fileData, moderatorId) {
    const lines = fileData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

    const results = {
      imported: 0,
      failed: 0,
      errors: []
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const data = {};

        headers.forEach((header, index) => {
          data[header] = values[index];
        });

        await this.pool.query(
          `INSERT INTO moderation_cases (id, user_id, reason, severity, status, created_by, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            crypto.randomUUID(),
            data['User ID'],
            data['Reason'],
            data['Severity'],
            'PENDING',
            moderatorId,
            new Date()
          ]
        );

        results.imported++;
      } catch (error) {
        results.failed++;
        results.errors.push({ line: i, error: error.message });
      }
    }

    return results;
  }
}

module.exports = BatchModerationService;
