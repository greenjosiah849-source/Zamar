/**
 * Complete Moderation Routes
 * Integrating all enhancement services
 */

const express = require('express');
const router = express.Router();

module.exports = (pool, redisClient, moderationService, services) => {
  const {
    batchService,
    customRuleService,
    mobileAPIService,
    notificationService,
    analyticsService,
    mlTrainerService,
    websocketServer
  } = services;

  // ============================================================================
  // Core Moderation Endpoints
  // ============================================================================

  router.post('/scan', async (req, res) => {
    try {
      const { content, contentType, userId } = req.body;
      const result = await moderationService.scanAsset(content, contentType, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/report', async (req, res) => {
    try {
      const { contentId, contentType, reason, userId, description } = req.body;
      const result = await moderationService.reportContent({
        contentId,
        contentType,
        reason,
        reportedBy: userId,
        description
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/cases', async (req, res) => {
    try {
      const result = await moderationService.getCases();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/cases/:caseId/review', async (req, res) => {
    try {
      const { caseId } = req.params;
      const { action, status, moderatorId, reviewNotes } = req.body;
      const result = await moderationService.reviewCase(caseId, {
        action,
        status,
        moderatorId,
        reviewNotes
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Batch Operations Endpoints
  // ============================================================================

  router.post('/batch/approve-cases', async (req, res) => {
    try {
      const { caseIds, action, moderatorId, notes } = req.body;
      const result = await batchService.batchApproveCases(caseIds, action, moderatorId, notes);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/batch/dismiss-cases', async (req, res) => {
    try {
      const { caseIds, moderatorId, reason } = req.body;
      const result = await batchService.batchDismissCases(caseIds, moderatorId, reason);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/batch/ban-users', async (req, res) => {
    try {
      const { userIds, reason, duration, moderatorId } = req.body;
      const result = await batchService.batchBanUsers(userIds, reason, duration, moderatorId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/batch/approve-appeals', async (req, res) => {
    try {
      const { appealIds, moderatorId, responseTemplate } = req.body;
      const result = await batchService.batchApproveAppeals(appealIds, moderatorId, responseTemplate);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/batch/jobs', async (req, res) => {
    try {
      const { status, type } = req.query;
      const result = await batchService.getBatchJobs({ status, type });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/batch/jobs/:jobId', async (req, res) => {
    try {
      const result = await batchService.getBatchJobStatus(req.params.jobId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Custom Rules Endpoints
  // ============================================================================

  router.post('/rules', async (req, res) => {
    try {
      const ruleData = req.body;
      const result = await customRuleService.createRule(ruleData);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/rules/:ruleId', async (req, res) => {
    try {
      const result = await customRuleService.updateRule(req.params.ruleId, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/rules/:ruleId', async (req, res) => {
    try {
      const result = await customRuleService.getRule(req.params.ruleId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/rules', async (req, res) => {
    try {
      const { scope } = req.query;
      const result = await customRuleService.getEnabledRules(scope);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.delete('/rules/:ruleId', async (req, res) => {
    try {
      await customRuleService.deleteRule(req.params.ruleId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/rules/test', async (req, res) => {
    try {
      const { ruleId, content } = req.body;
      const result = await customRuleService.testRule(ruleId, content);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/rules-templates', (req, res) => {
    const templates = customRuleService.getRuleTemplates();
    res.json(templates);
  });

  // ============================================================================
  // Mobile API Endpoints
  // ============================================================================

  router.post('/mobile/report', async (req, res) => {
    try {
      const result = await mobileAPIService.reportContentMobile(req.body.userId, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/mobile/violations/:userId', async (req, res) => {
    try {
      const result = await mobileAPIService.getUserViolationsMobile(req.params.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/mobile/ban-status/:userId', async (req, res) => {
    try {
      const result = await mobileAPIService.checkBanStatusMobile(req.params.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/mobile/guidelines/:language?', async (req, res) => {
    try {
      const language = req.params.language || 'en';
      const result = await mobileAPIService.getModerationGuidelinesMobile(language);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/mobile/status/:userId', async (req, res) => {
    try {
      const result = await mobileAPIService.getModerationStatusMobile(req.params.userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/mobile/appeal', async (req, res) => {
    try {
      const result = await mobileAPIService.submitAppealMobile(req.body.userId, req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/mobile/sync', async (req, res) => {
    try {
      const { userId, lastSyncTime } = req.query;
      const result = await mobileAPIService.getSyncData(userId, new Date(lastSyncTime));
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Notifications Endpoints
  // ============================================================================

  router.post('/notifications', async (req, res) => {
    try {
      const { userId, type, title, message, data, channels } = req.body;
      const result = await notificationService.createNotification(userId, {
        type,
        title,
        message,
        data,
        channels
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/notifications/:userId', async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const result = await notificationService.getNotifications(req.params.userId, limit, offset);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/notifications/:notificationId/read', async (req, res) => {
    try {
      await notificationService.markAsRead(req.params.notificationId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.put('/notifications/:userId/read-all', async (req, res) => {
    try {
      await notificationService.markAllAsRead(req.params.userId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // Analytics Endpoints
  // ============================================================================

  router.get('/analytics/overview', async (req, res) => {
    try {
      const { timeRange = '7d' } = req.query;
      const result = await analyticsService.getDashboardOverview(timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/violations', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const result = await analyticsService.getViolationStats(timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/bans', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const result = await analyticsService.getBanStats(timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/appeals', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const result = await analyticsService.getAppealStats(timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/moderators/:moderatorId?', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const { moderatorId } = req.params;
      const result = await analyticsService.getModeratorPerformance(moderatorId, timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/ai-performance', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const result = await analyticsService.getAIPerformanceMetrics(timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/analytics/report', async (req, res) => {
    try {
      const { timeRange = '30d' } = req.query;
      const result = await analyticsService.exportAnalyticsReport(timeRange);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ML Training Endpoints
  // ============================================================================

  router.post('/ml/train', async (req, res) => {
    try {
      const result = await mlTrainerService.trainModel();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ml/stats', async (req, res) => {
    try {
      const result = await mlTrainerService.getTrainingStats();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ml/versions', async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const result = await mlTrainerService.getModelVersions(limit);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ml/current', async (req, res) => {
    try {
      const result = await mlTrainerService.getCurrentModelInfo();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/ml/recommendations', async (req, res) => {
    try {
      const result = await mlTrainerService.getTrainingRecommendations();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/ml/versions/:versionId/rollback', async (req, res) => {
    try {
      const result = await mlTrainerService.rollbackToVersion(req.params.versionId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // WebSocket Integration
  // ============================================================================

  router.get('/ws/config', (req, res) => {
    res.json({
      wsUrl: process.env.WS_URL || 'ws://localhost:3001',
      subscriptions: ['MODERATION_CASES', 'APPEALS', 'FLAGGED_CONTENT', 'STATS']
    });
  });

  return router;
};
