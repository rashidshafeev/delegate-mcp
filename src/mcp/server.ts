import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { prepareContextTool } from './tools/prepare-context.js';
import { delegateTool } from './tools/delegate.js';

/**
 * Create and configure an MCP server with all the tools
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
    repository: z.string().describe('Path to a local repository or a GitHub repository URL'),
    
    // Optional parameters
    files: z.array(z.string()).optional().describe('Glob patterns to include specific files'),
    ignorePatterns: z.array(z.string()).optional().describe('Glob patterns to exclude files'),
    includeComments: z.boolean().optional().describe('Whether to include explanatory comments'),
    subsetDirectories: z.array(z.string()).optional().describe('Only include specific directories'),
    outputFormat: z.enum(['text', 'json', 'github']).optional().describe('Format of the output'),
    outputPath: z.string().optional().describe('Path where output should be saved'),
    githubOutput: z.object({
      owner: z.string(),
      repo: z.string(),
      path: z.string(),
      message: z.string().optional(),
    }).optional().describe('GitHub repository details for saving output'),
    maxTokens: z.number().optional().describe('Maximum tokens to include in context'),
  });
  
  server.tool(
    'prepare_context',
    'Prepare and package LLM context from repository content with enhanced capabilities',
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
    
    // Optional parameters
    model: z.string().optional().describe('The model to use (e.g., "gemini-pro", "gpt-4")'),
    provider: z.string().optional().describe('The provider to use (e.g., "gemini", "openai", "anthropic")'),
    contextFile: z.string().optional().describe('Path to a context file to use'),
    contextText: z.string().optional().describe('Context text to include with the prompt'),
    temperature: z.number().min(0).max(1).optional().describe('Temperature for generation'),
    maxTokens: z.number().optional().describe('Maximum tokens to generate'),
    async: z.boolean().optional().describe('Whether to run asynchronously'),
    storeResults: z.boolean().optional().describe('Whether to store results'),
    resultPath: z.string().optional().describe('Path to store results'),
    resultRepo: z.string().optional().describe('GitHub repo to store results (format: "owner/repo")'),
    resultRepoPath: z.string().optional().describe('Path in GitHub repo to store results'),
    systemPrompt: z.string().optional().describe('System prompt to use'),
  });
  
  server.tool(
    'delegate',
    'Delegate requests to LLMs with flexibility in model selection and result handling',
    delegateSchema.shape,
    delegateTool
  );
  
  logger.debug('delegate tool registered successfully');
}
