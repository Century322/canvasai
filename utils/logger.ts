type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

const LOG_STORAGE_KEY = 'app_logs';
const MAX_LOG_ENTRIES = 500;

class Logger {
  private logs: LogEntry[] = [];
  private initialized = false;

  constructor() {
    this.loadLogs();
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
    this.initialized = true;
  }

  private saveLogs(): void {
    try {
      if (this.logs.length > MAX_LOG_ENTRIES) {
        this.logs = this.logs.slice(-MAX_LOG_ENTRIES);
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    } catch {
      // Storage full, clear old logs
      this.logs = this.logs.slice(-100);
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(this.logs));
    }
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      message,
      data,
    };

    this.logs.push(entry);
    this.saveLogs();

    const consoleMethod = level === 'debug' ? 'log' : level;
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    
    switch (consoleMethod) {
      case 'log':
        console.log(prefix, message, data ?? '');
        break;
      case 'info':
        console.info(prefix, message, data ?? '');
        break;
      case 'warn':
        console.warn(prefix, message, data ?? '');
        break;
      case 'error':
        console.error(prefix, message, data ?? '');
        break;
    }
  }

  debug(message: string, data?: unknown): void {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      this.log('debug', message, data);
    }
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(LOG_STORAGE_KEY);
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

export const logger = new Logger();
