import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { prepareContextTool } from './tools/prepare-context.js';
import { delegateTool } from './tools/delegate.js';

/**
 * Create and configure an MCP server with the prepare_context and delegate tools
 */
export function createMcpServer(): McpServer {
  logger.info('Creating MCP server');
  
  const server = new McpServer(
    { name: 'delegate-mcp', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {} } }
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
  const transport = new StdioServerTransport();
  
  logger.info('Starting MCP server with stdio transport');
  await server.connect(transport);
  logger.success('MCP server started');
  
  return server;
}

/**
 * Register the prepare_context tool with the MCP server
 */
function registerPrepareContextTool(server: McpServer): void {
  logger.info('Registering prepare_context tool');
  
  const prepareContextSchema = z.object({
    // Required parameters
    paths: z.array(z.string()).describe('Array of file or directory paths to include'),
    
    // Optional parameters
    comment: z.string().optional().describe('Comment to append to the end of the context'),
    owner: z.string().optional().describe('GitHub repository owner'),
    repo: z.string().optional().describe('GitHub repository name'),
    branch: z.string().optional().describe('GitHub repository branch'),
    outputPath: z.string().optional().describe('Path where output should be saved locally'),
    githubPath: z.string().optional().describe('Path in the GitHub repository to save the file'),
  });
  
  server.tool(
    'prepare_context',
    'Prepare context from file paths and save to GitHub',
    prepareContextSchema.shape,
    prepareContextTool
  );
  
  logger.debug('prepare_context tool registered successfully');
}

/**
 * Register the delegate tool with the MCP server
 */
function registerDelegateTool(server: McpServer): void {
  logger.info('Registering delegate tool');
  
  const delegateSchema = z.object({
    // Required parameters
    prompt: z.string().describe('The prompt to send to the model'),
    
    // Context parameters
    paths: z.array(z.string()).optional().describe('Array of file paths to include as context'),
    comment: z.string().optional().describe('Additional context comment'),
    
    // Model parameters
    model: z.string().optional().describe('The model to use (only Gemini models supported)'),
    temperature: z.number().min(0).max(1).optional().describe('Temperature for generation'),
    maxTokens: z.number().optional().describe('Maximum tokens to generate'),
    
    // Result handling parameters
    realtime: z.boolean().optional().default(true).describe('Whether to return results in realtime'),
    
    // GitHub parameters
    owner: z.string().optional().describe('GitHub repository owner'),
    repo: z.string().optional().describe('GitHub repository name'),
    branch: z.string().optional().describe('GitHub repository branch'),
  });
  
  server.tool(
    'delegate',
    'Delegate requests to Gemini with context from file paths',
    delegateSchema.shape,
    delegateTool
  );
  
  logger.debug('delegate tool registered successfully');
}
