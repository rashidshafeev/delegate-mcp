import { pack, RepomixConfig } from 'repomix';
import { z } from 'zod';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { countTokens, exceedsTokenLimit, truncateToTokenLimit } from '../utils/token-counter.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { github } from '../utils/github.js';

// Schema for context preparation options
export const contextOptionsSchema = z.object({
  repository: z.string().describe('Path to a local repository or a GitHub repository URL'),
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

export type ContextOptions = z.infer<typeof contextOptionsSchema>;

/**
 * Main function to prepare context from a repository
 * 
 * This function handles the entire context preparation pipeline:
 * 1. Clone/download the repository if it's a GitHub URL
 * 2. Configure repomix with appropriate options
 * 3. Pack the repository content
 * 4. Add explanatory comments if requested
 * 5. Save the output to the specified destination
 */
export async function prepareContext(options: ContextOptions): Promise<{
  path: string;
  success: boolean;
  message: string;
  tokenCount?: number;
}> {
  logger.section('Preparing Context');
  logger.info(`Processing repository: ${options.repository}`);
  
  // Validate input options
  try {
    contextOptionsSchema.parse(options);
  } catch (error) {
    logger.error('Invalid options:', error);
    return {
      path: '',
      success: false,
      message: `Invalid options: ${(error as Error).message}`,
    };
  }
  
  try {
    // Determine if this is a GitHub repository or local path
    let localRepoPath = options.repository;
    let isGitHubRepo = false;
    
    if (options.repository.startsWith('https://github.com/') || 
        options.repository.startsWith('github.com/')) {
      // This is a GitHub repository URL
      isGitHubRepo = true;
      
      // Normalize URL format
      const url = options.repository.replace(/^github\.com\//, 'https://github.com/');
      
      // Extract owner/repo
      const urlMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
      if (!urlMatch) {
        throw new Error(`Invalid GitHub repository URL: ${options.repository}`);
      }
      
      const [_, owner, repo] = urlMatch;
      logger.info(`Detected GitHub repository: ${owner}/${repo}`);
      
      // Create temporary directory
      const tempDir = path.join(config.get('tempDirectory'), `${owner}-${repo}`);
      
      // Clone repository
      localRepoPath = await github.cloneRepository(url, tempDir);
    } else {
      // This is a local path
      localRepoPath = path.resolve(process.cwd(), options.repository);
      
      // Verify that the path exists
      if (!existsSync(localRepoPath)) {
        throw new Error(`Repository path does not exist: ${localRepoPath}`);
      }
    }
    
    logger.info(`Using repository at: ${localRepoPath}`);
    
    // Configure Repomix
    const repomixConfig = await configureRepomix(localRepoPath, options);
    
    // Run repository packing
    logger.info('Packing repository content...');
    const packResult = await pack([localRepoPath], repomixConfig);
    
    logger.success(`Repository packed successfully. ${packResult.totalFiles} files. Approximate size: ${packResult.totalTokens} tokens.`);
    
    // Read the generated output
    const outputFilePath = path.resolve(process.cwd(), repomixConfig.output.filePath!);
    let contextContent = await fs.readFile(outputFilePath, 'utf-8');
    
    // Add explanatory comments if requested
    if (options.includeComments) {
      contextContent = addExplanatoryComments(contextContent, packResult);
    }
    
    // Verify and handle token limit
    const tokenCount = countTokens(contextContent);
    const maxTokens = options.maxTokens || config.get('maxTokensPerContext');
    
    if (exceedsTokenLimit(contextContent, maxTokens)) {
      logger.warn(`Context exceeds token limit of ${maxTokens} (estimated: ${tokenCount}). Truncating...`);
      contextContent = truncateToTokenLimit(contextContent, maxTokens);
    }
    
    // Determine where to save the output
    let finalOutputPath = outputFilePath;
    
    if (options.outputPath) {
      // User-specified output path
      finalOutputPath = path.resolve(process.cwd(), options.outputPath);
      await fs.mkdir(path.dirname(finalOutputPath), { recursive: true });
      await fs.writeFile(finalOutputPath, contextContent, 'utf-8');
      logger.success(`Context saved to: ${finalOutputPath}`);
    }
    
    // Save to GitHub if requested
    if (options.githubOutput) {
      const { owner, repo, path: ghPath, message } = options.githubOutput;
      const commitMessage = message || `Update context from ${options.repository}`;
      
      await github.saveContentToRepo(
        owner,
        repo,
        ghPath,
        contextContent,
        commitMessage
      );
      
      logger.success(`Context saved to GitHub: ${owner}/${repo}/${ghPath}`);
      finalOutputPath = `https://github.com/${owner}/${repo}/blob/main/${ghPath}`;
    }
    
    return {
      path: finalOutputPath,
      success: true,
      message: `Context prepared successfully. ${packResult.totalFiles} files processed with approximately ${tokenCount} tokens.`,
      tokenCount,
    };
  } catch (error) {
    logger.error(`Failed to prepare context: ${(error as Error).message}`);
    return {
      path: '',
      success: false,
      message: `Failed to prepare context: ${(error as Error).message}`,
    };
  }
}

/**
 * Configure Repomix with options for the repository
 */
async function configureRepomix(repoPath: string, options: ContextOptions): Promise<RepomixConfig> {
  logger.debug('Configuring Repomix...');
  
  const defaultIgnorePatterns = config.get('defaultIgnorePatterns');
  const defaultIncludePatterns = config.get('defaultIncludePatterns');
  
  // Build the repomix configuration
  const repomixConfig: RepomixConfig = {
    output: {
      filePath: '.repomix-output.txt',
      git: {
        sortByChanges: true,
        sortByChangesMaxCommits: 10,
      },
      compress: false,
      style: 'xml',
      fileSummary: true,
      directoryStructure: true,
      removeComments: false,
      removeEmptyLines: true,
      topFilesLength: 20,
      showLineNumbers: true,
      copyToClipboard: false,
      includeEmptyDirectories: true,
      parsableStyle: false,
    },
    include: options.files || defaultIncludePatterns,
    ignore: {
      useGitignore: true,
      useDefaultPatterns: true,
      customPatterns: options.ignorePatterns || defaultIgnorePatterns,
    },
    security: {
      enableSecurityCheck: true,
    },
    tokenCount: {
      encoding: 'o200k_base',
    },
    cwd: repoPath,
  };
  
  // If subset directories specified, modify include patterns
  if (options.subsetDirectories && options.subsetDirectories.length > 0) {
    const subsetIncludes = options.subsetDirectories.map(dir => 
      path.join(dir, '**/*').replace(/\\/g, '/')
    );
    
    repomixConfig.include = subsetIncludes;
    logger.info(`Including only these directories: ${subsetIncludes.join(', ')}`);
  }
  
  return repomixConfig;
}

/**
 * Add explanatory comments to the packaged context
 */
function addExplanatoryComments(content: string, packResult: any): string {
  logger.debug('Adding explanatory comments...');
  
  const headerComment = `
/*
 * CONTEXT SUMMARY
 * ===============
 * Repository processed with delegate-mcp
 * Total files: ${packResult.totalFiles}
 * Approximate token count: ${packResult.totalTokens}
 * 
 * This context has been prepared to provide a comprehensive view of the codebase.
 * Key files are listed first, followed by the directory structure and file contents.
 */

`;
  
  return headerComment + content;
}
