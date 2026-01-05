/**
 * Admin API Routes
 * User management, moderation, game management, analytics
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Admin users database simulation
const adminAccounts = {
  'zamar': {
    password: 'zamar_secure_pass_123',
    role: 'Site Manager',
    email: 'zamar@zamarplatform.com',
    permissions: [
      'view_all_users',
      'edit_users',
      'ban_users',
      'manage_roles',
      'view_moderation',
      'manage_games',
      'manage_servers',
      'view_analytics',
      'delete_reports',
      'manage_admins'
    ]
  },
  'Ke_devy': {
    password: 'intern_dev_pass_456',
    role: 'Intern Developer',
    email: 'intern@zamarplatform.com',
    permissions: [
      'view_users',
      'edit_users',
      'view_moderation',
      'manage_games',
      'view_analytics'
    ]
  },
  'games': {
    password: 'games_testing_789',
    role: 'Game Testing',
    email: 'testing@zamarplatform.com',
    permissions: [
      'view_games',
      'test_games',
      'view_server_status'
    ]
  }
};

// In-memory data storage
let users = [];
let games = [];
let reports = [];
let activityLog = [];

// Middleware: Verify admin token
const verifyAdminToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'zamar-secret-key');
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Not an admin' });
    }
    req.adminUser = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * POST /admin/authenticate
 * Authenticate admin user
 */
