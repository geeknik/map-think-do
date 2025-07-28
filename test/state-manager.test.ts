/**
 * @fileoverview Unit tests for State Management System
 *
 * Tests the unified state management system including StateManager,
 * state adapters, and StateService integration.
 */

import assert from 'node:assert';
import { StateManager, UnifiedState } from '../src/state/state-manager.js';
import { StateService } from '../src/state/state-service.js';

/**
 * Test StateManager basic functionality
 */
async function testStateManagerBasics(): Promise<void> {
  console.log('  Testing StateManager basic operations...');

  const stateManager = new StateManager();

  // Test initial state
  const initialState = stateManager.getState();
  assert.ok(
    initialState.lifecycle.status === 'initializing',
    'Initial lifecycle status should be initializing'
  );
  assert.ok(initialState.version === 1, 'Initial version should be 1');
  assert.ok(initialState.cognitive.thought_count === 0, 'Initial thought count should be 0');

  // Test state updates
  stateManager.updateStateByPath('cognitive.thought_count', 5, 'test');

  const updatedState = stateManager.getState();
  assert.ok(updatedState.cognitive.thought_count === 5, 'Thought count should be updated');
  assert.ok(updatedState.version === 2, 'Version should increment');

  // Test path-based access
  const thoughtCount = stateManager.getStateByPath('cognitive.thought_count');
  assert.ok(thoughtCount === 5, 'Path-based access should work');

  // Test path-based updates
  stateManager.updateStateByPath('cognitive.current_complexity', 8, 'test');
  const complexity = stateManager.getStateByPath('cognitive.current_complexity');
  assert.ok(complexity === 8, 'Path-based update should work');

  stateManager.dispose();
  console.log('    ✓ Basic operations work correctly');
}

/**
 * Test state validation
 */
async function testStateValidation(): Promise<void> {
  console.log('  Testing state validation...');

  const stateManager = new StateManager();
  let validationErrorEmitted = false;

  // Listen for validation errors
  stateManager.on('state_validation_error', () => {
    validationErrorEmitted = true;
  });

  // Test invalid state update
  stateManager.updateState(
    {
      cognitive: {
        thought_count: -1, // Invalid negative thought count
      } as any,
    } as any,
    'test'
  );

  assert.ok(validationErrorEmitted, 'Validation error should be emitted for invalid state');

  stateManager.dispose();
  console.log('    ✓ State validation works correctly');
}

/**
 * Test state subscriptions
 */
async function testStateSubscriptions(): Promise<void> {
  console.log('  Testing state subscriptions...');

  const stateManager = new StateManager();
  let subscriptionCallbackCalled = false;
  let receivedValue: any;

  // Subscribe to cognitive state changes
  const unsubscribe = stateManager.subscribe('cognitive.thought_count', newValue => {
    subscriptionCallbackCalled = true;
    receivedValue = newValue;
  });

  // Update cognitive state
  stateManager.updateStateByPath('cognitive.thought_count', 10, 'test');

  assert.ok(subscriptionCallbackCalled, 'Subscription callback should be called');
  assert.ok(receivedValue === 10, 'Received value should be correct');

  // Test unsubscription
  unsubscribe();
  subscriptionCallbackCalled = false;

  stateManager.updateStateByPath('cognitive.thought_count', 15, 'test');

  assert.ok(!subscriptionCallbackCalled, 'Callback should not be called after unsubscription');

  stateManager.dispose();
  console.log('    ✓ State subscriptions work correctly');
}

/**
 * Test state history
 */
async function testStateHistory(): Promise<void> {
  console.log('  Testing state history...');

  const stateManager = new StateManager();

  // Make several state updates
  for (let i = 1; i <= 5; i++) {
    stateManager.updateStateByPath('cognitive.thought_count', i, 'test');
  }

  const history = stateManager.getStateHistory();
  assert.ok(history.length === 5, 'History should contain all updates');

  const limitedHistory = stateManager.getStateHistory(3);
  assert.ok(limitedHistory.length === 3, 'Limited history should respect limit');

  stateManager.dispose();
  console.log('    ✓ State history works correctly');
}

/**
 * Test StateService basic functionality
 */
