import { envConfig } from '@configs';

enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

class Logger {
  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (envConfig.nodeEnv === 'test') return false;
    return true;
  }

  public log(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage(LogLevel.INFO, message, meta));
    }
  }

  public info(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, meta));
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, meta));
    }
  }

  public error(message: string, error?: Error | any, meta?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorDetails = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : error;

      console.error(
        this.formatMessage(LogLevel.ERROR, message, { ...errorDetails, ...meta })
      );
    }
  }

  public debug(message: string, meta?: any): void {
    if (envConfig.isDevelopment && this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, meta));
    }
  }
}

export const logger = new Logger();
