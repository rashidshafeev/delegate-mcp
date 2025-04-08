/**
 * Pure JavaScript implementation of MCP server with direct JSON-RPC transport
 * 
 * This is a simplified version that doesn't depend on TypeScript or the MCP SDK
 * It's useful for compatibility testing and as a fallback in environments where
 * TypeScript compilation might fail.
 */

// Import Node.js modules
const fs = require('fs');
const path = require('path');
const { Readable, Writable } = require('stream');

// Create log directory
const logDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

// Set up logging
const logFile = path.join(logDir, `direct-server-${Date.now()}.log`);
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${message}\n`;
  
  // Log to stderr (doesn't interfere with stdout used for JSON-RPC)
  console.error(logEntry);
  
  // Log to file
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

log(`Starting direct server, logging to: ${logFile}`);

// Buffer class for incoming messages
class ReadBuffer {
  constructor() {
    this.buffer = null;
  }

  append(chunk) {
    log(`Received chunk: ${chunk.toString('utf8')}`);
    this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk]) : chunk;
  }

  readMessage() {
    if (!this.buffer) {
      return null;
    }

    const index = this.buffer.indexOf('\n');
    if (index === -1) {
      return null;
    }

    const line = this.buffer.toString('utf8', 0, index).replace(/\r$/, '');
    this.buffer = this.buffer.subarray(index + 1);
    
    try {
      log(`Parsing message: ${line}`);
      return JSON.parse(line);
    } catch (error) {
      log(`JSON parse error: ${error.message}`);
      throw error;
    }
  }

  clear() {
    this.buffer = null;
  }
}

// Main server class
class DirectServer {
  constructor(stdin = process.stdin, stdout = process.stdout) {
    this.stdin = stdin;
    this.stdout = stdout;
    this.readBuffer = new ReadBuffer();
    this.running = false;
    
    // Registered tools
    this.tools = {
      prepare_context: {
        name: 'prepare_context',
        description: 'Prepare context from file paths and save to GitHub',
        schema: {
          type: 'object',
          properties: {
            paths: { 
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file or directory paths to include'
            },
            comment: { 
              type: 'string',
              description: 'Comment to append to the end of the context'
            },
            owner: {
              type: 'string',
              description: 'GitHub repository owner'
            },
            repo: {
              type: 'string',
              description: 'GitHub repository name'
            },
            branch: {
              type: 'string',
              description: 'GitHub repository branch'
            }
          },
          required: ['paths']
        },
        handler: this.prepareContextHandler.bind(this)
      },
      delegate: {
        name: 'delegate',
        description: 'Delegate requests to Gemini with context from file paths',
        schema: {
          type: 'object',
          properties: {
            prompt: { 
              type: 'string',
              description: 'The prompt to send to the model'
            },
            paths: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of file paths to include as context'
            },
            comment: {
              type: 'string',
              description: 'Additional context comment'
            },
            model: {
              type: 'string',
              description: 'The model to use (only Gemini models supported)'
            },
            temperature: {
              type: 'number',
              description: 'Temperature for generation'
            },
            maxTokens: {
              type: 'number',
              description: 'Maximum tokens to generate'
            },
            realtime: {
              type: 'boolean',
              description: 'Whether to return results in realtime'
            },
            owner: {
              type: 'string',
              description: 'GitHub repository owner'
            },
            repo: {
              type: 'string',
              description: 'GitHub repository name'
            },
            branch: {
              type: 'string',
              description: 'GitHub repository branch'
            }
          },
          required: ['prompt']
        },
        handler: this.delegateHandler.bind(this)
      }
    };
  }

  async start() {
    if (this.running) {
      throw new Error('Server already running');
    }

    this.running = true;
    log('Direct MCP server starting...');

    // Set up data handler
    this.stdin.on('data', (chunk) => {
      this.readBuffer.append(chunk);
      this.processReadBuffer();
    });

    // Set up error handler
    this.stdin.on('error', (error) => {
      log(`Transport error: ${error.message}`);
    });
    
    log('Server ready to process requests');
  }

  async stop() {
    this.stdin.removeAllListeners('data');
    this.stdin.removeAllListeners('error');
    
    if (this.stdin.listenerCount('data') === 0) {
      this.stdin.pause();
    }
    
    this.readBuffer.clear();
    this.running = false;
    log('Server stopped');
  }

  processReadBuffer() {
    while (true) {
      try {
        const message = this.readBuffer.readMessage();
        if (message === null) {
          break;
        }

        log(`Received message: ${JSON.stringify(message)}`);
        this.handleMessage(message);
      } catch (error) {
        log(`Error processing message: ${error.message}`);
      }
    }
  }

  async handleMessage(message) {
    // Ensure it's a JSON-RPC message
    if (!message.jsonrpc || message.jsonrpc !== '2.0') {
      log('Invalid JSON-RPC message');
      return;
    }

    // Handle different request types
    if (message.method === 'initialize' && message.id) {
      await this.handleInitialize(message);
    } 
    else if (message.method === 'tools/list' && message.id) {
      await this.handleToolsList(message);
    }
    else if (message.method === 'tools/call' && message.id) {
      await this.handleToolsCall(message);
    }
    else if (message.method === 'notifications/initialized') {
      log('Received initialized notification');
      // No response needed for notifications
    }
    else if (message.id) {
      // Unknown method but has an ID, send error response
      await this.sendError(message.id, -32601, 'Method not found');
    }
  }

  async handleInitialize(message) {
    log('Handling initialize request');
    await this.sendResponse(message.id, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'delegate-mcp', version: '0.1.0' },
      capabilities: { tools: {} }
    });
  }

  async handleToolsList(message) {
    log('Handling tools/list request');
    
    // Prepare tools list
    const toolsList = Object.values(this.tools).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.schema
    }));
    
    await this.sendResponse(message.id, { tools: toolsList });
  }

  async handleToolsCall(message) {
    if (!message.params || !message.params.name) {
      await this.sendError(message.id, -32602, 'Invalid params: tool name is required');
      return;
    }

    const toolName = message.params.name;
    const toolParams = message.params.parameters || {};
    
    log(`Handling tools/call request for ${toolName}`);
    
    if (!this.tools[toolName]) {
      await this.sendError(message.id, -32602, `Tool not found: ${toolName}`);
      return;
    }
    
    try {
      // Call the tool handler
      const result = await this.tools[toolName].handler(toolParams);
      await this.sendResponse(message.id, result);
    } catch (error) {
      log(`Error in tool ${toolName}: ${error.message}`);
      await this.sendError(
        message.id, 
        -32603, 
        `Internal error in tool ${toolName}: ${error.message}`
      );
    }
  }

  // Tool handlers
  async prepareContextHandler(params) {
    log(`prepare_context called with paths: ${(params.paths || []).join(', ')}`);
    
    // This is a mock implementation - in production, you'd implement the real functionality
    return {
      content: [
        {
          type: 'text',
          text: `Context prepared successfully from ${params.paths.length} paths.\n\n` +
                `Paths: ${params.paths.join(', ')}\n` +
                `Comment: ${params.comment || 'None'}\n\n` +
                `This would save to GitHub repository ${params.owner || 'default-owner'}/${params.repo || 'default-repo'}\n` +
                `Estimated token count: 1024`
        }
      ]
    };
  }

  async delegateHandler(params) {
    log(`delegate called with prompt: ${params.prompt.substring(0, 50)}...`);
    
    // This is a mock implementation - in production, you'd implement the real functionality
    return {
      content: [
        {
          type: 'text',
          text: `Delegated to Gemini model: ${params.model || 'gemini-pro'}\n\n` +
                `Prompt (first 50 chars): ${params.prompt.substring(0, 50)}...\n` +
                `Paths: ${(params.paths || []).join(', ') || 'None'}\n\n` +
                `Mock response: This is a simulated response from the model.`
        }
      ]
    };
  }

  // Helper methods for sending responses
  async sendResponse(id, result) {
    const response = {
      jsonrpc: '2.0',
      id,
      result
    };
    
    log(`Sending response for ID ${id}`);
    await this.send(response);
  }

  async sendError(id, code, message) {
    const response = {
      jsonrpc: '2.0',
      id,
      error: { code, message }
    };
    
    log(`Sending error for ID ${id}: ${code} - ${message}`);
    await this.send(response);
  }

  async send(message) {
    return new Promise((resolve) => {
      const jsonString = JSON.stringify(message) + '\n';
      log(`Sending: ${jsonString.trim()}`);
      
      if (this.stdout.write(jsonString)) {
        resolve();
      } else {
        this.stdout.once('drain', resolve);
      }
    });
  }
}

// Run the server
(async () => {
  try {
    const server = new DirectServer();
    await server.start();
    
    // Handle process termination
    process.on('SIGINT', async () => {
      log('Received SIGINT, shutting down');
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      log('Received SIGTERM, shutting down');
      await server.stop();
      process.exit(0);
    });
    
    log('Server running, waiting for requests');
  } catch (error) {
    log(`Fatal error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
  }
})();
