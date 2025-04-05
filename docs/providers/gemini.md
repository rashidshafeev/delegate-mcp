# Gemini Provider

The Gemini provider integrates with Google's Gemini API to provide access to Google's large language models.

## Setup

To use the Gemini provider, you need to set the `GEMINI_API_KEY` environment variable:

```
GEMINI_API_KEY=your_gemini_key
```

You can obtain an API key from [Google AI Studio](https://makersuite.google.com/).

## Supported Models

The Gemini provider supports the following models:

- `gemini-pro` - General purpose text model
- `gemini-pro-vision` - Multimodal model supporting text and images
- `gemini-ultra` - Advanced capabilities (limited availability)
- `gemini-1.5-pro` - Newer generation model
- `gemini-1.5-flash` - Faster, more efficient model

## Default Model

The default model is `gemini-pro`.

## Usage

### Basic Usage

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Explain the difference between REST and GraphQL',
  model: 'gemini-pro'
});
```

### With System Prompt

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Write a function to calculate the Fibonacci sequence',
  model: 'gemini-pro',
  systemPrompt: 'You are an expert programmer. Provide well-commented code with explanations.'
});
```

### With Temperature Control

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Write a creative story about a robot learning to paint',
  model: 'gemini-pro',
  temperature: 0.9
});
```

## Implementation Details

The Gemini provider uses the official `@google-generativeai/node` SDK to interact with the Gemini API. It handles authentication, request formatting, and response parsing.

For chat-style interactions, the provider uses the chat session API, allowing for system instructions to be properly handled.

### Token Usage

Note that the Gemini API currently does not provide token usage information in its responses. As a result, the `tokenUsage` field in the response will be undefined.

### Rate Limiting

Be aware of the API rate limits imposed by Google's Gemini API. If you encounter rate limiting issues, consider implementing exponential backoff in your client code when making repeated requests.

## Additional Features

### Model Validation

The provider validates model names and will attempt to match partial model names to available models. For example, if you specify `gemini` as the model, it will match it to one of the available Gemini models.

### Error Handling

API errors are caught and formatted with helpful error messages. Common errors include authentication issues, invalid model names, and rate limiting.
