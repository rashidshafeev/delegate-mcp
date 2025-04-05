import { Octokit } from 'octokit';
import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { config } from './config.js';
import { logger } from './logger.js';
import https from 'https';
import { execSync } from 'child_process';

// GitHub utility class for interacting with repositories and storing results
export class GitHubClient {
  private static instance: GitHubClient;
  private octokit: Octokit;
  private authenticated: boolean = false;

  private constructor() {
    const token = config.get('githubToken');
    
    if (token) {
      try {
        this.octokit = new Octokit({ auth: token });
        this.authenticated = true;
        logger.debug('GitHub client initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize GitHub client', error);
        throw error;
      }
    } else {
      logger.warn('No GitHub token provided. GitHub functionality will be limited.');
      this.octokit = new Octokit(); // Limited access without authentication
    }
  }

  public static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  /**
   * Check if the client is authenticated with a token
   */
  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Clone a repository to a local directory
   */
  public async cloneRepository(repoUrl: string, targetDir: string): Promise<string> {
    logger.info(`Cloning repository ${repoUrl} to ${targetDir}`);
    
    try {
      const fullTargetPath = path.resolve(process.cwd(), targetDir);
      await fs.mkdir(fullTargetPath, { recursive: true });
      
      // Extract owner and repo from URL
      let cloneCommand: string;
      
      if (this.authenticated) {
        // Use token authentication in clone URL
        const token = config.get('githubToken');
        const urlWithToken = repoUrl.replace('https://', `https://${token}@`);
        cloneCommand = `git clone ${urlWithToken} "${fullTargetPath}" --depth 1`;
      } else {
        cloneCommand = `git clone ${repoUrl} "${fullTargetPath}" --depth 1`;
      }
      
      execSync(cloneCommand, { stdio: 'pipe' });
      logger.success(`Repository cloned successfully to ${targetDir}`);
      
      return fullTargetPath;
    } catch (error) {
      logger.error(`Failed to clone repository: ${(error as Error).message}`);
      throw new Error(`Failed to clone repository: ${(error as Error).message}`);
    }
  }

  /**
   * Download a repository as a zip file (alternative to cloning)
   */
  public async downloadRepositoryZip(owner: string, repo: string, targetPath: string): Promise<string> {
    logger.info(`Downloading repository ${owner}/${repo} as zip`);
    
    try {
      // Ensure directory exists
      const directory = path.dirname(targetPath);
      await fs.mkdir(directory, { recursive: true });
      
      // Create a download URL
      const downloadUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
      
      // Download the file
      return new Promise((resolve, reject) => {
        const file = createWriteStream(targetPath);
        https.get(downloadUrl, (response) => {
          if (response.statusCode !== 200) {
            reject(new Error(`Failed to download: ${response.statusCode} ${response.statusMessage}`));
            return;
          }
          
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            logger.success(`Repository downloaded successfully to ${targetPath}`);
            resolve(targetPath);
          });
        }).on('error', (err) => {
          fs.unlink(targetPath).catch(() => {});
          reject(err);
        });
      });
    } catch (error) {
      logger.error(`Failed to download repository: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get file content from a GitHub repository
   */
  public async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<string> {
    try {
      logger.debug(`Fetching file content from ${owner}/${repo}/${path}${ref ? ` at ${ref}` : ''}`);
      
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref
      });
      
      if ('content' in response.data && response.data.content) {
        // Decode base64 content
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return content;
      } else {
        throw new Error('No content returned from GitHub API');
      }
    } catch (error) {
      logger.error(`Failed to get file content: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Save content to a file in a GitHub repository
   */
  public async saveContentToRepo(owner: string, repo: string, path: string, content: string, message: string): Promise<void> {
    if (!this.authenticated) {
      throw new Error('GitHub token required to save content to repository');
    }
    
    try {
      logger.info(`Saving content to ${owner}/${repo}/${path}`);
      
      // Check if file exists to get its SHA (needed for updates)
      let sha: string | undefined;
      try {
        const fileResponse = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path
        });
        
        if ('sha' in fileResponse.data) {
          sha = fileResponse.data.sha;
          logger.debug(`Updating existing file with SHA: ${sha}`);
        }
      } catch (error) {
        // File doesn't exist, will create new
        logger.debug('File does not exist, will create new file');
      }
      
      // Create or update file
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha
      });
      
      logger.success(`Content saved successfully to ${owner}/${repo}/${path}`);
    } catch (error) {
      logger.error(`Failed to save content to repo: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Create a new repository
   */
  public async createRepository(name: string, description?: string, isPrivate: boolean = false): Promise<{ owner: string, repo: string }> {
    if (!this.authenticated) {
      throw new Error('GitHub token required to create repository');
    }
    
    try {
      logger.info(`Creating new repository: ${name}`);
      
      const response = await this.octokit.rest.repos.createForAuthenticatedUser({
        name,
        description,
        private: isPrivate,
        auto_init: true // Initialize with a README
      });
      
      logger.success(`Repository created successfully: ${response.data.full_name}`);
      return {
        owner: response.data.owner.login,
        repo: response.data.name
      };
    } catch (error) {
      logger.error(`Failed to create repository: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Get repository details
   */
  public async getRepositoryDetails(owner: string, repo: string): Promise<any> {
    try {
      logger.debug(`Fetching repository details for ${owner}/${repo}`);
      
      const response = await this.octokit.rest.repos.get({
        owner,
        repo
      });
      
      return response.data;
    } catch (error) {
      logger.error(`Failed to get repository details: ${(error as Error).message}`);
      throw error;
    }
  }
}

// Export a default instance
export const github = GitHubClient.getInstance();
