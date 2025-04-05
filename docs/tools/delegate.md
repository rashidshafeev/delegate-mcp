# delegate Tool

The `delegate` tool delegates requests to LLMs with flexibility in model selection and result handling.

## Overview

This tool allows you to send prompts to various LLM providers and models, optionally including context from files, and saving the results for future reference. It's designed to be flexible and extensible, supporting both synchronous and asynchronous operation.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The prompt to send to the model |
| `model` | string | No | The model to use (e.g., "gemini-pro", "gpt-4") |
| `provider` | string | No | The provider to use (e.g., "gemini", "openai", "anthropic") |
| `contextFile` | string | No | Path to a context file to use |
| `contextText` | string | No | Context text to include with the prompt |
| `temperature` | number | No | Temperature for generation (0.0 to 1.0) |
| `maxTokens` | number | No | Maximum tokens to generate |
| `async` | boolean | No | Whether to run asynchronously |
| `storeResults` | boolean | No | Whether to store results |
| `resultPath` | string | No | Path to store results |
| `resultRepo` | string | No | GitHub repo to store results (format: "owner/repo") |
| `resultRepoPath` | string | No | Path in GitHub repo to store results |
| `systemPrompt` | string | No | System prompt to use |

## Examples

### Basic Usage

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Explain how promises work in JavaScript',
  model: 'gemini-pro'
});
```

### Using Context File

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Summarize this codebase',
  model: 'gemini-pro',
  contextFile: './output/context.txt'
});
```

### Storing Results

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Generate unit tests for this code',
  model: 'gemini-pro',
  contextFile: './output/context.txt',
  storeResults: true,
  resultPath: './results/unit-tests.md'
});
```

### Asynchronous Processing

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Perform a detailed code review of this repository',
  model: 'gemini-pro',
  contextFile: './output/context.txt',
  async: true,
  storeResults: true,
  resultRepo: 'myusername/code-reviews',
  resultRepoPath: 'reviews/repo-review.md'
});
```

### Using System Prompt

```typescript
const result = await client.callTool('delegate', {
  prompt: 'Implement a binary search tree in Python',
  model: 'gemini-pro',
  systemPrompt: 'You are an expert software engineer. Provide clear, well-documented code with comments explaining your implementation decisions.'
});
```

## Response

For synchronous requests, the `delegate` tool returns the model's response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Promises in JavaScript are objects that represent the eventual completion (or failure) of an asynchronous operation and its resulting value...\n\n[Full model response]\n\n---\nResults saved to file: ./results/promise-explanation.md"
    }
  ]
}
```

For asynchronous requests, the tool returns an immediate acknowledgment:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Request has been delegated to model gemini-pro asynchronously.\n\nResults will be saved to myusername/code-reviews."
    }
  ]
}
```

## Error Handling

If an error occurs during delegation, the tool will return an error message:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Failed to communicate with Gemini API: API key missing or invalid"
    }
  ],
  "isError": true
}
```

## Supported Models

Currently, the `delegate` tool primarily supports Google's Gemini models:

- `gemini-pro`
- `gemini-pro-vision`
- `gemini-1.5-pro`
- `gemini-1.5-flash`

Support for other providers will be added in future versions.

## Implementation Details

The `delegate` tool uses a provider system to interface with different LLM APIs. It handles authentication, context preparation, API calls, and result storage. The tool supports both synchronous and asynchronous operation, allowing for flexibility in handling both quick queries and longer-running tasks.
