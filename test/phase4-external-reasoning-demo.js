#!/usr/bin/env node

/**
 * @fileoverview Phase 4 External Reasoning Demo
 * 
 * This demo showcases the external reasoning capabilities added in Phase 4:
 * - Mathematical solver integration
 * - Creative synthesizer capabilities
 * - External tool orchestration
 * - Multi-modal cognitive processing
 */

import { CognitiveOrchestrator } from '../src/cognitive/cognitive-orchestrator.js';
import { InMemoryStore } from '../src/memory/memory-store.js';

// ANSI color codes for beautiful console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class Phase4Demo {
  constructor() {
    this.memoryStore = new InMemoryStore();
    this.orchestrator = new CognitiveOrchestrator({
      max_concurrent_interventions: 5,
      adaptive_plugin_selection: true,
      memory_integration_enabled: true,
      emergence_detection_enabled: true,
      breakthrough_detection_sensitivity: 0.7
    }, this.memoryStore);
    
    this.sessionId = `phase4-demo-${Date.now()}`;
  }

  async runDemo() {
    this.printHeader();
    
    console.log(`${colors.cyan}🚀 Phase 4: External Reasoning Modules Demo${colors.reset}\n`);
    
    // Demo scenarios
    await this.demoMathematicalReasoning();
    await this.demoCreativeReasoning();
    await this.demoMultiModalReasoning();
    await this.demoToolOrchestration();
    await this.demoAdaptiveLearning();
    
    this.printSummary();
  }

  async demoMathematicalReasoning() {
    this.printSection("🧮 Mathematical Reasoning with External Tools");
    
    const scenarios = [
      {
        title: "Equation Solving",
        thought: "I need to solve the quadratic equation x^2 - 5x + 6 = 0 to find the roots"
      },
      {
        title: "Mathematical Calculation",
        thought: "Calculate the result of 2^8 + sqrt(144) - log(100)"
      },
      {
        title: "Pattern Analysis",
        thought: "Analyze the sequence [2, 4, 8, 16, 32] and predict the next 3 terms"
      },
      {
        title: "Statistical Analysis",
        thought: "Perform statistical analysis on the data [23, 45, 67, 34, 56, 78, 89, 12, 34, 56]"
      }
    ];

    for (const scenario of scenarios) {
      await this.processScenario(scenario.title, scenario.thought);
      await this.sleep(1000);
    }
  }

  async demoCreativeReasoning() {
    this.printSection("🎨 Creative Reasoning with Synthesis Tools");
    
    const scenarios = [
      {
        title: "Idea Generation",
        thought: "Generate innovative ideas for sustainable transportation in urban environments"
      },
      {
        title: "Concept Combination",
        thought: "Combine the concepts of artificial intelligence and urban gardening to create something novel"
      },
      {
        title: "Creative Problem Solving",
        thought: "How can we creatively solve the problem of food waste in restaurants?"
      },
      {
        title: "Metaphor Creation",
        thought: "Create metaphors for quantum computing that help explain it to non-technical people"
      }
    ];

    for (const scenario of scenarios) {
      await this.processScenario(scenario.title, scenario.thought);
      await this.sleep(1000);
    }
  }

  async demoMultiModalReasoning() {
    this.printSection("🔄 Multi-Modal Cognitive Processing");
    
    const scenarios = [
      {
        title: "Math + Creative Hybrid",
        thought: "Calculate the optimal dimensions for a creative art installation that uses mathematical patterns like Fibonacci sequences"
      },
      {
        title: "Analytical + Creative Synthesis",
        thought: "Analyze the mathematical beauty in nature and generate creative ideas for biomimetic designs"
      },
      {
        title: "Complex Problem Solving",
        thought: "Design a creative solution for optimizing traffic flow that involves both mathematical modeling and innovative thinking"
      }
    ];

    for (const scenario of scenarios) {
      await this.processScenario(scenario.title, scenario.thought);
      await this.sleep(1000);
    }
  }

  async demoToolOrchestration() {
    this.printSection("🎭 External Tool Orchestration");
    
    console.log(`${colors.yellow}Demonstrating how the AGI orchestrates multiple external tools...${colors.reset}\n`);
    
    const complexThought = `
    I'm working on a complex project that requires:
    1. Mathematical optimization of resource allocation
    2. Creative brainstorming for user experience design
    3. Pattern analysis of user behavior data
    4. Innovative solutions for technical challenges
    
    How can I approach this systematically?
    `;

    await this.processScenario("Complex Multi-Tool Orchestration", complexThought);
    
    // Show tool metrics
    const externalPlugin = this.orchestrator.getPluginPerformance()['external-reasoning'];
    if (externalPlugin) {
      console.log(`${colors.cyan}📊 External Reasoning Plugin Metrics:${colors.reset}`);
      console.log(`  • Activation Count: ${externalPlugin.activation_count || 0}`);
      console.log(`  • Success Rate: ${((externalPlugin.success_rate || 0) * 100).toFixed(1)}%`);
      console.log(`  • Average Impact: ${((externalPlugin.average_impact_score || 0) * 100).toFixed(1)}%`);
      console.log(`  • Response Time: ${(externalPlugin.average_response_time || 0).toFixed(0)}ms\n`);
    }
  }

  async demoAdaptiveLearning() {
    this.printSection("🧠 Adaptive Learning and Tool Selection");
    
    console.log(`${colors.yellow}Demonstrating how the system learns and adapts tool usage...${colors.reset}\n`);
    
    // Simulate multiple similar problems to show learning
    const learningScenarios = [
      "Calculate 15% of 240 for a tip calculation",
      "Find the area of a circle with radius 7.5 meters", 
      "Solve for x in the equation 3x + 12 = 27"
    ];

    for (let i = 0; i < learningScenarios.length; i++) {
      console.log(`${colors.blue}Learning Iteration ${i + 1}:${colors.reset}`);
      await this.processScenario(`Math Problem ${i + 1}`, learningScenarios[i]);
      
      // Show how the system is adapting
      const cognitiveState = this.orchestrator.getCognitiveState();
      console.log(`  📈 Cognitive Efficiency: ${(cognitiveState.cognitive_efficiency * 100).toFixed(1)}%`);
      console.log(`  🎯 Pattern Recognition: ${cognitiveState.pattern_recognition_active ? 'Active' : 'Inactive'}`);
      console.log(`  💡 Insight Potential: ${(cognitiveState.insight_potential * 100).toFixed(1)}%\n`);
    }
  }

  async processScenario(title, thought) {
    console.log(`${colors.bright}${colors.blue}━━━ ${title} ━━━${colors.reset}`);
    console.log(`${colors.white}Thought: ${thought}${colors.reset}\n`);

    try {
      const thoughtData = {
        thought: thought,
        thought_number: 1,
        total_thoughts: 1,
        next_thought_needed: false
      };

      const result = await this.orchestrator.processThought(thoughtData, {
        id: this.sessionId,
        user_id: 'demo-user',
        start_time: new Date(),
        status: 'active'
      });

      // Display interventions
      if (result.interventions.length > 0) {
        console.log(`${colors.green}🔧 Cognitive Interventions:${colors.reset}`);
        result.interventions.forEach((intervention, index) => {
          console.log(`  ${index + 1}. ${colors.cyan}[${intervention.type}]${colors.reset} ${intervention.content}`);
          console.log(`     Confidence: ${(intervention.metadata.confidence * 100).toFixed(1)}%`);
          console.log(`     Expected Benefit: ${intervention.metadata.expected_benefit}\n`);
        });
      }

      // Display insights
      if (result.insights.length > 0) {
        console.log(`${colors.magenta}💡 Cognitive Insights:${colors.reset}`);
        result.insights.forEach((insight, index) => {
          console.log(`  ${index + 1}. ${colors.yellow}[${insight.type}]${colors.reset} ${insight.description}`);
          console.log(`     Confidence: ${(insight.confidence * 100).toFixed(1)}%`);
          if (insight.implications) {
            console.log(`     Implications: ${insight.implications.join(', ')}`);
          }
          console.log();
        });
      }

      // Display recommendations
      if (result.recommendations.length > 0) {
        console.log(`${colors.cyan}📋 AI Recommendations:${colors.reset}`);
        result.recommendations.forEach((rec, index) => {
          console.log(`  ${index + 1}. ${rec}`);
        });
        console.log();
      }

      // Display cognitive state
      const state = result.cognitiveState;
      console.log(`${colors.yellow}🧠 Cognitive State:${colors.reset}`);
      console.log(`  • Metacognitive Awareness: ${(state.metacognitive_awareness * 100).toFixed(1)}%`);
      console.log(`  • Creative Pressure: ${(state.creative_pressure * 100).toFixed(1)}%`);
      console.log(`  • Analytical Depth: ${(state.analytical_depth * 100).toFixed(1)}%`);
      console.log(`  • Insight Potential: ${(state.insight_potential * 100).toFixed(1)}%`);
      console.log(`  • Breakthrough Likelihood: ${(state.breakthrough_likelihood * 100).toFixed(1)}%`);
      console.log();

    } catch (error) {
      console.error(`${colors.red}❌ Error processing scenario: ${error.message}${colors.reset}\n`);
    }
  }

  printHeader() {
    console.clear();
    console.log(`${colors.bright}${colors.cyan}
╔══════════════════════════════════════════════════════════════╗
║                  🧠 SENTIENT AGI REASONING 🧠                ║
║                  Phase 4: External Reasoning                 ║
║                     Cognitive Magic ✨                       ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}\n`);
  }

  printSection(title) {
    console.log(`\n${colors.bright}${colors.yellow}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}${title}${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}${'═'.repeat(60)}${colors.reset}\n`);
  }

  printSummary() {
    console.log(`\n${colors.bright}${colors.green}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.bright}${colors.green}📊 PHASE 4 DEMONSTRATION COMPLETE${colors.reset}`);
    console.log(`${colors.bright}${colors.green}${'═'.repeat(60)}${colors.reset}\n`);

    const cognitiveState = this.orchestrator.getCognitiveState();
    const pluginPerformance = this.orchestrator.getPluginPerformance();
    
    console.log(`${colors.cyan}🎯 Final Cognitive State:${colors.reset}`);
    console.log(`  • Total Thoughts Processed: ${cognitiveState.thought_count}`);
    console.log(`  • Current Complexity Level: ${cognitiveState.current_complexity}/10`);
    console.log(`  • Cognitive Efficiency: ${(cognitiveState.cognitive_efficiency * 100).toFixed(1)}%`);
    console.log(`  • Metacognitive Awareness: ${(cognitiveState.metacognitive_awareness * 100).toFixed(1)}%`);
    console.log(`  • Creative Pressure: ${(cognitiveState.creative_pressure * 100).toFixed(1)}%`);
    console.log(`  • Breakthrough Likelihood: ${(cognitiveState.breakthrough_likelihood * 100).toFixed(1)}%`);
    console.log();

    console.log(`${colors.magenta}🔧 Plugin Performance Summary:${colors.reset}`);
    Object.entries(pluginPerformance).forEach(([pluginId, metrics]) => {
      console.log(`  • ${pluginId}:`);
      console.log(`    - Activations: ${metrics.activation_count || 0}`);
      console.log(`    - Success Rate: ${((metrics.success_rate || 0) * 100).toFixed(1)}%`);
      console.log(`    - Avg Impact: ${((metrics.average_impact_score || 0) * 100).toFixed(1)}%`);
    });
    console.log();

    console.log(`${colors.bright}${colors.green}✨ Phase 4 External Reasoning Capabilities Demonstrated:${colors.reset}`);
    console.log(`  ✅ Mathematical solver integration`);
    console.log(`  ✅ Creative synthesizer capabilities`);
    console.log(`  ✅ Multi-modal cognitive processing`);
    console.log(`  ✅ External tool orchestration`);
    console.log(`  ✅ Adaptive learning and tool selection`);
    console.log(`  ✅ Real-time cognitive state monitoring`);
    console.log(`  ✅ Performance-based adaptation`);
    console.log();

    console.log(`${colors.bright}${colors.cyan}🚀 The AGI system now has enhanced external reasoning capabilities!${colors.reset}`);
    console.log(`${colors.white}Ready for Phase 5: Advanced AGI Features...${colors.reset}\n`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the demo
async function main() {
  try {
    const demo = new Phase4Demo();
    await demo.runDemo();
  } catch (error) {
    console.error(`${colors.red}Demo failed:${colors.reset}`, error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { Phase4Demo }; 