async function testStateService(): Promise<void> {
  console.log('  Testing StateService...');

  const stateService = new StateService({
    persistence: {
      enabled: false, // Disable persistence for testing
      autoSave: false,
      saveInterval: 1000,
    },
    adapters: {
      cognitive: false,
      plugins: false,
      memory: false,
      performance: true,
      session: true,
    },
  });

  // Initialize without dependencies (adapters disabled)
  await stateService.initialize({});

  // Test basic state access
  const state = stateService.getState();
  assert.ok(state.lifecycle.status === 'ready', 'Service should be ready after initialization');

  // Test state updates
  stateService.updateState(
    {
      session: {
        currentSessionId: 'test_session',
        sessionStartTime: new Date(),
        totalSessions: 5,
        activeConnections: 0,
      },
    },
    'test'
  );

  const sessionCount = stateService.getStateByPath('session.totalSessions');
  assert.ok(sessionCount === 5, 'State update should work');

  // Test performance recording
  stateService.recordRequest(150, true);
  stateService.recordRequest(200, false);

  // Allow time for performance metrics to update
  await new Promise(resolve => setTimeout(resolve, 100));

  // Test system health
  const health = stateService.getSystemHealth();
  assert.ok(health.overall, 'System health should be available');
  assert.ok(health.components, 'Component health should be available');

  // Test state stats
  const stats = stateService.getStateStats();
  assert.ok(stats.totalUpdates > 0, 'State stats should show updates');

  await stateService.dispose();
  console.log('    ✓ StateService works correctly');
}

/**
 * Test state persistence
 */
async function testStatePersistence(): Promise<void> {
  console.log('  Testing state persistence...');

  const stateManager = new StateManager(undefined, {
    autoSave: false, // Manual save for testing
  });

  let saveRequested = false;
  stateManager.on('state_save_requested', () => {
    saveRequested = true;
  });

  // Update state and save
  stateManager.updateStateByPath('cognitive.thought_count', 42, 'test');

  await stateManager.saveState();
  assert.ok(saveRequested, 'Save should be requested');

  // Test state loading
  const testState = {
    cognitive: {
      session_id: 'test_session_123',
      thought_count: 100,
      current_complexity: 5,
      confidence_trajectory: [0.5],
      metacognitive_awareness: 0.5,
      creative_pressure: 0.3,
      analytical_depth: 0.5,
      self_doubt_level: 0.3,
      curiosity_level: 0.7,
      frustration_level: 0.2,
      engagement_level: 0.8,
      pattern_recognition_active: true,
      adaptive_learning_enabled: true,
      self_reflection_depth: 0.5,
      cognitive_flexibility: 0.5,
      insight_potential: 0.5,
      breakthrough_likelihood: 0.5,
      recent_success_rate: 0.5,
      improvement_trajectory: 0,
      cognitive_efficiency: 0.5,
    },
    session: {
      currentSessionId: 'test_session_123',
      sessionStartTime: new Date(),
      totalSessions: 1,
      activeConnections: 0,
    },
    lifecycle: {
      status: 'ready' as const,
      startupTime: new Date(),
      version: '1.0.0-TEST',
    },
  };

  await stateManager.loadState(testState);
  const loadedValue = stateManager.getStateByPath('cognitive.thought_count');
  assert.ok(loadedValue === 100, 'State should be loaded correctly');

  stateManager.dispose();
  console.log('    ✓ State persistence works correctly');
}

/**
 * Test state reset functionality
 */
async function testStateReset(): Promise<void> {
  console.log('  Testing state reset...');

  const stateManager = new StateManager();

  // Update state
  stateManager.updateStateByPath('cognitive.thought_count', 50, 'test');

  assert.ok(
    stateManager.getStateByPath('cognitive.thought_count') === 50,
    'State should be updated'
  );

  // Reset state
  stateManager.resetState();
  assert.ok(stateManager.getStateByPath('cognitive.thought_count') === 0, 'State should be reset');

  stateManager.dispose();
  console.log('    ✓ State reset works correctly');
}

/**
 * Run all state management tests
 */
export async function runStateManagerTests(): Promise<void> {
  console.log('🧪 Running State Management tests...');

  await testStateManagerBasics();
  await testStateValidation();
  await testStateSubscriptions();
  await testStateHistory();
  await testStateService();
  await testStatePersistence();
  await testStateReset();

  console.log('✅ All State Management tests passed');
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runStateManagerTests()
    .then(() => {
      console.log('🎉 State Management tests completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 State Management tests failed:', error);
      process.exit(1);
    });
}
