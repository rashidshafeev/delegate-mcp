import { z } from 'zod';
import { RequestHandlerExtra } from '@modelcontextprotocol/sdk/shared/protocol.js';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../utils/logger.js';
import { prepareContext } from '../../context/packager.js';
import { config } from '../../utils/config.js';

/**
 * Schema for the prepare_context tool parameters
 */
export const prepareContextParamsSchema = z.object({
  // Required parameters
  paths: z.array(z.string()).describe('Array of file or directory paths to include'),
  
  // Optional parameters
  comment: z.string().optional().describe('Comment to append to the end of the context'),
  owner: z.string().optional().describe('GitHub repository owner'),
  repo: z.string().optional().describe('GitHub repository name'),
  branch: z.string().optional().describe('GitHub repository branch'),
  outputPath: z.string().optional().describe('Path where output should be saved locally'),
  githubPath: z.string().optional().describe('Path in the GitHub repository to save the file'),
});

export type PrepareContextParams = z.infer<typeof prepareContextParamsSchema>;

/**
 * Implementation of the prepare_context tool
 * 
 * This tool:
 * 1. Accepts an array of file paths
 * 2. Optionally accepts a comment to append
 * 3. Concatenates the files into a single document
 * 4. Saves the result to GitHub
 */
export async function prepareContextTool(
  params: PrepareContextParams,
  extra: RequestHandlerExtra
): Promise<CallToolResult> {
  logger.info(`prepare_context tool called with paths: ${params.paths.join(', ')}`);
  
  try {
    // Validate parameters
    prepareContextParamsSchema.parse(params);
    
    // Set defaults from configuration if not provided
    const owner = params.owner || config.get('defaultOwner');
    const repo = params.repo || config.get('defaultRepo');
    
    // Verify required parameters
    if (!owner || !repo) {
      throw new Error('Repository owner and name are required. Provide them as parameters or set OWNER and REPO environment variables.');
    }
    
    // Call the context preparation logic
    const result = await prepareContext({
      paths: params.paths,
      comment: params.comment,
      owner,
      repo,
      branch: params.branch || config.get('defaultBranch'),
      outputPath: params.outputPath,
      githubPath: params.githubPath,
    });
    
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
