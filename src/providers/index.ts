import { providerRegistry } from './base.js';
import { GeminiProvider } from './gemini.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize only the Gemini provider and register it with the provider registry
 */
export function initializeProviders(): void {
  logger.info('Initializing Gemini provider');
  
  // Create instance of the Gemini provider
  const geminiProvider = new GeminiProvider();
  
  // Register provider
  providerRegistry.registerProvider(geminiProvider);
  
  // Log provider availability
  if (geminiProvider.isAvailable()) {
    logger.success('Gemini provider is available');
  } else {
    logger.warn('Gemini provider is not available. Please check your GEMINI_API_KEY.');
  }
}

/**
 * Get the Gemini provider or throw an error if it's not available
 */
export async function getProvider(providerName?: string) {
  // We only support Gemini, so ignore the providerName parameter
  const provider = providerRegistry.getProvider('gemini');
  if (!provider) {
    throw new Error('Gemini provider not found');
  }
  
  if (!provider.isAvailable()) {
    throw new Error('Gemini provider is not available. Check your GEMINI_API_KEY.');
  }
  
  return provider;
}

/**
 * Get all available providers (only Gemini in this case)
 */
export function getAvailableProviders() {
  return providerRegistry.getAvailableProviders();
}

/**
 * Find the appropriate provider for a model (only Gemini models are supported)
 */
export async function findProviderForModel(model: string) {
  // Only support Gemini models
  if (!model.startsWith('gemini-')) {
    logger.warn(`Model ${model} is not a Gemini model. Only Gemini models are supported.`);
  }
  
  return providerRegistry.getProvider('gemini');
}
