import { z } from 'zod';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import { countTokens } from '../utils/token-counter.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { github } from '../utils/github.js';
import crypto from 'crypto';

// Schema for context preparation options
export const contextOptionsSchema = z.object({
  paths: z.array(z.string()).describe('Array of file or directory paths to include'),
  comment: z.string().optional().describe('Comment to append to the end of the context'),
  owner: z.string().optional().describe('GitHub repository owner'),
  repo: z.string().optional().describe('GitHub repository name'),
  branch: z.string().optional().describe('GitHub repository branch'),
  outputPath: z.string().optional().describe('Path where output should be saved locally'),
  githubPath: z.string().optional().describe('Path in the GitHub repository to save the file'),
});

export type ContextOptions = z.infer<typeof contextOptionsSchema>;

/**
 * Main function to prepare context from file paths
 * 
 * This function handles the context preparation pipeline:
 * 1. Read all specified files and directories
 * 2. Concatenate content with file paths as headers
 * 3. Add comment if provided
 * 4. Save the output to local file and/or GitHub repository
 */
export async function prepareContext(options: ContextOptions): Promise<{
  content: string;
  path: string;
  success: boolean;
  message: string;
  tokenCount?: number;
}> {
  logger.section('Preparing Context');
  logger.info(`Processing paths: ${options.paths.join(', ')}`);
  
  // Validate input options
  try {
    contextOptionsSchema.parse(options);
  } catch (error) {
    logger.error('Invalid options:', error);
    return {
      content: '',
      path: '',
      success: false,
      message: `Invalid options: ${(error as Error).message}`,
    };
  }
  
  try {
    // Set GitHub defaults from environment if not provided
    const owner = options.owner || config.get('defaultOwner');
    const repo = options.repo || config.get('defaultRepo');
    const branch = options.branch || config.get('defaultBranch');
    
    if (!owner || !repo) {
      throw new Error('Repository owner and name are required. Provide them as parameters or set OWNER and REPO environment variables.');
    }
    
    // Read and concatenate files
    const contextContent = await readAndConcatenateFiles(options.paths, options.comment);
    
    // Count tokens
    const tokenCount = countTokens(contextContent);
    logger.info(`Estimated token count: ${tokenCount}`);
    
    // Save to local file if requested
    if (options.outputPath) {
      const outputPath = path.resolve(process.cwd(), options.outputPath);
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, contextContent, 'utf-8');
      logger.success(`Context saved locally to: ${outputPath}`);
    }
    
    // Generate a default GitHub path if not provided
    const githubPath = options.githubPath || generateDefaultGithubPath();
    
    // Save to GitHub
    await github.saveContentToRepo(
      owner,
      repo,
      githubPath,
      contextContent,
      `Context from ${options.paths.join(', ')}${options.comment ? ' with comment' : ''}`
    );
    
    logger.success(`Context saved to GitHub: ${owner}/${repo}/${githubPath}`);
    
    return {
      content: contextContent,
      path: `https://github.com/${owner}/${repo}/blob/${branch}/${githubPath}`,
      success: true,
      message: `Context prepared successfully from ${options.paths.length} paths with approximately ${tokenCount} tokens.`,
      tokenCount,
    };
  } catch (error) {
    logger.error(`Failed to prepare context: ${(error as Error).message}`);
    return {
      content: '',
      path: '',
      success: false,
      message: `Failed to prepare context: ${(error as Error).message}`,
    };
  }
}

/**
 * Read and concatenate files from specified paths
 */
async function readAndConcatenateFiles(filePaths: string[], comment?: string): Promise<string> {
  let result = '';
  
  // Process each path
  for (const filePath of filePaths) {
    try {
      const resolvedPath = path.resolve(process.cwd(), filePath);
      
      // Check if path exists
      if (!existsSync(resolvedPath)) {
        logger.warn(`Path does not exist: ${resolvedPath}`);
        result += `\n\n/* FILE: ${filePath} - NOT FOUND */\n`;
        continue;
      }
      
      const stats = await fs.stat(resolvedPath);
      
      if (stats.isFile()) {
        // Add file content with header
        const content = await fs.readFile(resolvedPath, 'utf-8');
        result += `\n\n/* FILE: ${filePath} */\n${content}`;
      } else if (stats.isDirectory()) {
        // Process directory recursively
        const dirContent = await processDirectory(resolvedPath, filePath);
        result += dirContent;
      }
    } catch (error) {
      logger.error(`Error processing path ${filePath}: ${(error as Error).message}`);
      result += `\n\n/* FILE: ${filePath} - ERROR: ${(error as Error).message} */\n`;
    }
  }
  
  // Add comment if provided
  if (comment) {
    result += `\n\n/* COMMENT: */\n${comment}\n`;
  }
  
  return result;
}

/**
 * Process a directory recursively to find and concatenate all files
 */
async function processDirectory(dirPath: string, relativePath: string): Promise<string> {
  let result = '';
  
  try {
    // Read directory entries
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Process each entry
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other common directories to ignore
        if (shouldSkipDirectory(entry.name)) {
          continue;
        }
        
        // Process subdirectory
        const dirContent = await processDirectory(fullPath, relPath);
        result += dirContent;
      } else if (entry.isFile()) {
        // Skip binary and other files not suitable for LLM context
        if (shouldSkipFile(entry.name)) {
          continue;
        }
        
        // Add file content with header
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          result += `\n\n/* FILE: ${relPath} */\n${content}`;
        } catch (error) {
          logger.error(`Error reading file ${relPath}: ${(error as Error).message}`);
          result += `\n\n/* FILE: ${relPath} - ERROR: ${(error as Error).message} */\n`;
        }
      }
    }
  } catch (error) {
    logger.error(`Error processing directory ${dirPath}: ${(error as Error).message}`);
  }
  
  return result;
}

/**
 * Check if a directory should be skipped
 */
function shouldSkipDirectory(dirName: string): boolean {
  const dirsToSkip = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'target',
    'coverage',
    '.next',
    '.nuxt',
    '.cache',
    '.vscode',
    '.idea',
  ];
  
  return dirsToSkip.includes(dirName);
}

/**
 * Check if a file should be skipped
 */
function shouldSkipFile(fileName: string): boolean {
  // Skip by extension
  const extensionsToSkip = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.ico', '.svg',
    '.mp3', '.mp4', '.wav', '.ogg', '.webm',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.tar', '.gz', '.7z',
    '.exe', '.dll', '.so', '.dylib',
    '.min.js', '.min.css',
    '.map',
    '.lock',
  ];
  
  return extensionsToSkip.some(ext => fileName.endsWith(ext));
}

/**
 * Generate a default path for GitHub storage
 */
function generateDefaultGithubPath(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const randomId = crypto.randomBytes(4).toString('hex');
  return `contexts/context-${timestamp}-${randomId}.txt`;
}
