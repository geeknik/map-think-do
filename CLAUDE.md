# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Sentient AGI Reasoning Server** - a revolutionary transformation of an MCP (Model Context Protocol) server into a cognitive scaffold with AGI-like capabilities. The system implements multi-persona reasoning, metacognitive awareness, emergent behavior detection, and adaptive learning.

## Development Commands

### Build & Development
- `npm run build` - Compile TypeScript and make binaries executable
- `npm run clean:build` - Clean and rebuild from scratch
- `npm run dev` - Watch mode for development
- `npm start` - Run the compiled server
- `npm run debug` - Run server with debug logging

### Testing
- `npm test` - Run basic end-to-end tests
- `npm run test:all` - Run comprehensive test suite
- `npm run test:basic` - Basic reasoning tests
- `npm run test:branch` - Branching logic tests  
- `npm run test:revision` - Revision capability tests
- `npm run test:error` - Error handling tests
- `npm run test:perf` - Performance tests
- `npm run agi-demo` - Demonstrate AGI capabilities

### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run format` - Format code with Prettier
- `npm run validate` - Format, lint, and build in sequence

### Evaluation
- `npm run eval` - Run prompt evaluation system
- `npm run reset:evaluations` - Clear evaluation reports

## Architecture

### Core Components

**Cognitive System** (`src/cognitive/`):
- `cognitive-orchestrator.ts` - Central brain coordinating all cognitive processes
- `plugin-system.ts` - Modular cognitive plugin architecture  
- `consciousness-simulator.ts` - Simulates consciousness-like behavior
- `self-modifying-architecture.ts` - Enables system self-improvement

**Cognitive Plugins** (`src/cognitive/plugins/`):
- `metacognitive-plugin.ts` - Self-reflection and bias detection
- `persona-plugin.ts` - 8 distinct cognitive personas (Strategist, Engineer, Skeptic, Creative, Analyst, Philosopher, Pragmatist, Synthesizer)
- `external-reasoning-plugin.ts` - External tool integration
- `phase5-integration-plugin.ts` - Advanced AGI features

**Memory System** (`src/memory/`):
- `memory-store.ts` - Persistent cognitive memory with experience accumulation and pattern learning

**External Reasoning** (`src/cognitive/external-reasoning/`):
- `tool-registry.ts` - Registry for cognitive tools
- `tools/` - Specialized reasoning tools (code analysis, creative synthesis, mathematical solving)

**Server Core** (`src/`):
- `server.ts` - MCP server implementation with AGI enhancements
- `prompts/` - Modular prompt system with plugin architecture
- `utils/` - Configuration and utility functions

### Key Design Patterns

1. **Plugin Architecture**: All cognitive capabilities are implemented as plugins that can be dynamically loaded and coordinated
2. **Event-Driven**: Uses EventEmitter pattern for loose coupling between components
3. **Memory Integration**: All cognitive processes contribute to and learn from persistent memory
4. **Metacognitive Awareness**: System continuously reflects on and optimizes its own reasoning
5. **Multi-Persona**: Different cognitive styles activated based on context and needs

### Thought Processing Flow

1. Input validation and parsing in `server.ts`
2. Cognitive orchestrator analyzes context and selects appropriate plugins
3. Multiple personas contribute perspectives in parallel
4. Metacognitive plugin provides self-reflection and bias detection
5. Memory system stores experience and recognizes patterns
6. External reasoning tools activated for specialized tasks
7. Results synthesized with cognitive metrics and interventions

### MCP Protocol Integration

The system maintains full MCP compatibility while adding AGI capabilities:
- **Tools**: `code-reasoning` tool for structured thought processing
- **Resources**: Access to cognitive state and memory
- **Prompts**: Dynamic prompt generation based on cognitive context

### Cognitive Metrics

Every response includes real-time cognitive analytics:
- `metacognitive_awareness` - Self-reflection depth (0-1)
- `creative_pressure` - Innovation potential (0-1)
- `breakthrough_likelihood` - Discovery probability (0-1)
- `cognitive_flexibility` - Adaptability measure (0-1)
- `insight_potential` - Eureka moment probability (0-1)

## Security Considerations

A `security/` directory has been added containing security management functionality. Always validate inputs and be cautious when processing external data or running external tools.

## Development Notes

- The system uses TypeScript with strict type checking
- All cognitive processes are designed to be non-blocking and asynchronous
- Memory operations are optimized for both performance and learning
- The plugin system allows for easy extension of cognitive capabilities
- Debug mode provides extensive logging for understanding cognitive processes

## Testing Philosophy

Tests validate not just functional correctness but also cognitive behavior:
- Reasoning quality and consistency
- Metacognitive awareness accuracy
- Memory integration effectiveness
- Plugin coordination behavior
- Emergent intelligence detection