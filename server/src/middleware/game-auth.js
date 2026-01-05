/**
 * JWT Authentication Middleware
 */

const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Game Session Authentication
 */
const verifyGameToken = (req, res, next) => {
  const token = req.query.token || req.headers['x-game-token'];

  if (!token) {
    return res.status(401).json({ error: 'No game token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Check if token is a game join token
    if (!decoded.gameId) {
      return res.status(401).json({ error: 'Invalid game token' });
    }

    req.gameSession = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid game token' });
  }
};

/**
 * Rate limit by user
 */
const rateLimitByUser = (req, res, next) => {
  // Implementation depends on Redis or similar
  // This is a placeholder
  next();
};

module.exports = {
  verifyToken,
  verifyGameToken,
  rateLimitByUser
};
