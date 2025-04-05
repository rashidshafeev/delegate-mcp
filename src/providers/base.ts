/**
 * Base types and interfaces for model providers
 */

// Standard response from a model call
export interface ModelResponse {
  content: string;
  model: string;
  provider: string;
  tokenUsage?: {
    prompt?: number;
    completion?: number;
    total?: number;
  };
  finishReason?: string;
  metadata?: Record<string, any>;
}

// Standard request options for all models
export interface ModelRequestOptions {
  model: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
  timeout?: number;
}

// Base provider interface
export interface ModelProvider {
  /**
   * Name of the provider
   */
  readonly name: string;
  
  /**
   * Whether the provider is available (has required credentials)
   */
  isAvailable(): boolean;
  
  /**
   * Get available models for this provider
   */
  getAvailableModels(): Promise<string[]>;
  
  /**
   * Get default model for this provider
   */
  getDefaultModel(): string;
  
  /**
   * Send a request to the model and get a response
   */
  generateText(options: ModelRequestOptions): Promise<ModelResponse>;
  
  /**
   * Check if a specific model is supported by this provider
   */
  supportsModel(model: string): Promise<boolean>;
}

// Base provider class with common functionality
export abstract class BaseModelProvider implements ModelProvider {
  abstract readonly name: string;
  
  // Abstract methods that must be implemented by subclasses
  abstract isAvailable(): boolean;
  abstract getAvailableModels(): Promise<string[]>;
  abstract getDefaultModel(): string;
  abstract generateText(options: ModelRequestOptions): Promise<ModelResponse>;
  
  // Default implementation that can be overridden
  async supportsModel(model: string): Promise<boolean> {
    if (!this.isAvailable()) {
      return false;
    }
    
    try {
      const availableModels = await this.getAvailableModels();
      return availableModels.includes(model);
    } catch (error) {
      // If we can't get available models, assume the model isn't supported
      return false;
    }
  }
  
  // Helper method to validate required options
  protected validateOptions(options: ModelRequestOptions): void {
    if (!options.model) {
      throw new Error(`No model specified for ${this.name}`);
    }
    
    if (!options.prompt) {
      throw new Error(`No prompt specified for ${this.name}`);
    }
  }
  
  // Helper to create a basic response object
  protected createResponse(content: string, model: string): ModelResponse {
    return {
      content,
      model,
      provider: this.name,
    };
  }
}

// Provider registry to manage available providers
export class ProviderRegistry {
  private static instance: ProviderRegistry;
  private providers: Map<string, ModelProvider> = new Map();
  
  private constructor() {}
  
  public static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }
  
  // Register a provider
  public registerProvider(provider: ModelProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }
  
  // Get a provider by name
  public getProvider(name: string): ModelProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }
  
  // Get all registered providers
  public getAllProviders(): ModelProvider[] {
    return Array.from(this.providers.values());
  }
  
  // Get all available providers (that have credentials)
  public getAvailableProviders(): ModelProvider[] {
    return this.getAllProviders().filter(provider => provider.isAvailable());
  }
  
  // Find the appropriate provider for a model
  public async findProviderForModel(model: string): Promise<ModelProvider | undefined> {
    // Try direct match in model prefix (e.g., 'openai/gpt-4')
    const [providerPrefix] = model.split('/');
    if (providerPrefix && providerPrefix !== model) {
      const provider = this.getProvider(providerPrefix);
      if (provider?.isAvailable() && await provider.supportsModel(model)) {
        return provider;
      }
    }
    
    // Try all available providers
    for (const provider of this.getAvailableProviders()) {
      if (await provider.supportsModel(model)) {
        return provider;
      }
    }
    
    return undefined;
  }
}

// Export a default registry instance
export const providerRegistry = ProviderRegistry.getInstance();
