/**
 * Global Game Server Manager
 * Manages game servers across 12+ countries worldwide
 * Handles player assignment, server selection, latency optimization, and health monitoring
 * No external APIs - pure in-house implementation
 */

const GameServer = require('./advanced-game-server');

class RegionalGameServerManager {
  constructor(config = {}) {
    // Global regions across 12+ countries with real geolocation data
    this.regions = {
      // North America
      'US-EAST': { lat: 40.7128, lon: -74.006, port: 8001, city: 'New York', country: 'USA', continent: 'NA' },
      'US-WEST': { lat: 34.0522, lon: -118.2437, port: 8002, city: 'Los Angeles', country: 'USA', continent: 'NA' },
      'US-CENTRAL': { lat: 41.8781, lon: -87.6298, port: 8003, city: 'Chicago', country: 'USA', continent: 'NA' },
      'US-SOUTH': { lat: 29.7604, lon: -95.3698, port: 8004, city: 'Houston', country: 'USA', continent: 'NA' },
      'CANADA': { lat: 43.6629, lon: -79.3957, port: 8005, city: 'Toronto', country: 'Canada', continent: 'NA' },
      'MEXICO': { lat: 19.4326, lon: -99.1332, port: 8006, city: 'Mexico City', country: 'Mexico', continent: 'NA' },
      
      // Europe
      'EU-WEST': { lat: 48.8566, lon: 2.3522, port: 8007, city: 'Paris', country: 'France', continent: 'EU' },
      'EU-CENTRAL': { lat: 52.52, lon: 13.405, port: 8008, city: 'Berlin', country: 'Germany', continent: 'EU' },
      'EU-NORTH': { lat: 59.3293, lon: 18.0686, port: 8009, city: 'Stockholm', country: 'Sweden', continent: 'EU' },
      'EU-SOUTH': { lat: 41.9028, lon: 12.4964, port: 8010, city: 'Rome', country: 'Italy', continent: 'EU' },
      'UK': { lat: 51.5074, lon: -0.1278, port: 8011, city: 'London', country: 'United Kingdom', continent: 'EU' },
      
      // Asia
      'ASIA-EAST': { lat: 35.6762, lon: 139.6503, port: 8012, city: 'Tokyo', country: 'Japan', continent: 'AS' },
      'ASIA-SE': { lat: 1.3521, lon: 103.8198, port: 8013, city: 'Singapore', country: 'Singapore', continent: 'AS' },
      'ASIA-SOUTH': { lat: 28.7041, lon: 77.1025, port: 8014, city: 'New Delhi', country: 'India', continent: 'AS' },
      'ASIA-WEST': { lat: 31.2456, lon: 121.4986, port: 8015, city: 'Shanghai', country: 'China', continent: 'AS' },
      
      // South America
      'SA-EAST': { lat: -23.5505, lon: -46.6333, port: 8016, city: 'São Paulo', country: 'Brazil', continent: 'SA' },
      
      // Oceania
      'OCE': { lat: -33.8688, lon: 151.2093, port: 8017, city: 'Sydney', country: 'Australia', continent: 'OC' },
    };

    this.servers = new Map();
    this.playerRegionMap = new Map();
    this.playerLatencyCache = new Map(); // Cache latency measurements
    this.regionLoadCache = new Map();
    this.startTime = Date.now();
    this.requestCount = 0;
    this.cacheUpdateInterval = 5000; // Update cache every 5 seconds
  }

  async initialize() {
    console.log('🌍 Initializing Global Game Servers (17 regions across 12+ countries)...');

    const regionCount = Object.keys(this.regions).length;
    let initCount = 0;

    for (const [region, config] of Object.entries(this.regions)) {
      try {
        const server = new GameServer({
          port: config.port,
          region,
          maxPlayers: 250, // Increased from 200
          tickRate: 60,
          optimizationLevel: 'high', // Enable server-side optimizations
        });

        server.start();
        this.servers.set(region, server);
        this.regionLoadCache.set(region, { load: 0, lastUpdate: Date.now() });

        console.log(`✅ [${region.padEnd(12)}] ${config.country.padEnd(15)} - ${config.city.padEnd(15)} (Port ${config.port})`);
        initCount++;
      } catch (error) {
        console.error(`❌ Failed to initialize ${region}: ${error.message}`);
      }
    }

    console.log(`\n✨ Successfully initialized ${initCount}/${regionCount} game servers globally\n`);

    // Health check every 15 seconds (faster than before)
    this.healthCheckInterval = setInterval(() => {
      this.checkServerHealth();
    }, 15000);

    // Update load cache more frequently for faster decisions
    this.loadCacheInterval = setInterval(() => {
      this.updateLoadCache();
    }, this.cacheUpdateInterval);

    this.updateLoadCache();
  }

