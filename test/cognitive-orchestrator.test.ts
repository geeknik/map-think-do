/**
 * @fileoverview Unit tests for CognitiveOrchestrator
 *
 * Tests the cognitive orchestration system including:
 * - Thought processing and cognitive state management
 * - Plugin coordination and interventions
 * - Insight detection and recommendations
 * - Feedback and learning integration
 * - Error handling and resilience
 */

import assert from 'node:assert';
import { createTestCognitiveOrchestrator } from '../src/cognitive/cognitive-orchestrator-factory.js';
import { OrchestratorConfig } from '../src/cognitive/cognitive-orchestrator.js';
import { ValidatedThoughtData } from '../src/server.js';
import { CognitiveContext } from '../src/cognitive/plugin-system.js';

// ============================================================================
// Test Utilities
// ============================================================================

function createMockThought(overrides: Partial<ValidatedThoughtData> = {}): ValidatedThoughtData {
  return {
    thought: 'This is a test thought for cognitive processing',
    thought_number: 1,
    total_thoughts: 5,
    next_thought_needed: true,
    is_revision: false,
    revises_thought: undefined,
    branch_from_thought: undefined,
    branch_id: undefined,
    needs_more_thoughts: false,
    ...overrides,
  };
}

function createMockSessionContext() {
  return {
    id: 'test-session-123',
    start_time: new Date(),
    domain: 'testing',
    objective: 'Test the cognitive orchestrator',
    total_thoughts: 0,
    revision_count: 0,
    branch_count: 0,
    confidence_level: 0.5,
    goal_achieved: false,
  };
}

// ============================================================================
// Orchestrator Creation Tests
// ============================================================================

async function testOrchestratorCreation(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  assert.ok(orchestrator, 'Should create orchestrator');
  assert.ok(typeof orchestrator.processThought === 'function', 'Should have processThought method');
  assert.ok(
    typeof orchestrator.getCognitiveState === 'function',
    'Should have getCognitiveState method'
  );
  assert.ok(
    typeof orchestrator.getPluginPerformance === 'function',
    'Should have getPluginPerformance method'
  );

  await orchestrator.dispose();
  console.log('  ✓ Orchestrator creation works');
}

async function testOrchestratorWithCustomConfig(): Promise<void> {
  const customConfig: Partial<OrchestratorConfig> = {
    learning_rate: 0.2,
    intervention_cooldown_ms: 500,
    adaptive_learning_enabled: true,
  };

  const orchestrator = await createTestCognitiveOrchestrator(customConfig);

  assert.ok(orchestrator, 'Should create orchestrator with custom config');

  await orchestrator.dispose();
  console.log('  ✓ Orchestrator with custom config works');
}

// ============================================================================
// Thought Processing Tests
// ============================================================================

async function testProcessThoughtReturnsResult(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();
  const thought = createMockThought();

  const result = await orchestrator.processThought(thought);

  assert.ok(result, 'Should return result');
  assert.ok(Array.isArray(result.interventions), 'Should have interventions array');
  assert.ok(Array.isArray(result.insights), 'Should have insights array');
  assert.ok(result.cognitiveState, 'Should have cognitiveState');
  assert.ok(Array.isArray(result.recommendations), 'Should have recommendations array');
  assert.ok(result.actionRanking, 'Should have structured action ranking');
  assert.ok(
    typeof result.actionRanking.primary.action === 'string',
    'Should rank a primary action'
  );

  await orchestrator.dispose();
  console.log('  ✓ Process thought returns proper result');
}

async function testProcessThoughtUpdatesCognitiveState(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();
  const thought = createMockThought();

  const initialState = orchestrator.getCognitiveState();
  const initialThoughtCount = initialState.thought_count;

  await orchestrator.processThought(thought);

  const updatedState = orchestrator.getCognitiveState();
  assert.ok(updatedState.thought_count > initialThoughtCount, 'Thought count should increment');

  await orchestrator.dispose();
  console.log('  ✓ Process thought updates cognitive state');
}

async function testProcessThoughtGeneratesSessionId(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();
  const thought = createMockThought();

  const result = await orchestrator.processThought(thought);

  assert.ok(
    result.cognitiveState.session_id,
    'Should assign a session ID without explicit context'
  );

  await orchestrator.dispose();
  console.log('  ✓ Process thought generates session id');
}

