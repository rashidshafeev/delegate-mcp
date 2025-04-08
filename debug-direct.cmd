@echo off
REM Debug script for testing direct transport on Windows

REM Set NODE_ENV to production to avoid development-specific behaviors
set NODE_ENV=production

REM Run the direct server implementation
node direct-server.js
