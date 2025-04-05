# Model Providers

Delegate MCP is designed to support multiple model providers. Currently, it primarily supports Google's Gemini API, with extensibility for other providers in the future.

## Current Provider Support

- [Gemini](gemini.md) - Google's Gemini models

## Planned Provider Support

Support for the following providers is planned for future releases:

- OpenAI - GPT models
- Anthropic - Claude models
- More will be added based on demand

## Architecture

Delegate MCP uses a provider-based architecture to abstract away the differences between different model APIs. This allows for a consistent interface for working with different models, regardless of the underlying API.

Each provider implements the following interface:

```typescript
interface ModelProvider {
  readonly name: string;
  isAvailable(): boolean;
  getAvailableModels(): Promise<string[]>;
  getDefaultModel(): string;
  generateText(options: ModelRequestOptions): Promise<ModelResponse>;
  supportsModel(model: string): Promise<boolean>;
}
```

This abstraction allows the tools to work with any provider that implements this interface, making it easy to add support for new providers in the future.

## Provider Selection

When using the `delegate` tool, you can specify which provider to use with the `provider` parameter. If not specified, the tool will attempt to find a provider that supports the requested model, or fall back to the default provider configured in the environment.

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Explain quantum computing',
  provider: 'gemini',
  model: 'gemini-pro'
});
```

## Configuration

Each provider requires its own API key, which should be set in the environment variables:

```
GEMINI_API_KEY=your_gemini_key
```

See each provider's documentation for specific configuration options.
