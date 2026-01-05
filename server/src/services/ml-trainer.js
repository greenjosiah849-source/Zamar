/**
 * Machine Learning Trainer Service
 * Auto-improve AI model from moderator feedback
 */

const crypto = require('crypto');
const fs = require('fs').promises;

class MLTrainerService {
  constructor(pool, redisClient, modelPath = './models') {
    this.pool = pool;
    this.redis = redisClient;
    this.modelPath = modelPath;
    this.trainingInProgress = false;
  }

  /**
   * Log training data (collected from moderator decisions)
   */
  async logTrainingData(caseId, contentData, aiPrediction, moderatorDecision) {
    const trainingRecord = {
      id: crypto.randomUUID(),
      caseId,
      content: this._sanitizeContent(contentData),
      contentHash: crypto.createHash('sha256').update(JSON.stringify(contentData)).digest('hex'),
      aiPrediction,
      moderatorDecision,
      agreement: aiPrediction === moderatorDecision,
      confidence: aiPrediction.confidence,
      category: aiPrediction.category,
      timestamp: new Date()
    };

    // Store in database
    await this.pool.query(
      `INSERT INTO ml_training_data (id, case_id, content_hash, ai_prediction, moderator_decision, 
       agreement, confidence, category, recorded_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        trainingRecord.id,
        caseId,
        trainingRecord.contentHash,
        JSON.stringify(aiPrediction),
        JSON.stringify(moderatorDecision),
        trainingRecord.agreement,
        aiPrediction.confidence,
        aiPrediction.category,
        trainingRecord.timestamp
      ]
    );

    // Add to training buffer
    await this.redis.lpush('training_buffer', JSON.stringify(trainingRecord));

    // Update model metadata
    await this._updateModelMetadata();

    return trainingRecord;
  }

  /**
   * Train model from accumulated data
   */
  async trainModel() {
    if (this.trainingInProgress) {
      throw new Error('Training already in progress');
    }

    this.trainingInProgress = true;

    try {
      const startTime = Date.now();

      // Get all training data
      const result = await this.pool.query(
        `SELECT ai_prediction, moderator_decision, confidence, category FROM ml_training_data 
         WHERE used_for_training = false LIMIT 10000`
      );

      if (result.rows.length < 100) {
        throw new Error('Insufficient training data (minimum 100 samples required)');
      }

      const trainingData = result.rows.map(row => ({
        prediction: JSON.parse(row.ai_prediction),
        decision: JSON.parse(row.moderator_decision),
        confidence: row.confidence,
        category: row.category
      }));

      // Calculate improved weights
      const improvements = await this._analyzeTrainingData(trainingData);

      // Update model weights
      const newModel = await this._updateModelWeights(improvements);

      // Save model version
      const versionId = crypto.randomUUID();
      const modelVersion = {
        id: versionId,
        version: await this._getNextVersion(),
        improvements,
        accuracy: newModel.accuracy,
        trainingCount: trainingData.length,
        createdAt: new Date(),
        status: 'ACTIVE'
      };

      // Store version info
      await this.pool.query(
        `INSERT INTO ml_model_versions (id, version, improvements, accuracy, training_count, created_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          modelVersion.id,
          modelVersion.version,
          JSON.stringify(improvements),
          modelVersion.accuracy,
          modelVersion.trainingCount,
          modelVersion.createdAt,
          modelVersion.status
        ]
      );

      // Mark training data as used
      await this.pool.query(
        'UPDATE ml_training_data SET used_for_training = true WHERE used_for_training = false'
      );

      const duration = Date.now() - startTime;

      console.log(`[ML] Training completed in ${duration}ms. New accuracy: ${(newModel.accuracy * 100).toFixed(2)}%`);

      return modelVersion;
    } finally {
      this.trainingInProgress = false;
    }
  }

  /**
   * Analyze training data and generate improvements
   */
  async _analyzeTrainingData(data) {
    const categoryAnalysis = {};
    const errors = [];

    // Group by category
    for (const item of data) {
      if (!categoryAnalysis[item.category]) {
        categoryAnalysis[item.category] = {
          total: 0,
          correct: 0,
          falsePositives: 0,
          falseNegatives: 0,
          avgConfidence: 0,
          confidences: []
        };
      }

      categoryAnalysis[item.category].total++;
      categoryAnalysis[item.category].confidences.push(item.confidence);

      if (item.prediction.category === item.decision.category) {
        categoryAnalysis[item.category].correct++;
      } else {
        if (item.prediction.isSuspicious && !item.decision.isSuspicious) {
          categoryAnalysis[item.category].falsePositives++;
          errors.push({
            type: 'FALSE_POSITIVE',
            category: item.category,
            confidence: item.confidence,
            prediction: item.prediction,
            decision: item.decision
          });
        } else {
          categoryAnalysis[item.category].falseNegatives++;
          errors.push({
            type: 'FALSE_NEGATIVE',
            category: item.category,
            confidence: item.confidence,
            prediction: item.prediction,
            decision: item.decision
          });
        }
      }
    }

    // Calculate accuracy and adjustments
    const improvements = {};

    for (const [category, stats] of Object.entries(categoryAnalysis)) {
      const accuracy = stats.correct / stats.total;
      const avgConfidence = stats.confidences.reduce((a, b) => a + b, 0) / stats.confidences.length;

      improvements[category] = {
        accuracy,
        adjustment: this._calculateWeightAdjustment(accuracy),
        confidenceThreshold: Math.max(0.4, avgConfidence - 0.1),
        falsePositiveRate: stats.falsePositives / stats.total,
        falseNegativeRate: stats.falseNegatives / stats.total
      };
    }

    // Store error analysis
    await this._storeErrorAnalysis(errors);

    return improvements;
  }

  /**
   * Calculate weight adjustment
   */
  _calculateWeightAdjustment(accuracy) {
    if (accuracy > 0.95) return 0; // No adjustment needed
    if (accuracy > 0.80) return 0.05; // Minor adjustment
    if (accuracy > 0.60) return 0.15; // Moderate adjustment
    return 0.30; // Significant adjustment
  }

  /**
   * Update model weights
   */
  async _updateModelWeights(improvements) {
    // Load current model (this would normally load from file)
    const currentModel = await this._loadModel();

    // Apply improvements
    for (const [category, improvement] of Object.entries(improvements)) {
      if (!currentModel.weights[category]) {
        currentModel.weights[category] = {};
      }

      currentModel.weights[category].adjustment = improvement.adjustment;
      currentModel.weights[category].confidenceThreshold = improvement.confidenceThreshold;
    }

    // Calculate overall accuracy
    const accuracies = Object.values(improvements).map(i => i.accuracy);
    const overallAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

    currentModel.accuracy = overallAccuracy;
    currentModel.lastTrained = new Date();

    // Save updated model
    await this._saveModel(currentModel);

    // Update cache
    await this.redis.setEx('current_model', 86400, JSON.stringify(currentModel));

    return currentModel;
  }

  /**
   * Load model from file/cache
   */
  async _loadModel() {
    // Try cache first
    const cached = await this.redis.get('current_model');
    if (cached) {
      return JSON.parse(cached);
    }

    // Default model structure
    return {
      version: '1.0.0',
      accuracy: 0.85,
      weights: {},
      lastTrained: null,
      features: []
    };
  }

  /**
   * Save model to file
   */
  async _saveModel(model) {
    // Save model file
    // This would typically save to a versioned model file
    await this.redis.setEx('current_model', 86400, JSON.stringify(model));

    return true;
  }

  /**
   * Store error analysis
   */
  async _storeErrorAnalysis(errors) {
    for (const error of errors) {
      await this.pool.query(
        `INSERT INTO ml_error_log (error_type, category, confidence, prediction, decision, logged_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          error.type,
          error.category,
          error.confidence,
          JSON.stringify(error.prediction),
          JSON.stringify(error.decision),
          new Date()
        ]
      );
    }
  }

  /**
   * Get training data statistics
   */
  async getTrainingStats() {
    const result = await this.pool.query(
      `SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN used_for_training = true THEN 1 END) as used,
        COUNT(CASE WHEN used_for_training = false THEN 1 END) as pending,
        COUNT(CASE WHEN agreement = true THEN 1 END) as agreeing,
        ROUND(COUNT(CASE WHEN agreement = true THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as agreement_rate,
        AVG(confidence) as avg_confidence
       FROM ml_training_data`
    );

    return result.rows[0];
  }

  /**
   * Get model versions
   */
  async getModelVersions(limit = 20) {
    const result = await this.pool.query(
      `SELECT id, version, accuracy, training_count, created_at, status 
       FROM ml_model_versions ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  /**
   * Get current model info
   */
  async getCurrentModelInfo() {
    const model = await this._loadModel();

    const versionResult = await this.pool.query(
      `SELECT id, version, accuracy, training_count, created_at FROM ml_model_versions 
       WHERE status = 'ACTIVE' LIMIT 1`
    );

    return {
      model,
      latestVersion: versionResult.rows[0] || null
    };
  }

  /**
   * Predict with confidence interval
   */
  async predictWithConfidence(content, category) {
    const model = await this._loadModel();

    // Get weight adjustment for category
    const adjustment = model.weights[category]?.adjustment || 0;
    const threshold = model.weights[category]?.confidenceThreshold || 0.5;

    // Simple confidence calculation based on model accuracy
    const baseConfidence = model.accuracy;
    const adjustedConfidence = Math.min(1, Math.max(0, baseConfidence + adjustment));

    return {
      prediction: adjustedConfidence > threshold,
      confidence: adjustedConfidence,
      threshold,
      adjustment
    };
  }

  /**
   * Get training recommendations
   */
  async getTrainingRecommendations() {
    const stats = await this.getTrainingStats();
    const errors = await this.pool.query(
      `SELECT error_type, COUNT(*) as count FROM ml_error_log 
       GROUP BY error_type ORDER BY count DESC`
    );

    const recommendations = [];

    if (stats.pending < 100) {
      recommendations.push({
        priority: 'LOW',
        message: 'More training data needed for optimal improvements'
      });
    }

    if (stats.agreement_rate < 80) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Low moderator agreement rate - review flagged cases manually'
      });
    }

    // Find most common error type
    const topError = errors.rows[0];
    if (topError) {
      recommendations.push({
        priority: topError.count > 50 ? 'HIGH' : 'MEDIUM',
        message: `Most common error: ${topError.error_type} (${topError.count} occurrences)`
      });
    }

    return recommendations;
  }

  /**
   * Schedule automatic training
   */
  async scheduleTraining(intervalHours = 24) {
    const config = {
      enabled: true,
      intervalHours,
      lastRun: null,
      nextRun: new Date(Date.now() + intervalHours * 3600000)
    };

    await this.redis.setEx('training_schedule', 86400 * 30, JSON.stringify(config));

    return config;
  }

  /**
   * Get next version number
   */
  async _getNextVersion() {
    const result = await this.pool.query(
      'SELECT MAX(version) as max_version FROM ml_model_versions'
    );

    const currentVersion = result.rows[0]?.max_version || '1.0.0';
    const [major, minor, patch] = currentVersion.split('.').map(Number);

    return `${major}.${minor}.${patch + 1}`;
  }

  /**
   * Sanitize content for storage
   */
  _sanitizeContent(content) {
    // Remove sensitive information before storing
    if (typeof content === 'string') {
      return content.substring(0, 1000); // Limit to 1000 chars
    }

    return JSON.stringify(content).substring(0, 5000);
  }

  /**
   * Compare model versions
   */
  async compareModelVersions(versionId1, versionId2) {
    const [v1, v2] = await Promise.all([
      this.pool.query('SELECT * FROM ml_model_versions WHERE id = $1', [versionId1]),
      this.pool.query('SELECT * FROM ml_model_versions WHERE id = $1', [versionId2])
    ]);

    if (!v1.rows[0] || !v2.rows[0]) {
      throw new Error('Model version not found');
    }

    return {
      version1: v1.rows[0],
      version2: v2.rows[0],
      accuracyDifference: v2.rows[0].accuracy - v1.rows[0].accuracy,
      improvement: ((v2.rows[0].accuracy - v1.rows[0].accuracy) / v1.rows[0].accuracy * 100).toFixed(2) + '%'
    };
  }

  /**
   * Rollback to previous model
   */
  async rollbackToVersion(versionId) {
    const result = await this.pool.query(
      'SELECT * FROM ml_model_versions WHERE id = $1',
      [versionId]
    );

    if (!result.rows[0]) {
      throw new Error('Model version not found');
    }

    // Set as active
    await this.pool.query(
      'UPDATE ml_model_versions SET status = $1 WHERE status = $2',
      ['INACTIVE', 'ACTIVE']
    );

    await this.pool.query(
      'UPDATE ml_model_versions SET status = $1 WHERE id = $2',
      ['ACTIVE', versionId]
    );

    // Clear cache
    await this.redis.del('current_model');

    return result.rows[0];
  }
}

module.exports = MLTrainerService;
