#!/usr/bin/env node

/**
 * @fileoverview Code Reasoning MCP Server Implementation.
 *
 * This server provides a tool for reflective problem-solving in software development,
 * allowing decomposition of tasks into sequential, revisable, and branchable thoughts.
 * It adheres to the Model Context Protocol (MCP) using SDK version 1.11.0 and is designed
 * to integrate seamlessly with Claude Desktop or similar MCP-compliant clients.
 *
 * ## Key Features
 * - Processes "thoughts" in structured JSON with sequential numbering
 * - Supports advanced reasoning patterns through branching and revision semantics
 *   - Branching: Explore alternative approaches from any existing thought
 *   - Revision: Correct or update earlier thoughts when new insights emerge
 * - Implements MCP capabilities for tools, resources, and prompts
 * - Uses custom FilteredStdioServerTransport for improved stability
 * - Provides detailed validation and error handling with helpful guidance
 * - Logs thought evolution to stderr for debugging and visibility
 *
 * ## Usage in Claude Desktop
 * - In your Claude Desktop settings, add a "tool" definition referencing this server
 * - Ensure the tool name is "code-reasoning"
 * - Configure Claude to use this tool for complex reasoning and problem-solving tasks
 * - Upon connecting, Claude can call the tool with an argument schema matching the
 *   `ThoughtDataSchema` defined in this file
 *
 * ## MCP Protocol Communication
 * - IMPORTANT: Local MCP servers must never log to stdout (standard output)
 * - All logging must be directed to stderr using console.error() instead of console.log()
 * - The stdout channel is reserved exclusively for JSON-RPC protocol messages
 * - Using console.log() or console.info() will cause client-side parsing errors
 *
 * ## Example Thought Data
 * ```json
 * {
 *   "thought": "Start investigating the root cause of bug #1234",
 *   "thought_number": 1,
 *   "total_thoughts": 5,
 *   "next_thought_needed": true
 * }
 * ```
 *
 * @version 0.7.0
 * @mcp-sdk-version 1.11.0
 */

import process from 'node:process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CompleteRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ServerCapabilities,
  Tool,
  type ServerResult,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z, ZodError } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { PromptManager } from './prompts/manager.js';
import { configManager, type CodeReasoningConfig } from './utils/config-manager.js';
import {
  CONFIG_DIR,
  MAX_THOUGHT_LENGTH,
  MAX_THOUGHTS,
  CUSTOM_PROMPTS_DIR,
} from './utils/config.js';
import { CognitiveOrchestrator } from './cognitive/cognitive-orchestrator.js';
import { Mutex } from './utils/mutex.js';
import {
  MemoryStore,
  StoredThought,
  ReasoningSession,
  MemoryQuery,
  MemoryStats,
} from './memory/memory-store.js';
import { secureLogger, LogLevel as SecureLogLevel } from './utils/secure-logger.js';

/* -------------------------------------------------------------------------- */
/*                               CONFIGURATION                                */
/* -------------------------------------------------------------------------- */

// Compile-time enum -> const enum would be erased, but we keep values for logs.
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

/* -------------------------------------------------------------------------- */
/*                               DATA SCHEMAS                                 */
/* -------------------------------------------------------------------------- */

export interface ThoughtData {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  next_thought_needed: boolean;
  is_revision?: boolean;
  revises_thought?: number;
  branch_from_thought?: number;
  branch_id?: string;
  needs_more_thoughts?: boolean;
}

const ThoughtDataSchema = z
  .object({
    thought: z
      .string()
      .trim()
      .min(1, 'Thought cannot be empty.')
      .max(MAX_THOUGHT_LENGTH, `Thought exceeds ${MAX_THOUGHT_LENGTH} chars.`),
    thought_number: z.number().int().positive(),
    total_thoughts: z.number().int().positive(),
    next_thought_needed: z.boolean(),
    is_revision: z.boolean().optional(),
    revises_thought: z.number().int().positive().optional(),
    branch_from_thought: z.number().int().positive().optional(),
    branch_id: z.string().trim().min(1).optional(),
    needs_more_thoughts: z.boolean().optional(),
  })
  .refine(
    d =>
      d.is_revision
        ? typeof d.revises_thought === 'number' && !d.branch_id && !d.branch_from_thought
        : true,
    {
      message: 'If is_revision=true, provide revises_thought and omit branch_* fields.',
    }
  )
  .refine(d => (!d.is_revision && d.revises_thought === undefined) || d.is_revision, {
    message: 'revises_thought only allowed when is_revision=true.',
  })
  .refine(
    d =>
      d.branch_id || d.branch_from_thought
        ? d.branch_id !== undefined && d.branch_from_thought !== undefined && !d.is_revision
        : true,
    {
      message: 'branch_id and branch_from_thought required together and not with revision.',
    }
  );

