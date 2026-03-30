import assert from 'assert/strict';
import { InsightDetector, CognitiveInsight } from '../src/cognitive/insight-detector.js';
import { SimpleMemoryStore } from '../src/memory/simple-memory-store.js';
import { CognitiveContext, PluginIntervention } from '../src/cognitive/plugin-system.js';
import { StateTracker } from '../src/cognitive/state-tracker.js';
import { StoredThought } from '../src/memory/memory-store.js';

function createStoredThought(
  id: string,
  thought: string,
  confidence = 0.5,
  complexity = 6
): StoredThought {
  return {
    id,
    thought,
    thought_number: 1,
    total_thoughts: 4,
    next_thought_needed: true,
    timestamp: new Date(),
    session_id: 'session-test',
    confidence,
    complexity,
    context: {},
  };
}

function createContext(overrides: Partial<CognitiveContext> = {}): CognitiveContext {
  return {
    current_thought: 'This may reveal a breakthrough in the recurring deployment issue',
    thought_history: [
      createStoredThought('1', 'deployment failure happens during rollout'),
      createStoredThought('2', 'deployment failure appears during canary rollout'),
      createStoredThought('3', 'deployment failure is recurring in rollout validation'),
    ],
    session: {},
    domain: 'software_development',
    complexity: 8,
    urgency: 'high',
    confidence_level: 0.85,
    available_tools: ['map-think-do'],
    time_constraints: { deadline: new Date(Date.now() + 60 * 60 * 1000) },
    similar_past_sessions: [],
    success_patterns: [],
    failure_patterns: [],
    curiosity_level: 0.7,
    frustration_level: 0.2,
    engagement_level: 0.8,
    metacognitive_awareness: 0.8,
    self_doubt_level: 0.2,
    creative_pressure: 0.7,
    last_thought_output: '',
    context_trace: [],
    ...overrides,
  };
}

function createIntervention(pluginId: string, confidence = 0.8): PluginIntervention {
  return {
    type: 'context_enhancement',
    content: `Intervention from ${pluginId}`,
    metadata: {
      plugin_id: pluginId,
      confidence,
      expected_benefit: 'test',
    },
  };
}

async function testInsightDetectorRanksInsightsByValidationPriority(): Promise<void> {
  const memory = new SimpleMemoryStore();
  const state = new StateTracker().getState();
  const detector = new InsightDetector(memory, state, new Map<string, number>());
  const context = createContext();
  const interventions = [createIntervention('persona'), createIntervention('metacognitive')];

  const insights = await detector.detectInsights(context, interventions);

  assert.ok(insights.length >= 2, 'expected multiple insights to rank');
  for (let i = 1; i < insights.length; i++) {
    assert.ok(
      (insights[i - 1].validation_priority || 0) >= (insights[i].validation_priority || 0),
      'insights should be sorted by validation priority descending'
    );
  }
}

async function testInsightDetectorAnnotatesEvidenceAndValidationGuidance(): Promise<void> {
  const memory = new SimpleMemoryStore();
  const state = new StateTracker().getState();
  const detector = new InsightDetector(memory, state, new Map<string, number>());
  const context = createContext();
  const interventions = [createIntervention('persona'), createIntervention('external-reasoning')];

  const insights = await detector.detectInsights(context, interventions);
  const topInsight = insights[0] as CognitiveInsight;

  assert.ok(typeof topInsight.evidence_strength === 'number', 'should annotate evidence strength');
  assert.ok(
    typeof topInsight.validation_priority === 'number',
    'should annotate validation priority'
  );
  assert.ok(
    typeof topInsight.suggested_validation === 'string' &&
      topInsight.suggested_validation.length > 0,
    'should provide a suggested validation step'
  );
}

export async function runInsightDetectorTests(): Promise<void> {
  await testInsightDetectorRanksInsightsByValidationPriority();
  await testInsightDetectorAnnotatesEvidenceAndValidationGuidance();
  console.log('✅ insight-detector tests passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runInsightDetectorTests().catch(error => {
    console.error('💥 insight-detector tests failed', error);
    process.exit(1);
  });
}
