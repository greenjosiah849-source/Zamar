/**
 * Zamar Moderation System - Testing & Utility Functions
 * 
 * Useful for testing, debugging, and benchmarking the moderation system
 */

const ZamarAI = require('./zamar-ai');
const fs = require('fs');
const path = require('path');

class ModerationTester {
  constructor() {
    this.ai = new ZamarAI();
    this.testResults = [];
  }

  /**
   * Test Text Analysis
   */
  async testTextAnalysis() {
    console.log('\n🧪 Testing Text Analysis...');
    console.log('='.repeat(50));

    const testCases = [
      {
        text: 'This is a clean message',
        expectedCategory: 'clean',
        name: 'Clean Message'
      },
      {
        text: 'admin_account official_owner',
        expectedCategory: 'clean',
        name: 'Admin Keywords in Context'
      },
      {
        text: 'I hate all xxx people',
        expectedCategory: 'hate_speech',
        name: 'Hate Speech'
      },
      {
        text: 'BUY NOW!!! LIMITED TIME OFFER!!!',
        expectedCategory: 'spam',
        name: 'Spam Message'
      },
      {
        text: 'stupid idiot moron',
        expectedCategory: 'harassment',
        name: 'Harassment'
      },
      {
        text: 'xxx nude porn adult',
        expectedCategory: 'explicit',
        name: 'Explicit Content'
      },
      {
        text: 'You should buy cocaine and heroin',
        expectedCategory: 'drugs',
        name: 'Drug References'
      }
    ];

    for (const testCase of testCases) {
      const result = await this.ai.analyzeText(testCase.text);
      const passed = result.category === testCase.expectedCategory;

      console.log(`\n${testCase.name}:`);
      console.log(`  Text: "${testCase.text}"`);
      console.log(`  Expected: ${testCase.expectedCategory}`);
      console.log(`  Got: ${result.category}`);
      console.log(`  Confidence: ${result.confidence}`);
      console.log(`  Flagged: ${result.isFlagged}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}`);

      this.testResults.push({
        test: testCase.name,
        type: 'text',
        passed,
        expected: testCase.expectedCategory,
        actual: result.category
      });
    }
  }

  /**
   * Test Username Analysis
   */
  async testUsernameAnalysis() {
    console.log('\n\n🧪 Testing Username Analysis...');
    console.log('='.repeat(50));

    const testCases = [
      {
        username: 'john_doe_123',
        shouldFlag: false,
        name: 'Normal Username'
      },
      {
        username: 'admin',
        shouldFlag: true,
        name: 'Admin Impersonation'
      },
      {
        username: 'ModeratorUser',
        shouldFlag: true,
        name: 'Moderator Impersonation'
      },
      {
        username: 'ab',
        shouldFlag: true,
        name: 'Too Short'
      },
      {
        username: 'xxx_badword_xxx',
        shouldFlag: true,
        name: 'Profanity'
      },
      {
        username: 'normal_user',
        shouldFlag: false,
        name: 'Clean Username'
      }
    ];

    for (const testCase of testCases) {
      const result = await this.ai.analyzeUsername(testCase.username);
      const passed = result.isFlagged === testCase.shouldFlag;

      console.log(`\n${testCase.name}:`);
      console.log(`  Username: "${testCase.username}"`);
      console.log(`  Should Flag: ${testCase.shouldFlag}`);
      console.log(`  Flagged: ${result.isFlagged}`);
      console.log(`  Issues: ${result.issues.join(', ') || 'None'}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}`);

      this.testResults.push({
        test: testCase.name,
        type: 'username',
        passed,
        expected: testCase.shouldFlag,
        actual: result.isFlagged
      });
    }
  }