  updateLoadCache() {
    for (const [region, server] of this.servers) {
      const utilization = (server.players.size / server.config.maxPlayers) * 100;
      this.regionLoadCache.set(region, {
        load: utilization,
        playerCount: server.players.size,
        lastUpdate: Date.now(),
      });
    }
  }

  getClosestRegion(lat, lon, continent = null) {
    let closestRegion = 'US-EAST';
    let closestDistance = Infinity;

    // Filter by continent if specified for faster routing
    const candidateRegions = continent 
      ? Object.entries(this.regions).filter(([_, data]) => data.continent === continent)
      : Object.entries(this.regions);

    for (const [region, regionData] of candidateRegions) {
      const distance = this.calculateDistance(
        lat,
        lon,
        regionData.lat,
        regionData.lon
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestRegion = region;
      }
    }

    return { region: closestRegion, distance: closestDistance };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    // Haversine formula for great circle distance (optimized)
    const R = 6371; // Earth's radius in km
    const toRad = Math.PI / 180;
    
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const lat1Rad = lat1 * toRad;
    const lat2Rad = lat2 * toRad;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getPlayerContinent(lat, lon) {
    // Determine continent from latitude/longitude
    if (lat > 15 && lat < 72 && lon > -170 && lon < -50) return 'NA'; // North America
    if (lat > 35 && lat < 71 && lon > -10 && lon < 40) return 'EU'; // Europe
    if (lat > -10 && lat < 55 && lon > 60 && lon < 180) return 'AS'; // Asia
    if (lat > -56 && lat < -10 && lon > 112 && lon < 180) return 'OC'; // Oceania
    if (lat > -33 && lat < 12 && lon > -82 && lon < -34) return 'SA'; // South America
    return null; // Unknown
  }

  assignPlayerToServer(userId, lat, lon, gameId) {
    // Fast path: use continent for quicker regional selection
    const continent = this.getPlayerContinent(lat, lon);
    const { region } = this.getClosestRegion(lat, lon, continent);
    
    const server = this.servers.get(region);

    if (server && server.players.size < server.config.maxPlayers) {
      this.playerRegionMap.set(userId, {
        region,
        gameId,
        assignedAt: Date.now(),
        continent,
      });

      const regionData = this.regions[region];
      return {
        region,
        port: regionData.port,
        host: 'localhost',
        city: regionData.city,
        country: regionData.country,
        continent: regionData.continent,
        estimatedLatency: this.estimateLatency(lat, lon, region),
      };
    }

    // Load balancing: find least loaded server if closest is full
    let bestRegion = null;
    let lowestLoad = Infinity;

    for (const [altRegion, altServer] of this.servers) {
      const load = altServer.players.size / altServer.config.maxPlayers;
      if (load < lowestLoad && altServer.players.size < altServer.config.maxPlayers) {
        lowestLoad = load;
        bestRegion = altRegion;
      }
    }

    if (bestRegion) {
      const server = this.servers.get(bestRegion);
      this.playerRegionMap.set(userId, {
        region: bestRegion,
        gameId,
        assignedAt: Date.now(),
        continent,
      });

      const regionData = this.regions[bestRegion];
      return {
        region: bestRegion,
        port: regionData.port,
        host: 'localhost',
        city: regionData.city,
        country: regionData.country,
        continent: regionData.continent,
        estimatedLatency: this.estimateLatency(lat, lon, bestRegion),
      };
    }

    // All servers full
    return null;
  }

  getServerStats(region) {
    const server = this.servers.get(region);
    if (!server) return null;

    const regionData = this.regions[region];
    const playerCount = server.players.size;
    const maxPlayers = server.config.maxPlayers;
    const utilization = (playerCount / maxPlayers) * 100;

    return {
      region,
      city: regionData.city,
      country: regionData.country,
      continent: regionData.continent,
      playerCount,
      maxPlayers,
      utilization: Math.round(utilization * 10) / 10,
      tickRate: server.config.tickRate,
      status: utilization > 100 ? 'OVERLOADED' : utilization > 90 ? 'HIGH_LOAD' : 'ONLINE',
      ping: 0, // Will be measured per-player
    };
  }

  getAllServerStats() {
    const stats = [];
    for (const region of this.servers.keys()) {
      stats.push(this.getServerStats(region));
    }
    // Sort by continent and utilization for better organization
    return stats.sort((a, b) => {
      if (a.continent !== b.continent) return a.continent.localeCompare(b.continent);
      return a.utilization - b.utilization;
    });
  }

  getServersByContinent(continent) {
    return this.getAllServerStats().filter(s => s.continent === continent);
  }

  checkServerHealth() {
    const healthReport = [];

    for (const [region, server] of this.servers) {
      const stats = this.getServerStats(region);
      const utilization = stats.utilization;

      if (utilization > 95) {
        healthReport.push(`⚠️  ${region} (${stats.country}) - ${utilization.toFixed(1)}% capacity`);
      }

      if (utilization > 100) {
        healthReport.push(`🚨 ${region} (${stats.country}) - OVERLOADED!`);
      }
    }

    if (healthReport.length > 0) {
      console.log('\n📊 Server Health Status:');
      healthReport.forEach(msg => console.log(msg));
    }
  }

  estimateLatency(userLat, userLon, region) {
    // Check cache first
    const cacheKey = `${userLat.toFixed(2)},${userLon.toFixed(2)},${region}`;
    if (this.playerLatencyCache.has(cacheKey)) {
      return this.playerLatencyCache.get(cacheKey);
    }

    const distance = this.calculateDistance(
      userLat,
      userLon,
      this.regions[region].lat,
      this.regions[region].lon
    );

    // Improved latency estimation: ~1ms per 75km + 8ms baseline + variance
    const baseLatency = Math.round((distance / 75) * 1 + 8);
    // Add slight variance (-2 to +5ms) for realism
    const variance = Math.floor(Math.random() * 7) - 2;
    const estimatedLatency = Math.max(5, baseLatency + variance); // Minimum 5ms

    // Cache for 30 seconds
    this.playerLatencyCache.set(cacheKey, estimatedLatency);
    setTimeout(() => this.playerLatencyCache.delete(cacheKey), 30000);

    return estimatedLatency;
  }

  getLatencyForAllRegions(userLat, userLon) {
    const latencies = {};
    const continents = {};

    for (const region of this.servers.keys()) {
      const latency = this.estimateLatency(userLat, userLon, region);
      latencies[region] = latency;
      
      const continent = this.regions[region].continent;
      if (!continents[continent]) continents[continent] = [];
      continents[continent].push({ region, latency });
    }

    // Sort by latency within each continent
    for (const continent in continents) {
      continents[continent].sort((a, b) => a.latency - b.latency);
    }

    return { all: latencies, byContinent: continents };
  }

  getBestRegionsByLatency(userLat, userLon, count = 3) {
    const allLatencies = this.getLatencyForAllRegions(userLat, userLon);
    const sorted = Object.entries(allLatencies.all)
      .map(([region, latency]) => ({
        region,
        latency,
        ...this.regions[region],
      }))
      .sort((a, b) => a.latency - b.latency);

    return sorted.slice(0, count);
  }

  removePlayer(userId) {
    const playerData = this.playerRegionMap.get(userId);
    if (playerData) {
      // Pre-remove player to speed up load calculations
      const server = this.servers.get(playerData.region);
      if (server) {
        server.players.delete(userId); // Quick removal
      }
    }
    this.playerRegionMap.delete(userId);
  }

  shutdown() {
    console.log('\n🛑 Shutting down all game servers...');
    clearInterval(this.healthCheckInterval);
    clearInterval(this.loadCacheInterval);

    for (const server of this.servers.values()) {
      server.stop();
    }

    this.servers.clear();
    this.playerRegionMap.clear();
    this.playerLatencyCache.clear();
    this.regionLoadCache.clear();
    
    console.log('✅ All servers shut down cleanly');
  }

  getMetrics() {
    const totalPlayers = Array.from(this.servers.values()).reduce(
      (sum, server) => sum + server.players.size,
      0
    );

    const stats = this.getAllServerStats();
    const totalCapacity = stats.reduce((sum, stat) => sum + stat.maxPlayers, 0);
    const avgUtilization = (totalPlayers / totalCapacity) * 100;

    // Metrics by continent
    const continentMetrics = {};
    const continents = new Set(stats.map(s => s.continent));
    
    for (const continent of continents) {
      const continentServers = stats.filter(s => s.continent === continent);
      const continentPlayers = continentServers.reduce((sum, s) => sum + s.playerCount, 0);
      const continentCapacity = continentServers.reduce((sum, s) => sum + s.maxPlayers, 0);
      
      continentMetrics[continent] = {
        regions: continentServers.length,
        players: continentPlayers,
        capacity: continentCapacity,
        utilization: Math.round(((continentPlayers / continentCapacity) || 0) * 10) / 10 + '%',
      };
    }

    return {
      totalRegions: this.servers.size,
      totalPlayers,
      totalCapacity,
      averageUtilization: Math.round(avgUtilization * 10) / 10 + '%',
      uptime: this.formatUptime(Math.floor((Date.now() - this.startTime) / 1000)),
      requestsProcessed: this.requestCount,
      regions: stats,
      byContinent: continentMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }

  incrementRequestCount() {
    this.requestCount++;
  }
}

module.exports = RegionalGameServerManager;
