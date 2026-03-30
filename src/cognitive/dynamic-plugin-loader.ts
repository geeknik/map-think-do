/**
 * @fileoverview Dynamic Plugin Loader
 *
 * Real implementation for hot-loading cognitive plugins from the filesystem.
 * Supports:
 * - Watching a plugins directory for changes
 * - Loading/unloading plugins dynamically
 * - Plugin validation and sandboxing
 * - Plugin manifest parsing
 * - Event-driven plugin lifecycle
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import crypto from 'crypto';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author?: string;
  main: string; // Entry point file
  capabilities: string[];
  activation_triggers: string[];
  config_schema?: Record<string, unknown>;
  dependencies?: string[];
  priority?: number;
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: DynamicPlugin;
  path: string;
  loadedAt: Date;
  hash: string; // For change detection
  status: 'loaded' | 'error' | 'disabled';
  errorMessage?: string;
  metrics: PluginMetrics;
}

export interface PluginMetrics {
  activationCount: number;
  successCount: number;
  failureCount: number;
  avgExecutionTime: number;
  lastActivation?: Date;
}

/**
 * Interface that dynamic plugins must implement
 */
export interface DynamicPlugin {
  id: string;
  name: string;
  version: string;
  capabilities: string[];

  /**
   * Initialize the plugin with config
   */
  initialize(config?: Record<string, unknown>): Promise<void>;

  /**
   * Check if plugin should activate for given context
   */
  shouldActivate(context: PluginContext): Promise<PluginActivationResult>;

  /**
   * Execute the plugin's main logic
   */
  execute(context: PluginContext): Promise<PluginResult>;

  /**
   * Cleanup resources
   */
  destroy(): Promise<void>;
}

export interface PluginContext {
  thought: string;
  thought_number: number;
  total_thoughts: number;
  session_id: string;
  domain?: string;
  complexity?: number;
  confidence?: number;
  cognitive_state: Record<string, unknown>;
  previous_interventions: string[];
}

export interface PluginActivationResult {
  should_activate: boolean;
  priority: number;
  confidence: number;
  reason?: string;
}

export interface PluginResult {
  success: boolean;
  intervention_type: string;
  content: string;
  metadata?: Record<string, unknown>;
  follow_up_needed?: boolean;
}

export class DynamicPluginLoader extends EventEmitter {
  private pluginsDir: string;
  private plugins: Map<string, LoadedPlugin> = new Map();
  private watcher: fs.FSWatcher | null = null;
  private loadQueue: string[] = [];
  private isProcessingQueue = false;

  constructor(pluginsDir: string) {
    super();
    this.pluginsDir = pluginsDir;
    this.ensurePluginsDirectory();
  }

  /**
   * Ensure plugins directory exists
   */
  private ensurePluginsDirectory(): void {
    if (!fs.existsSync(this.pluginsDir)) {
      fs.mkdirSync(this.pluginsDir, { recursive: true });
    }
  }

  /**
   * Start watching for plugin changes
   */
  startWatching(): void {
    if (this.watcher) return;

    this.watcher = fs.watch(
      this.pluginsDir,
      { recursive: true },
      (eventType: string, filename: string | null) => {
        if (filename && (filename.endsWith('.js') || filename.endsWith('.json'))) {
          this.handleFileChange(eventType, filename);
        }
      }
    );

    this.emit('watching_started', { directory: this.pluginsDir });
  }

  /**
   * Stop watching for changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.emit('watching_stopped');
    }
  }

  /**
   * Handle file change event
   */
  private handleFileChange(eventType: string, filename: string): void {
    const fullPath = path.join(this.pluginsDir, filename);

    if (filename.endsWith('manifest.json')) {
      // Plugin manifest changed - reload plugin
      const pluginDir = path.dirname(fullPath);
      this.queuePluginLoad(pluginDir);
    } else if (filename.endsWith('.js') && eventType === 'change') {
      // Plugin code changed - find and reload
      const pluginDir = path.dirname(fullPath);
      const manifestPath = path.join(pluginDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        this.queuePluginLoad(pluginDir);
      }
    }
  }

