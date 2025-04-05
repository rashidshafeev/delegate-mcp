# prepare_context Tool

The `prepare_context` tool prepares and packages context from repositories for LLMs with enhanced capabilities.

## Overview

This tool helps you create optimized context from repositories by extracting relevant files, adding explanatory comments, and saving the output in your preferred format. It's particularly useful for preparing code and documentation for LLMs to analyze.

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `repository` | string | Yes | Path to a local repository or a GitHub repository URL |
| `files` | string[] | No | Glob patterns to include specific files |
| `ignorePatterns` | string[] | No | Glob patterns to exclude files |
| `includeComments` | boolean | No | Whether to include explanatory comments |
| `subsetDirectories` | string[] | No | Only include specific directories |
| `outputFormat` | string | No | Format of the output ("text", "json", or "github") |
| `outputPath` | string | No | Path where output should be saved |
| `githubOutput` | object | No | GitHub repository details for saving output |
| `maxTokens` | number | No | Maximum tokens to include in context |

### githubOutput Object

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner` | string | Yes | GitHub repository owner |
| `repo` | string | Yes | GitHub repository name |
| `path` | string | Yes | Path in the repository to save the file |
| `message` | string | No | Commit message |

## Examples

### Basic Usage

```typescript
const result = await client.callTool('prepare_context', {
  repository: './my-project',
  outputPath: './output/context.txt'
});
```

### GitHub Repository

```typescript
const result = await client.callTool('prepare_context', {
  repository: 'https://github.com/user/repo',
  includeComments: true,
  outputPath: './output/github-context.txt'
});
```

### Including Specific Files

```typescript
const result = await client.callTool('prepare_context', {
  repository: './my-project',
  files: [
    'src/**/*.ts',
    'docs/**/*.md',
    '!**/*.test.ts',
    '!**/node_modules/**'
  ],
  outputPath: './output/filtered-context.txt'
});
```

### Limiting Token Count

```typescript
const result = await client.callTool('prepare_context', {
  repository: './my-project',
  maxTokens: 50000,
  outputPath: './output/limited-context.txt'
});
```

### Storing in GitHub

```typescript
const result = await client.callTool('prepare_context', {
  repository: './my-project',
  githubOutput: {
    owner: 'myusername',
    repo: 'my-contexts',
    path: 'contexts/project-context.txt',
    message: 'Add context for my-project'
  }
});
```

## Response

The `prepare_context` tool returns a result object with the following information:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Context prepared successfully and saved to: ./output/context.txt\n\nContext prepared successfully. 25 files processed with approximately 32450 tokens.\n\nEstimated token count: 32450\n"
    }
  ]
}
```

## Error Handling

If an error occurs during context preparation, the tool will return an error message:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Failed to prepare context: Repository path does not exist: ./non-existent-repo"
    }
  ]
}
```

## Implementation Details

The `prepare_context` tool uses the [repomix](https://github.com/ayndqy/repomix) library to extract and package repository contents. It processes files according to the specified patterns, adds explanatory comments if requested, and saves the output to the specified location.

The tool handles both local repositories and GitHub repositories, automatically cloning GitHub repositories to a temporary directory for processing.
