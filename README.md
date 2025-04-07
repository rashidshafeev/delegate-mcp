# delegate-mcp

Model Context Protocol (MCP) implementation that provides context preparation and Gemini model delegation capabilities.

## Features

- **`prepare_context` Tool**: Prepares context from specified file paths and saves to GitHub
  - Accepts an array of file paths
  - Accepts an optional comment to append
  - Concatenates files with path headers
  - Pushes the result to GitHub

- **`delegate` Tool**: Delegates requests to Gemini models
  - Accepts a prompt
  - Supports context preparation using file paths
  - Configurable to return results in real-time or save to GitHub
  - Saves both conversation and model response to GitHub

## Installation

### Prerequisites

- Node.js 18+
- API keys for:
  - Google Gemini
  - GitHub

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/rashidshafeev/delegate-mcp.git
   cd delegate-mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your API keys:
   ```
   GEMINI_API_KEY=your_gemini_api_key
   GITHUB_API_KEY=your_github_token
   OWNER=your_github_username
   REPO=your_github_repo
   BRANCH=main
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Starting the MCP Server

```bash
npm start
```

Or for debug mode:

```bash
npm start -- start --debug
```

### Checking Provider Availability

```bash
npm start -- check
```

## Tools

### prepare_context

Prepares and packages context from file paths for LLMs.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paths` | string[] | Yes | Array of file or directory paths to include |
| `comment` | string | No | Comment to append to the end of the context |
| `owner` | string | No | GitHub repository owner (defaults to OWNER env var) |
| `repo` | string | No | GitHub repository name (defaults to REPO env var) |
| `branch` | string | No | GitHub repository branch (defaults to BRANCH env var) |
| `outputPath` | string | No | Path where output should be saved locally |
| `githubPath` | string | No | Path in the GitHub repository to save the file |

#### Example

```json
{
  "paths": ["src/index.ts", "src/utils"],
  "comment": "Review this code for security vulnerabilities",
  "owner": "username",
  "repo": "myrepo"
}
```

### delegate

Delegates requests to Gemini models with flexibility in context and result handling.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `prompt` | string | Yes | The prompt to send to the model |
| `paths` | string[] | No | Array of file paths to include as context |
| `comment` | string | No | Additional context comment |
| `model` | string | No | The model to use (defaults to gemini-pro) |
| `temperature` | number | No | Temperature for generation (0.0 to 1.0) |
| `maxTokens` | number | No | Maximum tokens to generate |
| `realtime` | boolean | No | Whether to return results in realtime (default: true) |
| `owner` | string | No | GitHub repository owner (defaults to OWNER env var) |
| `repo` | string | No | GitHub repository name (defaults to REPO env var) |
| `branch` | string | No | GitHub repository branch (defaults to BRANCH env var) |

#### Example

```json
{
  "prompt": "Explain how this code works",
  "paths": ["src/index.ts", "src/utils/helpers.ts"],
  "model": "gemini-pro",
  "temperature": 0.7,
  "realtime": false
}
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | API key for Google Gemini | Yes |
| `GITHUB_API_KEY` | GitHub personal access token | Yes |
| `OWNER` | Default GitHub repository owner | Yes |
| `REPO` | Default GitHub repository name | Yes |
| `BRANCH` | Default GitHub repository branch | No (defaults to main) |
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | No (defaults to info) |

## License

MIT