async function testProcessMultipleThoughts(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0, // Disable cooldown for testing
  });

  for (let i = 1; i <= 5; i++) {
    const thought = createMockThought({
      thought: `Test thought number ${i}`,
      thought_number: i,
    });
    await orchestrator.processThought(thought);
  }

  const state = orchestrator.getCognitiveState();
  assert.strictEqual(state.thought_count, 5, 'Should process all 5 thoughts');

  await orchestrator.dispose();
  console.log('  ✓ Process multiple thoughts works');
}

async function testProcessThoughtWithSessionContext(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();
  const thought = createMockThought();
  const sessionContext = createMockSessionContext();

  const result = await orchestrator.processThought(thought, sessionContext);

  assert.ok(result.cognitiveState, 'Should return cognitive state');
  assert.ok(result.cognitiveState.session_id, 'Should have session ID');

  await orchestrator.dispose();
  console.log('  ✓ Process thought with session context works');
}

async function testProcessThoughtBuildsHypothesisLedger(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
    emergence_detection_enabled: true,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'The root cause is likely stale cache invalidation because the deployment issue appears after config changes.',
    })
  );

  assert.ok(
    Array.isArray(result.cognitiveState.hypothesis_ledger),
    'Should expose hypothesis ledger'
  );
  assert.ok(
    result.cognitiveState.hypothesis_ledger.length > 0,
    'Should create a working hypothesis'
  );
  assert.match(
    result.cognitiveState.hypothesis_ledger[0].statement,
    /root cause|stale cache invalidation|deployment issue/i,
    'Should capture a concrete working hypothesis'
  );
  assert.ok(
    result.cognitiveState.hypothesis_ledger[0].next_validation_step.length > 0,
    'Should include a next validation step'
  );

  await orchestrator.dispose();
  console.log('  ✓ Process thought builds hypothesis ledger');
}

async function testRevisionThoughtUpdatesHypothesisLedger(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
    emergence_detection_enabled: true,
  });

  await orchestrator.processThought(
    createMockThought({
      thought: 'The root cause appears to be stale cache invalidation after deploy.',
      thought_number: 1,
    })
  );

  const revisionResult = await orchestrator.processThought(
    createMockThought({
      thought:
        'Revision: the earlier root cause hypothesis was wrong because the issue still occurs after clearing cache.',
      thought_number: 2,
      is_revision: true,
      revises_thought: 1,
    })
  );

  const matchingHypothesis = revisionResult.cognitiveState.hypothesis_ledger.find(entry =>
    /root cause|cache/i.test(entry.statement)
  );

  assert.ok(matchingHypothesis, 'Should keep the revised hypothesis in the ledger');
  assert.ok(
    matchingHypothesis?.status === 'revised' || matchingHypothesis?.status === 'weakening',
    'Revision should weaken or revise the hypothesis'
  );
  assert.ok(
    (matchingHypothesis?.contradicting_evidence.length || 0) > 0,
    'Revision should record contradicting evidence'
  );

  await orchestrator.dispose();
  console.log('  ✓ Revision thought updates hypothesis ledger');
}

async function testRecommendationsPrioritizeTopHypothesis(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
    emergence_detection_enabled: true,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'This likely indicates that a background migration is blocking startup because the timeout appears after schema changes.',
    })
  );

  assert.ok(
    result.recommendations.some(recommendation => recommendation.includes('Top hypothesis:')),
    'Recommendations should reference the top unresolved hypothesis'
  );

  await orchestrator.dispose();
  console.log('  ✓ Recommendations prioritize top hypothesis');
}

async function testActionRankingPrioritizesTopHypothesisValidation(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
    emergence_detection_enabled: true,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'This likely indicates that a background migration is blocking startup because the timeout appears after schema changes.',
    })
  );

  assert.match(
    result.actionRanking.primary.action,
    /check whether the evidence supports this hypothesis|background migration|startup|schema/i,
    'Primary ranked action should focus on validating the top hypothesis'
  );
  assert.ok(
    result.actionRanking.primary.signals.some(signal => signal.startsWith('hypothesis:')),
    'Primary action should carry hypothesis-derived signals'
  );

  await orchestrator.dispose();
  console.log('  ✓ Action ranking prioritizes top hypothesis validation');
}

