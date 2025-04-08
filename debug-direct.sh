#!/bin/bash
echo "Running direct transport debug test..."
echo "The log file will be created in the logs directory."
echo ""
npx ts-node-esm src/utils/direct-transport.ts
echo ""
echo "Check the logs directory for detailed output."
read -p "Press Enter to continue..."
