/**
 * Notification System Service
 * Email, push, and in-app notifications
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');

class NotificationService {
  constructor(pool, redisClient, config = {}) {
    this.pool = pool;
    this.redis = redisClient;

    // Email configuration
    this.emailConfig = config.email || {
      host: process.env.SMTP_HOST || 'localhost',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    };

    // Initialize email transporter
    if (this.emailConfig.auth.user) {
      this.transporter = nodemailer.createTransport(this.emailConfig);
    }

    this.pushConfig = config.push || {
      apiKey: process.env.PUSH_API_KEY,
      baseUrl: process.env.PUSH_BASE_URL
    };
  }

  /**
   * Create notification
   */
  async createNotification(userId, notificationData) {
    const notification = {
      id: crypto.randomUUID(),
      userId,
      type: notificationData.type, // 'VIOLATION', 'APPEAL_DECISION', 'BAN', 'WARNING', 'INFO'
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {},
      read: false,
      channels: notificationData.channels || ['IN_APP'],
      createdAt: new Date(),
      expiresAt: notificationData.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };

    // Store in database
    await this.pool.query(
      `INSERT INTO notifications (id, user_id, type, title, message, data, read, channels, 
       created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        notification.id, userId, notification.type, notification.title, notification.message,
        JSON.stringify(notification.data), notification.read, notification.channels.join(','),
        notification.createdAt, notification.expiresAt
      ]
    );

    // Store in Redis cache
    await this.redis.setEx(
      `notification:${notification.id}`,
      86400,
      JSON.stringify(notification)
    );

    // Add to user's notification queue
    await this.redis.lpush(`user_notifications:${userId}`, notification.id);

    // Send notifications based on channels
    for (const channel of notification.channels) {
      await this._sendNotification(userId, notification, channel);
    }

    return notification;
  }

  /**
   * Send notification via specific channel
   */
  async _sendNotification(userId, notification, channel) {
    switch (channel) {
      case 'EMAIL':
        return await this._sendEmail(userId, notification);
      case 'PUSH':
        return await this._sendPush(userId, notification);
      case 'SMS':
        return await this._sendSMS(userId, notification);
      case 'IN_APP':
        return await this._createInAppNotification(userId, notification);
      default:
        return null;
    }
  }

  /**
   * Send email notification
   */
  async _sendEmail(userId, notification) {
    try {
      // Get user email
      const result = await this.pool.query(
        'SELECT email FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]?.email) {
        return { success: false, error: 'User email not found' };
      }

      const userEmail = result.rows[0].email;

      const emailContent = this._getEmailTemplate(notification);

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || 'noreply@zamar.game',
        to: userEmail,
        subject: notification.title,
        html: emailContent
      });

      // Log sent notification
      await this.pool.query(
        `INSERT INTO notification_logs (notification_id, channel, status, sent_at) 
         VALUES ($1, $2, $3, $4)`,
        [notification.id, 'EMAIL', 'SENT', new Date()]
      );

      return { success: true };
    } catch (error) {
      console.error('[Email] Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification
   */
  async _sendPush(userId, notification) {
    try {
      // Get user push tokens
      const result = await this.pool.query(
        'SELECT push_token FROM user_devices WHERE user_id = $1 AND push_enabled = true',
        [userId]
      );

      const tokens = result.rows.map(r => r.push_token);

      if (tokens.length === 0) {
        return { success: false, error: 'No push tokens found' };
      }

      for (const token of tokens) {
        await this._sendPushToToken(token, notification);
      }

      return { success: true, sentTo: tokens.length };
    } catch (error) {
      console.error('[Push] Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send push to token
   */
  async _sendPushToToken(token, notification) {
    // Implement with FCM, OneSignal, or custom push service
    // This is a placeholder
    const payload = {
      title: notification.title,
      body: notification.message,
      data: notification.data,
      timestamp: new Date().getTime()
    };

    // Send to push service
    // await fetch(this.pushConfig.baseUrl, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${this.pushConfig.apiKey}` },
    //   body: JSON.stringify({ token, payload })
    // });

    return { success: true };
  }

  /**
   * Send SMS notification
   */
  async _sendSMS(userId, notification) {
    try {
      // Get user phone
      const result = await this.pool.query(
        'SELECT phone FROM users WHERE id = $1',
        [userId]
      );

      if (!result.rows[0]?.phone) {
        return { success: false, error: 'User phone not found' };
      }

      // Send SMS via Twilio or similar
      // const message = await twilio.messages.create({
      //   body: notification.message.substring(0, 160),
      //   from: process.env.TWILIO_PHONE,
      //   to: result.rows[0].phone
      // });

      return { success: true };
    } catch (error) {
      console.error('[SMS] Error sending notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create in-app notification
   */
  async _createInAppNotification(userId, notification) {
    // Already stored in database above
    return { success: true };
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId, limit = 20, offset = 0) {
    const result = await this.pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 AND expires_at > NOW() 
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      data: JSON.parse(n.data),
      read: n.read,
      createdAt: n.created_at,
      expiresAt: n.expires_at
    }));
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    await this.pool.query(
      'UPDATE notifications SET read = true WHERE id = $1',
      [notificationId]
    );

    // Update cache
    const notif = await this.redis.get(`notification:${notificationId}`);
    if (notif) {
      const data = JSON.parse(notif);
      data.read = true;
      await this.redis.setEx(`notification:${notificationId}`, 86400, JSON.stringify(data));
    }

    return true;
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(userId) {
    await this.pool.query(
      'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false',
      [userId]
    );

    return true;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    await this.pool.query(
      'DELETE FROM notifications WHERE id = $1',
      [notificationId]
    );

    await this.redis.del(`notification:${notificationId}`);

    return true;
  }

  /**
   * Send violation notification
   */
  async notifyViolation(userId, violationData) {
    return await this.createNotification(userId, {
      type: 'VIOLATION',
      title: 'Content Violation',
      message: `Your content was found to violate our community guidelines: ${violationData.reason}`,
      data: {
        violationId: violationData.id,
        severity: violationData.severity,
        category: violationData.category
      },
      channels: ['IN_APP', 'EMAIL']
    });
  }

  /**
   * Send ban notification
   */
  async notifyBan(userId, banData) {
    return await this.createNotification(userId, {
      type: 'BAN',
      title: 'Account Suspended',
      message: `Your account has been suspended due to repeated violations. Ban reason: ${banData.reason}`,
      data: {
        banId: banData.id,
        banType: banData.banType,
        banUntil: banData.banUntil,
        appeal: true
      },
      channels: ['IN_APP', 'EMAIL']
    });
  }

  /**
   * Send appeal decision notification
   */
  async notifyAppealDecision(userId, appealData) {
    const title = appealData.decision === 'APPROVED' ? 'Appeal Approved' : 'Appeal Rejected';
    const message = appealData.decision === 'APPROVED'
      ? 'Your appeal has been approved. Your account restrictions have been lifted.'
      : `Your appeal was reviewed and rejected. Response: ${appealData.response}`;

    return await this.createNotification(userId, {
      type: 'APPEAL_DECISION',
      title,
      message,
      data: {
        appealId: appealData.id,
        decision: appealData.decision,
        response: appealData.response
      },
      channels: ['IN_APP', 'EMAIL']
    });
  }

  /**
   * Send warning notification
   */
  async notifyWarning(userId, warningData) {
    return await this.createNotification(userId, {
      type: 'WARNING',
      title: 'Community Guidelines Warning',
      message: warningData.message,
      data: {
        warningId: warningData.id,
        reason: warningData.reason
      },
      channels: ['IN_APP']
    });
  }

  /**
   * Notify moderators of new cases
   */
  async notifyModeratorsNewCase(caseId, caseData) {
    // Get all moderators
    const result = await this.pool.query(
      `SELECT id, notification_preferences FROM users 
       WHERE role = 'MODERATOR' AND disabled = false`
    );

    for (const mod of result.rows) {
      const prefs = JSON.parse(mod.notification_preferences || '{}');

      if (prefs.caseNotifications !== false) {
        await this.createNotification(mod.id, {
          type: 'NEW_CASE',
          title: 'New Moderation Case',
          message: `New case: ${caseData.reason}`,
          data: {
            caseId,
            severity: caseData.severity,
            category: caseData.category
          },
          channels: ['IN_APP', 'PUSH']
        });
      }
    }
  }

  /**
   * Get email template
   */
  _getEmailTemplate(notification) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              Zamar Game | Community Guidelines Enforcement
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId) {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN read = false THEN 1 END) as unread,
        COUNT(CASE WHEN type = 'VIOLATION' THEN 1 END) as violations,
        COUNT(CASE WHEN type = 'BAN' THEN 1 END) as bans,
        COUNT(CASE WHEN type = 'APPEAL_DECISION' THEN 1 END) as appeals
       FROM notifications WHERE user_id = $1`,
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Cleanup expired notifications
   */
  async cleanupExpiredNotifications() {
    const result = await this.pool.query(
      'DELETE FROM notifications WHERE expires_at < NOW()'
    );

    return { deleted: result.rowCount };
  }
}

module.exports = NotificationService;
