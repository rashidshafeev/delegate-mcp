# Development Guide

This document provides guidance for developers who want to extend or modify the delegate-mcp server.

## Table of Contents

- [Project Structure](#project-structure)
- [Adding New Tools](#adding-new-tools)
- [Adding Model Providers](#adding-model-providers)
- [Customizing GitHub Integration](#customizing-github-integration)
- [Development Workflow](#development-workflow)
- [Testing](#testing)

## Project Structure

The delegate-mcp codebase is organized as follows:

```
delegate-mcp/
├── dist/              # Compiled JavaScript output
├── docs/              # Documentation
├── src/               # Source code
│   ├── context/       # Context preparation and handling
│   │   └── packager.ts
│   ├── mcp/           # MCP server and tools
│   │   ├── server.ts
│   │   └── tools/
│   │       ├── prepare-context.ts
│   │       └── delegate.ts
│   ├── providers/     # Model providers
│   │   ├── base.ts
│   │   ├── gemini.ts
│   │   └── index.ts
│   ├── utils/         # Utility functions
│   │   ├── config.ts
│   │   ├── github.ts
│   │   ├── logger.ts
│   │   └── token-counter.ts
│   └── index.ts       # Entry point
└── package.json
```

## Adding New Tools

To add a new tool to the MCP server, follow these steps:

1. **Create a new tool file** in `src/mcp/tools/` (e.g., `new-tool.ts`)

```typescript
import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';

// Define parameter schema for the tool
export const newToolParamsSchema = z.object({
  // Define parameters
  param1: z.string().describe('Description of param1'),
  param2: z.number().optional().describe('Description of param2'),
});

export type NewToolParams = z.infer<typeof newToolParamsSchema>;

// Implement the tool
export async function newTool(
  params: NewToolParams,
  extra: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.info(`new_tool called with params: ${JSON.stringify(params)}`);
  
  try {
    // Validate parameters
    newToolParamsSchema.parse(params);
    
    // Tool implementation
    const result = await doSomething(params);
    
    // Return result
    return {
      content: [
        {
          type: 'text',
          text: `Tool executed successfully: ${result}`
        }
      ]
    };
  } catch (error) {
    logger.error(`Error in new_tool: ${(error as Error).message}`);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${(error as Error).message}`
        }
      ],
      isError: true
    };
  }
}

// Helper function for the tool
async function doSomething(params: NewToolParams): Promise<string> {
  // Implementation
  return "Result of the tool";
}
```

2. **Register the tool** in `src/mcp/server.ts`

```typescript
// In src/mcp/server.ts
import { newTool } from './tools/new-tool.js';

// Add this function to register your new tool
function registerNewTool(server: McpServer): void {
  logger.info('Registering new_tool');
  
  const newToolSchema = z.object({
    param1: z.string().describe('Description of param1'),
    param2: z.number().optional().describe('Description of param2'),
  });
  
  server.tool(
    'new_tool',
    'Description of what the new tool does',
    newToolSchema.shape,
    newTool
  );
  
  logger.debug('new_tool registered successfully');
}

// Update the createMcpServer function to call your registration function
export function createMcpServer(): McpServer {
  logger.info('Creating MCP server');
  
  const server = new McpServer(
    { name: 'delegate-mcp', version: '0.1.0' },
    { capabilities: { tools: {}, prompts: {} } }
  );

  // Register tools
  registerPrepareContextTool(server);
  registerDelegateTool(server);
  registerNewTool(server); // Add this line
  
  logger.success('MCP server initialized successfully');
  return server;
}
```

3. **Document your tool** in the README and usage documentation

## Adding Model Providers

To add a new model provider:

1. **Create a new provider file** in `src/providers/` (e.g., `newprovider.ts`)

```typescript
import { BaseModelProvider, ModelRequestOptions, ModelResponse } from './base.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export class NewProvider extends BaseModelProvider {
  readonly name = 'newprovider';
  private client: any = null;
  
  constructor() {
    super();
    this.initClient();
  }
  
  private initClient(): void {
    const apiKey = config.get('newProviderApiKey');
    if (apiKey) {
      try {
        // Initialize your client
        this.client = new SomeClientSDK(apiKey);
        logger.debug('New provider client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize new provider client', error);
        this.client = null;
      }
    } else {
      logger.warn('No API key provided for new provider');
      this.client = null;
    }
  }
  
  isAvailable(): boolean {
    return this.client !== null;
  }
  
  async getAvailableModels(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }
    
    // Return available models
    return [
      'newprovider-model1',
      'newprovider-model2',
    ];
  }
  
  getDefaultModel(): string {
    return 'newprovider-model1';
  }
  
  async generateText(options: ModelRequestOptions): Promise<ModelResponse> {
    if (!this.isAvailable()) {
      throw new Error('New provider is not available. Check your API key.');
    }
    
    this.validateOptions(options);
    logger.debug(`Generating text with model: ${options.model}`);
    
    try {
      // Implement API call to generate text
      const response = await this.client.generateText({
        model: options.model,
        prompt: options.prompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 1024,
      });
      
      return {
        content: response.text,
        model: options.model,
        provider: this.name,
        tokenUsage: {
          prompt: response.usedTokens?.prompt,
          completion: response.usedTokens?.completion,
          total: response.usedTokens?.total,
        },
      };
    } catch (error) {
      logger.error(`New provider API error: ${(error as Error).message}`);
      throw new Error(`New provider API error: ${(error as Error).message}`);
    }
  }
  
  async supportsModel(model: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.includes(model) || model.startsWith('newprovider-');
  }
}
```

2. **Update the configuration** in `src/utils/config.ts` to include the new provider's API key

```typescript
// In src/utils/config.ts
const configSchema = z.object({
  // Existing config
  geminiApiKey: z.string().optional(),
  githubToken: z.string().optional(),
  
  // Add new provider
  newProviderApiKey: z.string().optional(),
  
  // Rest of config
  defaultRepo: z.string().default(''),
  defaultOwner: z.string().default(''),
  defaultBranch: z.string().default('main'),
  // ...
});
```

3. **Register the provider** in `src/providers/index.ts`

```typescript
// In src/providers/index.ts
import { NewProvider } from './newprovider.js';

