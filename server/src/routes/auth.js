const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

module.exports = (pool, redisClient, jwtModule) => {
  const router = express.Router();
  const JWT_SECRET = process.env.JWT_SECRET || 'zamar_secret_key_change_in_production';

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if user exists
      const userExists = await pool.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (userExists.rows.length > 0) {
        return res.status(409).json({ error: 'Username or email already exists' });
      }

      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        'INSERT INTO users (id, username, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
        [userId, username, email, hashedPassword, new Date()]
      );

      // Create avatar
      await pool.query(
        'INSERT INTO avatars (id, user_id, rig_type, created_at) VALUES ($1, $2, $3, $4)',
        [uuidv4(), userId, 'R15', new Date()]
      );

      res.status(201).json({
        userId,
        username,
        email,
        message: 'User registered successfully'
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: 'Missing credentials' });
      }

      const user = await pool.query(
        'SELECT id, username, email, password_hash FROM users WHERE username = $1',
        [username]
      );

      if (user.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const userData = user.rows[0];
      const validPassword = await bcrypt.compare(password, userData.password_hash);

      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const accessToken = jwt.sign(
        { userId: userData.id, username: userData.username },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: userData.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Store refresh token in Redis
      await redisClient.setEx(`refresh_token:${userData.id}`, 604800, refreshToken);

      res.json({
        accessToken,
        refreshToken,
        user: {
          userId: userData.id,
          username: userData.username,
          email: userData.email,
          joinDate: new Date(),
          onlineStatus: 1,
          badges: []
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Refresh Token
  router.post('/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({ error: 'No refresh token' });
      }

      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);

      if (!storedToken || storedToken !== refreshToken) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const newAccessToken = jwt.sign(
        { userId: decoded.userId },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.json({ accessToken: newAccessToken });
    } catch (error) {
      console.error('Refresh error:', error);
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  // Logout
  router.post('/logout', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET);
        await redisClient.del(`refresh_token:${decoded.userId}`);
      }
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
