/**
 * Direct transport for MCP server that bypasses standard JSON serialization
 * Run with: npx ts-node-esm src/utils/direct-transport.ts
 * 
 * This is a last-resort approach that manually crafts the JSON-RPC messages.
 */

import { Readable, Writable } from 'node:stream';
import { writeFileSync, existsSync } from 'fs';
import path from 'path';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

// Create log directory
const logDir = path.resolve(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  try {
    require('fs').mkdirSync(logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error);
  }
}

const logFile = path.join(logDir, `direct-transport-${Date.now()}.log`);
console.error(`Logging to: ${logFile}`);

function log(message: string) {
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} ${message}\n`;
  
  // Log to stderr
  console.error(logEntry);
  
  // Log to file
  try {
    writeFileSync(logFile, logEntry, { flag: 'a' });
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Buffer for incoming messages
class ReadBuffer {
  private buffer: Buffer | undefined;

  append(chunk: Buffer): void {
    log(`Received chunk: ${chunk.toString('utf8')}`);
    this.buffer = this.buffer ? Buffer.concat([this.buffer, chunk]) : chunk;
  }

  readMessage(): any | null {
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
      log(`JSON parse error: ${(error as Error).message}`);
      throw error;
    }
  }

  clear(): void {
    this.buffer = undefined;
  }
}

// Direct transport implementation
export class DirectTransport implements Transport {
  private readBuffer = new ReadBuffer();
  private started = false;

  constructor(
    private stdin: Readable = process.stdin,
    private stdout: Writable = process.stdout
  ) {}

  // Interface required properties
  public onclose?: () => void;
  public onmessage?: (message: JSONRPCMessage) => void;
  public onerror?: (error: Error) => void;

  // Event handlers
  private onDataHandler = (chunk: Buffer) => {
    this.readBuffer.append(chunk);
    this.processReadBuffer();
  };
  
  private onErrorHandler = (error: Error) => {
    log(`Transport error: ${error.message}`);
    if (this.onerror) this.onerror(error);
  };

  async start(): Promise<void> {
    if (this.started) {
      throw new Error('Transport already started');
    }

    this.started = true;
    this.stdin.on('data', this.onDataHandler);
    this.stdin.on('error', this.onErrorHandler);
    
    log('Transport started');
  }

  private processReadBuffer() {
    while (true) {
      try {
        const message = this.readBuffer.readMessage();
        if (message === null) {
          break;
        }

        log(`Received message: ${JSON.stringify(message)}`);
        if (this.onmessage) this.onmessage(message);
      } catch (error) {
        log(`Error processing message: ${(error as Error).message}`);
        if (this.onerror) this.onerror(error as Error);
      }
    }
  }

  async close(): Promise<void> {
    this.stdin.off('data', this.onDataHandler);
    this.stdin.off('error', this.onErrorHandler);
    
    const hasRemainingListeners = this.stdin.listenerCount('data') > 0;
    if (!hasRemainingListeners) {
      this.stdin.pause();
    }
    
    this.readBuffer.clear();
    if (this.onclose) this.onclose();
    
    log('Transport closed');
  }

  async send(message: JSONRPCMessage): Promise<void> {
    return new Promise((resolve) => {
      // Log the message we're about to send
      log(`Sending message: ${JSON.stringify(message)}`);

      // Creating JSON manually using string template to ensure Claude compatibility
      let jsonString = '';
      
      // Different handling based on message type
      if ('result' in message) {
        // Handle response with result
        jsonString = `{"jsonrpc":"2.0","id":${typeof message.id === 'string' ? `"${message.id}"` : message.id},"result":${JSON.stringify(message.result)}}\n`;
      } else if ('error' in message) {
        // Handle error response  
        jsonString = `{"jsonrpc":"2.0","id":${typeof message.id === 'string' ? `"${message.id}"` : message.id},"error":${JSON.stringify(message.error)}}\n`;
      } else if ('method' in message) {
        // Handle request or notification
        const hasId = 'id' in message && message.id !== undefined;
        const idPart = hasId ? `,"id":${typeof message.id === 'string' ? `"${message.id}"` : message.id}` : '';
        const paramsPart = message.params ? `,"params":${JSON.stringify(message.params)}` : '';
        
        jsonString = `{"jsonrpc":"2.0","method":"${message.method}"${paramsPart}${idPart}}\n`;
      }
      
      // Check position 5 in the message
      if (jsonString.length > 5) {
        log(`Character at position 5: '${jsonString.charAt(5)}' (ASCII: ${jsonString.charCodeAt(5)})`);
      }

      // Write the JSON string to stdout
      if (this.stdout.write(jsonString)) {
        resolve();
      } else {
        this.stdout.once('drain', resolve);
      }
    });
  }
  
  get sessionId(): string | undefined {
    return undefined;
  }
}

// Sample server implementation using DirectTransport
async function main() {
  log('Starting direct transport test');
  
  const transport = new DirectTransport();
  
  // Set up message handler
  transport.onmessage = async (message) => {
    log(`Handling message: ${JSON.stringify(message)}`);
    
    // Handle initialize request
    if ('method' in message && message.method === 'initialize' && 'id' in message) {
      log('Responding to initialize request');
      await transport.send({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'direct-transport', version: '0.1.0' }
        }
      });
    } 
    // Handle tools/list request
    else if ('method' in message && message.method === 'tools/list' && 'id' in message) {
      log('Responding to tools/list request');
      await transport.send({
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
    else if ('method' in message && message.method === 'notifications/initialized') {
      log('Received initialized notification');
      // No response needed for notifications
    }
    // Handle resources/list request (not supported)
    else if ('method' in message && message.method === 'resources/list' && 'id' in message) {
      log('Responding to resources/list request with error');
      await transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
    // Handle prompts/list request (not supported)
    else if ('method' in message && message.method === 'prompts/list' && 'id' in message) {
      log('Responding to prompts/list request with error');
      await transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
    // Handle unknown requests
    else if ('method' in message && 'id' in message) {
      log(`Responding to unknown request: ${message.method}`);
      await transport.send({
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
  };
  
  // Handle errors
  transport.onerror = (error) => {
    log(`Transport error: ${error.message}`);
  };
  
  // Start the transport
  await transport.start();
  log('Direct transport server running');
}

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    log(`Fatal error: ${error.message}`);
    log(`Stack: ${error.stack}`);
    process.exit(1);
  });
}
