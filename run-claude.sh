#!/bin/bash
echo "Running delegate-mcp in Claude compatibility mode..."
echo ""
npm run build && npm start -- start --claude