export function initializeProviders(): void {
  logger.info('Initializing providers');
  
  // Create and register Gemini provider
  const geminiProvider = new GeminiProvider();
  providerRegistry.registerProvider(geminiProvider);
  
  // Create and register new provider
  const newProvider = new NewProvider();
  providerRegistry.registerProvider(newProvider);
  
  // Log available providers
  const availableProviders = providerRegistry.getAvailableProviders();
  if (availableProviders.length > 0) {
    logger.success(`Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
  } else {
    logger.warn('No providers are available. Please check your API keys.');
  }
}
```

4. **Update the delegate tool** in `src/mcp/tools/delegate.ts` to support the new provider.

## Customizing GitHub Integration

The GitHub integration is handled in `src/utils/github.ts`. You can extend this to add more functionality:

1. **Add new methods** to the `GitHubClient` class
2. **Modify existing methods** to support additional options
3. **Implement alternative storage backends** by creating a similar interface

## Development Workflow

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rashidshafeev/delegate-mcp.git
   cd delegate-mcp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a .env file**:
   ```
   GEMINI_API_KEY=your_key
   GITHUB_API_KEY=your_token
   OWNER=your_username
   REPO=your_repo
   ```

4. **Run in development mode**:
   ```bash
   npm run dev
   ```

5. **Test your changes**:
   ```bash
   npm start -- check
   ```

6. **Build the project**:
   ```bash
   npm run build
   ```

## Testing

To write tests for your new functionality:

1. **Create test files** in the same directory as the implementation, with a `.test.ts` extension

2. **Use Vitest** for testing:
   ```typescript
   import { describe, it, expect, vi } from 'vitest';
   import { yourFunction } from './your-file.js';
   
   describe('yourFunction', () => {
     it('should return expected result', async () => {
       const result = await yourFunction(params);
       expect(result).toEqual(expectedResult);
     });
     
     it('should handle errors', async () => {
       // Mock dependencies
       vi.spyOn(dependencies, 'method').mockRejectedValue(new Error('Test error'));
       
       // Test error handling
       await expect(yourFunction(params)).rejects.toThrow('Test error');
     });
   });
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Run tests in watch mode** during development:
   ```bash
   npm run test:watch
   ```