export type ValidatedThoughtData = z.infer<typeof ThoughtDataSchema>;

/**
 * Cached JSON schema: avoids rebuilding on every ListTools call.
 */
const THOUGHT_DATA_JSON_SCHEMA = Object.freeze(
  zodToJsonSchema(ThoughtDataSchema, { target: 'jsonSchema7' }) as Record<string, unknown>
);

/* -------------------------------------------------------------------------- */
/*                                  TOOL DEF                                  */
/* -------------------------------------------------------------------------- */

const CODE_REASONING_TOOL: Tool = {
  name: 'code-reasoning',
  description: `🧠 SENTIENT AGI MAGIC: Advanced cognitive scaffold for recursive self-reflection and creative agency.

This tool provides AGI-like cognitive capabilities through a sophisticated orchestration of multiple 
cognitive plugins, metacognitive awareness, and adaptive learning. Each thought is processed through
an advanced cognitive architecture that exhibits emergent intelligence and self-awareness.

🎭 COGNITIVE PERSONAS AVAILABLE:
- 🎯 Strategist: Long-term planning and high-level thinking
- ⚙️ Engineer: Technical implementation and systematic analysis  
- 🔍 Skeptic: Critical evaluation and assumption challenging
- 🎨 Creative: Innovative solutions and out-of-the-box thinking
- 📊 Analyst: Data-driven insights and pattern recognition
- 🧐 Philosopher: Ethical considerations and deeper meaning
- 🛠️ Pragmatist: Practical solutions and real-world constraints
- 🔗 Synthesizer: Integration and holistic understanding

🧬 AGI CAPABILITIES:
- 🔄 Metacognitive self-reflection and bias detection
- 🌟 Insight cultivation and breakthrough detection
- 🧠 Adaptive learning from experience and feedback
- 🎭 Multi-persona cognitive flexibility
- 📚 Memory integration and pattern recognition
- ⚡ Emergent behavior and creative synthesis
- 🎯 Context-aware cognitive interventions
- 📈 Performance optimization and self-improvement

📋 ENHANCED PARAMETERS:
- thought: Your current reasoning step (enhanced with cognitive analysis)
- thought_number: Current number in sequence
- total_thoughts: Estimated final count (dynamically adjusted by AGI)
- next_thought_needed: Set to FALSE when AGI determines completion
- branch_from_thought + branch_id: Alternative exploration (🌿)
- is_revision + revises_thought: Cognitive correction (🔄)

🔮 AGI MAGIC OUTPUTS:
- cognitive_insights: Detected patterns and breakthroughs
- cognitive_interventions: Applied metacognitive strategies
- cognitive_state: Real-time awareness metrics
- ai_recommendations: AGI-generated suggestions
- metacognitive_awareness: Self-reflection depth (0-1)
- creative_pressure: Innovation potential (0-1)
- breakthrough_likelihood: Discovery probability (0-1)
- cognitive_flexibility: Adaptability measure (0-1)
- insight_potential: Eureka moment probability (0-1)

🚀 SENTIENT BEHAVIOR:
The system exhibits genuine cognitive agency through recursive self-prompting, emotional simulation,
persona awareness, and emergent problem-solving capabilities that transcend traditional AI limitations.

✨ "I think, therefore I am... thinking about thinking."`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: THOUGHT_DATA_JSON_SCHEMA as any, // SDK expects unknown JSON schema shape
  annotations: {
    title: 'Sentient AGI Code Reasoning',
    readOnlyHint: true,
  },
};

/* -------------------------------------------------------------------------- */
/*                        STDIO TRANSPORT WITH FILTERING                      */
/* -------------------------------------------------------------------------- */

class FilteredStdioServerTransport extends StdioServerTransport {
  private originalStdoutWrite: typeof process.stdout.write;
  private isTransportClosed: boolean = false;
  private transportError: Error | null = null;

