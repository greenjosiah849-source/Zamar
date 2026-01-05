require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const redis = require('redis');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Database Connection
const pool = new Pool({
  user: process.env.DB_USER || 'zamar',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'zamar_db',
  password: process.env.DB_PASSWORD || 'zamar_password',
  port: process.env.DB_PORT || 5432,
});

// Redis Connection
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.connect();

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Regional Game Servers
const RegionalGameServerManager = require('./regional-game-server-manager');
const gameServerManager = new RegionalGameServerManager();

// Initialize game servers on startup
async function initializeGameServers() {
  try {
    await gameServerManager.initialize();
    console.log('✅ Game server infrastructure initialized');
  } catch (error) {
    console.error('❌ Failed to initialize game servers:', error);
  }
}

initializeGameServers();

// Auth Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gameRoutes = require('./routes/games');
const catalogRoutes = require('./routes/catalog');
const chatRoutes = require('./routes/chat');
const gameServersAdvancedRoutes = require('./routes/game-servers-advanced');
const publishingRoutes = require('./routes/publishing');
const featuresRoutes = require('./routes/features');
const { router: multiplayerRoutes, handleWebSocket } = require('./routes/multiplayer');

app.use('/auth', authRoutes(pool, redisClient, jwt));
app.use('/users', userRoutes(pool, redisClient));
app.use('/games', gameRoutes(pool, redisClient));
app.use('/catalog', catalogRoutes(pool, redisClient));
app.use('/chat', chatRoutes(pool, redisClient));
app.use('/game-servers', gameServersAdvancedRoutes(gameServerManager));
app.use('/publishing', publishingRoutes(pool));
app.use('/features', featuresRoutes(pool));
app.use('/api/multiplayer', multiplayerRoutes);

// WebSocket handler for game sessions
wss.on('connection', (ws, req) => {
  handleWebSocket(ws, req);
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Zamar API Gateway running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log('Database connected');
  console.log('Redis connected');
});

module.exports = { pool, redisClient };
