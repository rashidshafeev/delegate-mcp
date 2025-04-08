/**
 * Minimal MCP server for testing Claude compatibility
 * Run with: npx ts-node-esm src/utils/minimal-server.ts
 * 
 * This is a stripped down server that only responds to basic commands.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';

// Set production mode explicitly
process.env.NODE_ENV = 'production';

// Setup logging
const logDir = path.resolve(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  try {
    require('fs').mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

const logFile = path.join(logDir, `minimal-server-${Date.now()}.log`);
console.error(`Logging to: ${logFile}`);

function logMessage(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${message}\n`;
  
  // Log to stderr
  console.error(logEntry);
  
  // Log to file
  try {
    writeFileSync(logFile, logEntry, { flag: 'a' });
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

async function main() {
  logMessage('Starting minimal MCP server');
  
  try {
    // Create a simple server with minimal configuration
    const server = new McpServer(
      { name: 'minimal-server', version: '0.1.0' },
      { capabilities: { tools: {} } }
    );
    
    // Register a single simple tool
    server.tool(
      'echo',
      'Simple echo tool',
      {
        message: z.string().describe('Message to echo back')
      },
      async (request) => {
        logMessage(`Echo tool called with: ${JSON.stringify(request.params)}`);
        return {
          content: [
            { type: 'text', text: `You said: ${request.params.message}` }
          ]
        };
      }
    );
    
    // Use the standard transport without any customization
    const transport = new StdioServerTransport();
    
    // Log when messages are received
    transport.onmessage = (message) => {
      logMessage(`Received message: ${JSON.stringify(message)}`);
    };
    
    // Connect the server
    logMessage('Connecting server...');
    await server.connect(transport);
    logMessage('Server connected successfully');
  } catch (error) {
    logMessage(`Fatal error: ${(error as Error).message}`);
    logMessage(`Stack: ${(error as Error).stack}`);
    process.exit(1);
  }
}

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