async function testProcessRevisionThought(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  // Process initial thought
  const initialThought = createMockThought({ thought: 'Initial approach to the problem' });
  await orchestrator.processThought(initialThought);

  // Process revision
  const revisionThought = createMockThought({
    thought: 'Revised approach after reconsidering the problem',
    thought_number: 2,
    is_revision: true,
    revises_thought: 1,
  });
  const result = await orchestrator.processThought(revisionThought);

  assert.ok(result, 'Should process revision thought');

  await orchestrator.dispose();
  console.log('  ✓ Process revision thought works');
}

async function testProcessBranchingThought(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  // Process main thought
  const mainThought = createMockThought({ thought: 'Main line of reasoning' });
  await orchestrator.processThought(mainThought);

  // Process branch
  const branchThought = createMockThought({
    thought: 'Alternative approach to explore',
    thought_number: 2,
    branch_from_thought: 1,
    branch_id: 'alt-approach-1',
  });
  const result = await orchestrator.processThought(branchThought);

  assert.ok(result, 'Should process branching thought');

  await orchestrator.dispose();
  console.log('  ✓ Process branching thought works');
}

// ============================================================================
// Cognitive State Tests
// ============================================================================

async function testGetCognitiveState(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const state = orchestrator.getCognitiveState();

  assert.ok(typeof state.session_id === 'string', 'Should have session_id');
  assert.ok(typeof state.thought_count === 'number', 'Should have thought_count');
  assert.ok(typeof state.current_complexity === 'number', 'Should have current_complexity');
  assert.ok(typeof state.reasoning_mode === 'string', 'Should have reasoning_mode');
  assert.ok(Array.isArray(state.recent_mode_shifts), 'Should have recent_mode_shifts');
  assert.ok(
    typeof state.metacognitive_awareness === 'number',
    'Should have metacognitive_awareness'
  );
  assert.ok(typeof state.curiosity_level === 'number', 'Should have curiosity_level');
  assert.ok(typeof state.frustration_level === 'number', 'Should have frustration_level');
  assert.ok(typeof state.engagement_level === 'number', 'Should have engagement_level');
  assert.ok(typeof state.cognitive_flexibility === 'number', 'Should have cognitive_flexibility');
  assert.ok(typeof state.insight_potential === 'number', 'Should have insight_potential');
  assert.ok(
    typeof state.breakthrough_likelihood === 'number',
    'Should have breakthrough_likelihood'
  );
  assert.ok(Array.isArray(state.confidence_trajectory), 'Should have confidence_trajectory');

  await orchestrator.dispose();
  console.log('  ✓ Get cognitive state returns valid structure');
}

async function testCognitiveStateImmutability(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const state1 = orchestrator.getCognitiveState();
  const state2 = orchestrator.getCognitiveState();

  // Should return copies, not the same object
  assert.notStrictEqual(state1, state2, 'Should return different objects');
  assert.strictEqual(state1.session_id, state2.session_id, 'Session ID should match');

  // Modify state1, should not affect state2
  (state1 as any).thought_count = 999;
  assert.notStrictEqual(
    state1.thought_count,
    state2.thought_count,
    'Modification should not affect other copies'
  );

  await orchestrator.dispose();
  console.log('  ✓ Cognitive state is immutable');
}

// ============================================================================
// Intervention Cooldown Tests
// ============================================================================

async function testInterventionCooldown(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 100, // 100ms cooldown
    max_concurrent_interventions: 4,
  });

  const thought1 = createMockThought({
    thought:
      'This is urgent and complex, so we should challenge our assumptions before choosing an architecture',
  });
  const result1 = await orchestrator.processThought(thought1);
  assert.ok(result1.interventions.length > 0, 'First thought should trigger an intervention');

  // Immediately process second thought - should be in cooldown
  const thought2 = createMockThought({
    thought: 'Second thought immediately after',
    thought_number: 2,
  });
  const result2 = await orchestrator.processThought(thought2);

  // During cooldown, we should get a recommendation about it
  const hasCooldownMessage = result2.recommendations.some(
    r => r.toLowerCase().includes('cooldown') || r.toLowerCase().includes('natural processing')
  );
  assert.ok(hasCooldownMessage, 'Should indicate cooldown is active');

  await orchestrator.dispose();
  console.log('  ✓ Intervention cooldown works');
}

