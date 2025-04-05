import { BaseModelProvider, ModelRequestOptions, ModelResponse } from './base.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { GoogleGenerativeAI, GenerativeModel, GenerationConfig } from '@google-generativeai/node';

export class GeminiProvider extends BaseModelProvider {
  readonly name = 'gemini';
  private client: GoogleGenerativeAI | null = null;
  
  constructor() {
    super();
    this.initClient();
  }
  
  private initClient(): void {
    const apiKey = config.get('geminiApiKey');
    if (apiKey) {
      try {
        this.client = new GoogleGenerativeAI(apiKey);
        logger.debug('Gemini client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Gemini client', error);
        this.client = null;
      }
    } else {
      logger.warn('No Gemini API key provided');
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
    
    // Hard-coded list of models since Gemini API doesn't provide a model list endpoint
    return [
      'gemini-pro',
      'gemini-pro-vision',
      'gemini-ultra',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
  }
  
  getDefaultModel(): string {
    return 'gemini-pro';
  }
  
  async generateText(options: ModelRequestOptions): Promise<ModelResponse> {
    if (!this.isAvailable()) {
      throw new Error('Gemini provider is not available. Check your API key.');
    }
    
    this.validateOptions(options);
    logger.debug(`Generating text with model: ${options.model}`);
    
    try {
      const generationConfig: GenerationConfig = {
        temperature: options.temperature ?? 0.7,
        topK: options.topK ?? 40,
        topP: options.topP ?? 0.95,
        maxOutputTokens: options.maxTokens ?? 1024,
        stopSequences: options.stopSequences,
      };
      
      const model = this.client!.getGenerativeModel({ model: options.model });
      
      // Handle system prompt if provided
      let chatSession;
      if (options.systemPrompt) {
        chatSession = model.startChat({
          generationConfig,
          systemInstruction: options.systemPrompt,
        });
        
        const result = await chatSession.sendMessage(options.prompt);
        const response = result.response;
        
        return {
          content: response.text(),
          model: options.model,
          provider: this.name,
          tokenUsage: {
            // The API doesn't return token usage info
            prompt: undefined,
            completion: undefined,
            total: undefined,
          },
        };
      } else {
        // Direct completion without chat
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
          generationConfig,
        });
        
        const response = result.response;
        
        return {
          content: response.text(),
          model: options.model,
          provider: this.name,
          tokenUsage: {
            // The API doesn't return token usage info
            prompt: undefined,
            completion: undefined,
            total: undefined,
          },
        };
      }
    } catch (error) {
      logger.error(`Gemini API error: ${(error as Error).message}`);
      throw new Error(`Gemini API error: ${(error as Error).message}`);
    }
  }
  
  async supportsModel(model: string): Promise<boolean> {
    const models = await this.getAvailableModels();
    return models.includes(model) || 
           model.startsWith('gemini-') || 
           model.startsWith('models/gemini-');
  }
}
