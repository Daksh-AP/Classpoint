import * as Sentry from '@sentry/react';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private log(level: LogLevel, message: string, context?: any) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'info':
    // eslint-disable-next-line no-console
        console.log(formattedMessage, context || '');
        break;
      case 'warn':
    // eslint-disable-next-line no-console
        console.warn(formattedMessage, context || '');
        break;
      case 'error':
    // eslint-disable-next-line no-console
        console.error(formattedMessage, context || '');
        break;
      case 'debug':
    // eslint-disable-next-line no-console
        console.debug(formattedMessage, context || '');
        break;
    }

    if (level === 'error') {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setExtra('context', context);
        }
        Sentry.captureMessage(message, 'error');
      });
    }
  }

  info(message: string, context?: any) {
    this.log('info', message, context);
  }

  warn(message: string, context?: any) {
    this.log('warn', message, context);
  }

  error(message: string, error?: any, context?: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.log('error', `${message} - ${errorMsg}`, { error, ...context });
    
    if (error instanceof Error) {
        Sentry.captureException(error, { extra: context });
    }
  }

  debug(message: string, context?: any) {
    if (import.meta.env.DEV) {
      this.log('debug', message, context);
    }
  }
}

export const logger = new Logger();
