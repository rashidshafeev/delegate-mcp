#!/usr/bin/env node

/**
 * Simplified Direct Transport Server (JavaScript Version)
 * This file is a plain JavaScript implementation of the direct transport
 * that doesn't require TypeScript compilation.
 * 
 * Run with: node direct-server.js
 */

import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Setup console for debugging
console.error('Starting plain JS direct transport server...');

// Create log directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

const logFile = path.join(logDir, `direct-js-${Date.now()}.log`);
console.error(`Logging to: ${logFile}`);

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${message}\n`;
  
  // Log to stderr
  console.error(logEntry);
  
  // Log to file
  try {
    fs.writeFileSync(logFile, logEntry, { flag: 'a' });
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Buffer for incoming messages
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

// Simple server implementation
class SimpleServer {
  constructor() {
    this.readBuffer = new ReadBuffer();
    this.started = false;
    
    // Bind methods
    this.ondata = this.ondata.bind(this);
    this.onerror = this.onerror.bind(this);
    this.processReadBuffer = this.processReadBuffer.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
  }
  
  ondata(chunk) {
    this.readBuffer.append(chunk);
    this.processReadBuffer();
  }
  
  onerror(error) {
    log(`Transport error: ${error.message}`);
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
        this.onerror(error);
      }
    }
  }
  
  sendMessage(message) {
    return new Promise((resolve) => {
      // Log the message we're about to send
      log(`Sending message: ${JSON.stringify(message)}`);
      
      // Creating JSON manually using string template
      let jsonString = '';
      
      // Different handling based on message type
      if (message.result !== undefined) {
        // Handle response with result
        jsonString = `{"jsonrpc":"2.0","id":${typeof message.id === 'string' ? `"${message.id}"` : message.id},"result":${JSON.stringify(message.result)}}\n`;
      } else if (message.error !== undefined) {
        // Handle error response  
        jsonString = `{"jsonrpc":"2.0","id":${typeof message.id === 'string' ? `"${message.id}"` : message.id},"error":${JSON.stringify(message.error)}}\n`;
      } else if (message.method !== undefined) {
        // Handle request or notification
        const hasId = message.id !== undefined;
        const idPart = hasId ? `,"id":${typeof message.id === 'string' ? `"${message.id}"` : message.id}` : '';
        const paramsPart = message.params ? `,"params":${JSON.stringify(message.params)}` : '';
        
        jsonString = `{"jsonrpc":"2.0","method":"${message.method}"${paramsPart}${idPart}}\n`;
      }
      
      // Check position 5 in the message
      if (jsonString.length > 5) {
        log(`Character at position 5: '${jsonString.charAt(5)}' (ASCII: ${jsonString.charCodeAt(5)})`);
      }
      
      // Write the JSON string to stdout
      if (process.stdout.write(jsonString)) {
        resolve();
      } else {
        process.stdout.once('drain', resolve);
      }
    });
  }
  
  async handleMessage(message) {
    log(`Handling message: ${JSON.stringify(message)}`);
    
    // Handle initialize request
    if (message.method === 'initialize' && message.id !== undefined) {
      log('Responding to initialize request');
      await this.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'direct-js-server', version: '0.1.0' }
        }
      });
    } 
    // Handle tools/list request
    else if (message.method === 'tools/list' && message.id !== undefined) {
      log('Responding to tools/list request');
      await this.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: [
            {
              name: 'echo',
              description: 'Simple echo tool',
              inputSchema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              }
            }
          ]
        }
      });
    }
    // Handle initialized notification
    else if (message.method === 'notifications/initialized') {
      log('Received initialized notification');
      // No response needed for notifications
    }
    // Handle resources/list request (not supported)
    else if (message.method === 'resources/list' && message.id !== undefined) {
      log('Responding to resources/list request with error');
      await this.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
    // Handle prompts/list request (not supported)
    else if (message.method === 'prompts/list' && message.id !== undefined) {
      log('Responding to prompts/list request with error');
      await this.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
    // Handle echo tool call
    else if (message.method === 'tools/call' && message.params && message.params.name === 'echo' && message.id !== undefined) {
      log(`Echo tool called with: ${JSON.stringify(message.params)}`);
      await this.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [{ 
            type: 'text', 
            text: `You said: ${message.params.arguments?.message || 'nothing'}` 
          }]
        }
      });
    }
    // Handle unknown requests
    else if (message.method && message.id !== undefined) {
      log(`Responding to unknown request: ${message.method}`);
      await this.sendMessage({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
  }
  
  start() {
    if (this.started) {
      throw new Error('Server already started');
    }
    
    this.started = true;
    process.stdin.on('data', this.ondata);
    process.stdin.on('error', this.onerror);
    
    log('Server started and listening');
  }
  
  stop() {
    process.stdin.off('data', this.ondata);
    process.stdin.off('error', this.onerror);
    
    const hasRemainingListeners = process.stdin.listenerCount('data') > 0;
    if (!hasRemainingListeners) {
      process.stdin.pause();
    }
    
    this.readBuffer.clear();
    log('Server stopped');
  }
}

// Create and start the server
const server = new SimpleServer();
server.start();

// Handle process exit
process.on('SIGINT', () => {
  log('Received SIGINT, shutting down');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down');
  server.stop();
  process.exit(0);
});

log('Direct JS server running, waiting for messages');
