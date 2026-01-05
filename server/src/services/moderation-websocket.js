/**
 * Moderation WebSocket Server
 * Real-time updates for admin dashboard
 * Live case notifications, status updates, appeals
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class ModerationWebSocketServer {
  constructor(server, jwtSecret) {
    this.wss = new WebSocket.Server({ server });
    this.jwtSecret = jwtSecret;
    this.clients = new Map(); // userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // userId -> Set of topics

    this.setupWebSocketServer();
    console.log('[WebSocket] Moderation server initialized');
  }

  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      // Verify auth
      const token = this.extractToken(req);
      if (!token) {
        ws.close(1008, 'Unauthorized');
        return;
      }

      try {
        const decoded = jwt.verify(token, this.jwtSecret);
        const userId = decoded.id || decoded.userId;

        // Add client
        if (!this.clients.has(userId)) {
          this.clients.set(userId, new Set());
        }
        this.clients.get(userId).add(ws);

        console.log(`[WebSocket] User ${userId} connected (${this.clients.get(userId).size} connections)`);

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'CONNECTED',
          message: 'Connected to moderation system',
          timestamp: new Date()
        }));

        // Handle messages
        ws.on('message', (data) => this.handleMessage(userId, data));

        // Handle disconnect
        ws.on('close', () => {
          this.clients.get(userId).delete(ws);
          if (this.clients.get(userId).size === 0) {
            this.clients.delete(userId);
          }
          console.log(`[WebSocket] User ${userId} disconnected`);
        });

        ws.on('error', (error) => {
          console.error(`[WebSocket] Error for user ${userId}:`, error.message);
        });
      } catch (error) {
        console.error('[WebSocket] Auth error:', error.message);
        ws.close(1008, 'Invalid token');
      }
    });
  }

  /**
   * Handle incoming messages
   */
  handleMessage(userId, data) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'SUBSCRIBE':
          this.subscribe(userId, message.topics);
          break;

        case 'UNSUBSCRIBE':
          this.unsubscribe(userId, message.topics);
          break;

        case 'PING':
          this.sendToUser(userId, { type: 'PONG', timestamp: new Date() });
          break;

        default:
          console.log(`[WebSocket] Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('[WebSocket] Message parse error:', error.message);
    }
  }

  /**
   * Subscribe user to topics
   */
  subscribe(userId, topics) {
    if (!Array.isArray(topics)) topics = [topics];

    if (!this.subscriptions.has(userId)) {
      this.subscriptions.set(userId, new Set());
    }

    const userSubs = this.subscriptions.get(userId);
    topics.forEach(topic => userSubs.add(topic));

    this.sendToUser(userId, {
      type: 'SUBSCRIBED',
      topics: Array.from(userSubs),
      timestamp: new Date()
    });

    console.log(`[WebSocket] User ${userId} subscribed to: ${topics.join(', ')}`);
  }

  /**
   * Unsubscribe user from topics
   */
  unsubscribe(userId, topics) {
    if (!Array.isArray(topics)) topics = [topics];

    if (this.subscriptions.has(userId)) {
      const userSubs = this.subscriptions.get(userId);
      topics.forEach(topic => userSubs.delete(topic));
    }

    this.sendToUser(userId, {
      type: 'UNSUBSCRIBED',
      topics,
      timestamp: new Date()
    });
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, message) {
    if (this.clients.has(userId)) {
      const clients = this.clients.get(userId);
      const payload = JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date()
      });

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    }
  }

  /**
   * Broadcast to all users subscribed to topic
   */
  broadcast(topic, message) {
    const payload = JSON.stringify({
      ...message,
      topic,
      timestamp: new Date()
    });

    for (const [userId, subs] of this.subscriptions) {
      if (subs.has(topic)) {
        this.sendToUser(userId, { ...message, topic });
      }
    }
  }

  /**
   * Notify case created
   */
  notifyCaseCreated(caseData) {
    this.broadcast('MODERATION_CASES', {
      type: 'CASE_CREATED',
      caseId: caseData.id,
      userId: caseData.user_id,
      reason: caseData.reason,
      severity: caseData.severity,
      category: caseData.ai_category,
      confidence: caseData.ai_confidence
    });
  }

  /**
   * Notify case reviewed
   */
  notifyCaseReviewed(caseData, action) {
    this.broadcast('MODERATION_CASES', {
      type: 'CASE_REVIEWED',
      caseId: caseData.id,
      action,
      status: caseData.status
    });
  }

  /**
   * Notify content flagged
   */
  notifyContentFlagged(flaggedData) {
    this.broadcast('FLAGGED_CONTENT', {
      type: 'CONTENT_FLAGGED',
      contentId: flaggedData.id,
      contentType: flaggedData.content_type,
      category: flaggedData.ai_category,
      confidence: flaggedData.ai_confidence
    });
  }

  /**
   * Notify appeal submitted
   */
  notifyAppealSubmitted(appealData) {
    this.broadcast('MODERATION_APPEALS', {
      type: 'APPEAL_SUBMITTED',
      appealId: appealData.id,
      userId: appealData.user_id,
      banId: appealData.ban_id
    });
  }

  /**
   * Notify appeal reviewed
   */
  notifyAppealReviewed(appealData) {
    this.broadcast('MODERATION_APPEALS', {
      type: 'APPEAL_REVIEWED',
      appealId: appealData.id,
      decision: appealData.status
    });

    // Also notify the user directly
    this.sendToUser(appealData.user_id, {
      type: 'APPEAL_DECISION',
      decision: appealData.status,
      message: `Your appeal has been ${appealData.status.toLowerCase()}. Response: ${appealData.response || 'None provided'}`
    });
  }

  /**
   * Notify user action (ban, mute, etc)
   */
  notifyUserAction(userId, action, details) {
    this.sendToUser(userId, {
      type: 'USER_ACTION',
      action,
      details,
      message: this.getActionMessage(action, details)
    });
  }

  /**
   * Send statistics update
   */
  broadcastStatsUpdate(stats) {
    this.broadcast('STATISTICS', {
      type: 'STATS_UPDATE',
      stats
    });
  }

  /**
   * Get friendly message for action
   */
  getActionMessage(action, details) {
    switch (action) {
      case 'WARNING':
        return 'You have received a warning for violating our guidelines.';
      case 'MUTE':
        return `You have been muted until ${details.until}.`;
      case 'SUSPEND':
        return `Your account has been suspended until ${details.until}.`;
      case 'BAN':
        return 'Your account has been banned.';
      default:
        return 'Your account has been affected by a moderation action.';
    }
  }

  /**
   * Extract JWT from request
   */
  extractToken(req) {
    const header = req.headers.authorization || '';
    const match = header.match(/Bearer\s+(\S+)/);
    return match ? match[1] : null;
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: Array.from(this.clients.values()).reduce((sum, set) => sum + set.size, 0),
      totalUsers: this.clients.size,
      totalSubscriptions: Array.from(this.subscriptions.values()).reduce((sum, set) => sum + set.size, 0)
    };
  }
}

module.exports = ModerationWebSocketServer;
