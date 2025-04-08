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
      
      // IMPLEMENTATION NOTE:
      // Claude appears to have a strict JSON parser that doesn't handle some edge cases well
      // We're bypassing the standard JSON.stringify and generating JSON manually
      // to ensure maximum compatibility
      
      // Method 1: Use built-in JSON.stringify with custom replacer for safety
      // const safeJson = JSON.stringify(message, this.jsonReplacer);
      
      // Method 2 (more reliable): Manual JSON construction
      let jsonString = this.constructJsonMessage(message);
      
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
   * Safest approach: Construct the JSON-RPC message manually
   * This gives us complete control over the formatting
   */
  private constructJsonMessage(message: JSONRPCMessage): string {
    // Always start with the envelope
    let jsonString = '{"jsonrpc":"2.0"';
    
    // Add the ID if present
    if ('id' in message && message.id !== undefined) {
      const idValue = typeof message.id === 'string' 
        ? `"${this.escapeString(message.id)}"`
        : message.id;
      jsonString += `,"id":${idValue}`;
    }
    
    // Add method if present
    if ('method' in message && message.method) {
      jsonString += `,"method":"${this.escapeString(message.method)}"`;
    }
    
    // Add params if present
    if ('params' in message && message.params) {
      jsonString += `,"params":${this.stringifyValue(message.params)}`;
    }
    
    // Add result if present
    if ('result' in message && message.result !== undefined) {
      jsonString += `,"result":${this.stringifyValue(message.result)}`;
    }
    
    // Add error if present
    if ('error' in message && message.error) {
      jsonString += `,"error":${this.stringifyValue(message.error)}`;
    }
    
    // Close the object
    jsonString += '}';
    
    return jsonString;
  }
  
  /**
   * JSON replacer function for standard JSON.stringify
   */
  private jsonReplacer(key: string, value: any): any {
    // Handle undefined values
    if (value === undefined) {
      return null;
    }
    
    // Handle arrays with potential undefined values
    if (Array.isArray(value)) {
      return value.map(item => item === undefined ? null : item);
    }
    
    return value;
  }
  
  /**
   * Stringifies a value to JSON with special handling for arrays and objects
   */
  private stringifyValue(value: any): string {
    // Handle null
    if (value === null) {
      return 'null';
    }
    
    // Handle undefined (treat as null)
    if (value === undefined) {
      return 'null';
    }
    
    // Handle different types
    const type = typeof value;
    
    switch (type) {
      case 'string':
        return `"${this.escapeString(value)}"`;
        
      case 'number':
        // Handle NaN and Infinity
        if (isNaN(value) || !isFinite(value)) {
          return 'null';
        }
        return String(value);
        
      case 'boolean':
        return value ? 'true' : 'false';
        
      case 'object':
        // Handle arrays
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return '[]';
          }
          
          const items = value.map(item => {
            return this.stringifyValue(item === undefined ? null : item);
          });
          
          return `[${items.join(',')}]`;
        }
        
        // Handle objects
        const properties: string[] = [];
        for (const [key, propValue] of Object.entries(value)) {
          if (propValue !== undefined) { // Skip undefined values
            properties.push(`"${this.escapeString(key)}":${this.stringifyValue(propValue)}`);
          }
        }
        
        return `{${properties.join(',')}}`;
        
      default:
        return 'null'; // Functions, symbols, etc. become null
    }
  }
  
  /**
   * Properly escape a string for JSON with extra caution
   */
  private escapeString(str: string): string {
    if (typeof str !== 'string') {
      return '';
    }
    
    let result = '';
    
    // Process each character individually for maximum control
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const code = str.charCodeAt(i);
      
      if (code < 32 || code > 126) {
        // Control characters and non-ASCII: use Unicode escape sequence
        result += '\\u' + ('0000' + code.toString(16)).slice(-4);
      } else {
        // Handle specific escape sequences
        switch (char) {
          case '\\': result += '\\\\'; break;
          case '"': result += '\\"'; break;
          case '\b': result += '\\b'; break;
          case '\f': result += '\\f'; break;
          case '\n': result += '\\n'; break;
          case '\r': result += '\\r'; break;
          case '\t': result += '\\t'; break;
          default: result += char;
        }
      }
    }
    
    return result;
  }
}
