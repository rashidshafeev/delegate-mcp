[FOR REMOVAL] This file is not needed for the focused Gemini implementation.

import { BaseModelProvider, ModelRequestOptions, ModelResponse } from './base.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

// This implementation is a placeholder and not fully implemented
export class AnthropicProvider extends BaseModelProvider {
  readonly name = 'anthropic';
  
  constructor() {
    super();
  }
  
  isAvailable(): boolean {
    return false;
  }
  
  async getAvailableModels(): Promise<string[]> {
    return [];
  }
  
  getDefaultModel(): string {
    return '';
  }
  
  async generateText(options: ModelRequestOptions): Promise<ModelResponse> {
    throw new Error('Anthropic provider is not implemented');
  }
}
