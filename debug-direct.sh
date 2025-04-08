#!/bin/bash
# Debug script for testing direct transport on Unix systems

# Set NODE_ENV to production to avoid development-specific behaviors
export NODE_ENV=production

# Run the direct server implementation
node direct-server.js
