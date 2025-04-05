# Development Guide

This guide covers how to set up and contribute to the Delegate MCP project.

## Setting Up the Development Environment

1. Clone the repository:

```bash
git clone https://github.com/rashidshafeev/delegate-mcp.git
cd delegate-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Create a local environment file:

```bash
cp .env.example .env
```

4. Edit the `.env` file to add your API keys and configuration.

5. Build the project:

```bash
npm run build
```

## Development Scripts

- `npm run build` - Build the project
- `npm run dev` - Build and watch for changes
- `npm run test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Project Structure

```
src/
├── context/        # Context preparation logic
├── mcp/            # MCP server and tools
│   └── tools/      # Tool implementations
├── providers/      # Model provider implementations
└── utils/          # Utility functions
```

## Adding a New Provider

To add a new model provider:

1. Create a new file in `src/providers/` (e.g., `src/providers/new-provider.ts`)
2. Implement the `ModelProvider` interface
3. Register the provider in `src/providers/index.ts`

Example:

```typescript
import { BaseModelProvider, ModelRequestOptions, ModelResponse } from './base.js';

export class NewProvider extends BaseModelProvider {
  readonly name = 'new-provider';
  // Implement the required methods...
}

// In src/providers/index.ts
import { NewProvider } from './new-provider.js';

export function initializeProviders(): void {
  // ...
  const newProvider = new NewProvider();
  providerRegistry.registerProvider(newProvider);
  // ...
}
```

## Adding a New Tool

To add a new tool to the MCP server:

1. Create a new file in `src/mcp/tools/` (e.g., `src/mcp/tools/new-tool.ts`)
2. Implement the tool function and schema
3. Register the tool in `src/mcp/server.ts`

Example:

```typescript
import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

export const newToolParamsSchema = z.object({
  // Define your parameters here
});

export async function newTool(
  params: z.infer<typeof newToolParamsSchema>,
  extra: RequestHandlerExtra
): Promise<CallToolResult> {
  // Implement your tool logic here
}

// In src/mcp/server.ts
function registerNewTool(server: McpServer): void {
  server.tool(
    'new_tool',
    'Description of the new tool',
    newToolParamsSchema.shape,
    newTool
  );
}
```

## Testing

We use Vitest for testing. Write tests for your components in the `tests/` directory. Run tests with:

```bash
npm run test
```

## Submitting Changes

1. Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

2. Make your changes

3. Test your changes:

```bash
npm run lint
npm run test
```

4. Commit your changes:

```bash
git commit -m "Add feature: your feature description"
```

5. Push your changes:

```bash
git push origin feature/your-feature-name
```

6. Open a pull request on GitHub

## Building Documentation

The documentation is written in Markdown and located in the `docs/` directory. To build the documentation, you can use a Markdown tool like `markserv` to preview the documentation locally:

```bash
npm install -g markserv
markserv docs/
```