// ============================================================================
// Plugin Performance Tests
// ============================================================================

async function testGetPluginPerformance(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const performance = orchestrator.getPluginPerformance();

  assert.ok(typeof performance === 'object', 'Should return object');
  // Plugin performance should have entries for registered plugins
  // Even if empty, it should be a valid object

  await orchestrator.dispose();
  console.log('  ✓ Get plugin performance returns valid structure');
}

// ============================================================================
// Insight History Tests
// ============================================================================

async function testGetInsightHistory(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    emergence_detection_enabled: true,
    insight_cultivation_enabled: true,
  });

  const history = orchestrator.getInsightHistory();

  assert.ok(Array.isArray(history), 'Should return array');

  await orchestrator.dispose();
  console.log('  ✓ Get insight history works');
}

// ============================================================================
// Event Emission Tests
// ============================================================================

async function testThoughtProcessedEvent(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  let eventData: any = null;
  orchestrator.on('thought_processed', data => {
    eventData = data;
  });

  const thought = createMockThought();
  await orchestrator.processThought(thought);

  assert.ok(eventData, 'Event should be emitted');
  assert.ok(eventData.thought, 'Event should have thought');
  assert.ok(eventData.interventions !== undefined, 'Event should have interventions');
  assert.ok(eventData.insights !== undefined, 'Event should have insights');
  assert.ok(eventData.cognitiveState, 'Event should have cognitiveState');
  assert.ok(typeof eventData.processing_time === 'number', 'Event should have processing_time');

  await orchestrator.dispose();
  console.log('  ✓ Thought processed event fires correctly');
}

async function testConfigUpdatedEvent(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  let eventData: any = null;
  orchestrator.on('config_updated', data => {
    eventData = data;
  });

  orchestrator.updateConfig({ learning_rate: 0.25 });

  assert.ok(eventData, 'Config updated event should fire');
  assert.strictEqual(eventData.learning_rate, 0.25, 'Should have updated learning rate');

  await orchestrator.dispose();
  console.log('  ✓ Config updated event fires correctly');
}

// ============================================================================
// Configuration Update Tests
// ============================================================================

async function testUpdateConfig(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    learning_rate: 0.1,
  });

  orchestrator.updateConfig({
    learning_rate: 0.3,
    intervention_cooldown_ms: 2000,
  });

  // Config is updated internally - verify via event or behavior
  let eventFired = false;
  orchestrator.on('config_updated', () => {
    eventFired = true;
  });

  orchestrator.updateConfig({ learning_rate: 0.35 });
  assert.ok(eventFired, 'Config update should emit event');

  await orchestrator.dispose();
  console.log('  ✓ Update config works');
}

// ============================================================================
// Reset Tests
// ============================================================================

async function testReset(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  // Process some thoughts to build up state
  for (let i = 1; i <= 3; i++) {
    await orchestrator.processThought(createMockThought({ thought_number: i }));
  }

  const stateBeforeReset = orchestrator.getCognitiveState();
  assert.strictEqual(stateBeforeReset.thought_count, 3, 'Should have 3 thoughts before reset');

  // Record intervention/insight history sizes before reset
  const insightsBefore = orchestrator.getInsightHistory().length;

  await orchestrator.reset();

  // Reset clears local buffers (intervention history, insight history, thought output)
  // Note: StateTracker is a singleton, so thought_count persists within same container
  // The reset still clears local orchestrator state
  const insightsAfter = orchestrator.getInsightHistory().length;
  assert.strictEqual(insightsAfter, 0, 'Insight history should be cleared');

  await orchestrator.dispose();
  console.log('  ✓ Reset clears orchestrator buffers');
}

// ============================================================================
// Feedback Tests
// ============================================================================

async function testProvideFeedback(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  const thought = createMockThought();
  const result = await orchestrator.processThought(thought);

  // Create a mock context for feedback
  const mockContext: CognitiveContext = {
    current_thought: thought.thought,
    thought_history: [],
    session: {},
    domain: 'testing',
    complexity: 5,
    urgency: 'medium',
    confidence_level: 0.6,
    available_tools: [],
    similar_past_sessions: [],
    success_patterns: [],
    failure_patterns: [],
    curiosity_level: 0.5,
    frustration_level: 0.2,
    engagement_level: 0.7,
    metacognitive_awareness: 0.6,
    self_doubt_level: 0.3,
    creative_pressure: 0.4,
    last_thought_output: '',
    context_trace: [],
  };

  // Should not throw
  await orchestrator.provideFeedback(result.interventions, 'success', 0.85, mockContext);
  await orchestrator.provideFeedback(result.interventions, 'failure', 0.2, mockContext);
  await orchestrator.provideFeedback(result.interventions, 'partial', 0.5, mockContext);

  await orchestrator.dispose();
  console.log('  ✓ Provide feedback works');
}