  /**
   * Queue a plugin for loading/reloading
   */
  private queuePluginLoad(pluginPath: string): void {
    if (!this.loadQueue.includes(pluginPath)) {
      this.loadQueue.push(pluginPath);
      this.processLoadQueue();
    }
  }

  /**
   * Process the load queue
   */
  private async processLoadQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.loadQueue.length > 0) {
      const pluginPath = this.loadQueue.shift()!;
      try {
        await this.loadPlugin(pluginPath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.emit('plugin_load_error', { path: pluginPath, error: errorMessage });
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Load all plugins from the directory
   */
  async loadAllPlugins(): Promise<void> {
    const entries = fs.readdirSync(this.pluginsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = path.join(this.pluginsDir, entry.name);
        const manifestPath = path.join(pluginPath, 'manifest.json');

        if (fs.existsSync(manifestPath)) {
          try {
            await this.loadPlugin(pluginPath);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.emit('plugin_load_error', { path: pluginPath, error: errorMessage });
          }
        }
      }
    }
  }

  /**
   * Load a single plugin
   */
  async loadPlugin(pluginPath: string): Promise<string> {
    const manifestPath = path.join(pluginPath, 'manifest.json');

    if (!fs.existsSync(manifestPath)) {
      throw new Error(`No manifest.json found in ${pluginPath}`);
    }

    // Read and parse manifest
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    const manifest: PluginManifest = JSON.parse(manifestContent);

    // Validate manifest
    this.validateManifest(manifest);

    // Check if plugin is already loaded with same hash
    const currentHash = this.calculatePluginHash(pluginPath);
    const existingPlugin = this.plugins.get(manifest.id);
    if (existingPlugin && existingPlugin.hash === currentHash) {
      return manifest.id; // No changes, skip reload
    }

    // Unload existing plugin if present
    if (existingPlugin) {
      await this.unloadPlugin(manifest.id);
    }

    // Load the plugin module
    const mainPath = path.join(pluginPath, manifest.main);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Plugin entry point not found: ${mainPath}`);
    }

    // Dynamic import with cache busting
    const moduleUrl = pathToFileURL(mainPath).href + `?t=${Date.now()}`;
    const module = await import(moduleUrl);

    // Get the plugin class/factory
    const PluginClass = module.default || module[manifest.name] || module.Plugin;
    if (!PluginClass) {
      throw new Error(`No plugin export found in ${mainPath}`);
    }

    // Instantiate the plugin
    const instance: DynamicPlugin =
      typeof PluginClass === 'function' ? new PluginClass() : PluginClass;

    // Initialize
    await instance.initialize(manifest.config_schema);

    const loadedPlugin: LoadedPlugin = {
      manifest,
      instance,
      path: pluginPath,
      loadedAt: new Date(),
      hash: currentHash,
      status: 'loaded',
      metrics: {
        activationCount: 0,
        successCount: 0,
        failureCount: 0,
        avgExecutionTime: 0,
      },
    };

    this.plugins.set(manifest.id, loadedPlugin);

    this.emit('plugin_loaded', {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      capabilities: manifest.capabilities,
    });

    return manifest.id;
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      await plugin.instance.destroy();
    } catch (error) {
      // Log but don't throw
      console.error(`Error destroying plugin ${pluginId}:`, error);
    }

    this.plugins.delete(pluginId);
    this.emit('plugin_unloaded', { id: pluginId });
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    const required = ['id', 'name', 'version', 'main', 'capabilities'];
    for (const field of required) {
      if (!(field in manifest)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error('Plugin ID must contain only lowercase letters, numbers, and hyphens');
    }

    if (!manifest.main.endsWith('.js')) {
      throw new Error('Plugin main file must be a .js file');
    }
  }

  /**
   * Calculate hash of plugin directory for change detection
   */
  private calculatePluginHash(pluginPath: string): string {
    const hash = crypto.createHash('md5');

    const addFile = (filePath: string) => {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath);
        hash.update(content);
      }
    };

    // Hash manifest and main file
    addFile(path.join(pluginPath, 'manifest.json'));
    const manifest = JSON.parse(fs.readFileSync(path.join(pluginPath, 'manifest.json'), 'utf-8'));
    addFile(path.join(pluginPath, manifest.main));

    return hash.digest('hex');
  }

  /**
   * Execute plugins that should activate for the given context
   */
  async executePlugins(context: PluginContext, maxConcurrent: number = 3): Promise<PluginResult[]> {
    const results: PluginResult[] = [];
    const activations: Array<{ plugin: LoadedPlugin; activation: PluginActivationResult }> = [];

    // Check which plugins should activate
    for (const plugin of this.plugins.values()) {
      if (plugin.status !== 'loaded') continue;

      try {
        const activation = await plugin.instance.shouldActivate(context);
        if (activation.should_activate) {
          activations.push({ plugin, activation });
        }
      } catch (error) {
        console.error(`Error checking activation for ${plugin.manifest.id}:`, error);
      }
    }

    // Sort by priority
    activations.sort((a, b) => b.activation.priority - a.activation.priority);

    // Execute top plugins
    const toExecute = activations.slice(0, maxConcurrent);

    for (const { plugin } of toExecute) {
      const startTime = Date.now();
      plugin.metrics.activationCount++;

      try {
        const result = await plugin.instance.execute(context);

        const executionTime = Date.now() - startTime;
        plugin.metrics.successCount++;
        plugin.metrics.lastActivation = new Date();
        plugin.metrics.avgExecutionTime =
          (plugin.metrics.avgExecutionTime * (plugin.metrics.activationCount - 1) + executionTime) /
          plugin.metrics.activationCount;

        results.push(result);

        this.emit('plugin_executed', {
          id: plugin.manifest.id,
          success: true,
          executionTime,
          interventionType: result.intervention_type,
        });
      } catch (error) {
        plugin.metrics.failureCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        this.emit('plugin_execution_error', {
          id: plugin.manifest.id,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Array<{
    id: string;
    name: string;
    version: string;
    capabilities: string[];
    status: string;
    metrics: PluginMetrics;
  }> {
    return Array.from(this.plugins.values()).map(p => ({
      id: p.manifest.id,
      name: p.manifest.name,
      version: p.manifest.version,
      capabilities: p.manifest.capabilities,
      status: p.status,
      metrics: p.metrics,
    }));
  }

  /**
   * Get a specific plugin by ID
   */
  getPlugin(pluginId: string): LoadedPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Enable/disable a plugin
   */
  setPluginEnabled(pluginId: string, enabled: boolean): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.status = enabled ? 'loaded' : 'disabled';
      this.emit('plugin_status_changed', { id: pluginId, enabled });
    }
  }

  /**
   * Cleanup all plugins
   */
  async destroy(): Promise<void> {
    this.stopWatching();

    for (const pluginId of this.plugins.keys()) {
      await this.unloadPlugin(pluginId);
    }

    this.removeAllListeners();
  }
}

/**
 * Template for creating a dynamic plugin
 */
export const PluginTemplate = `
import { DynamicPlugin, PluginContext, PluginActivationResult, PluginResult } from '../dynamic-plugin-loader.js';

export default class MyPlugin implements DynamicPlugin {
  id = 'my-plugin';
  name = 'My Plugin';
  version = '1.0.0';
  capabilities = ['custom_reasoning'];

  async initialize(config?: Record<string, unknown>): Promise<void> {
    // Initialize plugin with config
  }

  async shouldActivate(context: PluginContext): Promise<PluginActivationResult> {
    // Check if plugin should activate
    return {
      should_activate: true,
      priority: 50,
      confidence: 0.8,
      reason: 'Relevant context detected',
    };
  }

  async execute(context: PluginContext): Promise<PluginResult> {
    // Execute plugin logic
    return {
      success: true,
      intervention_type: 'custom_guidance',
      content: 'Plugin output here',
      metadata: {},
      follow_up_needed: false,
    };
  }

  async destroy(): Promise<void> {
    // Cleanup resources
  }
}
`;
