import { logger } from './logger';

interface ErrorInfo {
  message: string;
  stack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  type: 'uncaught' | 'unhandled' | 'react';
  componentStack?: string;
}

const ERROR_STORAGE_KEY = 'app_errors';
const MAX_ERROR_ENTRIES = 50;

class ErrorMonitor {
  private errors: ErrorInfo[] = [];

  constructor() {
    this.loadErrors();
    this.setupGlobalHandlers();
  }

  private loadErrors(): void {
    try {
      const stored = localStorage.getItem(ERROR_STORAGE_KEY);
      if (stored) {
        this.errors = JSON.parse(stored);
      }
    } catch {
      this.errors = [];
    }
  }

  private saveErrors(): void {
    try {
      if (this.errors.length > MAX_ERROR_ENTRIES) {
        this.errors = this.errors.slice(-MAX_ERROR_ENTRIES);
      }
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errors));
    } catch {
      this.errors = this.errors.slice(-20);
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(this.errors));
    }
  }

  private createErrorInfo(error: Error, type: ErrorInfo['type'], componentStack?: string): ErrorInfo {
    return {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      type,
      componentStack,
    };
  }

  private setupGlobalHandlers(): void {
    window.onerror = (message, source, lineno, colno, error) => {
      const errorInfo: ErrorInfo = {
        message: String(message),
        stack: error?.stack || `${source}:${lineno}:${colno}`,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        type: 'uncaught',
      };
      
      this.errors.push(errorInfo);
      this.saveErrors();
      logger.error('Uncaught error', errorInfo);
      
      return false;
    };

    window.onunhandledrejection = (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      const errorInfo = this.createErrorInfo(error, 'unhandled');
      this.errors.push(errorInfo);
      this.saveErrors();
      logger.error('Unhandled promise rejection', errorInfo);
    };
  }

  captureReactError(error: Error, componentStack: string): void {
    const errorInfo = this.createErrorInfo(error, 'react', componentStack);
    this.errors.push(errorInfo);
    this.saveErrors();
    logger.error('React error', errorInfo);
  }

  getErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
    localStorage.removeItem(ERROR_STORAGE_KEY);
  }

  exportErrors(): string {
    return JSON.stringify(this.errors, null, 2);
  }

  getErrorCount(): number {
    return this.errors.length;
  }
}

export const errorMonitor = new ErrorMonitor();
