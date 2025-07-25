/**
 * @fileoverview Manages storing and retrieving prompt argument values.
 *
 * This provides persistence for prompt arguments between sessions,
 * allowing users to avoid repetitive entry of common values.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PROMPT_VALUES_FILE } from '../utils/config.js';
import { safeJoin, safeReadFile, safeWriteFile } from '../utils/path-validator.js';

// Structure for stored prompt values
interface StoredPromptValues {
  global: Record<string, string>;
  prompts: Record<string, Record<string, string>>;
}

/**
 * Manages the storage and retrieval of prompt argument values.
 */
export class PromptValueManager {
  private valuesFilePath: string;
  private values: StoredPromptValues;

  /**
   * Creates a new PromptValueManager.
   *
   * @param configDir The directory where configuration files are stored
   */
  constructor(private configDir: string) {
    // Use the specified config directory
    // Use the centralized PROMPT_VALUES_FILE if no specific configDir is provided
    this.valuesFilePath =
      configDir === path.dirname(PROMPT_VALUES_FILE)
        ? PROMPT_VALUES_FILE
        : safeJoin(configDir, 'prompt_values.json');

    console.error(`PromptValueManager using file path: ${this.valuesFilePath}`);
    this.values = this.loadValues();
  }

  /**
   * Loads the stored values from the JSON file.
   * Creates a default file if it doesn't exist.
   */
  private loadValues(): StoredPromptValues {
    try {
      // Check if file exists
      if (!fs.existsSync(this.valuesFilePath)) {
        // Create default structure
        const defaultValues: StoredPromptValues = {
          global: {},
          prompts: {},
        };

        // Write default file using synchronous operation for constructor
        try {
          // Ensure directory exists
          const dir = path.dirname(this.valuesFilePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }

          // Only write if within config directory
          if (this.valuesFilePath.startsWith(path.resolve(this.configDir))) {
            fs.writeFileSync(this.valuesFilePath, JSON.stringify(defaultValues, null, 2));
            console.error(`Created default prompt values file at: ${this.valuesFilePath}`);
          }
        } catch (writeErr) {
          console.error(`Could not create prompt values file: ${writeErr}`);
        }

        return defaultValues;
      }

      // Read and parse the file - validate path first
      if (!this.valuesFilePath.startsWith(path.resolve(this.configDir))) {
        console.error('Path validation failed for prompt values file');
        return { global: {}, prompts: {} };
      }

      const fileContent = fs.readFileSync(this.valuesFilePath, 'utf8');
      return JSON.parse(fileContent) as StoredPromptValues;
    } catch (err) {
      console.error('Error loading prompt values:', err);
      // Return empty default structure on error
      return { global: {}, prompts: {} };
    }
  }

  /**
   * Saves the current values to the JSON file.
   */
  private async saveValues(): Promise<void> {
    try {
      // Validate path is within config directory
      if (!this.valuesFilePath.startsWith(path.resolve(this.configDir))) {
        console.error('Path validation failed: cannot save outside config directory');
        return;
      }

      // Use safe write operation
      await safeWriteFile(
        this.valuesFilePath,
        JSON.stringify(this.values, null, 2),
        this.configDir
      );
    } catch (err) {
      console.error('Error saving prompt values:', err);
    }
  }

  /**
   * Gets stored argument values for a prompt.
   *
   * @param promptName The name of the prompt
   * @returns An object with stored argument values
   */
  getStoredValues(promptName: string): Record<string, string> {
    // Start with global values
    const result: Record<string, string> = { ...this.values.global };

    // Add prompt-specific values if they exist
    if (this.values.prompts[promptName]) {
      Object.assign(result, this.values.prompts[promptName]);
    }

    return result;
  }

  /**
   * Updates stored values with the new values provided.
   *
   * @param promptName The name of the prompt
   * @param args The argument values to store
   */
  async updateStoredValues(promptName: string, args: Record<string, string>): Promise<void> {
    // Extract global values (like working_directory)
    if (args.working_directory) {
      this.values.global.working_directory = args.working_directory;
    }

    try {
      // Ensure prompt entry exists
      if (!this.values.prompts[promptName]) {
        this.values.prompts[promptName] = {};
      }

      // Update prompt-specific values (excluding global ones)
      const promptValues = this.values.prompts[promptName];
      const globalKeys = Object.keys(this.values.global);

      Object.entries(args).forEach(([key, value]) => {
        // Skip global keys and empty values
        if (!globalKeys.includes(key) && value.trim() !== '') {
          promptValues[key] = value;
        }
      });

      // Save updated values
      await this.saveValues();
    } catch (err) {
      console.error('Error saving prompt values:', err);
      // Don't throw, just log the error
    }
  }
}
