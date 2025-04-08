/**
 * Debug test utility for checking JSON formatting with the PatchedStdioServerTransport
 * 
 * Run this with:
 * ts-node src/utils/debug-test.ts
 * 
 * Or after building:
 * node dist/utils/debug-test.js
 */

import { PatchedStdioServerTransport } from './patched-stdio.js';
import { logger } from './logger.js';
import { Readable, Writable } from 'node:stream';

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
  
  // Test case 1: Simple message
  logger.info('Test case 1: Simple message');
  await transport.send({
    jsonrpc: '2.0',
    id: 1,
    result: 'Simple result'
  });
  
  // Test case 2: Message with array
  logger.info('Test case 2: Message with array');
  await transport.send({
    jsonrpc: '2.0',
    id: 2,
    result: ['item1', 'item2', 'item3']
  });
  
  // Test case 3: Message with nested objects and arrays
  logger.info('Test case 3: Message with nested objects and arrays');
  await transport.send({
    jsonrpc: '2.0',
    id: 3,
    result: {
      items: [
        { id: 1, name: 'First item' },
        { id: 2, name: 'Second item', tags: ['tag1', 'tag2'] }
      ],
      metadata: {
        count: 2,
        page: 1
      }
    }
  });
  
  // Test case 4: Message with special characters
  logger.info('Test case 4: Message with special characters');
  await transport.send({
    jsonrpc: '2.0',
    id: 4,
    result: {
      text: 'Special characters: \n, \t, \r, \b, \f',
      quote: 'This has "quotes" and \\backslashes\\'
    }
  });
  
  // Test case 5: Message with empty array
  logger.info('Test case 5: Message with empty array');
  await transport.send({
    jsonrpc: '2.0',
    id: 5,
    result: []
  });
  
  // Test case 6: Message with undefined and null values (should handle properly)
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
  });
  
  // Test case 7: Error response
  logger.info('Test case 7: Error response');
  await transport.send({
    jsonrpc: '2.0',
    id: 7,
    error: {
      code: -32600,
      message: 'Invalid request'
    }
  });
  
  // Show the output
  logger.info('=== Formatted outputs ===');
  logger.info(output.getOutput());
  
  logger.info('=== Test completed ===');
}

// Run the test
runJsonTest().catch(error => {
  logger.error('Test failed:', error);
});
