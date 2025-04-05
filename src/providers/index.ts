import { providerRegistry } from './base.js';
import { GeminiProvider } from './gemini.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize all providers and register them with the provider registry
 */
export function initializeProviders(): void {
  logger.info('Initializing LLM providers');
  
  // Create instances of each provider
  const geminiProvider = new GeminiProvider();
  const openaiProvider = new OpenAIProvider();
  const anthropicProvider = new AnthropicProvider();
  
  // Register providers
  providerRegistry.registerProvider(geminiProvider);
  providerRegistry.registerProvider(openaiProvider);
  providerRegistry.registerProvider(anthropicProvider);
  
  // Log available providers
  const availableProviders = providerRegistry.getAvailableProviders();
  if (availableProviders.length > 0) {
    logger.success(`Available providers: ${availableProviders.map(p => p.name).join(', ')}`);
  } else {
    logger.warn('No LLM providers are available. Please check your API keys.');
  }
}

/**
 * Get a provider by name or the default provider if none is specified
 */
export async function getProvider(providerName?: string) {
  // If no provider specified, get the first available provider
  if (!providerName) {
    const availableProviders = providerRegistry.getAvailableProviders();
    if (availableProviders.length === 0) {
      throw new Error('No LLM providers are available. Please check your API keys.');
    }
    return availableProviders[0];
  }
  
  // Get the specified provider
  const provider = providerRegistry.getProvider(providerName);
  if (!provider) {
    throw new Error(`Provider ${providerName} not found`);
  }
  
  if (!provider.isAvailable()) {
    throw new Error(`Provider ${providerName} is not available. Check your API key.`);
  }
  
  return provider;
}

/**
 * Get all available providers
 */
export function getAvailableProviders() {
  return providerRegistry.getAvailableProviders();
}

/**
 * Find the appropriate provider for a model
 */
export async function findProviderForModel(model: string) {
  return providerRegistry.findProviderForModel(model);
}
