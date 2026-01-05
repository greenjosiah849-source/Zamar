/**
 * Custom Rule Builder Service
 * Allows admins to create custom moderation rules
 */

const crypto = require('crypto');

class CustomRuleBuilderService {
  constructor(pool, redisClient) {
    this.pool = pool;
    this.redis = redisClient;
  }

  /**
   * Create custom rule
   */
  async createRule(ruleData) {
    const ruleId = crypto.randomUUID();

    const rule = {
      id: ruleId,
      name: ruleData.name,
      description: ruleData.description,
      trigger: ruleData.trigger, // KEYWORD, PATTERN, LENGTH, FREQUENCY, etc
      triggerValue: ruleData.triggerValue,
      action: ruleData.action, // WARN, MUTE, BAN, etc
      severity: ruleData.severity, // 1-5
      enabled: ruleData.enabled !== false,
      scope: ruleData.scope, // 'TEXT', 'USERNAME', 'PROFILE', 'GAME_CONTENT', 'ALL'
      priority: ruleData.priority || 0,
      createdBy: ruleData.createdBy,
      createdAt: new Date(),
      lastModified: new Date()
    };

    await this.pool.query(
      `INSERT INTO custom_rules (id, name, description, trigger, trigger_value, action, severity, 
       enabled, scope, priority, created_by, created_at, last_modified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        rule.id, rule.name, rule.description, rule.trigger, JSON.stringify(rule.triggerValue),
        rule.action, rule.severity, rule.enabled, rule.scope, rule.priority,
        rule.createdBy, rule.createdAt, rule.lastModified
      ]
    );

    // Cache rule
    await this.redis.setEx(
      `rule:${ruleId}`,
      86400,
      JSON.stringify(rule)
    );

    // Update rule cache
    await this._updateRuleCache();

    return rule;
  }

  /**
   * Update rule
   */
  async updateRule(ruleId, updates) {
    const rule = await this.getRule(ruleId);
    if (!rule) throw new Error('Rule not found');

    const updated = { ...rule, ...updates, lastModified: new Date() };

    await this.pool.query(
      `UPDATE custom_rules SET name = $1, description = $2, trigger = $3, trigger_value = $4, 
       action = $5, severity = $6, enabled = $7, scope = $8, priority = $9, last_modified = $10 
       WHERE id = $11`,
      [
        updated.name, updated.description, updated.trigger, JSON.stringify(updated.triggerValue),
        updated.action, updated.severity, updated.enabled, updated.scope, updated.priority,
        updated.lastModified, ruleId
      ]
    );

    // Update cache
    await this.redis.setEx(`rule:${ruleId}`, 86400, JSON.stringify(updated));
    await this._updateRuleCache();

    return updated;
  }

  /**
   * Get single rule
   */
  async getRule(ruleId) {
    const cached = await this.redis.get(`rule:${ruleId}`);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await this.pool.query(
      'SELECT * FROM custom_rules WHERE id = $1',
      [ruleId]
    );

    if (result.rows.length > 0) {
      const rule = this._parseRule(result.rows[0]);
      await this.redis.setEx(`rule:${ruleId}`, 86400, JSON.stringify(rule));
      return rule;
    }

    return null;
  }

  /**
   * Get all enabled rules
   */
  async getEnabledRules(scope = null) {
    const cached = await this.redis.get('rules:enabled');
    if (cached) {
      const rules = JSON.parse(cached);
      if (scope) {
        return rules.filter(r => r.scope === scope || r.scope === 'ALL');
      }
      return rules;
    }

    let query = 'SELECT * FROM custom_rules WHERE enabled = true ORDER BY priority DESC';
    const params = [];

    if (scope) {
      query += ` AND (scope = $1 OR scope = 'ALL')`;
      params.push(scope);
    }

    const result = await this.pool.query(query, params);
    const rules = result.rows.map(r => this._parseRule(r));

    await this.redis.setEx('rules:enabled', 3600, JSON.stringify(rules));

    return rules;
  }

  /**
   * Delete rule
   */
  async deleteRule(ruleId) {
    await this.pool.query('DELETE FROM custom_rules WHERE id = $1', [ruleId]);
    await this.redis.del(`rule:${ruleId}`);
    await this._updateRuleCache();

    return true;
  }

  /**
   * Test rule against content
   */
  async testRule(ruleId, content) {
    const rule = await this.getRule(ruleId);
    if (!rule) throw new Error('Rule not found');

    return this._evaluateRule(rule, content);
  }

  /**
   * Evaluate rule against content
   */
  _evaluateRule(rule, content) {
    const result = {
      triggered: false,
      matches: [],
      confidence: 0
    };

    switch (rule.trigger) {
      case 'KEYWORD':
        result = this._checkKeywords(rule, content);
        break;

      case 'PATTERN':
        result = this._checkPattern(rule, content);
        break;

      case 'LENGTH':
        result = this._checkLength(rule, content);
        break;

      case 'FREQUENCY':
        result = this._checkFrequency(rule, content);
        break;

      case 'CUSTOM_REGEX':
        result = this._checkRegex(rule, content);
        break;

      case 'SIMILARITY':
        result = this._checkSimilarity(rule, content);
        break;
    }

    return result;
  }

  /**
   * Check keywords
   */
  _checkKeywords(rule, content) {
    const keywords = rule.triggerValue.keywords || [];
    const caseSensitive = rule.triggerValue.caseSensitive || false;
    const matches = [];

    let searchText = content;
    if (!caseSensitive) {
      searchText = content.toLowerCase();
    }

    for (const keyword of keywords) {
      const searchKeyword = caseSensitive ? keyword : keyword.toLowerCase();
      if (searchText.includes(searchKeyword)) {
        matches.push(keyword);
      }
    }

    return {
      triggered: matches.length > 0,
      matches,
      confidence: Math.min(matches.length / keywords.length, 1.0)
    };
  }

  /**
   * Check pattern (LIKE SQL)
   */
  _checkPattern(rule, content) {
    const pattern = rule.triggerValue.pattern;
    const caseSensitive = rule.triggerValue.caseSensitive || false;

    let regex = this._patternToRegex(pattern, caseSensitive);
    const match = content.match(regex);

    return {
      triggered: !!match,
      matches: match ? [match[0]] : [],
      confidence: match ? 0.9 : 0
    };
  }

  /**
   * Check length
   */
  _checkLength(rule, content) {
    const minLength = rule.triggerValue.minLength || 0;
    const maxLength = rule.triggerValue.maxLength || Infinity;

    const triggered = content.length >= minLength && content.length <= maxLength;

    return {
      triggered,
      matches: triggered ? [content.length.toString()] : [],
      confidence: triggered ? 1.0 : 0
    };
  }

  /**
   * Check frequency
   */
  _checkFrequency(rule, content) {
    const char = rule.triggerValue.character;
    const minOccurrences = rule.triggerValue.minOccurrences || 1;

    const count = (content.match(new RegExp(char, 'g')) || []).length;
    const triggered = count >= minOccurrences;

    return {
      triggered,
      matches: [count.toString()],
      confidence: triggered ? Math.min(count / minOccurrences, 1.0) : 0
    };
  }

  /**
   * Check regex
   */
  _checkRegex(rule, content) {
    try {
      const regex = new RegExp(rule.triggerValue.regex, rule.triggerValue.flags || 'i');
      const match = content.match(regex);

      return {
        triggered: !!match,
        matches: match ? match.slice(0, 5) : [],
        confidence: match ? 1.0 : 0
      };
    } catch (error) {
      return {
        triggered: false,
        matches: [],
        confidence: 0
      };
    }
  }

  /**
   * Check similarity (basic)
   */
  _checkSimilarity(rule, content) {
    const targetText = rule.triggerValue.targetText;
    const threshold = rule.triggerValue.threshold || 0.8;

    const similarity = this._calculateSimilarity(content, targetText);

    return {
      triggered: similarity >= threshold,
      matches: similarity >= threshold ? [similarity.toFixed(2)] : [],
      confidence: similarity
    };
  }

  /**
   * Convert pattern to regex
   */
  _patternToRegex(pattern, caseSensitive) {
    // Convert SQL-like pattern to regex
    let regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    return new RegExp(`^${regex}$`, caseSensitive ? '' : 'i');
  }

  /**
   * Calculate similarity between strings
   */
  _calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this._levenshteinDistance(longer, shorter);

    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance
   */
  _levenshteinDistance(s1, s2) {
    const costs = {};

    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }

    return costs[s2.length];
  }

  /**
   * Parse rule from database
   */
  _parseRule(dbRow) {
    return {
      id: dbRow.id,
      name: dbRow.name,
      description: dbRow.description,
      trigger: dbRow.trigger,
      triggerValue: dbRow.trigger_value ? JSON.parse(dbRow.trigger_value) : {},
      action: dbRow.action,
      severity: dbRow.severity,
      enabled: dbRow.enabled,
      scope: dbRow.scope,
      priority: dbRow.priority,
      createdBy: dbRow.created_by,
      createdAt: dbRow.created_at,
      lastModified: dbRow.last_modified
    };
  }

  /**
   * Update rule cache
   */
  async _updateRuleCache() {
    const result = await this.pool.query('SELECT * FROM custom_rules WHERE enabled = true ORDER BY priority DESC');
    const rules = result.rows.map(r => this._parseRule(r));
    await this.redis.setEx('rules:enabled', 3600, JSON.stringify(rules));
  }

  /**
   * Get rule templates
   */
  getRuleTemplates() {
    return {
      PROFANITY: {
        name: 'Profanity Filter',
        trigger: 'KEYWORD',
        triggerValue: {
          keywords: [],
          caseSensitive: false
        },
        action: 'WARN',
        severity: 2,
        scope: 'TEXT'
      },
      SPAM: {
        name: 'Spam Detector',
        trigger: 'FREQUENCY',
        triggerValue: {
          character: ' ',
          minOccurrences: 10
        },
        action: 'MUTE',
        severity: 1,
        scope: 'TEXT'
      },
      HARASSMENT: {
        name: 'Harassment Pattern',
        trigger: 'PATTERN',
        triggerValue: {
          pattern: '%mention%*%mention%*%mention%',
          caseSensitive: false
        },
        action: 'WARN',
        severity: 3,
        scope: 'TEXT'
      },
      URLS: {
        name: 'URL Filter',
        trigger: 'CUSTOM_REGEX',
        triggerValue: {
          regex: 'https?:\\/\\/[^\\s]+',
          flags: 'gi'
        },
        action: 'REMOVE_CONTENT',
        severity: 1,
        scope: 'TEXT'
      },
      USERNAME_LENGTH: {
        name: 'Username Length Check',
        trigger: 'LENGTH',
        triggerValue: {
          minLength: 3,
          maxLength: 32
        },
        action: 'REJECT',
        severity: 1,
        scope: 'USERNAME'
      }
    };
  }

  /**
   * Batch rule operations
   */
  async applyRulesToContent(ruleIds, content, scope) {
    const violations = [];

    for (const ruleId of ruleIds) {
      const rule = await this.getRule(ruleId);
      if (rule && rule.enabled && (rule.scope === scope || rule.scope === 'ALL')) {
        const result = this._evaluateRule(rule, content);
        if (result.triggered) {
          violations.push({
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action,
            severity: rule.severity,
            confidence: result.confidence,
            matches: result.matches
          });
        }
      }
    }

    return violations;
  }

  /**
   * Get rules by scope
   */
  async getRulesByScope(scope) {
    const result = await this.pool.query(
      `SELECT * FROM custom_rules WHERE (scope = $1 OR scope = 'ALL') AND enabled = true ORDER BY priority DESC`,
      [scope]
    );

    return result.rows.map(r => this._parseRule(r));
  }
}

module.exports = CustomRuleBuilderService;
