# Detailed Usage Guide

This document provides detailed usage examples and information about the MCP tools.

## Table of Contents

- [Tool Usage Examples](#tool-usage-examples)
- [File Formats](#file-formats)
- [Error Handling](#error-handling)
- [Integration Guide](#integration-guide)
- [Troubleshooting](#troubleshooting)

## Tool Usage Examples

### prepare_context

This tool accepts file paths, concatenates their content, and saves to GitHub.

#### Basic Example

```json
{
  "paths": ["src/index.ts", "package.json"],
  "comment": "These files define the entry point and dependencies"
}
```

#### Advanced Example with Repository Settings

```json
{
  "paths": ["src/utils", "src/mcp/tools"],
  "comment": "These directories contain the core utilities and tool implementations",
  "owner": "custom-owner",
  "repo": "custom-repo",
  "branch": "develop",
  "githubPath": "contexts/core-files.txt",
  "outputPath": "./output/context.txt"
}
```

#### Response Example

```json
{
  "content": [
    {
      "type": "text",
      "text": "Context prepared successfully and saved to: https://github.com/custom-owner/custom-repo/blob/develop/contexts/core-files.txt\n\nContext prepared successfully from 2 paths with approximately 4578 tokens.\n\nEstimated token count: 4578\n"
    }
  ]
}
```

### delegate

This tool sends prompts to Gemini models and optionally includes context from files.

#### Basic Example

```json
{
  "prompt": "Explain how the prepare_context tool works"
}
```

#### With Context and Model Parameters

```json
{
  "prompt": "Review this code and suggest improvements",
  "paths": ["src/mcp/tools/delegate.ts"],
  "model": "gemini-pro",
  "temperature": 0.7,
  "maxTokens": 8192,
  "realtime": true,
  "owner": "custom-owner",
  "repo": "custom-repo"
}
```

#### Non-realtime Mode

```json
{
  "prompt": "Generate unit tests for this code",
  "paths": ["src/utils/github.ts"],
  "realtime": false
}
```

#### Response Example (Realtime Mode)

```json
{
  "content": [
    {
      "type": "text",
      "text": "The delegate.ts file implements the delegate tool for the MCP protocol, which allows sending prompts to Gemini models...\n\n[Full response content]\n\n---\nConversation saved to: https://github.com/owner/repo/blob/main/delegate/a1b2c3d4_conversation.txt\nResponse saved to: https://github.com/owner/repo/blob/main/delegate/a1b2c3d4_5e6f_response.txt"
    }
  ]
}
```

#### Response Example (Non-realtime Mode)

```json
{
  "content": [
    {
      "type": "text",
      "text": "Request processed successfully.\n\nConversation ID: a1b2c3d4\nRequest ID: 5e6f\n\nFiles saved to:\n- https://github.com/owner/repo/blob/main/delegate/a1b2c3d4_conversation.txt\n- https://github.com/owner/repo/blob/main/delegate/a1b2c3d4_5e6f_response.txt"
    }
  ]
}
```

## File Formats

### prepare_context Output Format

The prepare_context tool produces a text file with the following structure:

```
/* FILE: path/to/file1.ts */
[Content of file1.ts]

/* FILE: path/to/file2.ts */
[Content of file2.ts]

/* FILE: path/to/directory/file3.ts */
[Content of file3.ts]

/* COMMENT: */
[User-provided comment]
```

Files that cannot be read will be marked with an error:

```
/* FILE: path/to/nonexistent-file.ts - NOT FOUND */

/* FILE: path/to/binary-file.bin - ERROR: Error message */
```

### delegate Output Files

The delegate tool produces two types of files when saving to GitHub:

1. **Conversation file** (`[conversation_id]_conversation.txt`):
   ```
   # Conversation [conversation_id]

   ## Prompt

   [Original prompt with context (if provided)]

   ## Response

   [Model's response]
   ```

2. **Response file** (`[conversation_id]_[request_id]_response.txt`):
   ```
   [Model's response only]
   ```

## Error Handling

Common errors and their solutions:

### Authentication Errors

**Error**: `Error: Gemini provider is not available. Check your GEMINI_API_KEY.`

**Solution**: 
- Verify that the GEMINI_API_KEY environment variable is set correctly
- Check that the API key is valid and not expired
- Ensure the Gemini API is available

**Error**: `Error: GitHub token required to save content to repository`

**Solution**:
- Verify that the GITHUB_API_KEY environment variable is set correctly
- Ensure the token has permissions to write to the specified repository

### Repository Errors

**Error**: `Error: Repository owner and name are required.`

**Solution**:
- Set the OWNER and REPO environment variables, or
- Provide owner and repo parameters in the tool call

**Error**: `Error: Failed to save content to repo: Not Found`

**Solution**:
- Verify the repository exists and is accessible
- Check that the GitHub token has access to the repository
- Ensure the branch specified exists

### File Path Errors

**Error**: `Warning: Path does not exist: /path/to/file`

**Solution**:
- Make sure the file paths provided exist
- Use absolute paths or paths relative to the current working directory
- Check for typos in the file paths

## Integration Guide

### Using from Node.js

You can call the MCP server from Node.js using the MCP protocol client:

```javascript
import { McpClient } from '@modelcontextprotocol/sdk/client';

async function main() {
  // Create client
  const client = new McpClient({ spawn: 'delegate-mcp start' });
  await client.connect();
  
  // Call prepare_context tool
  const contextResult = await client.callTool('prepare_context', {
    paths: ['src/index.ts', 'src/utils'],
    comment: 'Core implementation files'
  });
  console.log(contextResult);
  
  // Call delegate tool
  const delegateResult = await client.callTool('delegate', {
    prompt: 'Explain how this code works',
    paths: ['src/mcp/tools/delegate.ts'],
    model: 'gemini-pro'
  });
  console.log(delegateResult);
  
  // Close the connection
  await client.close();
}

main().catch(console.error);
```

### Using from Python

The MCP protocol can be used from Python with appropriate clients:

```python
from mcp_python_client import McpClient

async def main():
    # Create client
    client = McpClient(spawn='delegate-mcp start')
    await client.connect()
    
    # Call prepare_context tool
    context_result = await client.call_tool('prepare_context', {
        'paths': ['src/index.ts', 'src/utils'],
        'comment': 'Core implementation files'
    })
    print(context_result)
    
    # Call delegate tool
    delegate_result = await client.call_tool('delegate', {
        'prompt': 'Explain how this code works',
        'paths': ['src/mcp/tools/delegate.ts'],
        'model': 'gemini-pro'
    })
    print(delegate_result)
    
    # Close the connection
    await client.close()

if __name__ == '__main__':
    import asyncio
    asyncio.run(main())
```

## Troubleshooting

### Server Won't Start

1. Make sure all dependencies are installed:
   ```bash
   npm install
   ```

2. Verify the build is up-to-date:
   ```bash
   npm run build
   ```

3. Check environment variables are set:
   ```bash
   export GEMINI_API_KEY=your_key
   export GITHUB_API_KEY=your_token
   export OWNER=your_username
   export REPO=your_repo
   ```

4. Try running with debug logs:
   ```bash
   npm start -- start --debug
   ```

### Model Not Generating Responses

1. Verify your Gemini API key is correct and has sufficient quota
2. Check that you're using a supported model (e.g., gemini-pro)
3. Ensure your prompt is not triggering content filtering
4. Try a simpler prompt to isolate the issue

### GitHub File Saving Issues

1. Verify your GitHub token has write access to the repository
2. Check if the repository exists and is not archived
3. Ensure you have the correct owner/repo combination
4. Try specifying a different path in the repository

### Unable to Read Files

1. Verify file paths are correct (absolute or relative to current directory)
2. Check file permissions
3. Ensure files are not binary or in an unsupported format
4. Try with a single file to isolate the issue
