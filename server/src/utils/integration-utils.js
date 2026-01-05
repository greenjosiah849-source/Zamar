/**
 * Integration Utilities
 * Helper methods for easy integration into existing features
 */

class IntegrationUtils {
  /**
   * Initialize moderation system
   */
  static async initializeModeration(serverUrl, config = {}) {
    return {
      url: serverUrl,
      endpoints: {
        scan: `${serverUrl}/api/moderation/scan`,
        scanGame: `${serverUrl}/api/moderation/scan-game`,
        report: `${serverUrl}/api/moderation/report`,
        cases: `${serverUrl}/api/moderation/cases`,
        status: `${serverUrl}/api/moderation/user/:id/status`,
        appeals: `${serverUrl}/api/moderation/appeals`,
        stats: `${serverUrl}/api/moderation/stats`,
        batch: `${serverUrl}/api/moderation/batch`
      },
      config: {
        timeout: config.timeout || 5000,
        retries: config.retries || 3,
        cacheDuration: config.cacheDuration || 3600
      }
    };
  }

  /**
   * Scan content before posting
   */
  static async scanContentBeforePost(content, contentType, userId) {
    try {
      const response = await fetch('/api/moderation/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          contentType,
          userId,
          context: 'PRE_POST_CHECK'
        })
      });

      const result = await response.json();

      return {
        allowed: result.severity < 4, // Allow if severity < 4
        severity: result.severity,
        violations: result.violations,
        message: result.severity >= 4 ? 'Content violates community guidelines' : null
      };
    } catch (error) {
      console.error('Error scanning content:', error);
      return { allowed: true, error: error.message };
    }
  }

  /**
   * Check user account status before allowing action
   */
  static async checkUserStatus(userId) {
    try {
      const response = await fetch(`/api/moderation/user/${userId}/status`);
      const result = await response.json();

      return {
        banned: result.banned,
        violations: result.violationCount,
        appeals: result.pendingAppeals,
        banReason: result.banReason,
        canPost: !result.banned,
        canPlay: !result.banned
      };
    } catch (error) {
      console.error('Error checking user status:', error);
      return { canPost: true, canPlay: true, error: error.message };
    }
  }

  /**
   * Report content from anywhere in the app
   */
  static async reportContent(contentId, contentType, reason, userId, description = '') {
    try {
      const response = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId,
          contentType,
          reason,
          userId,
          description,
          reportedAt: new Date()
        })
      });

      const result = await response.json();

      return {
        success: result.success,
        reportId: result.reportId,
        message: 'Thank you for reporting. Our team will review this shortly.'
      };
    } catch (error) {
      console.error('Error reporting content:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Appeal a ban
   */
  static async submitAppeal(userId, banId, reason, message) {
    try {
      const response = await fetch('/api/moderation/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          banId,
          reason,
          message,
          submittedAt: new Date()
        })
      });

      const result = await response.json();

      return {
        success: result.success,
        appealId: result.appealId,
        estimatedReviewTime: '24-48 hours'
      };
    } catch (error) {
      console.error('Error submitting appeal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get violation summary for user profile
   */
  static async getViolationSummary(userId) {
    try {
      const response = await fetch(`/api/moderation/user/${userId}/status`);
      const result = await response.json();

      return {
        violationCount: result.violationCount,
        lastViolation: result.lastViolation,
        severity: result.maxSeverity,
        status: result.banned ? 'BANNED' : 'ACTIVE'
      };
    } catch (error) {
      return { violationCount: 0, status: 'UNKNOWN', error: error.message };
    }
  }

  /**
   * Enable content scanning in chat
   */
  static createChatFilter() {
    return {
      async filter(message) {
        const scan = await IntegrationUtils.scanContentBeforePost(
          message,
          'TEXT',
          null
        );

        if (!scan.allowed) {
          return {
            blocked: true,
            reason: scan.message,
            severity: scan.severity
          };
        }

        return { blocked: false };
      },

      async onViolation(message, scanResult) {
        console.warn('Chat message blocked:', scanResult);
        // Show user notification
        return {
          message: 'Your message contains content that violates community guidelines.',
          suggestions: ['Use different language', 'Review community guidelines']
        };
      }
    };
  }

  /**
   * Create post validator
   */
  static createPostValidator() {
    return {
      async validateBefore(postData) {
        const scan = await IntegrationUtils.scanContentBeforePost(
          postData.content,
          'TEXT',
          postData.userId
        );

        return {
          valid: scan.allowed,
          errors: scan.allowed ? [] : [scan.message],
          warnings: scan.severity >= 2 ? ['Content may violate guidelines'] : []
        };
      },

      async validateMedia(mediaData) {
        const scan = await IntegrationUtils.scanContentBeforePost(
          mediaData.url,
          mediaData.type, // IMAGE, VIDEO, AUDIO
          mediaData.userId
        );

        return {
          valid: scan.allowed,
          errors: scan.allowed ? [] : [scan.message],
          severity: scan.severity
        };
      }
    };
  }

  /**
   * Create username validator
   */
  static createUsernameValidator() {
    return {
      async validate(username) {
        const scan = await IntegrationUtils.scanContentBeforePost(
          username,
          'USERNAME',
          null
        );

        return {
          valid: scan.allowed,
          message: scan.allowed ? 'Username is acceptable' : 'This username violates guidelines'
        };
      }
    };
  }

  /**
   * Get notification preferences
   */
  static async getNotificationPreferences(userId) {
    try {
      // This would come from user settings
      return {
        emailOnViolation: true,
        emailOnBan: true,
        emailOnAppealDecision: true,
        pushNotifications: true,
        inAppNotifications: true
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Create moderation admin panel
   */
  static createAdminPanel() {
    return {
      async getCases(filters = {}) {
        const response = await fetch('/api/moderation/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters)
        });
        return response.json();
      },

      async reviewCase(caseId, decision, notes) {
        const response = await fetch(`/api/moderation/cases/${caseId}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ decision, notes })
        });
        return response.json();
      },

      async getFlaggedContent(filters = {}) {
        const response = await fetch('/api/moderation/flagged', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filters)
        });
        return response.json();
      },

      async getStatistics(timeRange = '7d') {
        const response = await fetch(`/api/moderation/stats?range=${timeRange}`);
        return response.json();
      }
    };
  }

  /**
   * Create batch operations helper
   */
  static createBatchOperations() {
    return {
      async approveCases(caseIds, notes) {
        const response = await fetch('/api/moderation/batch/approve-cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caseIds, notes })
        });
        return response.json();
      },

      async banUsers(userIds, reason, duration) {
        const response = await fetch('/api/moderation/batch/ban-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userIds, reason, duration })
        });
        return response.json();
      },

      async removeContent(contentIds, reason) {
        const response = await fetch('/api/moderation/batch/remove-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contentIds, reason })
        });
        return response.json();
      }
    };
  }

  /**
   * Create analytics helper
   */
  static createAnalytics() {
    return {
      async getDashboard(timeRange = '7d') {
        const response = await fetch(`/api/moderation/analytics/overview?range=${timeRange}`);
        return response.json();
      },

      async getViolationTrends(timeRange = '30d') {
        const response = await fetch(`/api/moderation/analytics/violations?range=${timeRange}`);
        return response.json();
      },

      async getModeratorStats(moderatorId = null) {
        const url = moderatorId
          ? `/api/moderation/analytics/moderators/${moderatorId}`
          : '/api/moderation/analytics/moderators';
        const response = await fetch(url);
        return response.json();
      }
    };
  }

  /**
   * Format violation message for display
   */
  static formatViolationMessage(violation) {
    const categoryNames = {
      'HATE_SPEECH': 'Hate Speech',
      'HARASSMENT': 'Harassment',
      'VIOLENCE': 'Violent Content',
      'SELF_HARM': 'Self-Harm Content',
      'SPAM': 'Spam',
      'SEXUAL_CONTENT': 'Sexual Content',
      'MISINFORMATION': 'Misinformation'
    };

    return {
      title: categoryNames[violation.category] || violation.category,
      message: `Your content was removed for violating community guidelines: ${violation.reason}`,
      severity: violation.severity,
      canAppeal: true,
      learnMoreUrl: '/help/community-guidelines'
    };
  }

  /**
   * Create error handler for moderation operations
   */
  static createErrorHandler() {
    return {
      handleError(error, context) {
        const messages = {
          'INVALID_CONTENT': 'The content you provided is invalid.',
          'RATE_LIMIT': 'You are making requests too quickly. Please wait before trying again.',
          'UNAUTHORIZED': 'You do not have permission to perform this action.',
          'SERVER_ERROR': 'An error occurred. Please try again later.',
          'NETWORK_ERROR': 'Network connection error. Please check your connection.'
        };

        return {
          code: error.code || 'UNKNOWN',
          message: messages[error.code] || error.message,
          userFriendly: true,
          suggestedAction: 'RETRY'
        };
      }
    };
  }

  /**
   * Create logging utility
   */
  static createLogger() {
    return {
      log(level, message, data = {}) {
        console.log(`[${level}] ${message}`, data);
      },

      logModeration(action, userId, targetId, result) {
        this.log('MODERATION', `${action} by ${userId} on ${targetId}`, { result });
      },

      logViolation(userId, violation) {
        this.log('VIOLATION', `User ${userId} created violation`, violation);
      }
    };
  }
}

module.exports = IntegrationUtils;
