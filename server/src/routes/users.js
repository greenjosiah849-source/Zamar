const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = (pool, redisClient) => {
  const router = express.Router();

  // Get user profile
  router.get('/:userId', authenticateToken, async (req, res) => {
    try {
      const user = await pool.query(
        'SELECT id, username, email, created_at FROM users WHERE id = $1',
        [req.params.userId]
      );

      if (user.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = user.rows[0];
      res.json({
        userId: userData.id,
        username: userData.username,
        email: userData.email,
        joinDate: userData.created_at,
        onlineStatus: 1,
        badges: [],
        avatarUrl: `/avatars/${userData.id}.png`
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get avatar
  router.get('/:userId/avatar', authenticateToken, async (req, res) => {
    try {
      const avatar = await pool.query(
        'SELECT id, user_id, rig_type FROM avatars WHERE user_id = $1',
        [req.params.userId]
      );

      if (avatar.rows.length === 0) {
        return res.status(404).json({ error: 'Avatar not found' });
      }

      const avatarData = avatar.rows[0];
      res.json({
        avatarId: avatarData.id,
        userId: avatarData.user_id,
        rigType: avatarData.rig_type,
        equippedItems: {},
        skinTone: 'Medium',
        scale: 1.0
      });
    } catch (error) {
      console.error('Get avatar error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get inventory
  router.get('/:userId/inventory', authenticateToken, async (req, res) => {
    try {
      const inventory = await pool.query(
        'SELECT i.id, i.item_id, c.name, i.acquired_date, i.is_equipped FROM inventory i JOIN catalog_items c ON i.item_id = c.id WHERE i.user_id = $1',
        [req.params.userId]
      );

      res.json(inventory.rows.map(item => ({
        itemId: item.item_id,
        userId: req.params.userId,
        itemName: item.name,
        acquiredDate: item.acquired_date,
        isEquipped: item.is_equipped
      })));
    } catch (error) {
      console.error('Get inventory error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
