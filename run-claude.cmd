@echo off
REM Script to run the MCP server optimized for Claude compatibility on Windows

REM Set NODE_ENV to production to avoid development-specific behaviors
set NODE_ENV=production

REM Run the TypeScript application with ts-node
npx ts-node-esm src/index.ts
