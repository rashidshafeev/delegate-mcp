# Troubleshooting Guide

This document provides solutions to common issues that may arise when using the delegate-mcp server.

## JSON Parsing Errors with Claude

If you're using Claude as an MCP client and see errors like:

```
Expected ',' or ']' after array element in JSON at position 5 (line 1 column 6)
```

We've implemented a solution by using the standard MCP SDK's StdioServerTransport for maximum compatibility.

### Solution

After extensive testing, we found that the most reliable solution is:

1. **Use the standard transport**: We now use the standard `StdioServerTransport` from the MCP SDK without any customization
2. **Set NODE_ENV to production**: This improves JSON stability for Claude's parser
3. **Avoid custom JSON serialization**: Removing our custom JSON handling eliminated the parsing errors

If you still encounter JSON parsing issues:

1. Make sure you have the latest version of delegate-mcp (requires commit afb97e3 or later)
2. Ensure you're using the latest version of the MCP SDK
3. Run with debug logging to see the exact messages being sent/received:
   ```
   LOG_LEVEL=debug npm start
   ```

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

2. Check the logs for detailed information about:
   - Exact JSON being sent and received
   - API calls to Gemini and GitHub
   - Any errors occurring during processing

3. Use the `check` command to verify provider availability:
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
- We now use the standard MCP SDK transport implementation for Claude compatibility
- Setting `NODE_ENV=production` in the environment helps improve stability
- If you're still encountering issues, please create a GitHub issue with detailed logs

### Other Clients
- Make sure the client supports MCP protocol version "2024-11-05"
- Verify the client is sending correctly formatted JSON-RPC 2.0 requests

## Getting Help

If you continue to experience issues, please create a GitHub issue with:
- Detailed error messages
- Steps to reproduce
- Environment information (Node.js version, OS, etc.)
- Debug logs if available