// ============================================================================
// Error Handling Tests
// ============================================================================

async function testProcessThoughtWithInvalidData(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  // Process with minimal valid data
  const minimalThought: ValidatedThoughtData = {
    thought: '',
    thought_number: 0,
    total_thoughts: 0,
    next_thought_needed: false,
  };

  // Should not throw - error boundary should catch and return fallback
  const result = await orchestrator.processThought(minimalThought);
  assert.ok(result, 'Should return result even for edge case input');

  await orchestrator.dispose();
  console.log('  ✓ Process thought handles edge cases gracefully');
}

// ============================================================================
// Disposal Tests
// ============================================================================

async function testDisposal(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  // Process a thought first
  await orchestrator.processThought(createMockThought());

  // Should not throw
  await orchestrator.dispose();

  // Calling dispose again should also not throw
  await orchestrator.dispose();

  console.log('  ✓ Disposal works correctly');
}

async function testDestroyAlias(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  // destroy() should work as alias for dispose()
  await orchestrator.destroy();

  console.log('  ✓ Destroy alias works');
}

// ============================================================================
// State Service Integration Tests
// ============================================================================

async function testGetUnifiedState(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const state = orchestrator.getUnifiedState();

  assert.ok(state, 'Should return unified state');
  assert.ok(typeof state.version === 'number', 'Should have version');
  assert.ok(state.lastUpdated instanceof Date, 'Should have lastUpdated date');

  await orchestrator.dispose();
  console.log('  ✓ Get unified state works');
}

async function testGetSystemHealth(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const health = orchestrator.getSystemHealth();

  assert.ok(health, 'Should return health info');
  assert.ok(
    ['healthy', 'degraded', 'critical'].includes(health.overall),
    'Should have valid overall status'
  );
  assert.ok(health.components, 'Should have components object');
  assert.ok(
    ['healthy', 'degraded', 'critical'].includes(health.components.cognitive),
    'Should have cognitive health'
  );
  assert.ok(
    ['healthy', 'degraded', 'critical'].includes(health.components.plugins),
    'Should have plugins health'
  );

  await orchestrator.dispose();
  console.log('  ✓ Get system health works');
}

async function testGetStateStats(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const stats = orchestrator.getStateStats();

  assert.ok(stats, 'Should return stats');
  assert.ok(typeof stats.totalUpdates === 'number', 'Should have totalUpdates');
  assert.ok(typeof stats.historySize === 'number', 'Should have historySize');
  assert.ok(typeof stats.version === 'number', 'Should have version');
  assert.ok(stats.lastUpdated instanceof Date, 'Should have lastUpdated');

  await orchestrator.dispose();
  console.log('  ✓ Get state stats works');
}

// ============================================================================
// Complexity and Urgency Detection Tests
// ============================================================================

async function testComplexityDetection(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  // Simple thought
  const simpleThought = createMockThought({ thought: 'Hello world' });
  await orchestrator.processThought(simpleThought);
  const simpleState = orchestrator.getCognitiveState();

  await orchestrator.reset();

  // Complex thought with keywords
  const complexThought = createMockThought({
    thought:
      'We need to integrate multiple complex systems with various architectural components and coordinate their interactions',
    thought_number: 1,
  });
  await orchestrator.processThought(complexThought);
  const complexState = orchestrator.getCognitiveState();

  assert.ok(
    complexState.current_complexity >= simpleState.current_complexity,
    'Complex thought should have higher or equal complexity'
  );

  await orchestrator.dispose();
  console.log('  ✓ Complexity detection works');
}

async function testUrgencyRecommendations(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  // Urgent thought
  const urgentThought = createMockThought({
    thought: 'This is urgent and critical - we need an immediate solution ASAP',
  });

  const result = await orchestrator.processThought(urgentThought);
  // Should complete without error - urgency is handled internally

  await orchestrator.dispose();
  console.log('  ✓ Urgency handling works');
}

