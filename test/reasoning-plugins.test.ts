import assert from 'assert/strict';
import { PersonaPlugin } from '../src/cognitive/plugins/persona-plugin.js';
import { ExternalReasoningPlugin } from '../src/cognitive/plugins/external-reasoning-plugin.js';
import { CognitiveContext } from '../src/cognitive/plugin-system.js';

function createContext(overrides: Partial<CognitiveContext> = {}): CognitiveContext {
  return {
    current_thought: 'Investigate the current issue',
    thought_history: [],
    session: {},
    domain: 'software_development',
    complexity: 7,
    urgency: 'medium',
    confidence_level: 0.5,
    available_tools: ['code-reasoning'],
    time_constraints: undefined,
    similar_past_sessions: [],
    success_patterns: [],
    failure_patterns: [],
    curiosity_level: 0.6,
    frustration_level: 0.2,
    engagement_level: 0.7,
    metacognitive_awareness: 0.5,
    self_doubt_level: 0.3,
    creative_pressure: 0.3,
    last_thought_output: '',
    context_trace: [],
    ...overrides,
  };
}

async function testPersonaPluginUsesContextualGuidance(): Promise<void> {
  const plugin = new PersonaPlugin();
  const context = createContext({
    current_thought: 'We urgently need a practical implementation plan for this architecture',
    urgency: 'high',
    confidence_level: 0.3,
    time_constraints: { deadline: new Date(Date.now() + 30 * 60 * 1000) },
  });

  const intervention = await plugin.intervene(context);

  assert.match(
    intervention.content,
    /Current focus:|deadline|time pressure|validate/i,
    'persona output should anchor itself to the current context'
  );

  await plugin.destroy();
}

async function testExternalReasoningPluginReportsGroundedFindings(): Promise<void> {
  const plugin = new ExternalReasoningPlugin();
  const context = createContext({
    current_thought: 'Calculate 2 + 2 to compare the baseline estimate',
    confidence_level: 0.35,
  });

  const intervention = await plugin.intervene(context);

  assert.match(
    intervention.content,
    /External tool findings:/,
    'external reasoning output should include a findings section'
  );
  assert.match(
    intervention.content,
    /Mathematical Solver: computed|2 \+ 2 = 4/,
    'external reasoning output should surface the actual tool result'
  );
  assert.match(
    intervention.content,
    /Recommended next checks:/,
    'external reasoning output should include actionable follow-up checks'
  );

  await plugin.destroy();
}

export async function runReasoningPluginTests(): Promise<void> {
  await testPersonaPluginUsesContextualGuidance();
  await testExternalReasoningPluginReportsGroundedFindings();
  console.log('✅ reasoning-plugin tests passed');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runReasoningPluginTests().catch(error => {
    console.error('💥 reasoning-plugin tests failed', error);
    process.exit(1);
  });
}
