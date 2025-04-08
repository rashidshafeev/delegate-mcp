# Logs Directory

This directory contains logs created by the delegate-mcp server during operation. The logs are especially useful for diagnosing JSON parsing issues with Claude.

## Log Types

Different debugging tools create different types of logs:

1. **Direct JavaScript Server Logs**: `direct-js-*.log`
   - Generated when running `npm run server:direct`
   - Most useful for Claude compatibility

2. **Direct Transport Logs**: `direct-transport-*.log`
   - Generated when running `npm run debug:direct`
   - Shows the raw JSON messages and character-level details

3. **Minimal Server Logs**: `minimal-server-*.log`
   - Generated when running `npm run debug:minimal`
   - Shows basic server operation

## Log Format

Each log entry includes:
- Timestamp in ISO format
- Message content
- Details about JSON structure at character position 5 (for diagnosing Claude JSON parsing errors)

## Example Log Entry

```
2025-04-08T17:22:44.123Z Sending message: {"jsonrpc":"2.0","id":0,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"direct-js-server","version":"0.1.0"}}}
2025-04-08T17:22:44.124Z Character at position 5: '"' (ASCII: 34)
```

## Analyzing Claude JSON Parsing Errors

The most common Claude error is:
```
Expected ',' or ']' after array element in JSON at position 5 (line 1 column 6)
```

This refers to character position 5 (0-indexed), which is typically where the first comma appears after the `"jsonrpc":"2.0"` property. The logs specifically track what character is at position 5 to help diagnose these issues.

In proper JSON, position 5 should contain a double quote (`"`) character (ASCII 34) for the property name in most messages.

## Using the Logs

To use these logs for troubleshooting:

1. Run the server with debug logging enabled
2. Look for any error messages or unexpected behavior
3. Check the character at position 5 in the JSON messages
4. Compare the JSON structure with what Claude expects

## Clearing Logs

Feel free to clear this directory periodically to prevent it from growing too large. The server will create new log files as needed.
