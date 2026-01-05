const express = require('express');
const { authenticateToken } = require('../middleware/auth');

module.exports = (pool, redisClient) => {
  const router = express.Router();

  // Get catalog items
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const { category } = req.query;
      let query = 'SELECT id, name, description, category, price, creator_id, thumbnail_url, is_limited, limited_supply FROM catalog_items';
      const params = [];

      if (category) {
        query += ' WHERE category = $1';
        params.push(category);
      }

      query += ' LIMIT 100';

      const items = await pool.query(query, params);

      res.json(items.rows.map(item => ({
        itemId: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        price: item.price,
        creatorId: item.creator_id,
        thumbnailUrl: item.thumbnail_url,
        isLimited: item.is_limited,
        limitedSupply: item.limited_supply,
        remainingSupply: item.limited_supply
      })));
    } catch (error) {
      console.error('Get catalog error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single catalog item
  router.get('/:itemId', authenticateToken, async (req, res) => {
    try {
      const item = await pool.query(
        'SELECT id, name, description, category, price, creator_id, thumbnail_url, is_limited, limited_supply FROM catalog_items WHERE id = $1',
        [req.params.itemId]
      );

      if (item.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      const itemData = item.rows[0];
      res.json({
        itemId: itemData.id,
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        price: itemData.price,
        creatorId: itemData.creator_id,
        thumbnailUrl: itemData.thumbnail_url,
        isLimited: itemData.is_limited,
        limitedSupply: itemData.limited_supply,
        remainingSupply: itemData.limited_supply
      });
    } catch (error) {
      console.error('Get item error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase item
  router.post('/purchase', authenticateToken, async (req, res) => {
    try {
      const { itemId, price } = req.body;
      const { userId } = req.user;

      if (!itemId || !price) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if item exists
      const itemCheck = await pool.query(
        'SELECT id, price FROM catalog_items WHERE id = $1',
        [itemId]
      );

      if (itemCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Item not found' });
      }

      // In production, verify payment here
      const inventoryId = require('crypto').randomUUID();
      await pool.query(
        'INSERT INTO inventory (id, user_id, item_id, acquired_date, is_equipped) VALUES ($1, $2, $3, $4, $5)',
        [inventoryId, userId, itemId, new Date(), false]
      );

      res.json({ message: 'Purchase successful', inventoryId });
    } catch (error) {
      console.error('Purchase error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
