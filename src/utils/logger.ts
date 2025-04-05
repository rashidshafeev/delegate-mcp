import chalk from 'chalk';
import { config } from './config.js';

// Log levels enum
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Map string log levels from config to enum values
const logLevelMap: Record<string, LogLevel> = {
  'debug': LogLevel.DEBUG,
  'info': LogLevel.INFO,
  'warn': LogLevel.WARN,
  'error': LogLevel.ERROR,
};

export class Logger {
  private static instance: Logger;
  private currentLevel: LogLevel;

  private constructor() {
    const configLevel = config.get('logLevel');
    this.currentLevel = logLevelMap[configLevel];
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // Set log level
  public setLevel(level: LogLevel | string): void {
    if (typeof level === 'string') {
      this.currentLevel = logLevelMap[level.toLowerCase()] ?? LogLevel.INFO;
    } else {
      this.currentLevel = level;
    }
  }

  // Format a message with timestamp
  private formatMessage(message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${message}`;
  }

  // Log only if the current level allows it
  private logIfEnabled(level: LogLevel, message: string, ...args: any[]): void {
    if (level >= this.currentLevel) {
      const formattedMsg = this.formatMessage(message);
      console.log(formattedMsg, ...args);
    }
  }

  // Debug level log (verbose information, development use)
  public debug(message: string, ...args: any[]): void {
    this.logIfEnabled(LogLevel.DEBUG, chalk.gray(`DEBUG: ${message}`), ...args);
  }

  // Info level log (standard information)
  public info(message: string, ...args: any[]): void {
    this.logIfEnabled(LogLevel.INFO, chalk.blue(`INFO: ${message}`), ...args);
  }

  // Warning level log (potential issues)
  public warn(message: string, ...args: any[]): void {
    this.logIfEnabled(LogLevel.WARN, chalk.yellow(`WARN: ${message}`), ...args);
  }

  // Error level log (critical issues)
  public error(message: string, ...args: any[]): void {
    this.logIfEnabled(LogLevel.ERROR, chalk.red(`ERROR: ${message}`), ...args);
  }

  // Success log (always visible) for highlighting successes
  public success(message: string, ...args: any[]): void {
    console.log(this.formatMessage(chalk.green(`SUCCESS: ${message}`)), ...args);
  }

  // Section log for structuring log output
  public section(title: string): void {
    if (this.currentLevel <= LogLevel.INFO) {
      console.log('\n' + chalk.bold(chalk.white(this.formatMessage(`=== ${title} ===`))));
    }
  }
}

// Export a default instance
export const logger = Logger.getInstance();
