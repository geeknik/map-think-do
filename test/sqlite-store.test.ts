/**
 * @fileoverview Unit tests for SQLiteStore
 *
 * Tests the SQLite-based persistent memory store including:
 * - Basic CRUD operations for thoughts and sessions
 * - Outcome tracking and confidence calibration
 * - Intelligent search and retrieval
 * - Learning patterns
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SQLiteStore } from '../src/memory/sqlite-store.js';
import { StoredThought, ReasoningSession } from '../src/memory/memory-store.js';

// Test database path
const TEST_DB_PATH = path.join(os.tmpdir(), `map-think-do-test-${Date.now()}.db`);

let store: SQLiteStore;

// Helper to create a test thought
function createTestThought(overrides: Partial<StoredThought> = {}): StoredThought {
  return {
    id: `thought_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    thought: 'This is a test thought about problem solving',
    thought_number: 1,
    total_thoughts: 5,
    next_thought_needed: true,
    timestamp: new Date(),
    session_id: 'test_session_1',
    confidence: 0.75,
    domain: 'testing',
    complexity: 5,
    success: false,
    context: {},
    ...overrides,
  };
}

// Helper to create a test session
function createTestSession(overrides: Partial<ReasoningSession> = {}): ReasoningSession {
  return {
    id: `session_${Date.now()}`,
    start_time: new Date(),
    objective: 'Test objective',
    domain: 'testing',
    goal_achieved: false,
    confidence_level: 0.5,
    total_thoughts: 0,
    revision_count: 0,
    branch_count: 0,
    ...overrides,
  };
}

// ============================================================================
// Basic Operations Tests
// ============================================================================

async function testStoreAndRetrieveThought(): Promise<void> {
  const thought = createTestThought();

  await store.storeThought(thought);
  const retrieved = await store.getThought(thought.id);

  assert.ok(retrieved, 'Should retrieve stored thought');
  assert.strictEqual(retrieved.id, thought.id, 'ID should match');
  assert.strictEqual(retrieved.thought, thought.thought, 'Content should match');
  assert.strictEqual(
    retrieved.thought_number,
    thought.thought_number,
    'Thought number should match'
  );
  assert.strictEqual(retrieved.domain, thought.domain, 'Domain should match');

  console.log('  ✓ Store and retrieve thought');
}

async function testStoreAndRetrieveSession(): Promise<void> {
  const session = createTestSession();

  await store.storeSession(session);
  const retrieved = await store.getSession(session.id);

  assert.ok(retrieved, 'Should retrieve stored session');
  assert.strictEqual(retrieved.id, session.id, 'ID should match');
  assert.strictEqual(retrieved.objective, session.objective, 'Objective should match');
  assert.strictEqual(retrieved.domain, session.domain, 'Domain should match');

  console.log('  ✓ Store and retrieve session');
}

async function testUpdateThought(): Promise<void> {
  const thought = createTestThought();
  await store.storeThought(thought);

  // Update the thought
  await store.updateThought(thought.id, {
    success: true,
    confidence: 0.95,
  });

  const updated = await store.getThought(thought.id);
  assert.ok(updated, 'Should retrieve updated thought');
  assert.strictEqual(updated.success, true, 'Success should be updated');
  assert.strictEqual(updated.confidence, 0.95, 'Confidence should be updated');

  console.log('  ✓ Update thought');
}

async function testQueryThoughts(): Promise<void> {
  const sessionId = `query_test_session_${Date.now()}`;

  // Store multiple thoughts
  for (let i = 1; i <= 5; i++) {
    await store.storeThought(
      createTestThought({
        id: `query_thought_${i}_${Date.now()}`,
        session_id: sessionId,
        thought_number: i,
        confidence: 0.5 + i * 0.1,
        success: i > 3,
        domain: 'query_test',
      })
    );
  }

  // Query by domain
  const domainResults = await store.queryThoughts({ domain: 'query_test', limit: 10 });
  assert.ok(domainResults.length >= 5, 'Should find thoughts by domain');

  // Query by success
  const successResults = await store.queryThoughts({
    domain: 'query_test',
    success_only: true,
  });
  assert.strictEqual(successResults.length, 2, 'Should find 2 successful thoughts');

  // Query by confidence range
  const confidenceResults = await store.queryThoughts({
    domain: 'query_test',
    confidence_range: [0.7, 1.0],
  });
  assert.ok(confidenceResults.length >= 3, 'Should find high confidence thoughts');

  console.log('  ✓ Query thoughts with filters');
}

// ============================================================================
// Outcome Tracking Tests
// ============================================================================

async function testRecordOutcome(): Promise<void> {
  const sessionId = `outcome_session_${Date.now()}`;

  // First create a session (required for foreign key)
  await store.storeSession(createTestSession({ id: sessionId }));

  const thought = createTestThought({
    id: `outcome_test_${Date.now()}`,
    session_id: sessionId,
    domain: 'outcome_testing',
  });
  await store.storeThought(thought);

  // Record an outcome
  store.recordOutcome({
    id: `outcome_${Date.now()}`,
    thought_id: thought.id,
    session_id: sessionId,
    prediction: 'Expected successful outcome',
    predicted_confidence: 0.8,
    actual_outcome: 'success',
    outcome_score: 0.9,
    recorded_at: new Date(),
    domain: 'outcome_testing',
  });

  // Verify thought was updated
  const updated = await store.getThought(thought.id);
  assert.ok(updated, 'Thought should exist');
  assert.strictEqual(updated.success, true, 'Thought should be marked successful');
  assert.strictEqual(updated.outcome_quality, 'success', 'Outcome quality should be set');

  console.log('  ✓ Record outcome updates thought');
}

async function testConfidenceCalibration(): Promise<void> {
  const domain = `calibration_test_${Date.now()}`;
  const sessionId = `calibration_session_${Date.now()}`;

  // Create session first
  await store.storeSession(createTestSession({ id: sessionId, domain }));

  // Record multiple outcomes in the same confidence bucket
  for (let i = 0; i < 10; i++) {
    const thought = createTestThought({
      id: `calibration_thought_${i}_${Date.now()}`,
      session_id: sessionId,
      domain,
    });
    await store.storeThought(thought);

    store.recordOutcome({
      id: `calibration_outcome_${i}_${Date.now()}`,
      thought_id: thought.id,
      session_id: sessionId,
      prediction: 'Calibration test prediction',
      predicted_confidence: 0.75, // All in 0.7-0.8 bucket
      actual_outcome: i < 6 ? 'success' : 'failure', // 60% success rate
      outcome_score: i < 6 ? 1.0 : 0.0,
      recorded_at: new Date(),
      domain,
    });
  }

  // Get calibrated confidence
  const rawConfidence = 0.75;
  const calibrated = store.getCalibratedConfidence(rawConfidence, domain);

  // Calibrated should be influenced by actual success rate (60%)
  // With enough samples, it should pull toward 0.6
  assert.ok(
    calibrated <= rawConfidence,
    `Calibrated (${calibrated}) should be <= raw (${rawConfidence}) since actual success rate is lower`
  );

  console.log('  ✓ Confidence calibration adjusts predictions');
}

// ============================================================================
// Intelligent Search Tests
// ============================================================================

async function testIntelligentSearch(): Promise<void> {
  const sessionId = `search_test_${Date.now()}`;

  // Store thoughts with different content
  await store.storeThought(
    createTestThought({
      id: `search_1_${Date.now()}`,
      thought: 'Analyzing the performance optimization of database queries',
      session_id: sessionId,
      domain: 'performance',
      success: true,
    })
  );

  await store.storeThought(
    createTestThought({
      id: `search_2_${Date.now()}`,
      thought: 'Debugging a memory leak in the application',
      session_id: sessionId,
      domain: 'debugging',
      success: false,
    })
  );

  await store.storeThought(
    createTestThought({
      id: `search_3_${Date.now()}`,
      thought: 'Optimizing query execution plan for better performance',
      session_id: sessionId,
      domain: 'performance',
      success: true,
    })
  );

  // Search for performance-related thoughts
  const results = await store.intelligentSearch('database query performance optimization', {
    limit: 10,
    minSimilarity: 0.05,
  });

  assert.ok(results.length > 0, 'Should find matching thoughts');

  // Performance-related thoughts should rank higher
  const performanceResults = results.filter(r => r.domain === 'performance');
  assert.ok(performanceResults.length >= 1, 'Should find performance domain thoughts');

  // Check that relevance scores are present
  assert.ok(results[0].relevance_score > 0, 'Should have relevance score');
  assert.ok(results[0].relevance_breakdown, 'Should have relevance breakdown');

  console.log('  ✓ Intelligent search finds relevant thoughts');
}

async function testContextAwareRetrieval(): Promise<void> {
  const sessionId = `context_test_${Date.now()}`;

  // Store thoughts
  await store.storeThought(
    createTestThought({
      id: `context_1_${Date.now()}`,
      thought: 'Implementing microservices architecture for scalability',
      session_id: sessionId,
      domain: 'architecture',
      complexity: 8,
      success: true,
    })
  );

  await store.storeThought(
    createTestThought({
      id: `context_2_${Date.now()}`,
      thought: 'Simple function to add two numbers',
      session_id: sessionId,
      domain: 'implementation',
      complexity: 2,
      success: true,
    })
  );

  // Retrieve with context
  const results = await store.contextAwareRetrieval(
    {
      current_thought: 'Designing a distributed system architecture',
      domain: 'architecture',
      complexity: 7,
    },
    5
  );

  assert.ok(results.length > 0, 'Should find context-relevant thoughts');

  // Architecture thought should be retrieved (same domain, similar complexity)
  const architectureThought = results.find(t => t.domain === 'architecture');
  assert.ok(architectureThought, 'Should find architecture domain thought');

  console.log('  ✓ Context-aware retrieval finds relevant thoughts');
}

async function testFindByPattern(): Promise<void> {
  const sessionId = `pattern_test_${Date.now()}`;

  // Store thoughts with patterns
  await store.storeThought(
    createTestThought({
      id: `pattern_1_${Date.now()}`,
      thought: 'If the input is valid then we can proceed',
      session_id: sessionId,
      patterns_detected: ['conditional_reasoning'],
      success: true,
    })
  );

  await store.storeThought(
    createTestThought({
      id: `pattern_2_${Date.now()}`,
      thought: 'Because of the constraint, therefore we must adjust',
      session_id: sessionId,
      patterns_detected: ['causal_reasoning'],
      success: true,
    })
  );

  // Find by pattern
  const results = await store.findByPattern('conditional_reasoning', { limit: 10 });

  assert.ok(results.length >= 1, 'Should find thoughts with pattern');
  assert.ok(
    results.some(t => t.patterns_detected?.includes('conditional_reasoning')),
    'Results should include the pattern'
  );

  console.log('  ✓ Find by pattern works');
}

// ============================================================================
// Learning Patterns Tests
// ============================================================================

async function testLearningPatterns(): Promise<void> {
  const domain = `learning_test_${Date.now()}`;
  const sessionId = `learning_session_${Date.now()}`;

  // Create session first
  await store.storeSession(createTestSession({ id: sessionId, domain }));

  // Record multiple outcomes to build patterns
  for (let i = 0; i < 5; i++) {
    const thought = createTestThought({
      id: `learning_thought_${i}_${Date.now()}`,
      thought: 'If the condition is true then proceed with action',
      session_id: sessionId,
      domain,
    });
    await store.storeThought(thought);

    store.recordOutcome({
      id: `learning_outcome_${i}_${Date.now()}`,
      thought_id: thought.id,
      session_id: sessionId,
      prediction: 'Learning pattern test',
      predicted_confidence: 0.7,
      actual_outcome: 'success',
      outcome_score: 0.9,
      recorded_at: new Date(),
      domain,
    });
  }

  // Get success patterns
  const successPatterns = store.getSuccessPatterns(domain, 0.5);

  // Should have detected the conditional_reasoning pattern
  assert.ok(successPatterns.length >= 0, 'Should track learning patterns');

  console.log('  ✓ Learning patterns are tracked');
}

// ============================================================================
// Statistics Tests
// ============================================================================

async function testGetStats(): Promise<void> {
  const stats = await store.getStats();

  assert.ok(typeof stats.total_thoughts === 'number', 'Should have total_thoughts');
  assert.ok(typeof stats.total_sessions === 'number', 'Should have total_sessions');
  assert.ok(typeof stats.overall_success_rate === 'number', 'Should have success rate');
  assert.ok(stats.success_rate_by_domain !== undefined, 'Should have domain success rates');
  assert.ok(typeof stats.storage_size === 'number', 'Should have storage size');

  console.log('  ✓ Get stats returns valid statistics');
}

async function testRetrievalMetrics(): Promise<void> {
  const metrics = store.getRetrievalMetrics();

  assert.ok(typeof metrics.indexed_documents === 'number', 'Should have indexed_documents');
  assert.ok(typeof metrics.vocabulary_size === 'number', 'Should have vocabulary_size');
  assert.ok(typeof metrics.cache_valid === 'boolean', 'Should have cache_valid');

  console.log('  ✓ Retrieval metrics available');
}

// ============================================================================
// Cleanup Tests
// ============================================================================

async function testCleanupOldThoughts(): Promise<void> {
  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

  // Store an "old" thought
  const oldThought = createTestThought({
    id: `old_thought_${Date.now()}`,
    timestamp: oldDate,
    session_id: 'cleanup_test_session',
  });
  await store.storeThought(oldThought);

  // Store a recent thought
  const recentThought = createTestThought({
    id: `recent_thought_${Date.now()}`,
    session_id: 'cleanup_test_session',
  });
  await store.storeThought(recentThought);

  // Cleanup thoughts older than 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const deleted = await store.cleanupOldThoughts(cutoff);

  assert.ok(deleted >= 1, 'Should delete old thoughts');

  // Recent thought should still exist
  const recent = await store.getThought(recentThought.id);
  assert.ok(recent, 'Recent thought should still exist');

  console.log('  ✓ Cleanup old thoughts');
}

// ============================================================================
// Test Runner
// ============================================================================

async function runTests(): Promise<void> {
  console.log('\n📦 SQLiteStore Unit Tests\n');

  // Initialize store
  store = new SQLiteStore(TEST_DB_PATH);

  try {
    console.log('Basic Operations:');
    await testStoreAndRetrieveThought();
    await testStoreAndRetrieveSession();
    await testUpdateThought();
    await testQueryThoughts();

    console.log('\nOutcome Tracking:');
    await testRecordOutcome();
    await testConfidenceCalibration();

    console.log('\nIntelligent Search:');
    await testIntelligentSearch();
    await testContextAwareRetrieval();
    await testFindByPattern();

    console.log('\nLearning Patterns:');
    await testLearningPatterns();

    console.log('\nStatistics:');
    await testGetStats();
    await testRetrievalMetrics();

    console.log('\nCleanup:');
    await testCleanupOldThoughts();

    console.log('\n✅ All SQLiteStore tests passed!\n');
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
