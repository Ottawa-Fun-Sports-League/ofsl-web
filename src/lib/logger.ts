/**
 * Logger utility for consistent error handling and logging
 * In production, this could be replaced with a service like Sentry
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private formatMessage(entry: LogEntry): string {
    const { level, message, timestamp, context, error } = entry;
    let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += ` | Context: ${JSON.stringify(context)}`;
    }
    
    if (error instanceof Error) {
      formatted += ` | Error: ${error.message}`;
      if (error.stack && this.isDevelopment) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: unknown) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // In development, log to console
    if (this.isDevelopment) {
      const formattedMessage = this.formatMessage(entry);
      
      switch (level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(formattedMessage);
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }

    // In production, this could send to a logging service
    // Example: sendToLoggingService(entry);
  }

  debug(message: string, context?: Record<string, unknown>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>) {
    this.log('error', message, context, error);
  }
}

// Export singleton instance
export const logger = new Logger();