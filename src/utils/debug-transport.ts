import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { logger } from './logger.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

/**
 * A debug wrapper for a transport that logs all messages and ensures correct formatting
 */
export class DebugTransportWrapper implements Transport {
  private _wrapped: Transport;
  
  constructor(transport: Transport) {
    this._wrapped = transport;
    
    // Wrap the callbacks
    this._wrapped.onclose = () => this.onclose?.();
    this._wrapped.onerror = (error) => this.onerror?.(error);
    this._wrapped.onmessage = (message) => {
      logger.debug(`MESSAGE FROM CLIENT: ${JSON.stringify(message)}`);
      this.onmessage?.(message);
    };
  }
  
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  
  get sessionId(): string | undefined {
    return this._wrapped.sessionId;
  }
  
  async start(): Promise<void> {
    logger.debug('Starting debug transport wrapper');
    await this._wrapped.start();
  }
  
  async close(): Promise<void> {
    logger.debug('Closing debug transport wrapper');
    await this._wrapped.close();
  }
  
  async send(message: JSONRPCMessage, options?: unknown): Promise<void> {
    // Log the message first
    logger.debug(`SENDING TO CLIENT: ${JSON.stringify(message)}`);
    
    // Make sure the message is properly formatted
    if (typeof message !== 'object' || message === null) {
      throw new Error('Invalid message: must be an object');
    }
    
    // Ensure it has the jsonrpc field
    if (!('jsonrpc' in message) || message.jsonrpc !== '2.0') {
      message.jsonrpc = '2.0';
    }
    
    await this._wrapped.send(message, options);
  }
}
