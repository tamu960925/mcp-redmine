import { logger } from './logger.js';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  globalMaxRequests: number;
  toolLimits: Record<string, number>;
}

export class RateLimiter {
  private requestCounts: Map<string, number> = new Map();
  private globalRequestCount: number = 0;
  private windowStart: number = Date.now();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  getRequestCount(tool: string): number {
    this.checkWindowReset();
    return this.requestCounts.get(tool) || 0;
  }

  setRequestCount(tool: string, count: number): void {
    this.requestCounts.set(tool, count);
  }

  setGlobalRequestCount(count: number): void {
    this.globalRequestCount = count;
  }

  getLimit(tool: string): number {
    return this.config.toolLimits[tool] || 60;
  }

  resetTimeWindow(): void {
    this.requestCounts.clear();
    this.globalRequestCount = 0;
    this.windowStart = Date.now();
  }

  async checkRateLimit(tool: string): Promise<void> {
    this.checkWindowReset();

    // Check global rate limit
    if (this.globalRequestCount >= this.config.globalMaxRequests) {
      throw new Error('Global rate limit exceeded');
    }

    // Check tool-specific rate limit
    const currentCount = this.getRequestCount(tool);
    const limit = this.getLimit(tool);

    if (currentCount >= limit) {
      throw new Error(`Rate limit exceeded for tool ${tool}`);
    }

    // Increment counters
    this.requestCounts.set(tool, currentCount + 1);
    this.globalRequestCount++;
  }

  private checkWindowReset(): void {
    const now = Date.now();
    if (now - this.windowStart >= this.config.windowMs) {
      this.resetTimeWindow();
    }
  }
}

export class SecurityValidator {
  private static readonly DANGEROUS_PATTERNS = [
    // SQL injection patterns
    /('|\\|"|\[|\]|%|--|#|\/\*|\*\/)/i,
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    
    // XSS patterns
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    
    // Command injection patterns
    /[;&|`$()]/,
    /\b(rm|del|format|eval|exec|system)\b/i,
    
    // Path traversal
    /\.\.[\/\\]/,
    /\/etc\/passwd|\/etc\/shadow|\/proc\/|C:\\Windows/i
  ];

  static validateApiKey(apiKey: string | undefined): void {
    if (apiKey === undefined) {
      throw new ValidationError('API key is required');
    }

    if (typeof apiKey !== 'string') {
      throw new ValidationError('API key must be a string');
    }

    const trimmedKey = apiKey.trim();
    if (trimmedKey.length === 0) {
      throw new ValidationError('API key cannot be empty');
    }

    if (trimmedKey.length < 8) {
      throw new ValidationError('API key must be at least 8 characters long');
    }
  }

  static sanitizeErrorMessage(error: Error): Error {
    let message = error.message;

    // Don't sanitize our own validation errors
    if (error instanceof ValidationError || 
        message.includes('Rate limit exceeded') ||
        message.includes('Global rate limit exceeded') ||
        message.includes('Invalid input detected') ||
        message.includes('Request payload too large') ||
        message.includes('Too many parameters') ||
        message.includes('Invalid parameter type')) {
      return error;
    }

    // Remove API keys - but be more selective
    message = message.replace(/\b[a-f0-9]{32,64}\b/gi, '[REDACTED]');
    message = message.replace(/test-key/g, '[REDACTED]');
    
    // Remove file paths
    message = message.replace(/\/[^\s'",]+/g, '[PATH_REDACTED]');
    message = message.replace(/C:\\[^\s'",]+/g, '[PATH_REDACTED]');
    
    // Remove database connection strings
    message = message.replace(/\b\w+:\/\/[^\s]+/g, '[CONNECTION_REDACTED]');
    
    // Generic error messages for production or specific patterns
    if (process.env.NODE_ENV === 'production' || message.includes('ENOENT') || message.includes('no such file')) {
      if (message.includes('ENOENT') || message.includes('no such file')) {
        message = 'Internal server error';
      }
    }
    
    if (message.includes('Connection failed') || message.includes('mysql:') || message.includes('postgresql:')) {
      message = 'Database connection error';
    }

    const sanitizedError = new Error(message);
    sanitizedError.name = error.name;
    return sanitizedError;
  }

  static validateInput(input: any): void {
    if (input === null || input === undefined) {
      return;
    }

    // Check payload size
    const jsonString = JSON.stringify(input);
    if (jsonString.length > 500000) { // 500KB limit
      throw new ValidationError('Request payload too large');
    }

    // Check parameter count
    if (typeof input === 'object' && Object.keys(input).length > 100) {
      throw new ValidationError('Too many parameters');
    }

    this.validateInputRecursive(input);
  }

  private static validateInputRecursive(value: any): void {
    if (typeof value === 'string') {
      for (const pattern of this.DANGEROUS_PATTERNS) {
        if (pattern.test(value)) {
          logger.warn('Dangerous input pattern detected');
          throw new ValidationError('Invalid input detected');
        }
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        this.validateInputRecursive(item);
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [key, val] of Object.entries(value)) {
        this.validateInputRecursive(key);
        this.validateInputRecursive(val);
      }
    }
  }

  static validateParameterTypes(params: any, expectedTypes: Record<string, string | string[]>): void {
    for (const [key, expectedType] of Object.entries(expectedTypes)) {
      if (params[key] !== undefined) {
        const actualType = typeof params[key];
        
        // Handle multiple allowed types
        if (Array.isArray(expectedType)) {
          if (!expectedType.includes(actualType)) {
            throw new ValidationError(`Invalid parameter type for ${key}: expected one of [${expectedType.join(', ')}], got ${actualType}`);
          }
        } else {
          if (actualType !== expectedType) {
            throw new ValidationError(`Invalid parameter type for ${key}: expected ${expectedType}, got ${actualType}`);
          }
        }
      }
    }
  }
}