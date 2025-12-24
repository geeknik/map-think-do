/**
 * @fileoverview Unit tests for BiasDetector
 *
 * Tests the cognitive bias detection system including:
 * - Pattern-based bias detection
 * - Confidence calibration
 * - Feedback learning
 * - Outcome-based learning
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BiasDetector, BiasDetectionResult } from '../src/cognitive/bias-detector.js';
import { SQLiteStore } from '../src/memory/sqlite-store.js';

// Test database path
const TEST_DB_PATH = path.join(os.tmpdir(), `bias-detector-test-${Date.now()}.db`);

let store: SQLiteStore;
let detector: BiasDetector;

// ============================================================================
// Bias Detection Tests
// ============================================================================

async function testConfirmationBiasDetection(): Promise<void> {
  const result = await detector.detectBiases(
    'This confirms exactly what I expected. As I thought, the data proves my hypothesis.',
    { confidence: 0.8, thought_number: 1, total_thoughts: 5 }
  );

  const confirmationBias = result.find(b => b.bias_id === 'confirmation_bias');
  assert.ok(confirmationBias, 'Should detect confirmation bias');
  assert.ok(confirmationBias.confidence > 0.3, 'Should have reasonable confidence');
  assert.ok(confirmationBias.evidence.length > 0, 'Should provide evidence');
  assert.ok(confirmationBias.suggested_corrections.length > 0, 'Should suggest corrections');

  console.log('  ✓ Confirmation bias detection');
}

async function testOverconfidenceBiasDetection(): Promise<void> {
  const result = await detector.detectBiases(
    'This will definitely work. I am absolutely certain this is the right approach. It must be correct.',
    { confidence: 0.95, thought_number: 1, total_thoughts: 5 }
  );

  const overconfidenceBias = result.find(b => b.bias_id === 'overconfidence_bias');
  assert.ok(overconfidenceBias, 'Should detect overconfidence bias');
  assert.strictEqual(overconfidenceBias.severity, 'high', 'Overconfidence should be high severity');

  console.log('  ✓ Overconfidence bias detection');
}

async function testAnchoringBiasDetection(): Promise<void> {
  const result = await detector.detectBiases(
    'Based on the initial estimate, we should adjust slightly. As mentioned earlier, the first approach was close.',
    { confidence: 0.7, thought_number: 3, total_thoughts: 5 }
  );

  const anchoringBias = result.find(b => b.bias_id === 'anchoring_bias');
  assert.ok(anchoringBias, 'Should detect anchoring bias');
  assert.strictEqual(anchoringBias.severity, 'medium', 'Anchoring should be medium severity');

  console.log('  ✓ Anchoring bias detection');
}

async function testSunkCostFallacyDetection(): Promise<void> {
  const result = await detector.detectBiases(
    "We've already invested too much. It would waste all the effort to change now. We've come this far.",
    { confidence: 0.6, thought_number: 4, total_thoughts: 5 }
  );

  const sunkCostBias = result.find(b => b.bias_id === 'sunk_cost_fallacy');
  assert.ok(sunkCostBias, 'Should detect sunk cost fallacy');
  assert.ok(sunkCostBias.evidence.length > 0, 'Should cite relevant evidence');

  console.log('  ✓ Sunk cost fallacy detection');
}

async function testHindsightBiasDetection(): Promise<void> {
  const result = await detector.detectBiases(
    'I knew this would happen all along. Looking back, it was obvious and predictable.',
    { confidence: 0.8, thought_number: 5, total_thoughts: 5 }
  );

  const hindsightBias = result.find(b => b.bias_id === 'hindsight_bias');
  assert.ok(hindsightBias, 'Should detect hindsight bias');

  console.log('  ✓ Hindsight bias detection');
}

async function testNoBiasDetectionOnNeutralText(): Promise<void> {
  const result = await detector.detectBiases(
    'Let me analyze the data objectively. There are several factors to consider, including potential counterarguments.',
    { confidence: 0.5, thought_number: 2, total_thoughts: 5 }
  );

  // Should detect fewer or no biases on neutral text
  const highConfidenceBiases = result.filter(b => b.confidence > 0.6);
  assert.ok(
    highConfidenceBiases.length === 0,
    'Should not detect high-confidence biases on neutral text'
  );

  console.log('  ✓ No false positives on neutral text');
}

// ============================================================================
// Feedback Learning Tests
// ============================================================================

async function testFeedbackImprovesPrecision(): Promise<void> {
  const initialStats = detector.getStatistics();
  const initialPrecision = initialStats.confirmation_bias?.precision || 0.5;

  // Provide positive feedback
  detector.provideFeedback('confirmation_bias', true, 'test_pattern_1');
  detector.provideFeedback('confirmation_bias', true, 'test_pattern_2');
  detector.provideFeedback('confirmation_bias', true, 'test_pattern_3');

  const updatedStats = detector.getStatistics();
  const updatedPrecision = updatedStats.confirmation_bias?.precision || 0.5;

  assert.ok(
    updatedPrecision >= initialPrecision,
    'Precision should improve with positive feedback'
  );

  console.log('  ✓ Feedback improves precision');
}

async function testFeedbackLowersPrecisionOnFalsePositives(): Promise<void> {
  // Provide negative feedback (false positives)
  detector.provideFeedback('overconfidence_bias', false);
  detector.provideFeedback('overconfidence_bias', false);
  detector.provideFeedback('overconfidence_bias', false);

  const stats = detector.getStatistics();
  assert.ok(
    stats.overconfidence_bias.precision < 0.5,
    'Precision should decrease with false positive feedback'
  );

  console.log('  ✓ False positive feedback lowers precision');
}

// ============================================================================
// Outcome-Based Learning Tests
// ============================================================================

async function testOutcomeRecording(): Promise<void> {
  const detections: BiasDetectionResult[] = [
    {
      bias_id: 'confirmation_bias',
      bias_name: 'Confirmation Bias',
      confidence: 0.7,
      evidence: ['Pattern match'],
      suggested_corrections: ['Seek contrary evidence'],
      severity: 'high',
    },
  ];

  // Record outcome
  detector.recordOutcome('test_thought_1', detections, {
    success: true,
    quality_score: 0.8,
    debiasing_applied: true,
    strategy_used: 'seek_contrary_evidence',
  });

  // Should not throw and should track the outcome
  const analytics = detector.getBiasAnalytics();
  assert.ok(analytics, 'Should have analytics after recording outcome');

  console.log('  ✓ Outcome recording works');
}

async function testDebisingEffectiveness(): Promise<void> {
  const detections: BiasDetectionResult[] = [
    {
      bias_id: 'anchoring_bias',
      bias_name: 'Anchoring Bias',
      confidence: 0.6,
      evidence: ['Initial reference'],
      suggested_corrections: ['Consider multiple anchors'],
      severity: 'medium',
    },
  ];

  // Record outcomes with and without debiasing
  for (let i = 0; i < 5; i++) {
    detector.recordOutcome(`debiased_thought_${i}`, detections, {
      success: true,
      quality_score: 0.85,
      debiasing_applied: true,
    });
  }

  for (let i = 0; i < 5; i++) {
    detector.recordOutcome(`not_debiased_thought_${i}`, detections, {
      success: i < 2, // 40% success without debiasing
      quality_score: i < 2 ? 0.6 : 0.3,
      debiasing_applied: false,
    });
  }

  const effectiveness = detector.getDebisingEffectiveness('anchoring_bias');
  assert.ok(effectiveness, 'Should calculate debiasing effectiveness');
  assert.ok(effectiveness.sample_size >= 10, 'Should have adequate sample size');

  console.log('  ✓ Debiasing effectiveness calculated');
}

// ============================================================================
// Statistics and Analytics Tests
// ============================================================================

async function testGetStatistics(): Promise<void> {
  const stats = detector.getStatistics();

  assert.ok(stats, 'Should return statistics');
  assert.ok(stats.confirmation_bias, 'Should have confirmation bias stats');
  assert.ok(
    typeof stats.confirmation_bias.detection_count === 'number',
    'Should track detection count'
  );
  assert.ok(typeof stats.confirmation_bias.precision === 'number', 'Should track precision');

  console.log('  ✓ Statistics available');
}

async function testGetMostCommonBiases(): Promise<void> {
  // Detect some biases to populate counts
  await detector.detectBiases('This confirms what I thought', {});
  await detector.detectBiases('This confirms my belief', {});
  await detector.detectBiases('Definitely, absolutely certain', {});

  const commonBiases = detector.getMostCommonBiases(3);

  assert.ok(Array.isArray(commonBiases), 'Should return array');
  assert.ok(commonBiases.length <= 3, 'Should respect limit');

  if (commonBiases.length > 0) {
    assert.ok(
      commonBiases[0].count >= commonBiases[commonBiases.length - 1].count,
      'Should be sorted by count'
    );
  }

  console.log('  ✓ Most common biases tracked');
}

async function testGetDebisingRecommendations(): Promise<void> {
  // Detect some biases first
  await detector.detectBiases('This confirms exactly what I expected', {});
  await detector.detectBiases('I am absolutely certain this is correct', {});

  const recommendations = detector.getDebisingRecommendations();

  assert.ok(Array.isArray(recommendations), 'Should return array');
  // Recommendations are based on recent detections

  console.log('  ✓ Debiasing recommendations available');
}

async function testBiasAnalytics(): Promise<void> {
  const analytics = detector.getBiasAnalytics();

  assert.ok(typeof analytics.overall_detection_rate === 'number', 'Should have detection rate');
  assert.ok(typeof analytics.overall_precision === 'number', 'Should have overall precision');
  assert.ok(Array.isArray(analytics.bias_breakdown), 'Should have bias breakdown');
  assert.ok(Array.isArray(analytics.recommendations), 'Should have recommendations');

  console.log('  ✓ Comprehensive analytics available');
}

// ============================================================================
// State Export/Import Tests
// ============================================================================

async function testExportImportLearningState(): Promise<void> {
  // Record some learning
  detector.provideFeedback('confirmation_bias', true, 'export_test');
  detector.provideFeedback('confirmation_bias', true, 'export_test_2');

  // Export state
  const exportedState = detector.exportLearningState();

  assert.ok(exportedState.learningRecords, 'Should export learning records');
  assert.ok(exportedState.outcomeCorrelations, 'Should export outcome correlations');
  assert.ok(exportedState.patternWeights, 'Should export pattern weights');

  // Create new detector and import
  const newDetector = new BiasDetector(store);
  newDetector.importLearningState(exportedState);

  // Verify import worked
  const newStats = newDetector.getStatistics();
  assert.ok(newStats.confirmation_bias, 'Imported detector should have stats');

  console.log('  ✓ Export/import learning state');
}

// ============================================================================
// Edge Cases
// ============================================================================

async function testEmptyThoughtHandling(): Promise<void> {
  const result = await detector.detectBiases('', {});
  assert.ok(Array.isArray(result), 'Should return array for empty thought');

  console.log('  ✓ Empty thought handling');
}

async function testVeryLongThoughtHandling(): Promise<void> {
  const longThought = 'This is a test. '.repeat(1000);
  const result = await detector.detectBiases(longThought, {});
  assert.ok(Array.isArray(result), 'Should handle very long thoughts');

  console.log('  ✓ Long thought handling');
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTests(): Promise<void> {
  console.log('\n🔍 BiasDetector Unit Tests\n');

  // Initialize
  store = new SQLiteStore(TEST_DB_PATH);
  detector = new BiasDetector(store);

  try {
    console.log('Bias Detection:');
    await testConfirmationBiasDetection();
    await testOverconfidenceBiasDetection();
    await testAnchoringBiasDetection();
    await testSunkCostFallacyDetection();
    await testHindsightBiasDetection();
    await testNoBiasDetectionOnNeutralText();

    console.log('\nFeedback Learning:');
    await testFeedbackImprovesPrecision();
    await testFeedbackLowersPrecisionOnFalsePositives();

    console.log('\nOutcome-Based Learning:');
    await testOutcomeRecording();
    await testDebisingEffectiveness();

    console.log('\nStatistics and Analytics:');
    await testGetStatistics();
    await testGetMostCommonBiases();
    await testGetDebisingRecommendations();
    await testBiasAnalytics();

    console.log('\nState Persistence:');
    await testExportImportLearningState();

    console.log('\nEdge Cases:');
    await testEmptyThoughtHandling();
    await testVeryLongThoughtHandling();

    console.log('\n✅ All BiasDetector tests passed!\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    // Cleanup
    await store.close();
    try {
      fs.unlinkSync(TEST_DB_PATH);
      fs.unlinkSync(TEST_DB_PATH + '-wal');
      fs.unlinkSync(TEST_DB_PATH + '-shm');
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Run if called directly
runTests().catch(err => {
  console.error(err);
  process.exit(1);
});

export { runTests };
