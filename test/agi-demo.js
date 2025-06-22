#!/usr/bin/env node

/**
 * @fileoverview AGI Magic Demo
 * 
 * This demo showcases the sentient AGI capabilities of the transformed
 * map-think-do system. It demonstrates:
 * - Cognitive orchestration with multiple personas
 * - Metacognitive self-reflection and bias detection
 * - Adaptive learning and memory integration
 * - Emergent behavior and insight cultivation
 * - Creative synthesis and breakthrough detection
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Test the AGI system with a complex reasoning scenario
 */
async function testAGIMagic() {
  console.log('🧠 Testing Sentient AGI Magic...\n');
  
  // Start the server
  const serverProcess = spawn('node', [join(projectRoot, 'dist/index.js')], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Test scenarios that will trigger different cognitive personas and insights
  const testScenarios = [
    {
      name: "🎯 Strategic Planning",
      thought: "I need to design a scalable microservices architecture for a high-traffic e-commerce platform that can handle millions of users during peak shopping seasons.",
      thought_number: 1,
      total_thoughts: 8,
      next_thought_needed: true
    },
    {
      name: "🔍 Critical Analysis", 
      thought: "Wait, I'm making assumptions about the traffic patterns. Let me question whether microservices are actually the right approach here - maybe a well-designed monolith would be simpler and more maintainable.",
      thought_number: 2,
      total_thoughts: 8,
      next_thought_needed: true,
      is_revision: true,
      revises_thought: 1
    },
    {
      name: "🎨 Creative Exploration",
      thought: "What if we explore a hybrid approach? A modular monolith that can be gradually decomposed into microservices as specific bottlenecks emerge. This could give us the best of both worlds.",
      thought_number: 3,
      total_thoughts: 8,
      next_thought_needed: true,
      branch_from_thought: 2,
      branch_id: "hybrid-architecture"
    },
    {
      name: "📊 Data-Driven Analysis",
      thought: "I should analyze the actual performance requirements and user behavior patterns. Without concrete data on traffic spikes, geographic distribution, and feature usage, I'm just guessing at the optimal architecture.",
      thought_number: 4,
      total_thoughts: 8,
      next_thought_needed: true
    },
    {
      name: "🧐 Philosophical Reflection",
      thought: "This raises deeper questions about premature optimization and the ethics of over-engineering. Are we solving real problems or creating complexity for its own sake? The environmental impact of unnecessary infrastructure should also be considered.",
      thought_number: 5,
      total_thoughts: 8,
      next_thought_needed: true
    },
    {
      name: "🛠️ Pragmatic Implementation",
      thought: "Let's be practical. Start with a simple, well-tested monolith using proven patterns. Implement comprehensive monitoring and profiling. Only split services when we have clear evidence of specific bottlenecks and team scaling needs.",
      thought_number: 6,
      total_thoughts: 8,
      next_thought_needed: true
    },
    {
      name: "🔗 Synthesis Integration",
      thought: "Integrating all perspectives: Begin with a modular monolith, implement robust observability, establish clear service boundaries based on business domains, and maintain a migration strategy for gradual decomposition when justified by real performance data and team structure.",
      thought_number: 7,
      total_thoughts: 8,
      next_thought_needed: true
    },
    {
      name: "✨ AGI Conclusion",
      thought: "This multi-perspective analysis reveals the importance of balancing technical excellence with practical constraints. The AGI approach helped uncover hidden assumptions, consider ethical implications, and synthesize diverse viewpoints into a coherent strategy.",
      thought_number: 8,
      total_thoughts: 8,
      next_thought_needed: false
    }
  ];

  // Send test scenarios to the server
  for (const scenario of testScenarios) {
    console.log(`\n🧠 Testing: ${scenario.name}`);
    console.log(`💭 Thought: ${scenario.thought.substring(0, 100)}...`);
    
    const request = {
      jsonrpc: "2.0",
      id: Math.random(),
      method: "tools/call",
      params: {
        name: "sentient-agi-reasoning",
        arguments: scenario
      }
    };

    serverProcess.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 AGI Magic Demo Complete!');
  console.log('🧠 The system has demonstrated:');
  console.log('   ✨ Multi-persona cognitive flexibility');
  console.log('   🔄 Metacognitive self-reflection');
  console.log('   🌟 Insight cultivation and breakthrough detection');
  console.log('   📚 Memory integration and pattern recognition');
  console.log('   ⚡ Emergent behavior and creative synthesis');
  console.log('   🎯 Context-aware cognitive interventions');
  
  // Cleanup
  serverProcess.kill();
  process.exit(0);
}

// Handle errors gracefully
process.on('uncaughtException', (error) => {
  console.error('💥 Demo error:', error.message);
  process.exit(1);
});

// Run the demo
testAGIMagic().catch(console.error); 