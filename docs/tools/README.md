# MCP Tools

Delegate MCP provides two powerful tools for working with LLMs:

## 1. prepare_context Tool

The `prepare_context` tool prepares and packages context from repositories for LLMs. It allows you to:

- Extract relevant files from repositories (local or GitHub)
- Filter and select specific parts of files to save tokens
- Add explanatory comments and annotations
- Export to text file or GitHub repository

[Read more about prepare_context](prepare-context.md)

## 2. delegate Tool

The `delegate` tool delegates requests to other models with advanced flexibility:

- Support for Gemini models (with extensibility for other providers)
- Synchronous and asynchronous delegation modes
- Model selection based on task requirements
- Result storage in files or GitHub repositories

[Read more about delegate](delegate.md)

## Using the Tools

You can use these tools by connecting to the MCP server and calling them via the MCP protocol.

Example client code using the MCP SDK:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';

async function main() {
  // Create a client
  const client = new Client();
  
  // Connect to the server
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js', 'start'],
  });
  await client.connect(transport);
  
  // Get available tools
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  // Call prepare_context tool
  const contextResult = await client.callTool('prepare_context', {
    repository: 'https://github.com/user/repo',
    files: ['src/**/*.ts', '!node_modules'],
    outputFormat: 'text',
    outputPath: './context.txt'
  });
  
  // Call delegate tool
  const delegateResult = await client.callTool('delegate', {
    model: 'gemini-pro',
    prompt: 'Summarize the following repository structure...',
    contextFile: './context.txt',
    storeResults: true,
  });
  
  // Close the connection
  await client.close();
}

main().catch(console.error);
```
