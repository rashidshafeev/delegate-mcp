import { Octokit } from 'octokit';
import { config } from './config.js';
import { logger } from './logger.js';

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
      throw new Error('GitHub