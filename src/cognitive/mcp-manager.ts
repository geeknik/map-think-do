/**
 * @fileoverview MCP Integration Manager
 *
 * High-level manager that coordinates:
 * - External MCP server connections via RealMCPClient
 * - Dynamic plugin loading
 * - Tool routing and execution
 * - Configuration management
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { RealMCPClient, MCPServerConfig, ToolCallResult } from './real-mcp-client.js';
import { DynamicPluginLoader, PluginContext, PluginResult } from './dynamic-plugin-loader.js';
import { SQLiteStore } from '../memory/sqlite-store.js';

export interface MCPManagerConfig {
  /** Directory for external MCP server configurations */
  serversConfigPath?: string;
  /** Directory for dynamic plugins */
  pluginsDir?: string;
  /** Enable auto-connect to configured servers */
  autoConnect?: boolean;
  /** Enable plugin hot-reloading */
  watchPlugins?: boolean;
  /** Health check interval in ms */
  healthCheckInterval?: number;
}

export interface ExternalServerConfig {
  servers: MCPServerConfig[];
}

export interface MCPManagerStatus {
  connectedServers: number;
  totalTools: number;
  totalResources: number;
  totalPrompts: number;
  loadedPlugins: number;
  lastHealthCheck?: Date;
}

export class MCPIntegrationManager extends EventEmitter {
  private mcpClient: RealMCPClient;
  private pluginLoader: DynamicPluginLoader;
  private memoryStore: SQLiteStore;
  private config: MCPManagerConfig;
  private configPath: string;
  private lastHealthCheck?: Date;

  constructor(memoryStore: SQLiteStore, config: MCPManagerConfig = {}) {
    super();
    this.memoryStore = memoryStore;
    this.config = {
      serversConfigPath:
        config.serversConfigPath || path.join(os.homedir(), '.map-think-do', 'mcp-servers.json'),
      pluginsDir: config.pluginsDir || path.join(os.homedir(), '.map-think-do', 'plugins'),
      autoConnect: config.autoConnect ?? true,
      watchPlugins: config.watchPlugins ?? true,
      healthCheckInterval: config.healthCheckInterval ?? 30000,
    };
    this.configPath = this.config.serversConfigPath!;

    // Initialize components
    this.mcpClient = new RealMCPClient();
    this.pluginLoader = new DynamicPluginLoader(this.config.pluginsDir!);

    // Set up event forwarding
    this.setupEventForwarding();
  }

