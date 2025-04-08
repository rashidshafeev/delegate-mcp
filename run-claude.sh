#!/bin/bash
# Script to run the MCP server optimized for Claude compatibility on Unix systems

# Set NODE_ENV to production to avoid development-specific behaviors
export NODE_ENV=production

# Run the TypeScript application with ts-node
npx ts-node-esm src/index.ts
