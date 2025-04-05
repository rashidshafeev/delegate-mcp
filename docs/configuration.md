# Configuration

Delegate MCP can be configured using environment variables, a configuration file, or command-line options.

## Environment Variables

Create a `.env` file in the root directory with your configuration:

```
# LLM Provider API Keys
GEMINI_API_KEY=your_gemini_key

# GitHub Configuration
GITHUB_TOKEN=your_github_token

# Default Settings
DEFAULT_MODEL=gemini-pro
DEFAULT_PROVIDER=gemini
MAX_TOKENS_PER_CONTEXT=100000
LOG_LEVEL=info
OUTPUT_DIRECTORY=./output
TEMP_DIRECTORY=./tmp
DEFAULT_TIMEOUT=60000
```

## Configuration Options

### API Keys

- `GEMINI_API_KEY` - Your Google Gemini API key
- `GITHUB_TOKEN` - Your GitHub personal access token (for GitHub operations)

### Default Settings

- `DEFAULT_MODEL` - The default model to use (default: "gemini-pro")
- `DEFAULT_PROVIDER` - The default provider to use (default: "gemini")
- `MAX_TOKENS_PER_CONTEXT` - Maximum tokens per context (default: 100000)
- `DEFAULT_TIMEOUT` - Default timeout in milliseconds (default: 60000)

### File Patterns

- `DEFAULT_IGNORE_PATTERNS` - JSON array of glob patterns to ignore (default: includes node_modules, dist, etc.)
- `DEFAULT_INCLUDE_PATTERNS` - JSON array of glob patterns to include (default: ["**/*"])

### Logging and Output

- `LOG_LEVEL` - Logging level: "debug", "info", "warn", or "error" (default: "info")
- `OUTPUT_DIRECTORY` - Directory for output files (default: "./output")
- `TEMP_DIRECTORY` - Directory for temporary files (default: "./tmp")

## Starting with Configuration File

You can also specify a configuration file when starting the server:

```bash
npm start -- --config config.json
```

The configuration file should be a JSON file containing the same options as the environment variables above.

## Command-Line Options

The following command-line options are available when starting the server:

```bash
npm start -- --debug   # Enable debug logging
npm start -- --config config.json   # Use a specific configuration file
```

## Configuration Precedence

Configuration options are resolved in the following order of precedence:

1. Command-line arguments
2. Configuration file
3. Environment variables
4. Default values
