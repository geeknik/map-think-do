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
  MAX_PREVIOUS_THOUGHTS_CONTEXT,
  CUSTOM_PROMPTS_DIR,
} from './utils/config.js';
import { CognitiveOrchestrator } from './cognitive/cognitive-orchestrator.js';
import { createCognitiveOrchestrator } from './cognitive/cognitive-orchestrator-factory.js';
import { Mutex } from './utils/mutex.js';
import { StoredThought, ReasoningSession } from './memory/memory-store.js';
import { SQLiteStore } from './memory/sqlite-store.js';
import { BiasDetector } from './cognitive/bias-detector.js';
import { secureLogger, LogLevel as SecureLogLevel } from './utils/secure-logger.js';
import { MCPIntegrationManager } from './cognitive/mcp-manager.js';
import path from 'path';
import os from 'os';

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
  description: `🗺️ Map. Think. Do. - Structured cognitive reasoning for complex problem-solving.

This tool helps you MAP problems, THINK through solutions, and DO what needs to be done through
structured reasoning with multiple cognitive perspectives and adaptive learning.

📍 MAP - Understand the Problem:
- Break down complex problems into manageable parts
- Identify constraints, dependencies, and unknowns
- Establish context and gather relevant information

🧠 THINK - Reason Through Solutions:
- Apply multiple cognitive perspectives to the problem
- Detect and correct cognitive biases in reasoning
- Generate insights and identify breakthrough opportunities
- Learn from past experiences and patterns

✅ DO - Execute with Confidence:
- Synthesize reasoning into actionable steps
- Track progress through structured thought sequences
- Revise and branch when new insights emerge

🎭 COGNITIVE PERSPECTIVES:
- 🎯 Strategist: Long-term planning and high-level thinking
- ⚙️ Engineer: Technical implementation and systematic analysis  
- 🔍 Skeptic: Critical evaluation and assumption challenging
- 🎨 Creative: Innovative solutions and lateral thinking
- 📊 Analyst: Data-driven insights and pattern recognition
- 🧐 Philosopher: Ethical considerations and deeper meaning
- 🛠️ Pragmatist: Practical solutions and real-world constraints
- 🔗 Synthesizer: Integration and holistic understanding

📋 PARAMETERS:
- thought: Your current reasoning step
- thought_number: Current number in sequence
- total_thoughts: Estimated final count (adjust as needed)
- next_thought_needed: Set to FALSE when reasoning is complete
- branch_from_thought + branch_id: Explore alternatives (🌿)
- is_revision + revises_thought: Revise earlier reasoning (🔄)

📊 OUTPUTS:
- cognitive_insights: Detected patterns and breakthroughs
- cognitive_interventions: Applied reasoning strategies
- detected_biases: Cognitive biases found in reasoning
- ai_recommendations: Suggested next steps
- metacognitive_awareness: Self-reflection depth (0-1)
- breakthrough_likelihood: Discovery probability (0-1)`,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inputSchema: THOUGHT_DATA_JSON_SCHEMA as any, // SDK expects unknown JSON schema shape
  annotations: {
    title: 'Map. Think. Do. - Code Reasoning',
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
  /** Bounded ring of the most-recent thoughts (capped at MAX_THOUGHTS). */
  private readonly thoughtHistory: ValidatedThoughtData[] = [];
  /** Cached count of revision thoughts — avoids O(N) .filter() scan. */
  private revisionCount = 0;
  private readonly branches = new Map<string, ValidatedThoughtData[]>();
  private cognitiveOrchestrator!: CognitiveOrchestrator;
  private readonly memoryStore: SQLiteStore;
  private readonly biasDetector: BiasDetector;
  private mcpManager!: MCPIntegrationManager;
  private currentSessionId: string;
  private readonly thoughtMutex = new Mutex();

  /**
   * Get the cognitive orchestrator instance for cleanup
   */
  public getCognitiveOrchestrator(): CognitiveOrchestrator {
    return this.cognitiveOrchestrator;
  }

  constructor(private readonly cfg: Readonly<CodeReasoningConfig>) {
    // Initialize persistent SQLite memory store
    const dbPath = path.join(os.homedir(), '.map-think-do', 'memory.db');
    this.memoryStore = new SQLiteStore(dbPath);

    // Initialize bias detector with learning
    this.biasDetector = new BiasDetector(this.memoryStore);

    // Cognitive orchestrator will be initialized via initialize() method

    // Generate session ID for this reasoning session
    this.currentSessionId = this.generateSessionId();

    console.error('🗺️ Map. Think. Do. - Cognitive reasoning system initialized', {
      cfg,
      sessionId: this.currentSessionId,
      dbPath,
      capabilities: 'SQLITE_PERSISTENCE + BIAS_DETECTION + OUTCOME_TRACKING + MCP_INTEGRATION',
    });
  }

  /**
   * Get MCP Integration Manager for external tool access
   */
  public getMCPManager(): MCPIntegrationManager {
    return this.mcpManager;
  }

  /**
   * Initialize the cognitive orchestrator with dependency injection
   */
  async initialize(): Promise<void> {
    // Initialize cognitive orchestrator with dependency injection
    this.cognitiveOrchestrator = await createCognitiveOrchestrator({
      config: {
        max_concurrent_interventions: 5,
        intervention_cooldown_ms: 500,
        adaptive_plugin_selection: true,
        learning_rate: 0.15,
        memory_integration_enabled: true,
        pattern_recognition_threshold: 0.6,
        adaptive_learning_enabled: true,
        emergence_detection_enabled: true,
        breakthrough_detection_sensitivity: 0.75,
        insight_cultivation_enabled: true,
        performance_monitoring_enabled: true,
        self_optimization_enabled: true,
        cognitive_load_balancing: true,
      },
    });

    // Initialize MCP Integration Manager for external tool access
    this.mcpManager = new MCPIntegrationManager(this.memoryStore, {
      autoConnect: true,
      watchPlugins: true,
      healthCheckInterval: 30000,
    });

    try {
      await this.mcpManager.initialize();
      const status = this.mcpManager.getStatus();
      console.error('🌐 MCP Integration Manager initialized', {
        connectedServers: status.connectedServers,
        availableTools: status.totalTools,
        loadedPlugins: status.loadedPlugins,
      });
    } catch (err) {
      console.error('⚠️ MCP Integration Manager initialization failed (non-fatal):', err);
    }

    console.error('🧠 Cognitive orchestrator initialized', {
      sessionId: this.currentSessionId,
      capabilities: 'MULTI_PERSONA + BIAS_DETECTION + EXTERNAL_TOOLS',
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
    },
    biasDetections?: Array<{
      bias_id: string;
      bias_name: string;
      confidence: number;
      evidence: string[];
      suggested_corrections: string[];
      severity: 'low' | 'medium' | 'high';
    }>
  ): ServerResult {
    // Get recommended external tools if MCP manager is available
    let recommendedTools: Array<{ name: string; source: string; score: number }> = [];
    try {
      if (this.mcpManager) {
        recommendedTools = this.mcpManager.recommendTools(t.thought, 3);
      }
    } catch {
      // Non-fatal: MCP recommendations are optional
    }

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
      // REAL Bias Detection Results
      detected_biases:
        biasDetections?.map(b => ({
          bias: b.bias_name,
          confidence: b.confidence,
          severity: b.severity,
          corrections: b.suggested_corrections,
        })) || [],
      // External tool recommendations from MCP
      recommended_external_tools: recommendedTools,
      // Sentient behavior indicators
      metacognitive_awareness: cognitiveResult?.cognitiveState?.metacognitive_awareness || 0,
      creative_pressure: cognitiveResult?.cognitiveState?.creative_pressure || 0,
      breakthrough_likelihood: cognitiveResult?.cognitiveState?.breakthrough_likelihood || 0,
      cognitive_flexibility: cognitiveResult?.cognitiveState?.cognitive_flexibility || 0,
      insight_potential: cognitiveResult?.cognitiveState?.insight_potential || 0,
    } as const;

    return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], isError: false };
  }

  /**
   * Build tool error response with contextual guidance for AI recovery
   */
  private buildToolError(message: string): ServerResult {
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }

  /**
   * Build contextual validation guidance from Zod errors
   */
  private buildValidationGuidance(errors: any[]): string {
    const guidanceMap: Record<string, string> = {
      thought:
        'Your thought content is invalid. Ensure it contains meaningful text between 1-20000 characters. Empty thoughts or extremely long thoughts are not allowed.',
      thought_number:
        'The thought_number must be a positive integer. Start with 1 for your first thought and increment sequentially.',
      total_thoughts:
        'The total_thoughts must be a positive integer representing your estimated final thought count. You can adjust this as you progress.',
      next_thought_needed:
        'The next_thought_needed field must be true or false. Set to false when you complete your reasoning.',
      revises_thought:
        'When using is_revision=true, you must specify which thought number you are revising with revises_thought.',
      branch_from_thought:
        'When branching, specify which existing thought you are branching from using a valid thought number.',
      branch_id:
        'When branching, provide a unique branch_id string to identify this exploration path.',
    };

    const guidance = errors
      .map(error => {
        const field = error.path.join('.');
        const customGuidance = guidanceMap[field];
        if (customGuidance) {
          return `${field}: ${customGuidance}`;
        }
        return `${field}: ${error.message}`;
      })
      .join('\n\n');

    return `Validation errors found:\n\n${guidance}\n\nPlease correct these issues and try again. Each field serves a specific purpose in the reasoning process.`;
  }

  /* ------------------------------ Main Handler ----------------------------- */

  public async processThought(input: unknown): Promise<ServerResult> {
    const t0 = performance.now();

    try {
      const data = ThoughtDataSchema.parse(input);

      // Sanity limits with contextual guidance for AI recovery
      if (data.thought_number > MAX_THOUGHTS) {
        return this.buildToolError(
          `Thought limit reached (${MAX_THOUGHTS}). Consider breaking complex problems into separate reasoning sessions, or complete your analysis with fewer thoughts. Most problems can be solved effectively in 10-15 thoughts. You can start a new reasoning session to continue if needed.`
        );
      }
      if (data.branch_from_thought && data.branch_from_thought > this.thoughtHistory.length) {
        return this.buildToolError(
          `Invalid branch reference: thought ${data.branch_from_thought} doesn't exist. You currently have ${this.thoughtHistory.length} thoughts in your history. Use a valid thought number between 1-${this.thoughtHistory.length} for branching. To explore alternatives, branch from an existing thought that represents a decision point.`
        );
      }

      // 🧠 AGI MAGIC: Cognitive orchestration and sentient processing
      console.error('🧠 Engaging cognitive orchestrator for AGI-level processing...');

      // 🔍 REAL Bias Detection - analyze thought for cognitive biases
      const biasDetections = await this.biasDetector.detectBiases(data.thought, {
        confidence: this.estimateInitialConfidence(data),
        thought_number: data.thought_number,
        total_thoughts: data.total_thoughts,
        domain: this.inferDomain(data),
        previous_thoughts: this.thoughtHistory
          .slice(-MAX_PREVIOUS_THOUGHTS_CONTEXT)
          .map(t => t.thought),
      });

      // Log detected biases
      if (biasDetections.length > 0) {
        console.error(
          '⚠️ Cognitive biases detected:',
          biasDetections.map(b => ({
            bias: b.bias_name,
            confidence: b.confidence.toFixed(2),
            severity: b.severity,
          }))
        );
      }

      const cognitiveResult = await this.cognitiveOrchestrator.processThought(data, {
        id: this.currentSessionId,
        objective: this.inferObjective(data),
        domain: this.inferDomain(data),
        start_time: new Date(),
        goal_achieved: false,
        confidence_level: 0.5,
        total_thoughts: data.total_thoughts,
        revision_count: this.revisionCount,
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
        // Bounded history: evict the oldest entry when at capacity so that the
        // array never grows beyond MAX_THOUGHTS elements and the evicted entry's
        // contribution to revisionCount is subtracted.
        if (this.thoughtHistory.length >= MAX_THOUGHTS) {
          const evicted = this.thoughtHistory.shift();
          if (evicted?.is_revision) {
            this.revisionCount = Math.max(0, this.revisionCount - 1);
          }
        }
        this.thoughtHistory.push(data);
        if (data.is_revision) {
          this.revisionCount++;
        }
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
        biases_detected: biasDetections.length,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });

      return this.buildSuccess(data, cognitiveResult, biasDetections);
    } catch (err) {
      const e = err as Error;
      console.error('❌ AGI error', {
        err: e.message,
        elapsedMs: +(performance.now() - t0).toFixed(1),
      });

      // Handle validation errors with contextual guidance
      if (err instanceof ZodError) {
        if (this.cfg.debug) console.error(err.errors);

        const validationGuidance = this.buildValidationGuidance(err.errors);
        return this.buildToolError(validationGuidance);
      }

      // Handle MCP protocol errors (pass through - these are genuine protocol issues)
      if (err instanceof McpError) {
        throw err;
      }

      // Handle unknown errors with smart recovery guidance
      return this.buildToolError(
        `An unexpected error occurred: ${e.message}. Try rephrasing your thought or simplifying the reasoning. If this persists after 2-3 attempts, this may indicate a system limitation with your current approach. Consider breaking the problem into smaller steps or using different terminology.`
      );
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
   * Estimate initial confidence based on thought content
   * Uses REAL calibration from SQLiteStore historical data
   */
  private estimateInitialConfidence(data: ValidatedThoughtData): number {
    const thought = data.thought.toLowerCase();
    let rawConfidence = 0.5;

    // High confidence indicators
    if (thought.includes('definitely') || thought.includes('certainly')) rawConfidence += 0.3;
    if (thought.includes('clearly') || thought.includes('obviously')) rawConfidence += 0.2;
    if (thought.includes('confident') || thought.includes('sure')) rawConfidence += 0.2;

    // Low confidence indicators
    if (thought.includes('maybe') || thought.includes('perhaps')) rawConfidence -= 0.2;
    if (thought.includes('uncertain') || thought.includes('unsure')) rawConfidence -= 0.3;
    if (thought.includes('might') || thought.includes('could be')) rawConfidence -= 0.1;

    // Revision indicates some uncertainty
    if (data.is_revision) rawConfidence -= 0.1;

    // Clamp raw confidence
    rawConfidence = Math.min(1, Math.max(0, rawConfidence));

    // Apply REAL calibration from SQLiteStore based on historical accuracy
    const domain = this.inferDomain(data);
    const calibratedConfidence = this.memoryStore.getCalibratedConfidence(rawConfidence, domain);

    console.error('📊 Confidence calibration:', {
      raw: rawConfidence.toFixed(2),
      calibrated: calibratedConfidence.toFixed(2),
      domain,
    });

    return calibratedConfidence;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Clear data structures
    this.thoughtHistory.length = 0;
    this.revisionCount = 0;
    this.branches.clear();

    // Cleanup MCP Integration Manager
    try {
      if (this.mcpManager) {
        await this.mcpManager.destroy();
        console.error('✅ MCP Integration Manager closed');
      }
    } catch (err) {
      console.error('⚠️ Error closing MCP manager:', err);
    }

    // Close the SQLite memory store properly
    try {
      await this.memoryStore.close();
      console.error('✅ SQLite memory store closed');
    } catch (err) {
      console.error('⚠️ Error closing memory store:', err);
    }

    // The cognitive orchestrator cleanup is handled separately
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

  const serverMeta = { name: 'map-think-do', version: '1.0.0' } as const;

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

  // Initialize the cognitive orchestrator with dependency injection
  await logic.initialize();

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
      shutdown('transport_failure');
    }
  }, 5000); // Check every 5 seconds

  // Idempotent shutdown — safe to call from any exit path.
  let shuttingDown = false;
  const shutdown = async (sig: string) => {
    if (shuttingDown) return;
    shuttingDown = true;

    // Always clear the health-check interval first so it cannot re-enter shutdown.
    clearInterval(healthCheckInterval);

    console.error(`↩︎ shutdown on ${sig}`);

    // Cleanup cognitive components
    try {
      console.error('🧠 Cleaning up cognitive systems...');
      await logic.getCognitiveOrchestrator().dispose();
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

  await srv.connect(transport);

  console.error('🗺️ Map. Think. Do. - Server ready');
  console.error('📍 MAP: Problem decomposition active');
  console.error('🧠 THINK: 8 cognitive perspectives available');
  console.error('✅ DO: Structured reasoning enabled');
  console.error('📚 Memory: SQLite persistence active');
  console.error('🔍 Bias Detection: Online');
  console.error('🎯 Tool: code-reasoning');
  if (config.promptsEnabled) {
    console.error('📝 Prompts: Enabled');
  }
  console.error('✨ Map the problem. Think it through. Do what matters.');

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

// NOTE: InMemoryStore has been replaced by SQLiteStore for REAL persistence
// See /src/memory/sqlite-store.ts for implementation