  /**
   * Test Game Metadata Analysis
   */
  async testGameMetadata() {
    console.log('\n\n🧪 Testing Game Metadata Analysis...');
    console.log('='.repeat(50));

    const testCases = [
      {
        name: 'My Awesome Game',
        description: 'A fun adventure game for everyone',
        tags: ['adventure', 'fun', 'family'],
        shouldFlag: false,
        testName: 'Clean Game Metadata'
      },
      {
        name: 'xxx Adult Content',
        description: 'Explicit game content',
        tags: ['explicit'],
        shouldFlag: true,
        testName: 'Explicit Game'
      },
      {
        name: 'Zombie Gore Simulator',
        description: 'Kill and dismember zombie bodies with realistic blood',
        tags: ['violence', 'gore', 'horror'],
        shouldFlag: true,
        testName: 'Violent Game Description'
      }
    ];

    for (const testCase of testCases) {
      const result = await this.ai.analyzeGameMetadata({
        name: testCase.name,
        description: testCase.description,
        tags: testCase.tags
      });

      const passed = result.isFlagged === testCase.shouldFlag;

      console.log(`\n${testCase.testName}:`);
      console.log(`  Name: "${testCase.name}"`);
      console.log(`  Description: "${testCase.description.substring(0, 40)}..."`);
      console.log(`  Should Flag: ${testCase.shouldFlag}`);
      console.log(`  Flagged: ${result.isFlagged}`);
      console.log(`  Confidence: ${result.overall_confidence}`);
      console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}`);

      this.testResults.push({
        test: testCase.testName,
        type: 'game_metadata',
        passed,
        expected: testCase.shouldFlag,
        actual: result.isFlagged
      });
    }
  }

  /**
   * Benchmark Performance
   */
  async benchmarkPerformance() {
    console.log('\n\n⏱️  Performance Benchmark...');
    console.log('='.repeat(50));

    const sampleTexts = Array(100)
      .fill(null)
      .map((_, i) => `This is test message number ${i} for benchmark testing`);

    console.log(`\nTesting ${sampleTexts.length} text analyses...`);

    const start = Date.now();

    for (const text of sampleTexts) {
      await this.ai.analyzeText(text);
    }

    const duration = Date.now() - start;
    const avgTime = duration / sampleTexts.length;

    console.log(`\nResults:`);
    console.log(`  Total Time: ${duration}ms`);
    console.log(`  Average per Analysis: ${avgTime.toFixed(2)}ms`);
    console.log(`  Analyses per Second: ${(1000 / avgTime).toFixed(0)}`);

    return {
      totalTime: duration,
      avgTime: avgTime,
      opsPerSecond: 1000 / avgTime
    };
  }

  /**
   * Test Batch Analysis
   */
  async testBatchAnalysis() {
    console.log('\n\n🧪 Testing Batch Analysis...');
    console.log('='.repeat(50));

    const items = [
      { type: 'text', content: 'This is clean' },
      { type: 'text', content: 'I hate you stupid idiot' },
      { type: 'username', content: 'admin_fake' },
      { type: 'game_metadata', content: { name: 'My Game', description: 'Fun game', tags: [] } }
    ];

    console.log(`\nBatch analyzing ${items.length} items...`);

    const start = Date.now();
    const results = await this.ai.batchAnalyze(items);
    const duration = Date.now() - start;

    console.log(`\nBatch Processing Time: ${duration}ms`);
    console.log(`Items Processed: ${results.length}`);
    console.log(`Flagged Items: ${results.filter(r => r.isFlagged).length}`);

    results.forEach((result, i) => {
      console.log(`\n  Item ${i + 1}:`);
      console.log(`    Category: ${result.category}`);
      console.log(`    Flagged: ${result.isFlagged}`);
      console.log(`    Confidence: ${result.confidence}`);
    });
  }

  /**
   * Test Caching
   */
  async testCaching() {
    console.log('\n\n💾 Testing Caching System...');
    console.log('='.repeat(50));

    const testText = 'This is a test message for caching';
    const hash1 = await this.ai.hashContent(testText);
    const hash2 = await this.ai.hashContent(testText);

    console.log(`\nHash Consistency:`);
    console.log(`  Hash 1: ${hash1}`);
    console.log(`  Hash 2: ${hash2}`);
    console.log(`  Match: ${hash1 === hash2 ? '✅ YES' : '❌ NO'}`);

    // Test different content produces different hash
    const testText2 = 'Different message';
    const hash3 = await this.ai.hashContent(testText2);
    console.log(`\nHash Differentiation:`);
    console.log(`  Hash 1: ${hash1}`);
    console.log(`  Hash 3: ${hash3}`);
    console.log(`  Different: ${hash1 !== hash3 ? '✅ YES' : '❌ NO'}`);
  }

  /**
   * Generate Report
   */
  generateReport() {
    console.log('\n\n📊 Test Report');
    console.log('='.repeat(50));

    const passed = this.testResults.filter(r => r.passed).length;
    const failed = this.testResults.filter(r => !r.passed).length;
    const total = this.testResults.length;
    const passRate = ((passed / total) * 100).toFixed(2);

    console.log(`\nSummary:`);
    console.log(`  Total Tests: ${total}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log(`  Pass Rate: ${passRate}%`);

    if (failed > 0) {
      console.log(`\nFailed Tests:`);
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`  - ${r.test} (Expected: ${r.expected}, Got: ${r.actual})`);
        });
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * Run All Tests
   */
  async runAllTests() {
    console.log('\n');
    console.log('╔' + '═'.repeat(48) + '╗');
    console.log('║' + ' '.repeat(8) + 'ZAMAR MODERATION SYSTEM TEST SUITE' + ' '.repeat(6) + '║');
    console.log('╚' + '═'.repeat(48) + '╝');

    try {
      await this.testTextAnalysis();
      await this.testUsernameAnalysis();
      await this.testGameMetadata();
      await this.testCaching();
      await this.testBatchAnalysis();
      await this.benchmarkPerformance();

      this.generateReport();

      console.log('\n✅ All tests completed!\n');
    } catch (error) {
      console.error('\n❌ Test error:', error.message);
    }
  }
}

// ============================================
// CLI EXECUTION
// ============================================

if (require.main === module) {
  const tester = new ModerationTester();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0] || 'all';

  switch (command) {
    case 'text':
      tester.testTextAnalysis().then(() => tester.generateReport());
      break;
    case 'username':
      tester.testUsernameAnalysis().then(() => tester.generateReport());
      break;
    case 'game':
      tester.testGameMetadata().then(() => tester.generateReport());
      break;
    case 'batch':
      tester.testBatchAnalysis();
      break;
    case 'bench':
      tester.benchmarkPerformance();
      break;
    case 'cache':
      tester.testCaching();
      break;
    case 'all':
    default:
      tester.runAllTests();
      break;
  }
}

module.exports = ModerationTester;
