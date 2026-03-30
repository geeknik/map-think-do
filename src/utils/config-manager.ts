/**
 * @fileoverview Configuration manager for map-think-do.
 *
 * This module provides a singleton configuration manager that handles
 * runtime configuration settings for the server in memory.
 */

/**
 * Structure of the server configuration
 */
export interface MapThinkDoConfig {
  // Server settings
  maxThoughtLength: number;
  timeoutMs: number;
  maxThoughts: number;
  debug: boolean;

  // Prompt-related configuration
  promptsEnabled: boolean;

  // Any additional custom settings
  [key: string]: unknown;
}

/**
 * Singleton config manager for the server
 */
class ConfigManager {
  private config: MapThinkDoConfig;
  private initialized = false;

  constructor() {
    // Initialize with default config
    this.config = this.getDefaultConfig();
  }

  /**
   * Initialize configuration
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // In-memory only configuration, no filesystem operations needed
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize config:', error);
      // Fall back to default config in memory
      this.config = this.getDefaultConfig();
      this.initialized = true;
    }
  }

  /**
   * Create default configuration
   */
  private getDefaultConfig(): MapThinkDoConfig {
    return {
      maxThoughtLength: 20000,
      timeoutMs: 60000,
      maxThoughts: 20,
      debug: false,
      promptsEnabled: true,
    };
  }

  /**
   * Get the entire config
   */
  async getConfig(): Promise<MapThinkDoConfig> {
    await this.init();
    return { ...this.config };
  }

  /**
   * Get a specific configuration value
   */
  async getValue<K extends keyof MapThinkDoConfig>(key: K): Promise<MapThinkDoConfig[K]> {
    await this.init();
    return this.config[key];
  }

  /**
   * Set a specific configuration value
   */
  async setValue<K extends keyof MapThinkDoConfig>(
    key: K,
    value: MapThinkDoConfig[K]
  ): Promise<void> {
    await this.init();
    this.config[key] = value;
  }

  /**
   * Update multiple configuration values at once
   */
  async updateConfig(updates: Partial<MapThinkDoConfig>): Promise<MapThinkDoConfig> {
    await this.init();
    this.config = { ...this.config, ...updates };
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<MapThinkDoConfig> {
    this.config = this.getDefaultConfig();
    return { ...this.config };
  }
}

export type CodeReasoningConfig = MapThinkDoConfig;

// Export singleton instance
export const configManager = new ConfigManager();
