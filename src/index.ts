/**
 * Main entry point for delegate-mcp
 * 
 * This service implements two MCP tools:
 * 1. prepare_context - Packages files into a context document and saves to GitHub
 * 2. delegate - Delegates requests to Gemini with context from file paths
 */

import { logger } from './utils/logger.js';
import { startMcpServer } from './mcp/server.js';
import { DirectTransport } from './utils/direct-transport.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Enable production mode for better Claude compatibility
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

/**
 * Main function to start the application
 */
async function main(): Promise<void> {
  try {
    logger.info('Starting delegate-mcp...');
    
    // Start MCP server with DirectTransport for improved Claude compatibility
    logger.info('Using DirectTransport for all clients to ensure cross-compatibility');
    const server = await startDirectMcpServer();
    
    logger.success('delegate-mcp is running');
    
    // Handle shutdown
    setupShutdownHandlers(server);
  } catch (error) {
    logger.error(`Failed to start application: ${(error as Error).message}`);
    process.exit(1);
  }
}

/**
 * Start MCP server with DirectTransport
 */
async function startDirectMcpServer(): Promise<McpServer> {
  const server = new McpServer(
    { name: 'delegate-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );
  
  // Register tools
  await registerTools(server);
  
  // Use DirectTransport for all clients
  logger.info('Connecting server with DirectTransport');
  const transport = new DirectTransport();
  await server.connect(transport);
  
  return server;
}

/**
 * Register MCP tools with the server
 */
async function registerTools(server: McpServer): Promise<void> {
  const { registerPrepareContextTool, registerDelegateTool } = await import('./mcp/server.js');
  
  // Register tools directly using imported functions
  registerPrepareContextTool(server);
  registerDelegateTool(server);
}

/**
 * Set up handlers for graceful shutdown
 */
function setupShutdownHandlers(server: McpServer): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await shutdownGracefully(server);
  });
  
  // Handle SIGTERM (kill)
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await shutdownGracefully(server);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error(`Uncaught exception: ${error.message}`);
    logger.error(error.stack || 'No stack trace available');
    await shutdownGracefully(server);
  });
}

/**
 * Gracefully shut down the application
 */
async function shutdownGracefully(server: McpServer): Promise<void> {
  try {
    logger.info('Closing MCP server...');
    await server.close();
    logger.success('Shutdown complete');
  } catch (error) {
    logger.error(`Error during shutdown: ${(error as Error).message}`);
  } finally {
    process.exit(0);
  }
}

// Run the main function
main().catch(error => {
  console.error(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
