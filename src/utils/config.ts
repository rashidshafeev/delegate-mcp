import dotenv from 'dotenv';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

dotenv.config();

const configSchema = z.object({
  // LLM Provider API Keys
  openaiApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  
  // GitHub configuration
  githubToken: z.string().optional(),
  
  // Default models for delegation
  defaultModel: z.string().default('gemini-pro'),
  defaultProvider: z.string().default('gemini'),
  
  // Context preparation defaults
  maxTokensPerContext: z.number().default(100000),
  defaultIgnorePatterns: z.array(z.string()).default([
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/*.lock',
    '**/*.min.js',
    '**/*.map'
  ]),
  defaultIncludePatterns: z.array(z.string()).default(['**/*']),
  
  // Misc settings
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  outputDirectory: z.string().default('./output'),
  tempDirectory: z.string().default('./tmp'),
  defaultTimeout: z.number().default(60000), // 1 minute timeout
});

type ConfigType = z.infer<typeof configSchema>;

// Create a class to manage configuration with defaults and overrides
export class Config {
  private config: ConfigType;
  private static instance: Config;

  private constructor() {
    // Load from environment variables
    this.config = {
      openaiApiKey: process.env.OPENAI_API_KEY,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY,
      geminiApiKey: process.env.GEMINI_API_KEY,
      githubToken: process.env.GITHUB_TOKEN,
      defaultModel: process.env.DEFAULT_MODEL || 'gemini-pro',
      defaultProvider: process.env.DEFAULT_PROVIDER || 'gemini',
      maxTokensPerContext: parseInt(process.env.MAX_TOKENS_PER_CONTEXT || '100000'),
      defaultIgnorePatterns: process.env.DEFAULT_IGNORE_PATTERNS ? 
        JSON.parse(process.env.DEFAULT_IGNORE_PATTERNS) : [
          '**/node_modules/**',
          '**/dist/**',
          '**/build/**',
          '**/.git/**',
          '**/*.lock',
          '**/*.min.js',
          '**/*.map'
        ],
      defaultIncludePatterns: process.env.DEFAULT_INCLUDE_PATTERNS ?
        JSON.parse(process.env.DEFAULT_INCLUDE_PATTERNS) : ['**/*'],
      logLevel: (process.env.LOG_LEVEL as any) || 'info',
      outputDirectory: process.env.OUTPUT_DIRECTORY || './output',
      tempDirectory: process.env.TEMP_DIRECTORY || './tmp',
      defaultTimeout: parseInt(process.env.DEFAULT_TIMEOUT || '60000'),
    };

    // Validate the configuration
    try {
      this.config = configSchema.parse(this.config);
    } catch (error) {
      console.error('Invalid configuration:', error);
      throw error;
    }

    // Create required directories
    this.ensureDirectoryExists(this.config.outputDirectory);
    this.ensureDirectoryExists(this.config.tempDirectory);
  }

  private ensureDirectoryExists(directory: string): void {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
  }

  public static getInstance(): Config {
    if (!Config.instance) {
      Config.instance = new Config();
    }
    return Config.instance;
  }

  public get<K extends keyof ConfigType>(key: K): ConfigType[K] {
    return this.config[key];
  }

  public getAll(): ConfigType {
    return { ...this.config };
  }

  public set<K extends keyof ConfigType>(key: K, value: ConfigType[K]): void {
    this.config[key] = value;
  }

  // Load config from a JSON file and merge with current config
  public loadFromFile(filePath: string): void {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);
      
      // Merge with current config
      this.config = {
        ...this.config,
        ...fileConfig,
      };
      
      // Validate again
      this.config = configSchema.parse(this.config);
    } catch (error) {
      console.error(`Error loading config from ${filePath}:`, error);
      throw error;
    }
  }

  // Save current config to a JSON file
  public saveToFile(filePath: string): void {
    try {
      const dirPath = path.dirname(filePath);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error(`Error saving config to ${filePath}:`, error);
      throw error;
    }
  }
}

// Export a default instance
export const config = Config.getInstance();
