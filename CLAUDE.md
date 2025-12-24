# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **Map. Think. Do.** - An MCP (Model Context Protocol) server that provides structured cognitive reasoning capabilities. The system helps you:

- **Map** - Break down complex problems into understandable parts
- **Think** - Reason through solutions using multiple cognitive perspectives
- **Do** - Execute with confidence through structured, trackable reasoning

The system implements multi-persona reasoning, metacognitive awareness, bias detection, and adaptive learning.

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

- `cognitive-orchestrator.ts` - Central coordinator for all cognitive processes
- `plugin-system.ts` - Modular cognitive plugin architecture
- `learning-manager.ts` - Multi-armed bandit strategy selection and adaptive learning
- `bias-detector.ts` - Cognitive bias detection with outcome-based learning

**Cognitive Plugins** (`src/cognitive/plugins/`):

- `metacognitive-plugin.ts` - Self-reflection and bias detection
- `persona-plugin.ts` - 8 cognitive perspectives (Strategist, Engineer, Skeptic, Creative, Analyst, Philosopher, Pragmatist, Synthesizer)
- `external-reasoning-plugin.ts` - External tool integration

**Memory System** (`src/memory/`):

- `sqlite-store.ts` - Persistent memory with TF-IDF search and intelligent retrieval
- `memory-store.ts` - Memory interface with experience accumulation and pattern learning

**External Reasoning** (`src/cognitive/external-reasoning/`):

- `tool-registry.ts` - Registry for cognitive tools
- `tools/` - Specialized reasoning tools (code analysis, creative synthesis, mathematical solving)

**MCP Integration** (`src/cognitive/`):

- `mcp-manager.ts` - External MCP server coordination
- `real-mcp-client.ts` - Client for connecting to other MCP servers

**Server Core** (`src/`):

- `server.ts` - MCP server implementation
- `prompts/` - Modular prompt system with plugin architecture
- `utils/` - Configuration and utility functions

### Key Design Patterns

1. **Plugin Architecture**: All cognitive capabilities are implemented as plugins that can be dynamically loaded and coordinated
2. **Event-Driven**: Uses EventEmitter pattern for loose coupling between components
3. **Memory Integration**: All cognitive processes contribute to and learn from persistent memory
4. **Metacognitive Awareness**: System continuously reflects on and optimizes its own reasoning
5. **Multi-Persona**: Different cognitive perspectives activated based on context and needs

### Thought Processing Flow

1. Input validation and parsing in `server.ts`
2. Bias detection analyzes thought for cognitive biases
3. Cognitive orchestrator selects appropriate plugins and strategies
4. Multiple personas contribute perspectives in parallel
5. Memory system stores experience and recognizes patterns
6. External reasoning tools activated for specialized tasks
7. Results synthesized with cognitive metrics and recommendations

### MCP Protocol Integration

The system maintains full MCP compatibility:

- **Tools**: `code-reasoning` tool for structured thought processing
- **Resources**: Access to cognitive state and memory
- **Prompts**: Dynamic prompt generation based on cognitive context

### Cognitive Metrics

Every response includes real-time cognitive analytics:

- `metacognitive_awareness` - Self-reflection depth (0-1)
- `breakthrough_likelihood` - Discovery probability (0-1)
- `cognitive_flexibility` - Adaptability measure (0-1)
- `detected_biases` - Cognitive biases found in reasoning
- `recommended_external_tools` - Suggested tools from connected MCP servers

## Data Storage

All persistent data is stored in `~/.map-think-do/`:

- `memory.db` - SQLite database for thoughts, sessions, and learning
- `mcp-servers.json` - Configuration for external MCP server connections
- `plugins/` - Dynamic cognitive plugins

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
- Bias detection accuracy
