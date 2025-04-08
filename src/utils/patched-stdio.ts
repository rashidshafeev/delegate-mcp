import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Readable, Writable } from 'node:stream';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * A patched version of StdioServerTransport that ensures compatibility with Claude's JSON parser
 */
export class PatchedStdioServerTransport extends StdioServerTransport {
  constructor(stdin: Readable = process.stdin, stdout: Writable = process.stdout) {
    super(stdin, stdout);
  }
  
  // Override the send method to ensure proper JSON formatting
  async send(message: JSONRPCMessage): Promise<void> {
    try {
      // First, log the exact message we're sending
      logger.debug(`Original message: ${JSON.stringify(message)}`);
      
      // Extremely conservative approach - manually construct the JSON
      // This avoids any potential issues with JSON.stringify
      let jsonString = this.manualJsonStringify(message);
      
      // Add a newline at the end
      jsonString += '\n';
      
      // Log the final format
      logger.debug(`Sending JSON: ${jsonString.trim()}`);
      
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
   * Manual JSON stringify that's extremely careful about formatting
   * This avoids any potential issues with standard JSON.stringify
   */
  private manualJsonStringify(obj: JSONRPCMessage): string {
    // Start with an empty object
    let result = '{';
    
    // Handle each property manually
    const properties: string[] = [];
    
    // Always put jsonrpc first
    properties.push(`"jsonrpc":"2.0"`);
    
    // Handle id
    if ('id' in obj && obj.id !== undefined) {
      properties.push(`"id":${typeof obj.id === 'string' ? `"${obj.id}"` : obj.id}`);
    }
    
    // Handle method
    if ('method' in obj && obj.method) {
      properties.push(`"method":"${obj.method}"`);
    }
    
    // Handle params
    if ('params' in obj && obj.params) {
      properties.push(`"params":${this.stringifyValue(obj.params)}`);
    }
    
    // Handle result
    if ('result' in obj && obj.result !== undefined) {
      properties.push(`"result":${this.stringifyValue(obj.result)}`);
    }
    
    // Handle error
    if ('error' in obj && obj.error) {
      properties.push(`"error":${this.stringifyValue(obj.error)}`);
    }
    
    // Join properties
    result += properties.join(',');
    
    // Close object
    result += '}';
    
    return result;
  }
  
  /**
   * Helper to stringify values with special handling for objects, arrays, and primitives
   */
  private stringifyValue(value: any): string {
    if (value === null) {
      return 'null';
    }
    
    if (value === undefined) {
      return 'null';
    }
    
    // Handle various types
    switch (typeof value) {
      case 'string':
        // Escape quotes and special characters
        return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
        
      case 'number':
      case 'boolean':
        return String(value);
        
      case 'object':
        if (Array.isArray(value)) {
          // Handle arrays
          return `[${value.map(item => this.stringifyValue(item)).join(',')}]`;
        } else {
          // Handle objects
          const properties: string[] = [];
          
          for (const [key, propValue] of Object.entries(value)) {
            properties.push(`"${key}":${this.stringifyValue(propValue)}`);
          }
          
          return `{${properties.join(',')}}`;
        }
        
      default:
        // Fallback to built-in stringify for other types
        return JSON.stringify(value);
    }
  }
}
