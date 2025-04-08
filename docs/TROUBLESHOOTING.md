# Troubleshooting Guide

This document provides solutions to common issues that may arise when using the delegate-mcp server.

## JSON Parsing Errors with Claude

If you're using Claude as an MCP client and see errors like:

```
Expected ',' or ']' after array element in JSON at position 5 (line 1 column 6)
```

We've implemented multiple approaches to solve this issue:

### DirectTransport Solution

Our latest solution uses a completely custom DirectTransport implementation that:

1. Manually constructs JSON strings using templates
2. Carefully formats messages to avoid JSON parsing issues
3. Provides detailed logging of message contents

This solution (added in commit 24ebff9) should provide the most reliable compatibility with Claude's strict JSON parser.

### Debugging Options

We've added several debugging tools to help troubleshoot JSON parsing issues:

1. **Simple Debug**: Runs basic JSON serialization tests
   ```bash
   npm run debug:simple
   ```

2. **Minimal Server**: Tests a minimal MCP server implementation
   ```bash
   npm run debug:minimal
   ```

3. **Direct Transport**: Tests our custom Claude-compatible transport
   ```bash
   npm run debug:direct
   ```

All debugging tools create detailed logs in the `logs/` directory that you can examine to identify JSON parsing issues.

## Gemini API Key Issues

If the server starts but shows warnings about Gemini provider not being available, check:

1. Make sure you've set the `GEMINI_API_KEY` environment variable
2. Verify that the API key is valid and has not expired
3. Check if the Gemini API is available and you have quota remaining

## GitHub Integration Issues

If you're having trouble with GitHub operations:

1. Ensure your `GITHUB_API_KEY` is set and has appropriate permissions
2. Verify that `OWNER` and `REPO` environment variables are set correctly
3. Make sure the repository exists and is not archived
4. Check if the branch specified (or default branch) exists

## Debugging Tips

If you're experiencing issues:

1. Run with debug logging enabled:
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. Force Claude compatibility mode:
   ```bash
   npm start -- start --claude
   ```

3. Check the logs directory for detailed diagnostic information:
   ```
   logs/direct-transport-*.log
   ```

4. Use the `check` command to verify provider availability:
   ```bash
   npm start -- check
   ```

## Common Error Messages

### "Not connected"
- The server hasn't been properly initialized or has lost connection
- Try restarting the server

### "No LLM providers are available"
- Check your Gemini API key
- Make sure the Gemini API is accessible from your network

### "Repository owner and name are required"
- Set the `OWNER` and `REPO` environment variables, or
- Provide these parameters explicitly in your tool calls

### "Failed to prepare context"
- Verify that file paths exist and are readable
- Check permissions on the files and directories

### "Failed to save content to repo"
- Verify GitHub token has write access to the repository
- Make sure the repository and branch exist

## Client-Specific Issues

### Claude
- We now use a custom DirectTransport implementation specifically for Claude compatibility
- DirectTransport manually crafts JSON-RPC messages using string templates
- Detailed logging helps identify JSON parsing issues
- Use the `--claude` flag to force Claude compatibility mode

### Other Clients
- Make sure the client supports MCP protocol version "2024-11-05"
- Verify the client is sending correctly formatted JSON-RPC 2.0 requests

## Getting Help

If you continue to experience issues, please create a GitHub issue with:
- Detailed error messages
- Steps to reproduce
- Environment information (Node.js version, OS, etc.)
- Debug logs if available
