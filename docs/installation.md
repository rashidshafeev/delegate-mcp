# Installation

This guide walks you through the process of installing and setting up Delegate MCP.

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- API keys for the LLMs you want to use (at minimum a Gemini API key)

## Installation Options

### Option 1: Install from Source

1. Clone the repository:

```bash
git clone https://github.com/rashidshafeev/delegate-mcp.git
cd delegate-mcp
```

2. Install dependencies:

```bash
npm install
```

3. Build the project:

```bash
npm run build
```

4. Create a configuration file:

```bash
cp .env.example .env
```

5. Edit the `.env` file to add your API keys and configuration.

### Option 2: Install as a Global Package (Coming Soon)

```bash
npm install -g delegate-mcp
```

## Configuration

Create a `.env` file in the root directory with your API keys:

```
# LLM Provider API Keys
GEMINI_API_KEY=your_gemini_key

# GitHub Configuration (Optional)
GITHUB_TOKEN=your_github_token
```

At minimum, you need to provide a Gemini API key to use the delegate tool.

## Verify Installation

Verify that everything is set up correctly:

```bash
npm run check
```

This will check that your API keys are valid and list the available models.

## Starting the MCP Server

Start the MCP server:

```bash
npm start
```

The server will start and listen for incoming MCP requests.

## Next Steps

- Learn about [configuration options](configuration.md)
- Explore the [prepare_context](tools/prepare-context.md) tool
- Explore the [delegate](tools/delegate.md) tool