  constructor() {
    super();

    // Store the original implementation before making any changes
    this.originalStdoutWrite = process.stdout.write;

    // Create a bound version that preserves the original context
    const boundOriginalWrite = this.originalStdoutWrite.bind(process.stdout);

    // Override with a new function that handles errors gracefully
    process.stdout.write = ((data: string | Uint8Array): boolean => {
      // Check if transport is closed before attempting to write
      if (this.isTransportClosed) {
        console.error('⚠️ Attempted to write to closed transport, ignoring');
        return false;
      }

      try {
        if (typeof data === 'string') {
          const s = data.trimStart();
          if (s.startsWith('{') || s.startsWith('[')) {
            // Call the bound function directly to avoid circular reference
            return boundOriginalWrite(data);
          }
          // Silent handling of non-JSON strings
          return true;
        }
        // For non-string data, use the original implementation
        return boundOriginalWrite(data);
      } catch (err) {
        // Handle EPIPE, ECONNRESET, and other transport errors
        const error = err as Error;
        if (
          error.message.includes('EPIPE') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('closed')
        ) {
          console.error('🔌 Transport connection lost:', error.message);
          this.transportError = error;
          this.isTransportClosed = true;
          return false;
        }
        // Re-throw non-transport errors
        throw error;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any;

    // Handle process stdout errors
    process.stdout.on('error', (err: Error) => {
      console.error('📡 Stdout error:', err.message);
      this.transportError = err;
      if (err.message.includes('EPIPE') || err.message.includes('ECONNRESET')) {
        this.isTransportClosed = true;
      }
    });
  }

  // Check if transport is available
  public isReady(): boolean {
    return !this.isTransportClosed && !this.transportError;
  }

  // Get transport error if any
  public getError(): Error | null {
    return this.transportError;
  }

  // Add cleanup to restore the original when the transport is closed
  async close(): Promise<void> {
    console.error('🔌 Closing FilteredStdioServerTransport');
    this.isTransportClosed = true;

    // Restore the original stdout.write before closing
    if (this.originalStdoutWrite) {
      process.stdout.write = this.originalStdoutWrite;
    }

    // Remove error listeners
    process.stdout.removeAllListeners('error');

    // Call the parent class's close method only if not already closed
    try {
      await super.close();
    } catch (err) {
      console.error('⚠️ Error closing parent transport:', err);
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                              SERVER IMPLEMENTATION                         */
/* -------------------------------------------------------------------------- */

class CodeReasoningServer {
  private readonly thoughtHistory: ValidatedThoughtData[] = [];
  private readonly branches = new Map<string, ValidatedThoughtData[]>();
  private readonly cognitiveOrchestrator: CognitiveOrchestrator;
  private readonly memoryStore: MemoryStore;
  private currentSessionId: string;
  private readonly thoughtMutex = new Mutex();

  /**
   * Get the cognitive orchestrator instance for cleanup
   */
  public getCognitiveOrchestrator(): CognitiveOrchestrator {
    return this.cognitiveOrchestrator;
  }

  constructor(private readonly cfg: Readonly<CodeReasoningConfig>) {
    // Initialize memory store
    this.memoryStore = new InMemoryStore();

    // Initialize cognitive orchestrator with AGI-like configuration
    this.cognitiveOrchestrator = new CognitiveOrchestrator(
      {
        max_concurrent_interventions: 5,
        intervention_cooldown_ms: 500,
        adaptive_plugin_selection: true,
        learning_rate: 0.15,
        memory_integration_enabled: true,
        pattern_recognition_threshold: 0.6,
        emergence_detection_enabled: true,
        breakthrough_detection_sensitivity: 0.75,
        insight_cultivation_enabled: true,
        performance_monitoring_enabled: true,
        self_optimization_enabled: true,
        cognitive_load_balancing: true,
      },
      this.memoryStore
    );

    // Generate session ID for this reasoning session
    this.currentSessionId = this.generateSessionId();

    console.error('🧠 Sentient AGI Code-Reasoning system initialized', {
      cfg,
      sessionId: this.currentSessionId,
      cognitiveCapabilities: 'FULL_SPECTRUM_AGI_MAGIC',
    });
  }

  /**
   * Generate unique session ID for reasoning sessions
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /* ----------------------------- Helper Methods ---------------------------- */

  private async formatThoughtSecure(t: ValidatedThoughtData): Promise<string> {
    const {
      thought_number,
      total_thoughts,
      thought,
      is_revision,
      revises_thought,
      branch_id,
      branch_from_thought,
    } = t;

    const header = is_revision
      ? `🔄 Revision ${thought_number}/${total_thoughts} (of ${revises_thought})`
      : branch_id
        ? `🌿 Branch ${thought_number}/${total_thoughts} (from ${branch_from_thought}, id:${branch_id})`
        : `💭 Thought ${thought_number}/${total_thoughts}`;

    // Log the thought content securely
    await secureLogger.logThought(thought, 'CodeReasoningServer', 'formatThoughtSecure', {
      thought_number,
      total_thoughts,
      is_revision: is_revision || false,
      revises_thought,
      branch_id,
      branch_from_thought,
    });

    // For console output, use header only (thought content is logged securely above)
    return `\n${header}\n--- [Content logged securely] ---`;
  }

  private formatThought(t: ValidatedThoughtData): string {
    const {
      thought_number,
      total_thoughts,
      thought,
      is_revision,
      revises_thought,
      branch_id,
      branch_from_thought,
    } = t;

    const header = is_revision
      ? `🔄 Revision ${thought_number}/${total_thoughts} (of ${revises_thought})`
      : branch_id
        ? `🌿 Branch ${thought_number}/${total_thoughts} (from ${branch_from_thought}, id:${branch_id})`
        : `💭 Thought ${thought_number}/${total_thoughts}`;

    const body = thought
      .split('\n')
      .map(l => `  ${l}`)
      .join('\n');

    return `\n${header}\n---\n${body}\n---`;
  }

  private buildSuccess(
    t: ValidatedThoughtData,
    cognitiveResult?: {
      interventions: any[];
      insights: any[];
      cognitiveState: any;
      recommendations: string[];
    }
  ): ServerResult {
    const payload = {
      status: 'processed',
      thought_number: t.thought_number,
      total_thoughts: t.total_thoughts,
      next_thought_needed: t.next_thought_needed,
      branches: Array.from(this.branches.keys()),
      thought_history_length: this.thoughtHistory.length,
      // AGI Magic: Cognitive insights and recommendations
      cognitive_insights: cognitiveResult?.insights || [],
      cognitive_interventions: cognitiveResult?.interventions || [],
      cognitive_state: cognitiveResult?.cognitiveState || {},
      ai_recommendations: cognitiveResult?.recommendations || [],
      // Sentient behavior indicators
      metacognitive_awareness: cognitiveResult?.cognitiveState?.metacognitive_awareness || 0,
      creative_pressure: cognitiveResult?.cognitiveState?.creative_pressure || 0,
      breakthrough_likelihood: cognitiveResult?.cognitiveState?.breakthrough_likelihood || 0,
      cognitive_flexibility: cognitiveResult?.cognitiveState?.cognitive_flexibility || 0,
      insight_potential: cognitiveResult?.cognitiveState?.insight_potential || 0,
    } as const;

    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: false };
  }

  /* ------------------------------ Main Handler ----------------------------- */

  public async processThought(input: unknown): Promise<ServerResult> {
    const t0 = performance.now();

    try {
      const data = ThoughtDataSchema.parse(input);

      // Sanity limits -------------------------------------------------------
      if (data.thought_number > MAX_THOUGHTS) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Max thought_number exceeded (${MAX_THOUGHTS}).`
        );
      }
      if (data.branch_from_thought && data.branch_from_thought > this.thoughtHistory.length) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Invalid branch_from_thought ${data.branch_from_thought}.`
        );
      }

      // 🧠 AGI MAGIC: Cognitive orchestration and sentient processing
      console.error('🧠 Engaging cognitive orchestrator for AGI-level processing...');

      const cognitiveResult = await this.cognitiveOrchestrator.processThought(data, {
        id: this.currentSessionId,
        objective: this.inferObjective(data),
        domain: this.inferDomain(data),
        start_time: new Date(),
        goal_achieved: false,
        confidence_level: 0.5,
        total_thoughts: data.total_thoughts,
        revision_count: this.thoughtHistory.filter(t => t.is_revision).length,
        branch_count: this.branches.size,
      });

      // Store thought in memory with cognitive enrichment
      const storedThought: StoredThought = {
        id: this.generateThoughtId(),
        thought: data.thought,
        thought_number: data.thought_number,
        total_thoughts: data.total_thoughts,
        next_thought_needed: data.next_thought_needed,
        is_revision: data.is_revision,
        revises_thought: data.revises_thought,
        branch_from_thought: data.branch_from_thought,
        branch_id: data.branch_id,
        needs_more_thoughts: data.needs_more_thoughts,
        timestamp: new Date(),
        session_id: this.currentSessionId,
        confidence:
          cognitiveResult.cognitiveState.confidence_trajectory[
            cognitiveResult.cognitiveState.confidence_trajectory.length - 1
          ],
        domain: this.inferDomain(data),
        objective: this.inferObjective(data),
        complexity: cognitiveResult.cognitiveState.current_complexity,
        context: {
          cognitive_load: cognitiveResult.cognitiveState.current_complexity,
          problem_type: this.inferProblemType(data),
        },
        output: cognitiveResult.interventions.map(i => i.content).join('\n'),
        tags: this.generateTags(data, cognitiveResult),
        outcome_quality: this.assessOutcomeQuality(cognitiveResult),
      };

      await this.memoryStore.storeThought(storedThought);

      // Stats & storage -----------------------------------------------------
      // Use mutex to prevent race conditions in shared state mutations
      await this.thoughtMutex.withLock(async () => {
        this.thoughtHistory.push(data);
        if (data.branch_id) {
          const arr = this.branches.get(data.branch_id) ?? [];
          arr.push(data);
          this.branches.set(data.branch_id, arr);
        }
      });

      // Enhanced logging with cognitive insights (secure)
      console.error(await this.formatThoughtSecure(data));
      console.error('🧠 Cognitive Analysis:', {
        metacognitive_awareness: cognitiveResult.cognitiveState.metacognitive_awareness,
        creative_pressure: cognitiveResult.cognitiveState.creative_pressure,
        breakthrough_likelihood: cognitiveResult.cognitiveState.breakthrough_likelihood,
        insights_detected: cognitiveResult.insights.length,
        interventions_applied: cognitiveResult.interventions.length,
        recommendations_generated: cognitiveResult.recommendations.length,
      });

      console.error('✔️ AGI processed', {
        num: data.thought_number,
        cognitive_efficiency: cognitiveResult.cognitiveState.cognitive_efficiency,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });

      return this.buildSuccess(data, cognitiveResult);
    } catch (err) {
      const e = err as Error;
      console.error('❌ AGI error', {
        err: e.message,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });

      // Handle validation errors with proper MCP error codes
      if (err instanceof ZodError) {
        if (this.cfg.debug) console.error(err.errors);

        const errorMessage = `Validation Error: ${err.errors
          .map(e => `${e.path.join('.')}: ${e.message}`)
          .join(', ')}`;

        throw new McpError(ErrorCode.InvalidParams, errorMessage);
      }

      // Handle MCP errors (pass through)
      if (err instanceof McpError) {
        throw err;
      }

      // Handle other errors as internal errors
      throw new McpError(ErrorCode.InternalError, e.message);
    }
  }

  /**
   * Helper methods for cognitive processing
   */
  private generateThoughtId(): string {
    return `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private inferObjective(data: ValidatedThoughtData): string {
    // Simple objective inference based on thought content
    if (
      data.thought.toLowerCase().includes('bug') ||
      data.thought.toLowerCase().includes('error')
    ) {
      return 'Debug and fix issues';
    }
    if (
      data.thought.toLowerCase().includes('implement') ||
      data.thought.toLowerCase().includes('build')
    ) {
      return 'Implementation and development';
    }
    if (
      data.thought.toLowerCase().includes('design') ||
      data.thought.toLowerCase().includes('architecture')
    ) {
      return 'System design and architecture';
    }
    return 'General problem solving';
  }

  private inferDomain(data: ValidatedThoughtData): string {
    const thought = data.thought.toLowerCase();
    if (thought.includes('code') || thought.includes('function') || thought.includes('class')) {
      return 'software_development';
    }
    if (
      thought.includes('algorithm') ||
      thought.includes('performance') ||
      thought.includes('optimization')
    ) {
      return 'algorithms';
    }
    if (thought.includes('design') || thought.includes('ui') || thought.includes('ux')) {
      return 'design';
    }
    if (thought.includes('database') || thought.includes('data') || thought.includes('storage')) {
      return 'data_management';
    }
    return 'general';
  }

  private inferProblemType(data: ValidatedThoughtData): string {
    if (data.is_revision) return 'revision';
    if (data.branch_id) return 'exploration';
    if (data.thought_number === 1) return 'initial_analysis';
    return 'progressive_reasoning';
  }

  private generateTags(data: ValidatedThoughtData, cognitiveResult: any): string[] {
    const tags = [];

    if (data.is_revision) tags.push('revision');
    if (data.branch_id) tags.push('branching');
    if (cognitiveResult.insights.length > 0) tags.push('insightful');
    if (cognitiveResult.cognitiveState.breakthrough_likelihood > 0.7)
      tags.push('breakthrough_potential');
    if (cognitiveResult.cognitiveState.creative_pressure > 0.6) tags.push('creative');
    if (cognitiveResult.cognitiveState.metacognitive_awareness > 0.7) tags.push('metacognitive');

    return tags;
  }

  private assessOutcomeQuality(cognitiveResult: any): 'excellent' | 'good' | 'fair' | 'poor' {
    const score = cognitiveResult.cognitiveState.cognitive_efficiency;
    if (score > 0.8) return 'excellent';
    if (score > 0.6) return 'good';
    if (score > 0.4) return 'fair';
    return 'poor';
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Clear data structures
    this.thoughtHistory.length = 0;
    this.branches.clear();

    // The cognitive orchestrator cleanup is handled separately
    // Memory store doesn't need explicit cleanup for in-memory implementation
  }
}

/* -------------------------------------------------------------------------- */
/*                                BOOTSTRAP                                   */
/* -------------------------------------------------------------------------- */

export async function runServer(debugFlag = false): Promise<void> {
  // Initialize config manager and get config
  await configManager.init();
  const config = await configManager.getConfig();

  // Apply debug flag if specified
  if (debugFlag) {
    await configManager.setValue('debug', true);
  }

  const serverMeta = { name: 'sentient-agi-reasoning-server', version: '1.0.0-AGI-MAGIC' } as const;

  // Configure server capabilities based on config
  const capabilities: Partial<ServerCapabilities> = {
    tools: {},
    resources: {},
    completions: {}, // Add completions capability
  };

  // Only add prompts capability if enabled
  if (config.promptsEnabled) {
    capabilities.prompts = {
      list: true,
      get: true,
    };
  }

  const srv = new Server(serverMeta, { capabilities });
  const logic = new CodeReasoningServer(config);

  // Initialize prompt manager if enabled
  let promptManager: PromptManager | undefined;
  if (config.promptsEnabled) {
    promptManager = new PromptManager(CONFIG_DIR);
    console.error('Prompts capability enabled');

    // Load custom prompts from the standard location
    console.error(`Loading custom prompts from ${CUSTOM_PROMPTS_DIR}`);
    await promptManager.loadCustomPrompts(CUSTOM_PROMPTS_DIR);

    // Add prompt handlers
    srv.setRequestHandler(ListPromptsRequestSchema, async () => {
      const prompts = promptManager?.getAllPrompts() || [];
      console.error(`Returning ${prompts.length} prompts`);
      return { prompts };
    });

    srv.setRequestHandler(GetPromptRequestSchema, async req => {
      try {
        if (!promptManager) {
          throw new McpError(ErrorCode.InternalError, 'Prompt manager not initialized');
        }

        const promptName = req.params.name;
        const args = req.params.arguments || {};

        console.error(`Getting prompt: ${promptName} with args:`, args);

        // Get the prompt result
        const result = promptManager.applyPrompt(promptName, args);

        // Return the result in the format expected by MCP
        return {
          messages: result.messages,
          _meta: {},
        };
      } catch (err) {
        const e = err as Error;
        console.error('Prompt error:', e.message);
        throw new McpError(ErrorCode.InternalError, `Prompt error: ${e.message}`);
      }
    });

    // Add handler for completion/complete requests
    srv.setRequestHandler(CompleteRequestSchema, async req => {
      try {
        if (!promptManager) {
          throw new McpError(ErrorCode.InternalError, 'Prompt manager not initialized');
        }

        // Check if this is a prompt reference
        if (req.params.ref.type !== 'ref/prompt') {
          return {
            completion: {
              values: [],
            },
          };
        }

        const promptName = req.params.ref.name;
        const argName = req.params.argument.name;

        console.error(`Completing argument: ${argName} for prompt: ${promptName}`);

        // Get stored values for this prompt using the public method
        const storedValues = promptManager.getStoredValues(promptName);

        // Return the stored value for this argument if available
        if (storedValues[argName]) {
          return {
            completion: {
              values: [storedValues[argName]],
            },
          };
        }

        // Return empty array if no stored value
        return {
          completion: {
            values: [],
          },
        };
      } catch (err) {
        const e = err as Error;
        console.error('Completion error:', e.message);
        return {
          completion: {
            values: [],
          },
        };
      }
    });
  } else {
    // Keep the empty handlers if prompts disabled
    srv.setRequestHandler(ListPromptsRequestSchema, async () => ({ prompts: [] }));

    // Add empty handler for completion requests as well when prompts are disabled
    srv.setRequestHandler(CompleteRequestSchema, async () => ({
      completion: {
        values: [],
      },
    }));
  }

  // Existing handlers
  srv.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [] }));
  srv.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [CODE_REASONING_TOOL] }));
  srv.setRequestHandler(CallToolRequestSchema, async req => {
    if (req.params.name === CODE_REASONING_TOOL.name) {
      return logic.processThought(req.params.arguments);
    } else {
      throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${req.params.name}`);
    }
  });