async function testPhase5StaysInactiveForRoutineThoughts(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
    max_concurrent_interventions: 4,
  });

  const result = await orchestrator.processThought(
    createMockThought({ thought: 'List the next practical step for this small fix' })
  );

  assert.ok(
    !result.interventions.some(
      intervention => intervention.metadata.plugin_id === 'phase5-integration'
    ),
    'Routine thoughts should not trigger advanced reasoning integration'
  );

  await orchestrator.dispose();
  console.log('  ✓ Phase 5 stays inactive for routine thoughts');
}

async function testPhase5ActivatesForDemandingThoughts(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
    max_concurrent_interventions: 4,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'We urgently need to integrate multiple complex systems, revisit our assumptions, and coordinate a creative architecture under pressure',
    })
  );

  assert.ok(
    result.interventions.some(
      intervention => intervention.metadata.plugin_id === 'phase5-integration'
    ),
    'Demanding reasoning should trigger advanced reasoning integration'
  );

  await orchestrator.dispose();
  console.log('  ✓ Phase 5 activates for demanding thoughts');
}

async function testRecommendationsReflectRevisionAndDeadlinePressure(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  await orchestrator.processThought(
    createMockThought({ thought: 'Initial plan for the investigation' })
  );

  const result = await orchestrator.processThought(
    createMockThought({
      thought: 'Maybe we should revise this approach immediately because I am unsure',
      thought_number: 2,
      is_revision: true,
      revises_thought: 1,
    })
  );

  assert.ok(
    result.recommendations.some(
      recommendation =>
        recommendation.includes('Revision detected') || recommendation.includes('revised')
    ),
    'Revision thoughts should receive revision-specific guidance'
  );
  assert.ok(
    result.recommendations.some(
      recommendation =>
        recommendation.includes('deadline') || recommendation.includes('concrete action')
    ),
    'Deadline pressure should produce time-sensitive guidance'
  );

  await orchestrator.dispose();
  console.log('  ✓ Recommendations reflect revision and deadline pressure');
}

async function testReasoningModeShiftsToValidation(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'We should verify whether stale cache invalidation is the root cause by reproducing the failure after clearing cache.',
    })
  );

  assert.strictEqual(
    result.cognitiveState.reasoning_mode,
    'validation',
    'Evidence-oriented reasoning should enter validation mode'
  );
  assert.ok(
    result.cognitiveState.recent_mode_shifts.some(
      shift => shift.to === 'validation' && shift.thought_number === 1
    ),
    'Validation mode should record a bounded shift entry'
  );
  assert.ok(
    result.recommendations.some(
      recommendation =>
        recommendation.includes('Reasoning mode shifted from exploration to validation') ||
        recommendation.includes('Current reasoning mode: validation')
    ),
    'Recommendations should explain the active reasoning mode'
  );

  await orchestrator.dispose();
  console.log('  ✓ Reasoning mode shifts to validation');
}

async function testReasoningModeTracksRevision(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  await orchestrator.processThought(
    createMockThought({
      thought: 'We should verify the cache invalidation path with a reproducible test.',
    })
  );

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'Revision: the earlier cache theory is weaker because the failure persists after cache clear.',
      thought_number: 2,
      is_revision: true,
      revises_thought: 1,
    })
  );

  assert.strictEqual(
    result.cognitiveState.reasoning_mode,
    'revision',
    'Explicit revisions should switch the reasoning mode to revision'
  );
  assert.ok(
    result.cognitiveState.recent_mode_shifts.some(
      shift => shift.from === 'validation' && shift.to === 'revision' && shift.thought_number === 2
    ),
    'Revision mode should capture the transition from the prior mode'
  );

  await orchestrator.dispose();
  console.log('  ✓ Reasoning mode tracks revision');
}

