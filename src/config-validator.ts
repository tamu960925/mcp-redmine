import { z } from 'zod';

/**
 * Configuration schema validation using Zod
 */

// Rate limiting configuration schema
export const RateLimitConfigSchema = z.object({
  maxRequests: z.number().min(1).max(10000).default(1000),
  windowMs: z.number().min(1000).max(3600000).default(60000) // 1 second to 1 hour
});

// Main configuration schema
export const ConfigSchema = z.object({
  baseUrl: z.string()
    .url('Base URL must be a valid URL')
    .refine(url => url.startsWith('https://'), {
      message: 'Base URL must use HTTPS for security'
    }),
  apiKey: z.string()
    .min(8, 'API key must be at least 8 characters long')
    .max(128, 'API key must not exceed 128 characters'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  timeout: z.number()
    .min(1000, 'Timeout must be at least 1000ms')
    .max(300000, 'Timeout must not exceed 300000ms (5 minutes)')
    .optional(),
  rateLimit: RateLimitConfigSchema.optional()
});

// Environment variables schema
export const EnvironmentSchema = z.object({
  REDMINE_BASE_URL: z.string().url(),
  REDMINE_API_KEY: z.string().min(8),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  TIMEOUT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().min(1000).max(300000)).optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

export type RedmineConfig = z.infer<typeof ConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;

export class ConfigValidator {
  /**
   * Validate a configuration object
   */
  static validate(config: unknown): z.SafeParseReturnType<unknown, RedmineConfig> {
    return ConfigSchema.safeParse(config);
  }

  /**
   * Validate environment variables and convert to config
   */
  static validateEnvironment(): z.SafeParseReturnType<unknown, RedmineConfig> {
    const envResult = EnvironmentSchema.safeParse(process.env);
    
    if (!envResult.success) {
      return envResult;
    }

    const env = envResult.data;
    
    // Convert environment variables to config format
    const config = {
      baseUrl: env.REDMINE_BASE_URL,
      apiKey: env.REDMINE_API_KEY,
      logLevel: env.LOG_LEVEL,
      timeout: env.TIMEOUT
    };

    return ConfigSchema.safeParse(config);
  }

  /**
   * Get JSON schema for configuration (for external validation tools)
   */
  static getJsonSchema(): Record<string, any> {
    return {
      type: 'object',
      properties: {
        baseUrl: {
          type: 'string',
          format: 'uri',
          pattern: '^https://',
          description: 'Base URL of the Redmine instance (must use HTTPS)'
        },
        apiKey: {
          type: 'string',
          minLength: 8,
          maxLength: 128,
          description: 'Redmine API key for authentication'
        },
        logLevel: {
          type: 'string',
          enum: ['debug', 'info', 'warn', 'error'],
          default: 'info',
          description: 'Logging level for the application'
        },
        timeout: {
          type: 'number',
          minimum: 1000,
          maximum: 300000,
          description: 'Request timeout in milliseconds (1s - 5m)'
        },
        rateLimit: {
          type: 'object',
          properties: {
            maxRequests: {
              type: 'number',
              minimum: 1,
              maximum: 10000,
              default: 1000
            },
            windowMs: {
              type: 'number',
              minimum: 1000,
              maximum: 3600000,
              default: 60000
            }
          }
        }
      },
      required: ['baseUrl', 'apiKey'],
      additionalProperties: false
    };
  }

  /**
   * Generate a configuration template
   */
  static generateTemplate(): string {
    return `{
  "baseUrl": "https://your-redmine-instance.com",
  "apiKey": "your-api-key-here",
  "logLevel": "info",
  "timeout": 30000,
  "rateLimit": {
    "maxRequests": 1000,
    "windowMs": 60000
  }
}`;
  }

  /**
   * Format validation errors into human-readable messages
   */
  static formatErrors(error: z.ZodError): string {
    const messages = error.issues.map(issue => {
      const path = issue.path.join('.');
      return `${path}: ${issue.message}`;
    });

    return `Configuration validation failed:\n${messages.join('\n')}`;
  }

  /**
   * Get suggestions for common configuration errors
   */
  static getSuggestions(error: z.ZodError): string[] {
    const suggestions: string[] = [];

    for (const issue of error.issues) {
      const path = issue.path.join('.');
      
      if (path === 'baseUrl') {
        if (issue.message.includes('https')) {
          suggestions.push('Ensure your base URL starts with "https://" for security');
        } else if (issue.message.includes('URL')) {
          suggestions.push('Check that your base URL is properly formatted (e.g., https://example.redmine.com)');
        }
      }
      
      if (path === 'apiKey') {
        if (issue.message.includes('8 characters')) {
          suggestions.push('API key should be at least 8 characters long. Check your Redmine user settings.');
        }
      }
      
      if (path === 'logLevel') {
        suggestions.push('Log level must be one of: debug, info, warn, error');
      }
      
      if (path === 'timeout') {
        suggestions.push('Timeout should be between 1000ms (1 second) and 300000ms (5 minutes)');
      }
    }

    // Add general suggestions if no specific ones were found
    if (suggestions.length === 0) {
      suggestions.push('Check that all required fields are provided and properly formatted');
      suggestions.push('Refer to the documentation for configuration examples');
    }

    return suggestions;
  }

  /**
   * Validate and throw on error (convenience method)
   */
  static validateOrThrow(config: unknown): RedmineConfig {
    const result = this.validate(config);
    
    if (!result.success) {
      const errorMessage = this.formatErrors(result.error);
      const suggestions = this.getSuggestions(result.error);
      
      throw new Error(`${errorMessage}\n\nSuggestions:\n${suggestions.map(s => `- ${s}`).join('\n')}`);
    }
    
    return result.data;
  }

  /**
   * Validate environment and throw on error (convenience method)
   */
  static validateEnvironmentOrThrow(): RedmineConfig {
    const result = this.validateEnvironment();
    
    if (!result.success) {
      const errorMessage = this.formatErrors(result.error);
      const suggestions = this.getSuggestions(result.error);
      
      throw new Error(`Environment validation failed:\n${errorMessage}\n\nSuggestions:\n${suggestions.map(s => `- ${s}`).join('\n')}`);
    }
    
    return result.data;
  }
}