  /**
   * Initialize the manager
   */
  async initialize(): Promise<void> {
    console.error('🌐 Initializing MCP Integration Manager...');

    // Ensure config directories exist
    this.ensureDirectories();

    // Load server configurations
    if (this.config.autoConnect) {
      await this.loadAndConnectServers();
    }

    // Load dynamic plugins
    await this.pluginLoader.loadAllPlugins();

    // Start plugin watching if enabled
    if (this.config.watchPlugins) {
      this.pluginLoader.startWatching();
    }

    // Start health monitoring
    this.mcpClient.startHealthCheck(this.config.healthCheckInterval);

    console.error('✅ MCP Integration Manager initialized', {
      servers: this.mcpClient.getAllTools().length > 0 ? 'connected' : 'none',
      plugins: this.pluginLoader.getLoadedPlugins().length,
    });

    this.emit('initialized', this.getStatus());
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    if (!fs.existsSync(this.config.pluginsDir!)) {
      fs.mkdirSync(this.config.pluginsDir!, { recursive: true });
    }

    // Create default config if it doesn't exist
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig: ExternalServerConfig = {
        servers: [],
      };
      fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
    }
  }

  /**
   * Load and connect to configured servers
   */
  private async loadAndConnectServers(): Promise<void> {
    try {
      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      const config: ExternalServerConfig = JSON.parse(configContent);

      for (const serverConfig of config.servers) {
        try {
          console.error(`🔌 Connecting to MCP server: ${serverConfig.name}...`);
          const serverId = await this.mcpClient.connectToServer(serverConfig);
          console.error(`✅ Connected to ${serverConfig.name} (${serverId})`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`❌ Failed to connect to ${serverConfig.name}: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error('⚠️ Could not load MCP server configurations:', error);
    }
  }

  /**
   * Add a new MCP server configuration and connect
   */
  async addServer(serverConfig: MCPServerConfig): Promise<string> {
    // Add to config file
    const configContent = fs.readFileSync(this.configPath, 'utf-8');
    const config: ExternalServerConfig = JSON.parse(configContent);

    // Check if server already exists
    const exists = config.servers.some(s => s.name === serverConfig.name);
    if (!exists) {
      config.servers.push(serverConfig);
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    }

    // Connect to server
    const serverId = await this.mcpClient.connectToServer(serverConfig);

    this.emit('server_added', { serverId, config: serverConfig });

    return serverId;
  }

  /**
   * Remove a server configuration
   */
  async removeServer(serverName: string): Promise<void> {
    // Remove from config file
    const configContent = fs.readFileSync(this.configPath, 'utf-8');
    const config: ExternalServerConfig = JSON.parse(configContent);
    config.servers = config.servers.filter(s => s.name !== serverName);
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));

    // Find and disconnect matching servers
    const status = this.mcpClient.getServerStatus();
    for (const [serverId, serverInfo] of Object.entries(status)) {
      if (serverInfo.name === serverName) {
        await this.mcpClient.disconnectServer(serverId);
      }
    }

    this.emit('server_removed', { name: serverName });
  }

  /**
   * Call a tool (from either MCP server or dynamic plugin)
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>,
    context?: PluginContext
  ): Promise<ToolCallResult | PluginResult> {
    // First, try to find tool in connected MCP servers
    const mcpTool = this.mcpClient.findTool(toolName);
    if (mcpTool) {
      const result = await this.mcpClient.callTool(mcpTool.serverId, toolName, args);

      // Record outcome for learning
      this.recordToolOutcome(toolName, result.success, result.executionTime);

      return result;
    }

    // If not found in MCP servers, check dynamic plugins
    if (context) {
      const pluginResults = await this.pluginLoader.executePlugins(context, 1);
      if (pluginResults.length > 0) {
        return pluginResults[0];
      }
    }

    throw new Error(`Tool ${toolName} not found in any connected server or plugin`);
  }

  /**
   * Get all available tools from both MCP servers and plugins
   */
  getAllTools(): Array<{
    name: string;
    description?: string;
    source: 'mcp' | 'plugin';
    serverId?: string;
    pluginId?: string;
  }> {
    const tools: Array<{
      name: string;
      description?: string;
      source: 'mcp' | 'plugin';
      serverId?: string;
      pluginId?: string;
    }> = [];

    // Add MCP tools
    for (const tool of this.mcpClient.getAllTools()) {
      tools.push({
        name: tool.name,
        description: tool.description,
        source: 'mcp',
        serverId: tool.serverId,
      });
    }

    // Add plugin capabilities as tools
    for (const plugin of this.pluginLoader.getLoadedPlugins()) {
      for (const capability of plugin.capabilities) {
        tools.push({
          name: capability,
          description: `Provided by plugin: ${plugin.name}`,
          source: 'plugin',
          pluginId: plugin.id,
        });
      }
    }

    return tools;
  }

  /**
   * Recommend tools based on context
   */
  recommendTools(
    context: string,
    maxRecommendations: number = 5
  ): Array<{ name: string; source: string; score: number }> {
    const recommendations: Array<{ name: string; source: string; score: number }> = [];

    // Get MCP tool recommendations
    const mcpTools = this.mcpClient.recommendTools(context, maxRecommendations);
    for (const tool of mcpTools) {
      recommendations.push({
        name: tool.name,
        source: `mcp:${tool.serverId}`,
        score: 0.8, // Base score for MCP tools
      });
    }

    // Score plugin capabilities
    const contextLower = context.toLowerCase();
    for (const plugin of this.pluginLoader.getLoadedPlugins()) {
      for (const capability of plugin.capabilities) {
        if (contextLower.includes(capability.toLowerCase())) {
          recommendations.push({
            name: capability,
            source: `plugin:${plugin.id}`,
            score:
              0.7 +
              (plugin.metrics.successCount / Math.max(1, plugin.metrics.activationCount)) * 0.3,
          });
        }
      }
    }

    // Sort by score and return top recommendations
    return recommendations.sort((a, b) => b.score - a.score).slice(0, maxRecommendations);
  }

  /**
   * Record tool outcome for learning
   */
  private recordToolOutcome(toolName: string, success: boolean, executionTime: number): void {
    try {
      this.memoryStore.recordOutcome({
        id: `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        thought_id: `tool_call_${toolName}`,
        session_id: 'mcp_manager',
        prediction: `Tool ${toolName} execution`,
        predicted_confidence: 0.8,
        actual_outcome: success ? 'success' : 'failure',
        outcome_score: success ? 1 : 0,
        recorded_at: new Date(),
        domain: 'external_tools',
      });
    } catch (error) {
      console.error('⚠️ Failed to record tool outcome:', error);
    }
  }

  /**
   * Set up event forwarding from child components
   */
  private setupEventForwarding(): void {
    // Forward MCP client events
    this.mcpClient.on('server_connected', data => {
      this.emit('mcp_server_connected', data);
    });

    this.mcpClient.on('server_disconnected', data => {
      this.emit('mcp_server_disconnected', data);
    });

    this.mcpClient.on('server_error', data => {
      this.emit('mcp_server_error', data);
    });

    this.mcpClient.on('tool_called', data => {
      this.emit('mcp_tool_called', data);
    });

    this.mcpClient.on('health_check_failed', data => {
      this.emit('mcp_health_check_failed', data);
    });

    // Forward plugin loader events
    this.pluginLoader.on('plugin_loaded', data => {
      this.emit('plugin_loaded', data);
    });

    this.pluginLoader.on('plugin_unloaded', data => {
      this.emit('plugin_unloaded', data);
    });

    this.pluginLoader.on('plugin_executed', data => {
      this.emit('plugin_executed', data);
    });

    this.pluginLoader.on('plugin_execution_error', data => {
      this.emit('plugin_execution_error', data);
    });
  }

  /**
   * Get current status
   */
  getStatus(): MCPManagerStatus {
    const serverStatus = this.mcpClient.getServerStatus();
    const connectedServers = Object.values(serverStatus).filter(
      s => s.status === 'connected'
    ).length;

    return {
      connectedServers,
      totalTools: this.mcpClient.getAllTools().length,
      totalResources: this.mcpClient.getAllResources().length,
      totalPrompts: this.mcpClient.getAllPrompts().length,
      loadedPlugins: this.pluginLoader.getLoadedPlugins().length,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Get detailed server status
   */
  getServerStatus(): Record<string, unknown> {
    return this.mcpClient.getServerStatus();
  }

  /**
   * Get loaded plugins
   */
  getLoadedPlugins(): Array<{
    id: string;
    name: string;
    version: string;
    capabilities: string[];
    status: string;
  }> {
    return this.pluginLoader.getLoadedPlugins();
  }

  /**
   * Manually trigger plugin reload
   */
  async reloadPlugins(): Promise<void> {
    await this.pluginLoader.loadAllPlugins();
    this.emit('plugins_reloaded', {
      count: this.pluginLoader.getLoadedPlugins().length,
    });
  }

  /**
   * Cleanup all resources
   */
  async destroy(): Promise<void> {
    console.error('🧹 Cleaning up MCP Integration Manager...');

    await this.mcpClient.destroy();
    await this.pluginLoader.destroy();

    this.removeAllListeners();

    console.error('✅ MCP Integration Manager cleaned up');
  }
}

/**
 * Create a sample plugin structure
 */
export function createSamplePlugin(pluginsDir: string, pluginId: string): string {
  const pluginPath = path.join(pluginsDir, pluginId);

  if (!fs.existsSync(pluginPath)) {
    fs.mkdirSync(pluginPath, { recursive: true });
  }

  // Create manifest
  const manifest = {
    id: pluginId,
    name: `${pluginId.charAt(0).toUpperCase()}${pluginId.slice(1)} Plugin`,
    version: '1.0.0',
    description: 'A custom cognitive plugin',
    main: 'index.js',
    capabilities: ['custom_reasoning'],
    activation_triggers: ['complex_problem'],
    priority: 50,
  };

  fs.writeFileSync(path.join(pluginPath, 'manifest.json'), JSON.stringify(manifest, null, 2));

  // Create plugin code
  const pluginCode = `
/**
 * Custom Cognitive Plugin: ${manifest.name}
 */

export default class ${pluginId.replace(/-/g, '')}Plugin {
  id = '${pluginId}';
  name = '${manifest.name}';
  version = '${manifest.version}';
  capabilities = ${JSON.stringify(manifest.capabilities)};

  async initialize(config) {
    console.log('${manifest.name} initialized');
  }

  async shouldActivate(context) {
    // Activate for complex problems
    const isComplex = context.complexity && context.complexity > 7;
    return {
      should_activate: isComplex,
      priority: 50,
      confidence: 0.8,
      reason: isComplex ? 'Complex problem detected' : 'Not complex enough',
    };
  }

  async execute(context) {
    return {
      success: true,
      intervention_type: 'custom_guidance',
      content: \`Custom insight for thought #\${context.thought_number}: Consider alternative perspectives.\`,
      metadata: { plugin: this.id },
      follow_up_needed: false,
    };
  }

  async destroy() {
    console.log('${manifest.name} destroyed');
  }
}
`;

  fs.writeFileSync(path.join(pluginPath, 'index.js'), pluginCode);

  return pluginPath;
}