async function testReasoningModeConvergesAtSequenceEnd(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought: 'The logs confirm the migration timeout, so we can stop exploring and act on that.',
      total_thoughts: 1,
      next_thought_needed: false,
    })
  );

  assert.strictEqual(
    result.cognitiveState.reasoning_mode,
    'convergence',
    'Completed reasoning should switch into convergence mode'
  );
  assert.ok(
    result.cognitiveState.recent_mode_shifts.some(
      shift => shift.to === 'convergence' && shift.thought_number === 1
    ),
    'Convergence mode should record the transition'
  );
  assert.ok(
    result.recommendations.some(
      recommendation =>
        recommendation.includes('Reasoning mode shifted from exploration to convergence') ||
        recommendation.includes('Current reasoning mode: convergence')
    ),
    'Recommendations should surface convergence mode'
  );

  await orchestrator.dispose();
  console.log('  ✓ Reasoning mode converges at sequence end');
}

async function testActionRankingDefersScopeExpansionUnderDeadline(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  const result = await orchestrator.processThought(
    createMockThought({
      thought:
        'This is urgent and we need to verify the production timeout immediately before opening any new design branches.',
    })
  );

  assert.match(
    result.actionRanking.do_not_do_yet.action,
    /Do not open a new branch|Do not commit to implementation|Do not add more scope/i,
    'Deferred action should warn against expanding scope under uncertainty'
  );
  assert.ok(
    result.actionRanking.do_not_do_yet.signals.includes('near_deadline') ||
      result.actionRanking.do_not_do_yet.signals.includes('low_confidence') ||
      result.actionRanking.do_not_do_yet.signals.includes('mode:validation'),
    'Deferred action should explain the signal that caused the warning'
  );

  await orchestrator.dispose();
  console.log('  ✓ Action ranking defers scope expansion under deadline');
}

async function testRepeatedReasoningDetectionHandlesParaphrases(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator({
    intervention_cooldown_ms: 0,
  });

  await orchestrator.processThought(
    createMockThought({
      thought: 'We should evaluate peak API latency before changing the architecture',
    })
  );

  const result = await orchestrator.processThought(
    createMockThought({
      thought: 'Before we change the architecture, we need to assess peak API latency',
      thought_number: 2,
      total_thoughts: 3,
    })
  );

  assert.ok(
    result.recommendations.some(
      recommendation =>
        recommendation.includes('highly similar to a recent step') ||
        recommendation.includes('add new evidence')
    ),
    'Paraphrased repeats should be detected as stagnation signals'
  );

  await orchestrator.dispose();
  console.log('  ✓ Repeated reasoning detection handles paraphrases');
}

// ============================================================================
// Plugin Add/Remove Tests
// ============================================================================

async function testAddPlugin(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  const mockPlugin = {
    id: 'test-mock-plugin',
    name: 'Test Mock Plugin',
    version: '1.0.0',
    description: 'A mock plugin for testing',
    priority: 5,
    enabled: true,
    shouldActivate: () => true,
    process: async () => [],
    getMetrics: () => ({
      activation_count: 0,
      success_rate: 0,
      average_impact_score: 0,
      user_satisfaction: 0,
      average_response_time: 0,
      cognitive_efficiency: 0,
      performance_by_domain: {},
      performance_by_complexity: {},
      improvement_rate: 0,
      adaptation_speed: 0,
      synergy_with_plugins: {},
      conflict_rate: 0,
    }),
    handleFeedback: async () => {},
    on: () => {},
    removeAllListeners: () => {},
  };

  // Should not throw
  orchestrator.addPlugin(mockPlugin as any);

  await orchestrator.dispose();
  console.log('  ✓ Add plugin works');
}

async function testRemovePlugin(): Promise<void> {
  const orchestrator = await createTestCognitiveOrchestrator();

  // Try to remove a non-existent plugin
  const result = orchestrator.removePlugin('non-existent-plugin');
  assert.strictEqual(result, false, 'Should return false for non-existent plugin');

  await orchestrator.dispose();
  console.log('  ✓ Remove plugin works');
}

// ============================================================================
// Test Runner
// ============================================================================

