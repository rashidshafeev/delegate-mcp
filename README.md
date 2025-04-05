# delegate-mcp

A Model Context Protocol implementation with powerful context preparation and model delegation capabilities.

## Features

### prepare_context Tool

Prepares and packages context for LLMs with enhanced capabilities:

- Extract relevant files from repositories (local or GitHub)
- Filter and select specific parts of files to save tokens
- Add explanatory comments and annotations
- Export to text file or GitHub repository
- Support for multiple packaging formats

### delegate Tool

Delegates requests to other models with advanced flexibility:

- Support for multiple LLM providers (OpenAI, Anthropic, Google)
- Synchronous and asynchronous delegation modes
- Model selection based on task requirements
- Result storage in GitHub repositories for persistence
- Evaluation capabilities for comparing model responses

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with your API keys:

```
# LLM Provider API Keys
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# GitHub Configuration
GITHUB_TOKEN=your_github_token
```

## Usage

### Starting the MCP Server

```bash
npm start
```

### Using the Tools

Connect to the MCP server and use the tools:

```typescript
// Example client code
import { Client } from '@modelcontextprotocol/sdk/client';

const client = new Client();
await client.connect(transport);

// Use prepare_context tool
const contextResult = await client.callTool('prepare_context', {
  repository: 'https://github.com/user/repo',
  files: ['src/**/*.ts', '!node_modules'],
  outputFormat: 'text',
  outputPath: './context.txt'
});

// Use delegate tool
const delegateResult = await client.callTool('delegate', {
  model: 'gemini-pro',
  prompt: 'Summarize the following repository structure...',
  contextFile: './context.txt',
  storeResults: true,
  resultRepo: 'user/results-repo'
});
```

## License

MIT
