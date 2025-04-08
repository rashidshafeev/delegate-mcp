import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { prepareContextTool } from './tools/prepare-context.js';
import { delegateTool } from './tools/delegate.js';
import { DebugTransportWrapper } from '../utils/debug-transport.js';
import { PatchedStdioServerTransport } from '../utils/patched-stdio.js';

/**
 * Create and configure an MCP server with the prepare_context and delegate tools
 */
export function createMcpServer(): McpServer {
  logger.info('Creating MCP server');
  
  const server = new McpServer(
    { name: 'delegate-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // Register the prepare_context tool
  registerPrepareContextTool(server);
  
  // Register the delegate tool
  registerDelegateTool(server);
  
  logger.success('MCP server initialized successfully');
  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startMcpServer(): Promise<McpServer> {
  const server = createMcpServer();
  
  // Create the transport with debugging and patching
  // Use our patched version of StdioServerTransport to fix JSON issues
  const stdioTransport = new PatchedStdioServerTransport();
  const transport = new DebugTransportWrapper(stdioTransport);
  
  logger.info('Starting MCP server with patched stdio transport');
  await server.connect(transport);
  logger.success('MCP server started');
  
  return server;
}

/**
 * Register the prepare_context tool with the MCP server
 */
function registerPrepareContextTool(server: McpServer): void {
  logger.info('Registering prepare_context tool');
  
  server.tool(
    'prepare_context',
    'Prepare context from file paths and save to GitHub',
    {
      paths: z.array(z.string()).describe('Array of file or directory paths to include'),
      comment: z.string().optional().describe('Comment to append to the end of the context'),
      owner: z.string().optional().describe('GitHub repository owner'),
      repo: z.string().optional().describe('GitHub repository name'),
      branch: z.string().optional().describe('GitHub repository branch'),
      outputPath: z.string().optional().describe('Path where output should be saved locally'),
      githubPath: z.string().optional().describe('Path in the GitHub repository to save the file'),
    },
    prepareContextTool
  );
  
  logger.debug('prepare_context tool registered successfully');
}

/**
 * Register the delegate tool with the MCP server
 */
function registerDelegateTool(server: McpServer): void {
  logger.info('Registering delegate tool');
  
  server.tool(
    'delegate',
    'Delegate requests to Gemini with context from file paths',
    {
      prompt: z.string().describe('The prompt to send to the model'),
      paths: z.array(z.string()).optional().describe('Array of file paths to include as context'),
      comment: z.string().optional().describe('Additional context comment'),
      model: z.string().optional().describe('The model to use (only Gemini models supported)'),
      temperature: z.number().min(0).max(1).optional().describe('Temperature for generation'),
      maxTokens: z.number().optional().describe('Maximum tokens to generate'),
      realtime: z.boolean().optional().default(true).describe('Whether to return results in realtime'),
      owner: z.string().optional().describe('GitHub repository owner'),
      repo: z.string().optional().describe('GitHub repository name'),
      branch: z.string().optional().describe('GitHub repository branch'),
    },
    delegateTool
  );
  
  logger.debug('delegate tool registered successfully');
}
