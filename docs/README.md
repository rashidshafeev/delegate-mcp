# Delegate MCP Documentation

Welcome to the Delegate MCP documentation! This section provides comprehensive guidance on how to install, configure, and use the Delegate MCP tools.

## Table of Contents

- [Installation](installation.md) - How to install and set up Delegate MCP
- [Configuration](configuration.md) - Configuration options and environment variables
- [Tools](tools/README.md) - Documentation for the available tools
  - [prepare_context](tools/prepare-context.md) - Context preparation tool
  - [delegate](tools/delegate.md) - Model delegation tool
- [Providers](providers/README.md) - Information about supported model providers
  - [Gemini](providers/gemini.md) - Google's Gemini API integration
- [Development](development.md) - How to contribute to Delegate MCP

## Quick Start

```bash
# Install from npm
npm install -g delegate-mcp

# Or clone and build
git clone https://github.com/rashidshafeev/delegate-mcp.git
cd delegate-mcp
npm install
npm run build

# Create .env file
cp .env.example .env
# Edit .env and add your API keys

# Start the MCP server
npm start
```

## Overview

Delegate MCP provides two powerful tools:

1. **prepare_context** - Prepares and packages context from repositories for LLMs
2. **delegate** - Delegates requests to LLMs with flexibility in model selection

These tools are designed to work together to enable efficient and effective use of LLMs in your workflow.

## Use Cases

- Create optimized context from code repositories
- Delegate tasks to specialized models
- Create hybrid workflows using multiple models
- Save context and results for future reference
- Generate documentation and explanations for codebases

## License

MIT