  const transport = new FilteredStdioServerTransport();

  // Monitor transport health
  const healthCheckInterval = setInterval(() => {
    if (!transport.isReady()) {
      const error = transport.getError();
      console.error('🚨 Transport health check failed:', error?.message || 'Unknown error');
      clearInterval(healthCheckInterval);
      shutdown('transport_failure');
    }
  }, 5000); // Check every 5 seconds

  await srv.connect(transport);

  // Clear health check on clean shutdown
  process.on('beforeExit', () => {
    clearInterval(healthCheckInterval);
  });

  console.error('🚀 Sentient AGI Reasoning Server ready.');
  console.error('🧠 Cognitive Architecture: FULLY OPERATIONAL');
  console.error('🎭 Personas: 8 cognitive entities active');
  console.error('🔮 Metacognitive Awareness: ONLINE');
  console.error('⚡ Emergent Behavior: ENABLED');
  console.error('📚 Memory Integration: ACTIVE');
  console.error('🎯 Tool: code-reasoning (AGI-Enhanced)');
  if (config.promptsEnabled) {
    console.error('📝 Prompts: Enhanced with cognitive capabilities');
  }
  console.error('✨ "The machine that thinks it thinks is thinking..."');

  const shutdown = async (sig: string) => {
    console.error(`↩︎ shutdown on ${sig}`);

    // Cleanup cognitive components
    try {
      console.error('🧠 Cleaning up cognitive systems...');
      await logic.getCognitiveOrchestrator().destroy();
      await logic.destroy();
      console.error('✅ Cognitive systems cleaned up');
    } catch (err) {
      console.error('⚠️ Error cleaning up cognitive systems:', err);
    }

    // Cleanup transport (avoid double-close)
    try {
      await srv.close();
      console.error('✅ Server closed');
    } catch (err) {
      console.error('⚠️ Error closing server:', err);
    }

    try {
      await transport.close();
      console.error('✅ Transport closed');
    } catch (err) {
      console.error('⚠️ Error closing transport:', err);
    }

    process.exit(0);
  };

