/**
 * Simple debug script to test Claude compatibility
 * Run with: npx ts-node src/utils/simple-debug.ts
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Readable, Writable } from 'node:stream';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// Set up console logging
console.error('=== Simple Debug Test ===');
console.error('Testing StdioServerTransport serialization');

// Create a log directory if it doesn't exist
const logDir = path.resolve(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  fs.mkdir(logDir, { recursive: true });
}

const logFile = path.join(logDir, `debug-${Date.now()}.log`);
console.error(`Logging to: ${logFile}`);

class TestReadable extends Readable {
  _read() {}
}

class TestWritable extends Writable {
  async _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): Promise<void> {
    try {
      const msg = chunk.toString('utf8');
      
      // Log to file
      await fs.appendFile(logFile, `${new Date().toISOString()} SENT: ${msg}\n`);
      
      // Log to console
      console.error(`SENT: ${msg}`);
      
      // Check specifically position 5
      if (msg.length > 5) {
        console.error(`Character at position 5: '${msg.charAt(5)}' (ASCII: ${msg.charCodeAt(5)})`);
        console.error(`Context: '${msg.substring(0, 10)}...'`);
      }
      
      callback();
    } catch (error) {
      callback(error as Error);
    }
  }
}

async function debugTransport() {
  console.error('Creating test transport...');
  
  const input = new TestReadable();
  const output = new TestWritable();
  
  // Try with the standard StdioServerTransport
  const transport = new StdioServerTransport(input, output);
  
  // Test case 1: Initialize response
  console.error('\nTEST CASE 1: Initialize response');
  await transport.send({
    jsonrpc: '2.0',
    id: 0,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'delegate-mcp', version: '0.1.0' }
    }
  });
  
  // Test case 2: Tools list response
  console.error('\nTEST CASE 2: Tools list response');
  await transport.send({
    jsonrpc: '2.0',
    id: 1,
    result: {
      tools: [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              param1: { type: 'string' }
            }
          }
        }
      ]
    }
  });
  
  // Test case 3: Error response
  console.error('\nTEST CASE 3: Error response');
  await transport.send({
    jsonrpc: '2.0',
    id: 2,
    error: {
      code: -32601,
      message: 'Method not found'
    }
  });
  
  console.error('\nDebug test completed');
}

// Run the debug transport test
debugTransport().catch(error => {
  console.error('Debug test failed:', error);
});
