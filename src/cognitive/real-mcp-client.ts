/**
 * @fileoverview Real MCP Client Implementation
 *
 * Genuine MCP client that can:
 * - Connect to real MCP servers via stdio transport
 * - Discover and call tools from other servers
 * - Access resources and prompts
 * - Aggregate capabilities from multiple servers
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface ConnectedServer {
  config: MCPServerConfig;
  client: Client;
  transport: StdioClientTransport;
  process: ChildProcess;
  capabilities: ServerCapabilities;
  tools: ToolDefinition[];
  resources: ResourceDefinition[];
  prompts: PromptDefinition[];
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastError?: string;
  metrics: ServerMetrics;
}

export interface ServerCapabilities {
  tools?: boolean;
  resources?: boolean;
  prompts?: boolean;
  sampling?: boolean;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: unknown;
  serverId: string;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  serverId: string;
}

export interface PromptDefinition {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
  serverId: string;
}

export interface ServerMetrics {
  connectTime: number;
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  lastCallTime?: Date;
}

export interface ToolCallResult {
  success: boolean;
  content: unknown;
  isError: boolean;
  executionTime: number;
  serverId: string;
}

export class RealMCPClient extends EventEmitter {
  private servers: Map<string, ConnectedServer> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Connect to an MCP server
   */
  async connectToServer(config: MCPServerConfig): Promise<string> {
    const serverId = `${config.name}_${Date.now()}`;

    try {
      this.emit('server_connecting', { serverId, config });

      // Spawn the server process
      const serverProcess = spawn(config.command, config.args, {
        env: { ...process.env, ...config.env },
        cwd: config.cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Create transport and client
      const transport = new StdioClientTransport({
        command: config.command,
        args: config.args,
        env: config.env,
      });

      const client = new Client(
        {
          name: 'map-think-do-client',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      const startTime = Date.now();

      // Connect
      await client.connect(transport);

      const connectTime = Date.now() - startTime;

      // Get server capabilities
      const serverInfo = client.getServerCapabilities();

      const connectedServer: ConnectedServer = {
        config,
        client,
        transport,
        process: serverProcess,
        capabilities: {
          tools: !!serverInfo?.tools,
          resources: !!serverInfo?.resources,
          prompts: !!serverInfo?.prompts,
        },
        tools: [],
        resources: [],
        prompts: [],
        status: 'connected',
        metrics: {
          connectTime,
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          avgResponseTime: 0,
        },
      };

      // Discover capabilities
      await this.discoverServerCapabilities(serverId, connectedServer);

      this.servers.set(serverId, connectedServer);

      this.emit('server_connected', {
        serverId,
        capabilities: connectedServer.capabilities,
        tools: connectedServer.tools.length,
        resources: connectedServer.resources.length,
        prompts: connectedServer.prompts.length,
      });

      return serverId;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('server_error', { serverId, config, error: errorMessage });
      throw new Error(`Failed to connect to ${config.name}: ${errorMessage}`);
    }
  }

  /**
   * Discover server capabilities (tools, resources, prompts)
   */
  private async discoverServerCapabilities(
    serverId: string,
    server: ConnectedServer
  ): Promise<void> {
    const { client, capabilities } = server;

    // Discover tools
    if (capabilities.tools) {
      try {
        const toolsResult = await client.listTools();
        server.tools = (toolsResult.tools || []).map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          serverId,
        }));
      } catch (error) {
        console.error(`Failed to list tools from ${serverId}:`, error);
      }
    }

    // Discover resources
    if (capabilities.resources) {
      try {
        const resourcesResult = await client.listResources();
        server.resources = (resourcesResult.resources || []).map(resource => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
          serverId,
        }));
      } catch (error) {
        console.error(`Failed to list resources from ${serverId}:`, error);
      }
    }

    // Discover prompts
    if (capabilities.prompts) {
      try {
        const promptsResult = await client.listPrompts();
        server.prompts = (promptsResult.prompts || []).map(prompt => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
          serverId,
        }));
      } catch (error) {
        console.error(`Failed to list prompts from ${serverId}:`, error);
      }
    }
  }

  /**
   * Call a tool on a connected server
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<ToolCallResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (server.status !== 'connected') {
      throw new Error(`Server ${serverId} is not connected`);
    }

    const tool = server.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found on server ${serverId}`);
    }

    const startTime = Date.now();
    server.metrics.totalCalls++;

    try {
      const result = await server.client.callTool({
        name: toolName,
        arguments: args,
      });

      const executionTime = Date.now() - startTime;
      server.metrics.successfulCalls++;
      server.metrics.lastCallTime = new Date();
      server.metrics.avgResponseTime =
        (server.metrics.avgResponseTime * (server.metrics.totalCalls - 1) + executionTime) /
        server.metrics.totalCalls;

      this.emit('tool_called', {
        serverId,
        toolName,
        success: true,
        executionTime,
      });

      // Check if result has isError property
      const isError =
        typeof result === 'object' && result !== null && 'isError' in result
          ? Boolean(result.isError)
          : false;

      return {
        success: true,
        content: result.content,
        isError,
        executionTime,
        serverId,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      server.metrics.failedCalls++;

      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('tool_error', {
        serverId,
        toolName,
        error: errorMessage,
        executionTime,
      });

      return {
        success: false,
        content: { error: errorMessage },
        isError: true,
        executionTime,
        serverId,
      };
    }
  }

  /**
   * Read a resource from a connected server
   */
  async readResource(serverId: string, uri: string): Promise<unknown> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (server.status !== 'connected') {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const result = await server.client.readResource({ uri });
      return result.contents;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to read resource ${uri}: ${errorMessage}`);
    }
  }

  /**
   * Get a prompt from a connected server
   */
  async getPrompt(
    serverId: string,
    promptName: string,
    args?: Record<string, string>
  ): Promise<unknown> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new Error(`Server ${serverId} not found`);
    }

    if (server.status !== 'connected') {
      throw new Error(`Server ${serverId} is not connected`);
    }

    try {
      const result = await server.client.getPrompt({
        name: promptName,
        arguments: args,
      });
      return result.messages;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get prompt ${promptName}: ${errorMessage}`);
    }
  }

  /**
   * Get all available tools across all connected servers
   */
  getAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        tools.push(...server.tools);
      }
    }
    return tools;
  }

  /**
   * Get all available resources across all connected servers
   */
  getAllResources(): ResourceDefinition[] {
    const resources: ResourceDefinition[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        resources.push(...server.resources);
      }
    }
    return resources;
  }

  /**
   * Get all available prompts across all connected servers
   */
  getAllPrompts(): PromptDefinition[] {
    const prompts: PromptDefinition[] = [];
    for (const server of this.servers.values()) {
      if (server.status === 'connected') {
        prompts.push(...server.prompts);
      }
    }
    return prompts;
  }

  /**
   * Find a tool by name across all servers
   */
  findTool(toolName: string): { tool: ToolDefinition; serverId: string } | null {
    for (const [serverId, server] of this.servers) {
      if (server.status === 'connected') {
        const tool = server.tools.find(t => t.name === toolName);
        if (tool) {
          return { tool, serverId };
        }
      }
    }
    return null;
  }

  /**
   * Recommend tools based on context
   */
  recommendTools(context: string, maxRecommendations: number = 5): ToolDefinition[] {
    const allTools = this.getAllTools();
    const contextWords = context.toLowerCase().split(/\s+/);

    // Score tools based on keyword matches
    const scored = allTools.map(tool => {
      let score = 0;
      const toolText = `${tool.name} ${tool.description || ''}`.toLowerCase();

      for (const word of contextWords) {
        if (word.length > 3 && toolText.includes(word)) {
          score += 1;
        }
      }

      return { tool, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxRecommendations)
      .map(s => s.tool);
  }

  /**
   * Disconnect from a server
   */
  async disconnectServer(serverId: string): Promise<void> {
    const server = this.servers.get(serverId);
    if (!server) return;

    try {
      await server.client.close();
      server.process.kill();
      server.status = 'disconnected';
      this.emit('server_disconnected', { serverId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.emit('server_error', { serverId, error: errorMessage });
    }

    this.servers.delete(serverId);
  }

  /**
   * Get status of all servers
   */
  getServerStatus(): Record<
    string,
    {
      name: string;
      status: string;
      tools: number;
      resources: number;
      prompts: number;
      metrics: ServerMetrics;
    }
  > {
    const status: Record<string, unknown> = {};

    for (const [serverId, server] of this.servers) {
      status[serverId] = {
        name: server.config.name,
        status: server.status,
        tools: server.tools.length,
        resources: server.resources.length,
        prompts: server.prompts.length,
        metrics: server.metrics,
      };
    }

    return status as Record<
      string,
      {
        name: string;
        status: string;
        tools: number;
        resources: number;
        prompts: number;
        metrics: ServerMetrics;
      }
    >;
  }

  /**
   * Start health check monitoring
   */
  startHealthCheck(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      for (const [serverId, server] of this.servers) {
        if (server.status === 'connected') {
          try {
            // Try a lightweight operation to check health
            await server.client.listTools();
            this.emit('health_check_passed', { serverId });
          } catch {
            server.status = 'error';
            server.lastError = 'Health check failed';
            this.emit('health_check_failed', { serverId });
          }
        }
      }
    }, intervalMs);
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Cleanup all connections
   */
  async destroy(): Promise<void> {
    this.stopHealthCheck();

    for (const serverId of this.servers.keys()) {
      await this.disconnectServer(serverId);
    }

    this.removeAllListeners();
  }
}

// Common MCP server configurations
export const CommonMCPServers: Record<string, MCPServerConfig> = {
  filesystem: {
    name: 'filesystem',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-filesystem', '/tmp'],
  },
  memory: {
    name: 'memory',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
  },
  fetch: {
    name: 'fetch',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-fetch'],
  },
};