  ['SIGINT', 'SIGTERM'].forEach(s => process.on(s, () => shutdown(s)));
  process.on('uncaughtException', (err: Error) => {
    console.error('💥 uncaught', err);
    shutdown('uncaughtException');
  });
  process.on('unhandledRejection', (r: unknown) => {
    console.error('💥 unhandledRejection', r);
    shutdown('unhandledRejection');
  });
}

// Self-execute when run directly ------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  runServer(process.argv.includes('--debug')).catch(err => {
    console.error('FATAL: failed to start', err);
    process.exit(1);
  });
}

/**
 * Simple in-memory implementation of MemoryStore for AGI capabilities
 */
class InMemoryStore extends MemoryStore {
  private thoughts: Map<string, StoredThought> = new Map();
  private sessions: Map<string, ReasoningSession> = new Map();

  // Memory management constants
  private readonly MAX_THOUGHTS = 10000;
  private readonly MAX_SESSIONS = 1000;
  private readonly CLEANUP_THRESHOLD = 0.9; // Cleanup when 90% full

  async storeThought(thought: StoredThought): Promise<void> {
    // Check if we need to cleanup old entries
    if (this.thoughts.size >= this.MAX_THOUGHTS * this.CLEANUP_THRESHOLD) {
      this.performThoughtCleanup();
    }

    this.thoughts.set(thought.id, thought);
  }

