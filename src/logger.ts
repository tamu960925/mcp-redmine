export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class Logger {
  private level: LogLevel;
  private context: string;

  constructor(context: string = 'RedmineMCP', level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  error(message: string, error?: Error): void {
    if (this.level >= LogLevel.ERROR) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] ERROR [${this.context}] ${message}`);
      if (error) {
        console.error(error.stack || error.message);
      }
    }
  }

  warn(message: string): void {
    if (this.level >= LogLevel.WARN) {
      const timestamp = new Date().toISOString();
      console.warn(`[${timestamp}] WARN [${this.context}] ${message}`);
    }
  }

  info(message: string): void {
    if (this.level >= LogLevel.INFO) {
      const timestamp = new Date().toISOString();
      console.info(`[${timestamp}] INFO [${this.context}] ${message}`);
    }
  }

  debug(message: string, data?: any): void {
    if (this.level >= LogLevel.DEBUG) {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] DEBUG [${this.context}] ${message}`);
      if (data !== undefined) {
        console.debug(JSON.stringify(data, null, 2));
      }
    }
  }

  child(context: string): Logger {
    return new Logger(`${this.context}:${context}`, this.level);
  }
}

export const logger = new Logger();