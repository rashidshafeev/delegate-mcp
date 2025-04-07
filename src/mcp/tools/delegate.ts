import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';
import { ModelResponse } from '../../providers/base.js';
import { getProvider } from '../../providers/index.js';
import { config } from '../../utils/config.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { github } from '../../utils/github.js';
import { prepareContext } from '../../context/packager.js';
import crypto from 'crypto';

/**
 * Schema for the delegate tool parameters
 */
export const delegateParamsSchema = z.object({
  // Required parameters
  prompt: z.string().describe('The prompt to send to the model'),
  
  // Context parameters
  paths: z.array(z.string()).optional().describe('Array of file paths to include as context'),
  comment: z.string().optional().describe('Additional context comment'),
  
  // Model parameters
  model: z.string().optional().describe('The model to use (only Gemini models supported)'),
  temperature: z.number().min(0).max(1).optional().describe('Temperature for generation'),
  maxTokens: z.number().optional().describe('Maximum tokens to generate'),
  
  // Result handling parameters
  realtime: z.boolean().optional().default(true).describe('Whether to return results in realtime'),
  
  // GitHub parameters
  owner: z.string().optional().describe('GitHub repository owner'),
  repo: z.string().optional().describe('GitHub repository name'),
  branch: z.string().optional().describe('GitHub repository branch'),
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
  
  try {
    // Validate parameters
    delegateParamsSchema.parse(params);
    
    // Get owner and repo, either from params or default config
    const owner = params.owner || config.get('defaultOwner');
    const repo = params.repo || config.get('defaultRepo');
    
    if (!owner || !repo) {
      throw new Error('Repository owner and name are required. Provide them as parameters or set OWNER and REPO environment variables.');
    }
    
    // Generate conversation and request IDs
    const conversationId = crypto.randomBytes(8).toString('hex');
    const requestId = crypto.randomBytes(4).toString('hex');
    
    // Prepare context if path is provided
    let contextContent = '';
    if (params.paths && params.paths.length > 0) {
      logger.info(`Preparing context from paths: ${params.paths.join(', ')}`);
      
      const contextResult = await prepareContext({
        paths: params.paths,
        comment: params.comment,
        owner,
        repo,
        branch: params.branch || config.get('defaultBranch'),
        githubPath: `delegate/${conversationId}_context.txt`,
      });
      
      if (!contextResult.success) {
        throw new Error(`Failed to prepare context: ${contextResult.message}`);
      }
      
      contextContent = contextResult.content;
      logger.success('Context prepared successfully');
    }
    
    // Combine context with prompt
    let fullPrompt = params.prompt;
    if (contextContent) {
      fullPrompt = `${contextContent}\n\n${fullPrompt}`;
    }
    
    // Process the model request
    const response = await processModelRequest({
      prompt: fullPrompt,
      model: params.model || config.get('defaultModel'),
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
    
    // Save conversation to GitHub
    const conversationPath = `delegate/${conversationId}_conversation.txt`;
    await github.saveContentToRepo(
      owner,
      repo,
      conversationPath,
      `# Conversation ${conversationId}\n\n## Prompt\n\n${fullPrompt}\n\n## Response\n\n${response.content}`,
      `Add conversation ${conversationId}`
    );
    
    // Save response to GitHub
    const responsePath = `delegate/${conversationId}_${requestId}_response.txt`;
    await github.saveContentToRepo(
      owner,
      repo,
      responsePath,
      response.content,
      `Add response for conversation ${conversationId}`
    );
    
    // Format result based on realtime flag
    if (params.realtime !== false) {
      // Realtime mode - return the full response
      return {
        content: [
          {
            type: 'text',
            text: response.content + 
                 `\n\n---\nConversation saved to: https://github.com/${owner}/${repo}/blob/main/${conversationPath}\n` +
                 `Response saved to: https://github.com/${owner}/${repo}/blob/main/${responsePath}`
          }
        ]
      };
    } else {
      // Non-realtime mode - return only the IDs
      return {
        content: [
          {
            type: 'text',
            text: `Request processed successfully.\n\n` +
                 `Conversation ID: ${conversationId}\n` +
                 `Request ID: ${requestId}\n\n` +
                 `Files saved to:\n` +
                 `- https://github.com/${owner}/${repo}/blob/main/${conversationPath}\n` +
                 `- https://github.com/${owner}/${repo}/blob/main/${responsePath}`
          }
        ]
      };
    }
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
 * Process a model request
 */
async function processModelRequest(params: { 
  prompt: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<ModelResponse> {
  try {
    // Get the Gemini provider
    const provider = await getProvider();
    
    logger.info(`Using Gemini provider with model: ${params.model}`);
    
    // Call the model
    logger.info('Sending request to model...');
    const response = await provider.generateText({
      model: params.model,
      prompt: params.prompt,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });
    
    logger.success('Received response from model');
    return response;
  } catch (error) {
    logger.error(`Error processing model request: ${(error as Error).message}`);
    throw error;
  }
}
