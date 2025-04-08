# Troubleshooting Guide

This document provides solutions to common issues that may arise when using the delegate-mcp server.

## JSON Parsing Errors with Claude

If you're using Claude as an MCP client and see errors like:

```
Expected ',' or ']' after array element in JSON at position 5 (line 1 column 6)
```

This is due to a compatibility issue with how Claude's MCP client parses JSON responses. We've implemented the following fixes:

1. **Complete JSON Serialization Rewrite** (commit 126c382f): A completely manual approach to JSON formatting that ensures compatibility with Claude's more strict JSON parser
2. **Added Debug Transport Wrapper**: For logging all messages to help troubleshoot format issues
3. **Implemented Character-Level String Escaping**: To handle all special characters properly

### Understanding the Position 5 Error

The specific error at "position 5" refers to the 6th character in the JSON message (0-indexed). In JSON-RPC messages, this position is typically where the first comma appears after the "jsonrpc":"2.0" property. 

For example, in a message like:
```json
{"jsonrpc":"2.0","id":0,...}
```

Position 5 is where the first comma is located. Claude's parser appears to be particularly sensitive to formatting in this area.

Our fix ensures that all messages follow a strict format with:
- Consistent property ordering (jsonrpc first, then id, method, etc.)
- Proper comma placement
- Strict string escaping
- Handling of undefined, null, and special values

## Testing Your JSON Formatting

The current version should work with Claude, but you can use the built-in debug test utility to verify proper JSON formatting:

```bash
# Run the debug test
npm run debug:json

# Or with the compiled version
npm run debug:json:build
```

This will generate sample JSON-RPC messages and verify character positions for troubleshooting.

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

2. Use the built-in debug test utilities:
   ```bash
   # Test JSON formatting
   npm run debug:json
   
   # Or with the compiled version
   npm run debug:json:build
   ```

3. Check the logs for detailed information about:
   - Exact JSON being sent and received
   - API calls to Gemini and GitHub
   - Any errors occurring during processing

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
- We've implemented special JSON serialization to work around Claude's JSON parsing issues
- If still encountering problems, check logs for exact JSON format issues
- Our latest fixes (as of commits 126c382f and 50551b2e) include character-level string escaping and strict JSON construction
- Use the debug:json script to test JSON formatting in isolation

### Other Clients
- Make sure the client supports MCP protocol version "2024-11-05"
- Verify the client is sending correctly formatted JSON-RPC 2.0 requests

## Getting Help

If you continue to experience issues, please create a GitHub issue with:
- Detailed error messages
- Steps to reproduce
- Environment information (Node.js version, OS, etc.)
- Debug logs if available
