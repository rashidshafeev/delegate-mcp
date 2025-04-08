/**
 * Simple Debug Transport for testing
 * 
 * This file implements a simplified version of the MCP transport protocol
 * for quick debugging without the full SDK.
 * 
 * Run with: npx ts-node-esm src/utils/simple-debug.ts
 */

// Global constants
const JSON_RPC_VERSION = "2.0";

// Simple implementation of JSON-RPC message sending over stdout
function sendJsonRpc(message: any): void {
  // Ensure we have the jsonrpc field
  const fullMessage = { jsonrpc: JSON_RPC_VERSION, ...message };
  
  // Convert to JSON and add a newline
  const json = JSON.stringify(fullMessage) + "\n";
  
  // Write to stdout
  process.stdout.write(json);
  
  // Log to stderr for debugging (doesn't interfere with JSON-RPC)
  console.error(`[DEBUG] Sent: ${json.trim()}`);
}

// Send a JSON-RPC response
function sendResponse(id: string | number, result: any): void {
  sendJsonRpc({ id, result });
}

// Send a JSON-RPC error
function sendError(id: string | number, code: number, message: string): void {
  sendJsonRpc({ id, error: { code, message } });
}

// Main entry point
async function main(): Promise<void> {
  console.error("[DEBUG] Simple debug transport starting");
  
  // Listen for data on stdin
  process.stdin.on("data", (data: Buffer) => {
    const input = data.toString();
    console.error(`[DEBUG] Received: ${input.trim()}`);
    
    try {
      // Parse the JSON-RPC message
      const message = JSON.parse(input);
      
      // Handle the message
      handleMessage(message);
    } catch (error) {
      console.error(`[DEBUG] Error processing message: ${(error as Error).message}`);
    }
  });
  
  // Handle process termination
  process.on("SIGINT", () => {
    console.error("[DEBUG] Received SIGINT, exiting");
    process.exit(0);
  });
  
  console.error("[DEBUG] Simple debug transport running");
}

// Handle a JSON-RPC message
function handleMessage(message: any): void {
  // Validate it's a JSON-RPC message
  if (!message.jsonrpc || message.jsonrpc !== JSON_RPC_VERSION) {
    console.error("[DEBUG] Not a valid JSON-RPC 2.0 message");
    return;
  }
  
  // Handle different message types
  if (message.method === "initialize" && message.id) {
    // Handle initialize request
    console.error("[DEBUG] Handling initialize request");
    
    sendResponse(message.id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "simple-debug", version: "0.1.0" },
      capabilities: { tools: {} }
    });
  } 
  else if (message.method === "tools/list" && message.id) {
    // Handle tools/list request
    console.error("[DEBUG] Handling tools/list request");
    
    sendResponse(message.id, {
      tools: [
        {
          name: "echo",
          description: "Simple echo tool for debugging",
          inputSchema: {
            type: "object",
            properties: {
              message: { type: "string" }
            },
            required: ["message"]
          }
        },
        {
          name: "prepare_context",
          description: "Prepare context from file paths (debug mock)",
          inputSchema: {
            type: "object",
            properties: {
              paths: { 
                type: "array", 
                items: { type: "string" },
                description: "Array of file paths to include"
              }
            },
            required: ["paths"]
          }
        }
      ]
    });
  }
  else if (message.method === "tools/call" && message.id) {
    // Handle tools/call request
    console.error(`[DEBUG] Handling tools/call request for ${message.params?.name}`);
    
    if (!message.params || !message.params.name) {
      sendError(message.id, -32602, "Invalid params: tool name is required");
      return;
    }
    
    // Handle different tools
    if (message.params.name === "echo") {
      const params = message.params.parameters || {};
      
      sendResponse(message.id, {
        content: [
          {
            type: "text",
            text: `Echo: ${params.message || "No message provided"}`
          }
        ]
      });
    }
    else if (message.params.name === "prepare_context") {
      const params = message.params.parameters || {};
      const paths = params.paths || [];
      
      sendResponse(message.id, {
        content: [
          {
            type: "text",
            text: `Prepare context mock response:\nPaths: ${paths.join(", ")}\n\nThis is a debug mock implementation.`
          }
        ]
      });
    }
    else {
      sendError(message.id, -32601, `Tool not found: ${message.params.name}`);
    }
  }
  else if (message.method === "notifications/initialized") {
    // Handle initialized notification
    console.error("[DEBUG] Received initialized notification");
    // No response needed for notifications
  }
  else if (message.id) {
    // Unknown method but has an ID, send error response
    console.error(`[DEBUG] Unknown method: ${message.method}`);
    sendError(message.id, -32601, "Method not found");
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => {
    console.error(`[DEBUG] Fatal error: ${error.message}`);
    process.exit(1);
  });
}
