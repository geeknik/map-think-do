import assert from 'node:assert';
import { PluginManager } from '../src/prompts/plugins/plugin-manager.js';
import { BasePromptPlugin, PromptContext } from '../src/prompts/plugins/base-plugin.js';
import {
  CognitivePluginManager,
  CognitivePlugin,
  CognitiveContext,
  PluginActivation,
  PluginIntervention,
} from '../src/cognitive/plugin-system.js';

class DummyPromptPlugin extends BasePromptPlugin {
  constructor(name: string) {
    super({
      name,
      description: 'dummy',
      version: '1.0.0',
      capabilities: [],
      domains: ['general'],
      complexityRange: [1, 10],
      priority: 5,
    });
  }

  shouldActivate(_context: PromptContext): boolean {
    return true;
  }

  generatePrompts(_context: PromptContext) {
    return [{ name: `${this.getMetadata().name}-prompt`, description: 'test' }];
  }

  generateTemplates(_context: PromptContext) {
    return {};
  }
}

class DummyCognitivePlugin extends CognitivePlugin {
  private result: PluginActivation;
  private intervention: PluginIntervention;

  constructor(id: string, activation: PluginActivation) {
    super(id, id, 'dummy', '1.0.0');
    this.result = activation;
    this.intervention = {
      type: 'prompt_injection',
      content: 'x',
      metadata: { plugin_id: id, confidence: 1, expected_benefit: 'x' },
    };
  }

  async shouldActivate(_c: CognitiveContext): Promise<PluginActivation> {
    return this.result;
  }
  async intervene(_c: CognitiveContext): Promise<PluginIntervention> {
    return this.intervention;
  }
  async receiveFeedback() {}
  async adapt() {}
}

async function testPluginRegistration() {
  const manager = new PluginManager();
  const plugin = new DummyPromptPlugin('p1');
  manager.registerPlugin(plugin);
  assert.strictEqual(manager.getPlugins().length, 3);
  const removed = manager.unregisterPlugin('p1');
  assert.strictEqual(removed, true);
  assert.strictEqual(manager.getPlugins().length, 2);
}

async function testConflictHandling() {
  const manager = new CognitivePluginManager({ maxConcurrentPlugins: 3 });
  const pluginA = new DummyCognitivePlugin('A', {
    should_activate: true,
    priority: 90,
    confidence: 1,
    reason: 'A',
    estimated_impact: 'high',
    resource_requirements: {
      cognitive_load: 0.6,
      time_cost: 1,
      creativity_required: false,
      analysis_required: false,
    },
  });
  const pluginB = new DummyCognitivePlugin('B', {
    should_activate: true,
    priority: 80,
    confidence: 1,
    reason: 'B',
    estimated_impact: 'high',
    resource_requirements: {
      cognitive_load: 0.4,
      time_cost: 1,
      creativity_required: false,
      analysis_required: false,
    },
  });
  const pluginC = new DummyCognitivePlugin('C', {
    should_activate: true,
    priority: 70,
    confidence: 1,
    reason: 'C',
    estimated_impact: 'high',
    resource_requirements: {
      cognitive_load: 0.3,
      time_cost: 1,
      creativity_required: false,
      analysis_required: false,
    },
  });
  manager.registerPlugin(pluginA);
  manager.registerPlugin(pluginB);
  manager.registerPlugin(pluginC);
  manager.setPluginConflicts('A', ['B']);
  const context: CognitiveContext = {
    thought_history: [],
    session: {},
    complexity: 5,
    urgency: 'low',
    confidence_level: 0.5,
    available_tools: [],
    similar_past_sessions: [],
    success_patterns: [],
    failure_patterns: [],
    metacognitive_awareness: 0,
    self_doubt_level: 0,
    creative_pressure: 0,
  };
  const interventions = await manager.orchestrate(context);
  const ids = interventions.map(i => i.metadata.plugin_id);
  assert.deepStrictEqual(ids.sort(), ['A', 'C']);
}

async function testAdaptivePriority() {
  const manager = new PluginManager({ adaptivePriorities: true });
  const pluginA = new DummyPromptPlugin('A');
  const pluginB = new DummyPromptPlugin('B');
  manager.registerPlugin(pluginA);
  manager.registerPlugin(pluginB);
  const context: PromptContext = { thoughtHistory: [], domain: 'general' } as any;
  for (let i = 0; i < 10; i++) {
    manager.provideFeedback('A-prompt', true, 0.9, context);
    manager.provideFeedback('B-prompt', false, 0.2, context);
  }
  const activations = manager.selectActivePlugins(context);
  const first = activations[0].plugin.getMetadata().name;
  assert.strictEqual(first, 'A');
}

(async () => {
  await testPluginRegistration();
  await testConflictHandling();
  await testAdaptivePriority();
  console.log('plugin-manager tests passed');
})();
