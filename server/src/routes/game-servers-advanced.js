/**
 * Game Server Routes - Enhanced Global Version
 * Endpoints for server selection, matchmaking, and server management
 * Supports 17 regions across 12+ countries with optimized latency
 */

const express = require('express');
const router = express.Router();

// Simple in-memory cache for frequently accessed data
const responseCache = new Map();
const CACHE_TTL = 2000; // 2 second cache

// Middleware for verifying JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET || 'zamar-secret-key'
    );
    req.userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Response caching middleware for GET requests
const cacheMiddleware = (key) => (req, res, next) => {
  if (responseCache.has(key)) {
    const { data, timestamp } = responseCache.get(key);
    if (Date.now() - timestamp < CACHE_TTL) {
      return res.json(data);
    }
  }
  res.sendCached = (data) => {
    responseCache.set(key, { data, timestamp: Date.now() });
    res.json(data);
  };
  next();
};

module.exports = (serverManager) => {
  /**
   * GET /game-servers/regions
   * Get all available regions and their stats (17 regions, 12+ countries)
   */
  router.get('/regions', cacheMiddleware('regions'), (req, res) => {
    try {
      serverManager.incrementRequestCount();
      const stats = serverManager.getAllServerStats();
      res.sendCached(stats);
    } catch (error) {
      console.error('Error fetching regions:', error);
      res.status(500).json({ error: 'Failed to fetch regions' });
    }
  });

  /**
   * GET /game-servers/best-region
   * Find best region based on user location with multiple recommendations
   */
  router.get('/best-region', (req, res) => {
    try {
      serverManager.incrementRequestCount();
      const { lat, lon, count = 5 } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing location parameters (lat, lon)' });
      }

      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);

      // Get top N regions by latency
      const topRegions = serverManager.getBestRegionsByLatency(userLat, userLon, Math.min(parseInt(count), 10));
      const { region: closestRegion } = serverManager.getClosestRegion(userLat, userLon);
      const stats = serverManager.getServerStats(closestRegion);

      res.json({
        yourLocation: { lat: userLat, lon: userLon },
        recommended: {
          region: closestRegion,
          ...stats,
          estimatedLatency: serverManager.estimateLatency(userLat, userLon, closestRegion),
        },
        topRegions: topRegions.map(r => ({
          region: r.region,
          country: r.country,
          city: r.city,
          continent: r.continent,
          latency: r.latency + 'ms',
          ...serverManager.getServerStats(r.region),
        })),
        continentBreakdown: serverManager.getServerStats(closestRegion).continent,
      });
    } catch (error) {
      console.error('Error finding best region:', error);
      res.status(500).json({ error: 'Failed to find best region' });
    }
  });

  /**
   * POST /game-servers/join
   * Assign player to a game server (fastest possible response)
   */
  router.post('/join', verifyToken, (req, res) => {
    try {
      serverManager.incrementRequestCount();
      const { gameId, lat, lon, preferredRegion, continent } = req.body;

      if (!gameId) {
        return res.status(400).json({ error: 'Missing gameId' });
      }

      let result;

      if (preferredRegion) {
        // Use preferred region if specified and available
        const stats = serverManager.getServerStats(preferredRegion);
        if (stats && stats.utilization < 100) {
          result = serverManager.assignPlayerToServer(
            req.userId,
            lat || 0,
            lon || 0,
            gameId
          );
        } else {
          return res.status(503).json({ 
            error: 'Preferred server full',
            fallback: 'Routing to nearest available server...',
          });
        }
      } else if (lat && lon) {
        // Auto-select based on location (fastest)
        result = serverManager.assignPlayerToServer(
          req.userId,
          parseFloat(lat),
          parseFloat(lon),
          gameId
        );
      } else {
        return res.status(400).json({ error: 'Missing location or region' });
      }

      if (!result) {
        return res.status(503).json({ error: 'No servers available - all full' });
      }

      serverManager.incrementRequestCount();

      res.json({
        success: true,
        message: 'Connected to server',
        server: result,
        joinToken: Buffer.from(
          JSON.stringify({ 
            userId: req.userId, 
            gameId, 
            region: result.region,
            timestamp: Date.now() 
          })
        ).toString('base64'),
        connectionInfo: {
          protocol: 'WebSocket',
          address: `ws://${result.host}:${result.port}`,
          compression: 'deflate',
          reconnectDelay: 1000,
        },
      });
    } catch (error) {
      console.error('Error joining game:', error);
      res.status(500).json({ error: 'Failed to join game' });
    }
  });

  /**
   * POST /game-servers/leave
   * Unassign player from server (immediate)
   */
  router.post('/leave', verifyToken, (req, res) => {
    try {
      serverManager.removePlayer(req.userId);
      res.json({ success: true, message: 'Left server successfully' });
    } catch (error) {
      console.error('Error leaving game:', error);
      res.status(500).json({ error: 'Failed to leave game' });
    }
  });

  /**
   * GET /game-servers/metrics
   * Get comprehensive server metrics and analytics
   */
  router.get('/metrics', cacheMiddleware('metrics'), (req, res) => {
    try {
      serverManager.incrementRequestCount();
      const metrics = serverManager.getMetrics();
      res.sendCached(metrics);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch metrics' });
    }
  });

  /**
   * GET /game-servers/continents
   * Get servers grouped by continent
   */
  router.get('/continents', cacheMiddleware('continents'), (req, res) => {
    try {
      const continents = {
        'NA': serverManager.getServersByContinent('NA'),
        'EU': serverManager.getServersByContinent('EU'),
        'AS': serverManager.getServersByContinent('AS'),
        'SA': serverManager.getServersByContinent('SA'),
        'OC': serverManager.getServersByContinent('OC'),
      };

      res.sendCached({
        continents,
        info: {
          'NA': 'North America',
          'EU': 'Europe',
          'AS': 'Asia',
          'SA': 'South America',
          'OC': 'Oceania',
        },
      });
    } catch (error) {
      console.error('Error fetching continents:', error);
      res.status(500).json({ error: 'Failed to fetch continents' });
    }
  });

  /**
   * GET /game-servers/:region/stats
   * Get stats for specific region
   */
  router.get('/:region/stats', (req, res) => {
    try {
      const { region } = req.params;
      const stats = serverManager.getServerStats(region);

      if (!stats) {
        return res.status(404).json({ error: 'Region not found' });
      }

      res.json({
        ...stats,
        recommendedFor: region,
        status: stats.status,
      });
    } catch (error) {
      console.error('Error fetching region stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  /**
   * GET /game-servers/country/:country
   * Get all regions in a specific country
   */
  router.get('/country/:country', (req, res) => {
    try {
      const { country } = req.params;
      const stats = serverManager.getAllServerStats()
        .filter(s => s.country.toLowerCase() === country.toLowerCase());

      if (stats.length === 0) {
        return res.status(404).json({ error: 'No servers found for country' });
      }

      res.json({
        country,
        regions: stats,
        total: stats.length,
      });
    } catch (error) {
      console.error('Error fetching country stats:', error);
      res.status(500).json({ error: 'Failed to fetch country stats' });
    }
  });

  /**
   * POST /game-servers/matchmake
   * Find players for matchmaking with region preference
   */
  router.post('/matchmake', verifyToken, (req, res) => {
    try {
      serverManager.incrementRequestCount();
      const { gameMode, lat, lon, preferredRegion, skillLevel } = req.body;

      let region = preferredRegion;

      // If no preferred region, find best one by location
      if (!region && lat && lon) {
        const { region: bestRegion } = serverManager.getClosestRegion(
          parseFloat(lat),
          parseFloat(lon)
        );
        region = bestRegion;
      } else {
        region = region || 'US-EAST';
      }

      const stats = serverManager.getServerStats(region);

      // Fast matchmaking response
      if (!stats || stats.utilization >= 95) {
        return res.json({
          status: 'QUEUED',
          region,
          position: Math.floor(Math.random() * 30) + 1,
          estimatedWait: Math.floor(Math.random() * 45) + 15, // 15-60 seconds
          message: 'Server full, you are in queue',
        });
      }

      res.json({
        status: 'MATCHED',
        region,
        server: {
          host: 'localhost',
          port: stats.port || 8001,
          country: stats.country,
          city: stats.city,
        },
        latency: serverManager.estimateLatency(
          parseFloat(lat) || 0,
          parseFloat(lon) || 0,
          region
        ),
        playerCount: stats.playerCount,
        availableSlots: stats.maxPlayers - stats.playerCount,
      });
    } catch (error) {
      console.error('Error in matchmaking:', error);
      res.status(500).json({ error: 'Matchmaking failed' });
    }
  });

  /**
   * GET /game-servers/latency-check
   * Check latency from user to all servers (fast response)
   */
  router.get('/latency-check', (req, res) => {
    try {
      serverManager.incrementRequestCount();
      const { lat, lon } = req.query;

      if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing location parameters (lat, lon)' });
      }

      const userLat = parseFloat(lat);
      const userLon = parseFloat(lon);

      const allLatencies = serverManager.getLatencyForAllRegions(userLat, userLon);
      const topRegions = serverManager.getBestRegionsByLatency(userLat, userLon, 3);

      res.json({
        timestamp: Date.now(),
        yourLocation: { lat: userLat, lon: userLon },
        topRegions: topRegions.map(r => ({
          region: r.region,
          country: r.country,
          city: r.city,
          latency: r.latency + 'ms',
        })),
        allLatencies: allLatencies.all,
      });
    } catch (error) {
      console.error('Error checking latency:', error);
      res.status(500).json({ error: 'Latency check failed' });
    }
  });

  /**
   * POST /game-servers/ping
   * Simple ping endpoint for latency measurement (ultra-fast)
   */
  router.post('/ping', (req, res) => {
    res.json({ 
      pong: true,
      timestamp: Date.now(),
      latency: '~0ms (server response)',
    });
  });

  /**
   * GET /game-servers/health
   * Quick health check for all servers
   */
  router.get('/health', cacheMiddleware('health'), (req, res) => {
    try {
      const stats = serverManager.getAllServerStats();
      const allHealthy = stats.every(s => s.status !== 'OVERLOADED');

      res.sendCached({
        status: allHealthy ? 'HEALTHY' : 'DEGRADED',
        timestamp: Date.now(),
        servers: stats.map(s => ({
          region: s.region,
          status: s.status,
          utilization: s.utilization + '%',
        })),
      });
    } catch (error) {
      console.error('Error checking health:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  });

  /**
   * GET /game-servers/info
   * Get comprehensive platform information
   */
  router.get('/info', cacheMiddleware('info'), (req, res) => {
    try {
      const metrics = serverManager.getMetrics();
      const allStats = serverManager.getAllServerStats();

      res.sendCached({
        platform: 'Zamar Global Game Server Network',
        version: '2.0.0',
        totalRegions: metrics.totalRegions,
        totalCountries: 12,
        continents: 5,
        activePlayers: metrics.totalPlayers,
        capacity: metrics.totalCapacity,
        avgUtilization: metrics.averageUtilization,
        regions: allStats.length,
        uptime: metrics.uptime,
        requestsProcessed: metrics.requestsProcessed,
        features: [
          'Global server distribution',
          'Automatic region selection',
          'Latency-based routing',
          'Load balancing',
          'Real-time metrics',
          'Health monitoring',
          'Continent-aware selection',
        ],
      });
    } catch (error) {
      console.error('Error fetching info:', error);
      res.status(500).json({ error: 'Failed to fetch platform info' });
    }
  });

  return router;
};