router.post('/authenticate', (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = adminAccounts[username];
    if (!admin || admin.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        username,
        role: admin.role,
        isAdmin: true,
        permissions: admin.permissions
      },
      process.env.JWT_SECRET || 'zamar-secret-key',
      { expiresIn: '8h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        username,
        role: admin.role,
        email: admin.email,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error('Admin auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

/**
 * GET /admin/dashboard/stats
 * Get dashboard statistics
 */
router.get('/dashboard/stats', verifyAdminToken, (req, res) => {
  try {
    res.json({
      totalUsers: 1247,
      activePlayers: 342,
      totalGames: 856,
      pendingReports: 12,
      newUsersToday: 45,
      gamesPublishedToday: 8,
      serversOnline: 17,
      totalRevenue: 12450.50
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

/**
 * GET /admin/activity/recent
 * Get recent activity log
 */
router.get('/activity/recent', verifyAdminToken, (req, res) => {
  try {
    const activities = [
      {
        action: 'User Registration',
        details: 'New user registered',
        timestamp: Date.now(),
        adminUser: 'System'
      },
      {
        action: 'Game Published',
        details: 'New game published',
        timestamp: Date.now() - 3600000,
        adminUser: 'System'
      }
    ];

    res.json(activities);
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

/**
 * GET /admin/users
 * Get all users with optional filter
 */
router.get('/users', verifyAdminToken, (req, res) => {
  try {
    const { role, status, search } = req.query;

    let filteredUsers = [
      {
        username: 'zamar',
        email: 'zamar@zamarplatform.com',
        role: 'Site Manager',
        status: 'Active',
        joinDate: Date.now() - 63072000000,
        accountAge: 730
      },
      {
        username: 'Ke_devy',
        email: 'intern@zamarplatform.com',
        role: 'Intern Developer',
        status: 'Active',
        joinDate: Date.now() - 15552000000,
        accountAge: 180
      },
      {
        username: 'games',
        email: 'testing@zamarplatform.com',
        role: 'Game Testing',
        status: 'Active',
        joinDate: Date.now() - 7776000000,
        accountAge: 90
      }
    ];

    if (search) {
      filteredUsers = filteredUsers.filter(u =>
        u.username.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json(filteredUsers);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * POST /admin/users/create
 * Create new user (admin only)
 */
router.post('/users/create', verifyAdminToken, (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Simulate user creation
    const newUser = {
      userId: `user_${Date.now()}`,
      username,
      email,
      role,
      status: 'Active',
      createdAt: Date.now(),
      createdBy: req.adminUser.username
    };

    activityLog.push({
      action: 'User Created',
      details: `User '${username}' created by ${req.adminUser.username}`,
      timestamp: Date.now(),
      adminUser: req.adminUser.username
    });

    res.json({
      success: true,
      user: newUser
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * POST /admin/users/ban
 * Ban a user
 */
router.post('/users/ban', verifyAdminToken, (req, res) => {
  try {
    const { userId, reason } = req.body;

    activityLog.push({
      action: 'User Banned',
      details: `User '${userId}' banned. Reason: ${reason}`,
      timestamp: Date.now(),
      adminUser: req.adminUser.username
    });

    res.json({
      success: true,
      bannedUser: userId,
      reason: reason,
      bannedBy: req.adminUser.username
    });
  } catch (error) {
    console.error('Error banning user:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

/**
 * POST /admin/users/:userId/unban
 * Unban a user
 */
router.post('/users/:userId/unban', verifyAdminToken, (req, res) => {
  try {
    const { userId } = req.params;

    activityLog.push({
      action: 'User Unbanned',
      details: `User '${userId}' unbanned by ${req.adminUser.username}`,
      timestamp: Date.now(),
      adminUser: req.adminUser.username
    });

    res.json({
      success: true,
      unbannedUser: userId
    });
  } catch (error) {
    console.error('Error unbanning user:', error);
    res.status(500).json({ error: 'Failed to unban user' });
  }
});

/**
 * GET /admin/moderation/reports
 * Get moderation reports
 */
router.get('/moderation/reports', verifyAdminToken, (req, res) => {
  try {
    const reports = [
      {
        reportId: 'report_001',
        reportedUser: 'TestUser',
        reporterUser: 'Reporter1',
        reason: 'Offensive language',
        status: 'pending',
        reportDate: Date.now() - 7200000,
        description: 'User used inappropriate language in chat'
      }
    ];

    res.json(reports);
  } catch (error) {
    console.error('Error getting reports:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

/**
 * GET /admin/games
 * Get all games
 */
router.get('/games', verifyAdminToken, (req, res) => {
  try {
    const games = [
      {
        gameId: 'game_001',
        gameName: 'Test Game',
        creator: 'Developer1',
        playerCount: 150,
        rating: 4.5,
        status: 'Published',
        createdDate: Date.now() - 2592000000,
        isFeatured: true,
        isBanned: false
      }
    ];

    res.json(games);
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({ error: 'Failed to get games' });
  }
});

/**
 * POST /admin/games/ban
 * Ban a game
 */
router.post('/games/ban', verifyAdminToken, (req, res) => {
  try {
    const { gameId, reason } = req.body;

    activityLog.push({
      action: 'Game Banned',
      details: `Game '${gameId}' banned. Reason: ${reason}`,
      timestamp: Date.now(),
      adminUser: req.adminUser.username
    });

    res.json({
      success: true,
      bannedGame: gameId,
      reason: reason
    });
  } catch (error) {
    console.error('Error banning game:', error);
    res.status(500).json({ error: 'Failed to ban game' });
  }
});

/**
 * POST /admin/games/:gameId/feature
 * Feature a game on homepage
 */
router.post('/games/:gameId/feature', verifyAdminToken, (req, res) => {
  try {
    const { gameId } = req.params;

    activityLog.push({
      action: 'Game Featured',
      details: `Game '${gameId}' featured on homepage`,
      timestamp: Date.now(),
      adminUser: req.adminUser.username
    });

    res.json({
      success: true,
      featuredGame: gameId
    });
  } catch (error) {
    console.error('Error featuring game:', error);
    res.status(500).json({ error: 'Failed to feature game' });
  }
});

/**
 * GET /admin/servers/status
 * Get server status
 */
router.get('/servers/status', verifyAdminToken, (req, res) => {
  try {
    const servers = [
      {
        serverName: 'US-East-1',
        region: 'United States - East',
        status: 'online',
        currentPlayers: 3250,
        maxPlayers: 5000,
        cpuUsage: 45.2,
        memoryUsage: 62.8
      },
      {
        serverName: 'EU-Central-1',
        region: 'Germany - Central',
        status: 'online',
        currentPlayers: 2850,
        maxPlayers: 5000,
        cpuUsage: 38.5,
        memoryUsage: 55.3
      }
    ];

    res.json(servers);
  } catch (error) {
    console.error('Error getting server status:', error);
    res.status(500).json({ error: 'Failed to get server status' });
  }
});

/**
 * GET /admin/analytics
 * Get analytics data
 */
router.get('/analytics', verifyAdminToken, (req, res) => {
  try {
    res.json({
      dailyActive: 15420,
      gamesPlayed: 2847,
      avgSessionTime: 45,
      totalRevenue: 12450,
      newUsers: 45,
      returningUsers: 12000,
      playtimeIncrease: 8.5
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

/**
 * POST /admin/logs/action
 * Log admin action
 */
router.post('/logs/action', verifyAdminToken, (req, res) => {
  try {
    const { action, details } = req.body;

    activityLog.push({
      action,
      details,
      timestamp: Date.now(),
      adminUser: req.adminUser.username
    });

    res.json({
      success: true,
      logged: true
    });
  } catch (error) {
    console.error('Error logging action:', error);
    res.status(500).json({ error: 'Failed to log action' });
  }
});

module.exports = router;