const tests = [
  // Creation
  { name: 'Orchestrator creation', fn: testOrchestratorCreation },
  { name: 'Orchestrator with custom config', fn: testOrchestratorWithCustomConfig },

  // Thought Processing
  { name: 'Process thought returns result', fn: testProcessThoughtReturnsResult },
  { name: 'Process thought updates cognitive state', fn: testProcessThoughtUpdatesCognitiveState },
  { name: 'Process thought generates session id', fn: testProcessThoughtGeneratesSessionId },
  { name: 'Process multiple thoughts', fn: testProcessMultipleThoughts },
  { name: 'Process thought with session context', fn: testProcessThoughtWithSessionContext },
  {
    name: 'Process thought builds hypothesis ledger',
    fn: testProcessThoughtBuildsHypothesisLedger,
  },
  {
    name: 'Revision thought updates hypothesis ledger',
    fn: testRevisionThoughtUpdatesHypothesisLedger,
  },
  {
    name: 'Recommendations prioritize top hypothesis',
    fn: testRecommendationsPrioritizeTopHypothesis,
  },
  {
    name: 'Action ranking prioritizes top hypothesis validation',
    fn: testActionRankingPrioritizesTopHypothesisValidation,
  },
  { name: 'Process revision thought', fn: testProcessRevisionThought },
  { name: 'Process branching thought', fn: testProcessBranchingThought },

  // Cognitive State
  { name: 'Get cognitive state structure', fn: testGetCognitiveState },
  { name: 'Cognitive state immutability', fn: testCognitiveStateImmutability },

  // Intervention Cooldown
  { name: 'Intervention cooldown', fn: testInterventionCooldown },

  // Plugin Performance
  { name: 'Get plugin performance', fn: testGetPluginPerformance },

  // Insight History
  { name: 'Get insight history', fn: testGetInsightHistory },

  // Events
  { name: 'Thought processed event', fn: testThoughtProcessedEvent },
  { name: 'Config updated event', fn: testConfigUpdatedEvent },

  // Configuration
  { name: 'Update config', fn: testUpdateConfig },

  // Reset
  { name: 'Reset cognitive state', fn: testReset },

  // Feedback
  { name: 'Provide feedback', fn: testProvideFeedback },

  // Error Handling
  { name: 'Handle edge case input', fn: testProcessThoughtWithInvalidData },

  // Disposal
  { name: 'Disposal', fn: testDisposal },
  { name: 'Destroy alias', fn: testDestroyAlias },

  // State Service Integration
  { name: 'Get unified state', fn: testGetUnifiedState },
  { name: 'Get system health', fn: testGetSystemHealth },
  { name: 'Get state stats', fn: testGetStateStats },

  // Detection
  { name: 'Complexity detection', fn: testComplexityDetection },
  { name: 'Urgency handling', fn: testUrgencyRecommendations },
  { name: 'Phase 5 inactive on routine thoughts', fn: testPhase5StaysInactiveForRoutineThoughts },
  {
    name: 'Phase 5 active on demanding thoughts',
    fn: testPhase5ActivatesForDemandingThoughts,
  },
  {
    name: 'Recommendations reflect revision and deadline pressure',
    fn: testRecommendationsReflectRevisionAndDeadlinePressure,
  },
  {
    name: 'Reasoning mode shifts to validation',
    fn: testReasoningModeShiftsToValidation,
  },
  {
    name: 'Reasoning mode tracks revision',
    fn: testReasoningModeTracksRevision,
  },
  {
    name: 'Reasoning mode converges at sequence end',
    fn: testReasoningModeConvergesAtSequenceEnd,
  },
  {
    name: 'Action ranking defers scope expansion under deadline',
    fn: testActionRankingDefersScopeExpansionUnderDeadline,
  },
  {
    name: 'Repeated reasoning detection handles paraphrases',
    fn: testRepeatedReasoningDetectionHandlesParaphrases,
  },

  // Plugin Management
  { name: 'Add plugin', fn: testAddPlugin },
  { name: 'Remove plugin', fn: testRemovePlugin },
];

export async function runCognitiveOrchestratorTests(): Promise<{ passed: number; failed: number }> {
  console.log('\n🧠 Running CognitiveOrchestrator Tests\n');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.log(`  ✗ ${test.name}`);
      console.log(`    Error: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        console.log(`    Stack: ${error.stack.split('\n')[1]?.trim()}`);
      }
      failed++;
    }
  }

  console.log(`\n📊 CognitiveOrchestrator Results: ${passed} passed, ${failed} failed\n`);

  return { passed, failed };
}

// Run if executed directly
if (process.argv[1]?.includes('cognitive-orchestrator.test')) {
  runCognitiveOrchestratorTests()
    .then(({ passed, failed }) => {
      process.exit(failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Test runner failed:', error);
      process.exit(1);
    });
}
