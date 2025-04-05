import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';
import { prepareContext } from '../../context/packager.js';

/**
 * Schema for the prepare_context tool parameters
 */
export const prepareContextParamsSchema = z.object({
  // Required parameters
  repository: z.string().describe('Path to a local repository or a GitHub repository URL'),
  
  // Optional parameters
  files: z.array(z.string()).optional().describe('Glob patterns to include specific files'),
  ignorePatterns: z.array(z.string()).optional().describe('Glob patterns to exclude files'),
  includeComments: z.boolean().optional().describe('Whether to include explanatory comments'),
  subsetDirectories: z.array(z.string()).optional().describe('Only include specific directories'),
  outputFormat: z.enum(['text', 'json', 'github']).optional().describe('Format of the output'),
  outputPath: z.string().optional().describe('Path where output should be saved'),
  githubOutput: z.object({
    owner: z.string(),
    repo: z.string(),
    path: z.string(),
    message: z.string().optional(),
  }).optional().describe('GitHub repository details for saving output'),
  maxTokens: z.number().optional().describe('Maximum tokens to include in context'),
});

export type PrepareContextParams = z.infer<typeof prepareContextParamsSchema>;

/**
 * Implementation of the prepare_context tool
 */
export async function prepareContextTool(
  params: PrepareContextParams,
  extra: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.info(`prepare_context tool called with repository: ${params.repository}`);
  
  try {
    // Validate parameters
    prepareContextParamsSchema.parse(params);
    
    // Call the context preparation logic
    const result = await prepareContext(params);
    
    // Format the response
    if (result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `Context prepared successfully and saved to: ${result.path}\n\n` +
                  `${result.message}\n\n` +
                  (result.tokenCount ? `Estimated token count: ${result.tokenCount}\n` : '')
          }
        ]
      };
    } else {
      // Return error message but don't mark as error since it's a "soft" error
      return {
        content: [
          {
            type: 'text',
            text: `Failed to prepare context: ${result.message}`
          }
        ]
      };
    }
  } catch (error) {
    logger.error(`Error in prepare_context tool: ${(error as Error).message}`);
    
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
