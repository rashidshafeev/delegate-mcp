import { BaseModelProvider, ModelRequestOptions, ModelResponse } from './base.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import OpenAI from 'openai';

export class OpenAIProvider extends BaseModelProvider {
  readonly name = 'openai';
  private client: OpenAI | null = null;
  
  constructor() {
    super();
    this.initClient();
  }
  
  private initClient(): void {
    const apiKey = config.get('openaiApiKey');
    if (apiKey) {
      try {
        this.client = new OpenAI({ apiKey });
        logger.debug('OpenAI client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize OpenAI client', error);
        this.client = null;
      }
    } else {
      logger.warn('No OpenAI API key provided');
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
    
    try {
      const response = await this.client!.models.list();
      return response.data.map(model => model.id);
    } catch (error) {
      logger.error('Failed to fetch OpenAI models', error);
      return [];
    }
  }
  
  getDefaultModel(): string {
    return 'gpt-3.5-turbo';
  }
  
  async generateText(options: ModelRequestOptions): Promise<ModelResponse> {
    if (!this.isAvailable()) {
      throw new Error('OpenAI provider is not available. Check your API key.');
    }
    
    this.validateOptions(options);
    logger.debug(`Generating text with model: ${options.model}`);
    
    try {
      const messages = [];
      
      // Add system message if provided
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      // Add user message
      messages.push({ role: 'user', content: options.prompt });
      
      const response = await this.client!.chat.completions.create({
        model: options.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stopSequences,
      });
      
      return {
        content: response.choices[0]?.message?.content || '',
        model: options.model,
        provider: this.name,
        tokenUsage: {
          prompt: response.usage?.prompt_tokens,
          completion: response.usage?.completion_tokens,
          total: response.usage?.total_tokens,
        },
        finishReason: response.choices[0]?.finish_reason,
      };
    } catch (error) {
      logger.error(`OpenAI API error: ${(error as Error).message}`);
      throw new Error(`OpenAI API error: ${(error as Error).message}`);
    }
  }
}
