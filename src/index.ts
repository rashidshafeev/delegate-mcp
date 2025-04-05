#!/usr/bin/env node

import { Command } from 'commander';
import { startMcpServer } from './mcp/server.js';
import { initializeProviders, getAvailableProviders } from './providers/index.js';
import { config } from './utils/config.js';
import { logger, LogLevel } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get package version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Create commander program
const program = new Command();

program
  .name('delegate-mcp')
  .description('MCP implementation with context preparation and model delegation capabilities')
  .version(packageJson.version);

// Start command - start the MCP server
program
  .command('start')
  .description('Start the MCP server')
  .option('-d, --debug', 'Enable debug logging')
  .option('-c, --config <path>', 'Path to a configuration file')
  .action(async (options) => {
    try {
      // Set log level if debug flag is provided
      if (options.debug) {
        logger.setLevel(LogLevel.DEBUG);
        logger.debug('Debug logging enabled');
      }
      
      // Load config from file if provided
      if (options.config) {
        logger.info(`Loading configuration from ${options.config}`);
        config.loadFromFile(options.config);
      }
      
      // Initialize providers
      initializeProviders();
      
      // Start the server
      await startMcpServer();
      
      // We don't exit here as the server will keep running
    } catch (error) {
      logger.error(`Failed to start MCP server: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Check command - check availability of providers
program
  .command('check')
  .description('Check availability of LLM providers')
  .action(async () => {
    try {
      logger.info('Checking LLM providers...');
      
      // Initialize providers
      initializeProviders();
      
      // Get available providers
      const providers = getAvailableProviders();
      
      if (providers.length === 0) {
        logger.error('No LLM providers are available. Please check your API keys.');
        process.exit(1);
      }
      
      logger.success(`Available providers: ${providers.map(p => p.name).join(', ')}`);
      
      // For each provider, log available models
      for (const provider of providers) {
        const models = await provider.getAvailableModels();
        logger.info(`Models for ${provider.name}: ${models.slice(0, 5).join(', ')}${models.length > 5 ? ` and ${models.length - 5} more...` : ''}`);
      }
      
      process.exit(0);
    } catch (error) {
      logger.error(`Error checking providers: ${(error as Error).message}`);
      process.exit(1);
    }
  });

// Run the program
program.parse(process.argv);