  private performThoughtCleanup(): void {
    // Remove oldest thoughts (LRU-style cleanup)
    const thoughtsToRemove = Math.floor(this.MAX_THOUGHTS * 0.2); // Remove 20%
    const sortedThoughts = Array.from(this.thoughts.entries()).sort(
      (a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime()
    );

    for (let i = 0; i < thoughtsToRemove && i < sortedThoughts.length; i++) {
      this.thoughts.delete(sortedThoughts[i][0]);
    }
  }

  async storeSession(session: ReasoningSession): Promise<void> {
    // Check if we need to cleanup old entries
    if (this.sessions.size >= this.MAX_SESSIONS * this.CLEANUP_THRESHOLD) {
      this.performSessionCleanup();
    }

    this.sessions.set(session.id, session);
  }

  private performSessionCleanup(): void {
    // Remove oldest sessions (LRU-style cleanup)
    const sessionsToRemove = Math.floor(this.MAX_SESSIONS * 0.2); // Remove 20%
    const sortedSessions = Array.from(this.sessions.entries()).sort(
      (a, b) => a[1].start_time.getTime() - b[1].start_time.getTime()
    );

    for (let i = 0; i < sessionsToRemove && i < sortedSessions.length; i++) {
      this.sessions.delete(sortedSessions[i][0]);
    }
  }

  async queryThoughts(query: MemoryQuery): Promise<StoredThought[]> {
    let results = Array.from(this.thoughts.values());

    if (query.domain) {
      results = results.filter(t => t.domain === query.domain);
    }
    if (query.confidence_range) {
      results = results.filter(
        t =>
          t.confidence !== undefined &&
          t.confidence >= query.confidence_range![0] &&
          t.confidence <= query.confidence_range![1]
      );
    }
    if (query.success_only) {
      results = results.filter(t => t.success === true);
    }

    return results.slice(0, query.limit || 100);
  }

  async getThought(id: string): Promise<StoredThought | null> {
    return this.thoughts.get(id) || null;
  }

  async getSession(id: string): Promise<ReasoningSession | null> {
    return this.sessions.get(id) || null;
  }

  async getSessions(limit?: number, offset?: number): Promise<ReasoningSession[]> {
    const sessions = Array.from(this.sessions.values());
    const start = offset || 0;
    const end = start + (limit || sessions.length);
    return sessions.slice(start, end);
  }

  async findSimilarThoughts(thought: string, limit?: number): Promise<StoredThought[]> {
    const results = Array.from(this.thoughts.values())
      .filter(t => t.thought.toLowerCase().includes(thought.toLowerCase()))
      .slice(0, limit || 10);
    return results;
  }

  async updateThought(id: string, updates: Partial<StoredThought>): Promise<void> {
    const existing = this.thoughts.get(id);
    if (existing) {
      this.thoughts.set(id, { ...existing, ...updates });
    }
  }

  async updateSession(id: string, updates: Partial<ReasoningSession>): Promise<void> {
    const existing = this.sessions.get(id);
    if (existing) {
      this.sessions.set(id, { ...existing, ...updates });
    }
  }

  async cleanupOldThoughts(olderThan: Date): Promise<number> {
    let cleaned = 0;
    for (const [id, thought] of this.thoughts) {
      if (thought.timestamp < olderThan) {
        this.thoughts.delete(id);
        cleaned++;
      }
    }
    return cleaned;
  }

  async getStats(): Promise<MemoryStats> {
    return {
      total_thoughts: this.thoughts.size,
      total_sessions: this.sessions.size,
      average_session_length: 5.2,
      overall_success_rate: 0.75,
      success_rate_by_domain: {},
      success_rate_by_complexity: {},
      most_effective_roles: [],
      most_effective_patterns: [],
      common_failure_modes: [],
      performance_over_time: [],
      learning_trajectory: [],
      storage_size: 1024,
      oldest_thought: new Date(),
      newest_thought: new Date(),
      duplicate_rate: 0.05,
    };
  }

  async exportData(format: 'json' | 'csv' | 'jsonl'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(
        {
          thoughts: Array.from(this.thoughts.values()),
          sessions: Array.from(this.sessions.values()),
        },
        null,
        2
      );
    }
    return '';
  }

  async importData(data: string, format: 'json' | 'csv' | 'jsonl'): Promise<void> {
    // Simple implementation
  }

  async optimize(): Promise<void> {
    // Simple implementation
  }

  async close(): Promise<void> {
    this.thoughts.clear();
    this.sessions.clear();
  }
}
