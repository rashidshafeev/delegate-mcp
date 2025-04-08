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

// Check if we're being run via MCP (no arguments, just stdin/stdout)
if (process.argv.length <= 2) {
  // If no arguments are provided, assume we're being run by an MCP client
  // and start the server directly
  logger.info('Starting MCP server in direct mode');
  
  // Setup environment for proper JSON handling with Claude
  process.env.NODE_ENV = 'production';
  
  (async () => {
    try {
      // Initialize providers (only Gemini)
      initializeProviders();
      const providers = getAvailableProviders();
      
      if (providers.length === 0) {
        logger.warn('Gemini provider is not available. Please check your GEMINI_API_KEY environment variable.');
      }
      
      // Start the server
      await startMcpServer();
      
      // We don't exit here as the server will keep running
    } catch (error) {
      logger.error(`Failed to start MCP server: ${(error as Error).message}`);
      process.exit(1);
    }
  })();
} else {
  // Create commander program for CLI usage
  const program = new Command();

  program
    .name('delegate-mcp')
    .description('MCP implementation for Gemini context preparation and delegation')
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
        
        // Initialize providers (only Gemini)
        initializeProviders();
        const providers = getAvailableProviders();
        
        if (providers.length === 0) {
          throw new Error('Gemini provider is not available. Please check your GEMINI_API_KEY environment variable.');
        }
        
        // Start the server
        await startMcpServer();
        
        // We don't exit here as the server will keep running
      } catch (error) {
        logger.error(`Failed to start MCP server: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Check command - check if Gemini provider is available
  program
    .command('check')
    .description('Check availability of Gemini provider')
    .action(async () => {
      try {
        logger.info('Checking Gemini provider...');
        
        // Initialize provider
        initializeProviders();
        
        // Get available providers
        const providers = getAvailableProviders();
        
        if (providers.length === 0) {
          logger.error('Gemini provider is not available. Please check your GEMINI_API_KEY environment variable.');
          process.exit(1);
        }
        
        logger.success('Gemini provider is available');
        
        // Log available models
        const provider = providers[0];
        const models = await provider.getAvailableModels();
        logger.info(`Available Gemini models: ${models.join(', ')}`);
        
        process.exit(0);
      } catch (error) {
        logger.error(`Error checking provider: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  // Run the program
  program.parse(process.argv);
}
