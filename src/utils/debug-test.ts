/**
 * Debug test utility for checking JSON formatting with the PatchedStdioServerTransport
 * 
 * Run this with:
 * npx ts-node src/utils/debug-test.ts
 * 
 * Or after building:
 * node dist/utils/debug-test.js
 */

import { PatchedStdioServerTransport } from './patched-stdio.js';
import { logger } from './logger.js';
import { Readable, Writable } from 'node:stream';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

// Set log level to debug for this test
process.env.LOG_LEVEL = 'debug';

class TestReadable extends Readable {
  _read() {}
}

class TestWritable extends Writable {
  data: Buffer[] = [];
  
  _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.data.push(chunk);
    callback();
  }
  
  getOutput(): string {
    return Buffer.concat(this.data).toString('utf8');
  }
}

async function runJsonTest() {
  logger.info('=== Testing PatchedStdioServerTransport JSON formatting ===');
  
  const input = new TestReadable();
  const output = new TestWritable();
  
  const transport = new PatchedStdioServerTransport(input, output);
  
  // Test case 1: Initialize response (most critical for MCP protocol)
  logger.info('Test case 1: Initialize response');
  await transport.send({
    jsonrpc: '2.0',
    id: 0,
    result: {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'delegate-mcp', version: '0.1.0' }
    }
  } as JSONRPCMessage);
  
  // Test case 2: Message with tools array in result
  logger.info('Test case 2: Message with tools array in result');
  await transport.send({
    jsonrpc: '2.0',
    id: 2,
    result: { 
      tools: [
        { name: 'tool1', description: 'First tool' },
        { name: 'tool2', description: 'Second tool' }
      ]
    }
  } as JSONRPCMessage);
  
  // Test case 3: Error response (common in MCP protocol)
  logger.info('Test case 3: Error response');
  await transport.send({
    jsonrpc: '2.0',
    id: 3,
    error: {
      code: -32601,
      message: 'Method not found'
    }
  } as JSONRPCMessage);
  
  // Test case 4: Message with special characters
  logger.info('Test case 4: Message with special characters');
  await transport.send({
    jsonrpc: '2.0',
    id: 4,
    result: {
      text: 'Special characters: \n, \t, \r, \b, \f',
      quote: 'This has "quotes" and \\backslashes\\'
    }
  } as JSONRPCMessage);
  
  // Test case 5: Message with empty array in an object
  logger.info('Test case 5: Message with empty array in an object');
  await transport.send({
    jsonrpc: '2.0',
    id: 5,
    result: { items: [] }
  } as JSONRPCMessage);
  
  // Test case 6: Message with undefined and null values
  logger.info('Test case 6: Message with undefined and null values');
  await transport.send({
    jsonrpc: '2.0',
    id: 6,
    result: {
      definedValue: 'This is defined',
      nullValue: null,
      // @ts-ignore - deliberately testing with undefined
      undefinedValue: undefined,
      arrayWithUndefined: ['valid', undefined, 'also valid']
    }
  } as JSONRPCMessage);
  
  // Test case 7: Notification message (no id)
  logger.info('Test case 7: Notification message (no id)');
  await transport.send({
    jsonrpc: '2.0',
    method: 'notifications/initialized'
  } as JSONRPCMessage);
  
  // Test case 8: Method call with params
  logger.info('Test case 8: Method call with params');
  await transport.send({
    jsonrpc: '2.0',
    id: 8,
    method: 'tools/list',
    params: {}
  } as JSONRPCMessage);
  
  // Show the output
  logger.info('=== Formatted outputs ===');
  logger.info(output.getOutput());
  
  logger.info('=== Test completed ===');
  
  // Now check specifically for position 5 (which is where the Claude error occurred)
  const allOutputs = output.getOutput().split('\n').filter(line => line.trim().length > 0);
  
  logger.info('=== Character at position 5 in each message ===');
  for (let i = 0; i < allOutputs.length; i++) {
    const line = allOutputs[i];
    const charAtPos5 = line.charAt(5);
    const context = line.substring(0, 10) + '...';
    logger.info(`Message ${i+1}: '${charAtPos5}' (context: ${context})`);
  }
}

// Run the test
runJsonTest().catch(error => {
  logger.error('Test failed:', error);
});
