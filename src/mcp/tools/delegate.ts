import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';
import { ModelResponse } from '../../providers/base.js';
import { findProviderForModel, getProvider } from '../../providers/index.js';
import { config } from '../../utils/config.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { github } from '../../utils/github.js';

/**
 * Schema for the delegate tool parameters
 */
export const delegateParamsSchema = z.object({
  // Required parameters
  prompt: z.string().describe('The prompt to send to the model'),
  
  // Optional parameters
  model: z.string().optional().describe('The model to use (e.g., "gemini-pro", "gpt-4")'),
  provider: z.string().optional().describe('The provider to use (e.g., "gemini", "openai", "anthropic")'),
  contextFile: z.string().optional().describe('Path to a context file to use'),
  contextText: z.string().optional().describe('Context text to include with the prompt'),
  temperature: z.number().min(0).max(1).optional().describe('Temperature for generation'),
  maxTokens: z.number().optional().describe('Maximum tokens to generate'),
  async: z.boolean().optional().describe('Whether to run asynchronously'),
  storeResults: z.boolean().optional().describe('Whether to store results'),
  resultPath: z.string().optional().describe('Path to store results'),
  resultRepo: z.string().optional().describe('GitHub repo to store results (format: "owner/repo")'),
  resultRepoPath: z.string().optional().describe('Path in GitHub repo to store results'),
  systemPrompt: z.string().optional().describe('System prompt to use'),
});

export type DelegateParams = z.infer<typeof delegateParamsSchema>;

/**
 * Implementation of the delegate tool
 */
export async function delegateTool(
  params: DelegateParams,
  extra: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.info(`delegate tool called with model: ${params.model || config.get('defaultModel')}`);
  
  // For async mode, start a background process
  if (params.async) {
    // Start process in background
    processModelRequestAsync(params).catch(error => {
      logger.error(`Error in async delegate processing: ${error.message}`);
    });
    
    // Return immediate response indicating async processing has started
    return {
      content: [
        {
          type: 'text',
          text: `Request has been delegated to model ${params.model || config.get('defaultModel')} asynchronously.\n\n` +
                `${params.storeResults ? `Results will be saved to ${params.resultPath || params.resultRepo || 'the specified location'}.` : ''}`
        }
      ]
    };
  }
  
  // For synchronous mode, process immediately
  try {
    // Process the request
    const response = await processModelRequest(params);
    
    // Store results if requested
    let storageInfo = '';
    if (params.storeResults) {
      storageInfo = await storeResults(response, params);
    }
    
    // Return the model's response
    return {
      content: [
        {
          type: 'text',
          text: response.content +
                (storageInfo ? `\n\n---\n${storageInfo}` : '')
        }
      ]
    };
  } catch (error) {
    logger.error(`Error in delegate tool: ${(error as Error).message}`);
    
    // Return error result
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${(error as Error).message}`
        }
      ],
      isError: true
    };
  }
}

/**
 * Process a model request asynchronously
 */
async function processModelRequestAsync(params: DelegateParams): Promise<void> {
  try {
    logger.info(`Processing async request for model: ${params.model || config.get('defaultModel')}`);
    
    // Process the request
    const response = await processModelRequest(params);
    
    // Always store results for async requests
    if (params.storeResults !== false) {
      await storeResults(response, params);
    }
    
    logger.success('Async request processed successfully');
  } catch (error) {
    logger.error(`Error in async request processing: ${(error as Error).message}`);
    
    // Try to store error information
    if (params.storeResults !== false) {
      const errorResponse: ModelResponse = {
        content: `Error processing request: ${(error as Error).message}`,
        model: params.model || config.get('defaultModel'),
        provider: params.provider || config.get('defaultProvider'),
        metadata: { error: (error as Error).message }
      };
      
      await storeResults(errorResponse, params, true);
    }
  }
}

/**
 * Process a model request
 */
async function processModelRequest(params: DelegateParams): Promise<ModelResponse> {
  // Determine which provider and model to use
  let provider;
  const model = params.model || config.get('defaultModel');
  
  if (params.provider) {
    // Use specified provider
    provider = await getProvider(params.provider);
  } else {
    // Try to find a provider that supports the model
    provider = await findProviderForModel(model);
    
    if (!provider) {
      // Fallback to default provider
      provider = await getProvider(config.get('defaultProvider'));
    }
  }
  
  if (!provider) {
    throw new Error(`No provider available for model: ${model}`);
  }
  
  logger.info(`Using provider: ${provider.name} with model: ${model}`);
  
  // Prepare the prompt with context if provided
  let fullPrompt = params.prompt;
  
  // Add context from file if specified
  if (params.contextFile) {
    // Resolve path (could be relative to current directory)
    const contextPath = path.resolve(process.cwd(), params.contextFile);
    
    // Check if file exists
    if (!existsSync(contextPath)) {
      throw new Error(`Context file not found: ${params.contextFile}`);
    }
    
    logger.info(`Loading context from file: ${contextPath}`);
    const contextContent = await fs.readFile(contextPath, 'utf-8');
    
    // Combine context with prompt
    fullPrompt = `${contextContent}\n\n${fullPrompt}`;
  }
  
  // Add context text if provided
  if (params.contextText) {
    fullPrompt = `${params.contextText}\n\n${fullPrompt}`;
  }
  
  // Call the model
  logger.info('Sending request to model...');
  const response = await provider.generateText({
    model,
    prompt: fullPrompt,
    systemPrompt: params.systemPrompt,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
  });
  
  logger.success('Received response from model');
  return response;
}

/**
 * Store results to file or GitHub repository
 */
async function storeResults(
  response: ModelResponse,
  params: DelegateParams,
  isError: boolean = false
): Promise<string> {
  // Add metadata to the content
  const timestamp = new Date().toISOString();
  const metadata = {
    timestamp,
    model: response.model,
    provider: response.provider,
    tokenUsage: response.tokenUsage,
    prompt: params.prompt,
    isError
  };
  
  // Format content for saving
  const formattedContent = `# Delegated Request Result

## Metadata

- **Timestamp:** ${timestamp}
- **Model:** ${response.model}
- **Provider:** ${response.provider}
${response.tokenUsage?.total ? `- **Token Usage:** ${response.tokenUsage.total}` : ''}

## Prompt

${params.prompt}

## Response

${response.content}
`;
  
  // Store to file if path provided
  if (params.resultPath) {
    const resultPath = path.resolve(process.cwd(), params.resultPath);
    await fs.mkdir(path.dirname(resultPath), { recursive: true });
    await fs.writeFile(resultPath, formattedContent, 'utf-8');
    logger.success(`Results saved to file: ${resultPath}`);
    return `Results saved to file: ${resultPath}`;
  }
  
  // Store to GitHub if repo provided
  if (params.resultRepo) {
    const parts = params.resultRepo.split('/');
    if (parts.length !== 2) {
      throw new Error(`Invalid repository format: ${params.resultRepo}. Expected format: owner/repo`);
    }
    
    const [owner, repo] = parts;
    const filePath = params.resultRepoPath || `results/${timestamp.replace(/:/g, '-')}.md`;
    
    await github.saveContentToRepo(
      owner,
      repo,
      filePath,
      formattedContent,
      `Add model response for '${params.prompt.substring(0, 50)}${params.prompt.length > 50 ? '...' : ''}'`
    );
    
    logger.success(`Results saved to GitHub: ${owner}/${repo}/${filePath}`);
    return `Results saved to GitHub: https://github.com/${owner}/${repo}/blob/main/${filePath}`;
  }
  
  // If no storage location specified
  return '';
}
