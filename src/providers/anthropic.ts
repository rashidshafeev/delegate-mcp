import { BaseModelProvider, ModelRequestOptions, ModelResponse } from './base.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider extends BaseModelProvider {
  readonly name = 'anthropic';
  private client: Anthropic | null = null;
  
  constructor() {
    super();
    this.initClient();
  }
  
  private initClient(): void {
    const apiKey = config.get('anthropicApiKey');
    if (apiKey) {
      try {
        this.client = new Anthropic({ apiKey });
        logger.debug('Anthropic client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Anthropic client', error);
        this.client = null;
      }
    } else {
      logger.warn('No Anthropic API key provided');
      this.client = null;
    }
  }
  
  isAvailable(): boolean {
    return this.client !== null;
  }
  
  async getAvailableModels(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }
    
    // Hard-coded list since Anthropic doesn't provide a model list endpoint
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }
  
  getDefaultModel(): string {
    return 'claude-3-haiku-20240307';
  }
  
  async generateText(options: ModelRequestOptions): Promise<ModelResponse> {
    if (!this.isAvailable()) {
      throw new Error('Anthropic provider is not available. Check your API key.');
    }
    
    this.validateOptions(options);
    logger.debug(`Generating text with model: ${options.model}`);
    
    try {
      const response = await this.client!.messages.create({
        model: options.model,
        max_tokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0.7,
        top_p: options.topP,
        top_k: options.topK,
        system: options.systemPrompt,
        messages: [{ role: 'user', content: options.prompt }],
      });
      
      // Extract text from response
      const content = response.content
        .filter(item => item.type === 'text')
        .map(item => 'text' in item ? item.text : '')
        .join('');
      
      return {
        content,
        model: options.model,
        provider: this.name,
        tokenUsage: {
          prompt: response.usage?.input_tokens,
          completion: response.usage?.output_tokens,
          total: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
        },
        finishReason: response.stop_reason,
      };
    } catch (error) {
      logger.error(`Anthropic API error: ${(error as Error).message}`);
      throw new Error(`Anthropic API error: ${(error as Error).message}`);
    }
  }
  
  async supportsModel(model: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.includes(model) || model.startsWith('claude-');
  }
}
