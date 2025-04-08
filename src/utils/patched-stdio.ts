import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Readable, Writable } from 'node:stream';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * A patched version of StdioServerTransport that ensures proper JSON formatting
 * This version fixes the issue with Claude's JSON parser
 */
export class PatchedStdioServerTransport extends StdioServerTransport {
  constructor(stdin: Readable = process.stdin, stdout: Writable = process.stdout) {
    super(stdin, stdout);
  }
  
  // Override the send method to ensure proper JSON formatting
  async send(message: JSONRPCMessage): Promise<void> {
    try {
      // Add this logging to see the exact format we're sending
      logger.debug(`Sending message: ${JSON.stringify(message)}`);
      
      // Format the JSON string - we use a custom serialization to ensure compatibility
      const jsonString = this.safeJSONStringify(message) + '\n';
      
      // Send the formatted message
      return new Promise((resolve) => {
        if ((this as any)._stdout.write(jsonString)) {
          resolve();
        } else {
          (this as any)._stdout.once('drain', resolve);
        }
      });
    } catch (error) {
      logger.error(`Error sending message: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Safe JSON stringify that ensures compatibility with Claude's parser
   */
  private safeJSONStringify(obj: any): string {
    // Handle null and undefined
    if (obj === null || obj === undefined) {
      return 'null';
    }
    
    // Handle simple types
    if (typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      const items = obj.map(item => this.safeJSONStringify(item));
      return `[${items.join(',')}]`;
    }
    
    // Handle objects
    const pairs = Object.entries(obj).map(([key, value]) => {
      return `"${key}":${this.safeJSONStringify(value)}`;
    });
    
    return `{${pairs.join(',')}}`;
  }
}
