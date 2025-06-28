import { RedmineMcpServer } from '../server.js';
import { ConfigValidator, ConfigSchema } from '../config-validator.js';

describe('Configuration Schema Validation Tests (TDD Implementation)', () => {
  
  describe('ConfigValidator Class (Red Phase - Should Fail Initially)', () => {
    it('should exist and be importable', () => {
      expect(ConfigValidator).toBeDefined();
      expect(typeof ConfigValidator).toBe('function');
    });

    it('should have validate method', () => {
      expect(ConfigValidator.validate).toBeDefined();
      expect(typeof ConfigValidator.validate).toBe('function');
    });

    it('should have validateEnvironment method', () => {
      expect(ConfigValidator.validateEnvironment).toBeDefined();
      expect(typeof ConfigValidator.validateEnvironment).toBe('function');
    });
  });

  describe('Configuration Schema (Red Phase - Should Fail Initially)', () => {
    it('should have defined configuration schema', () => {
      expect(ConfigSchema).toBeDefined();
      expect(typeof ConfigSchema).toBe('object');
    });

    it('should validate valid configuration', () => {
      const validConfig = {
        baseUrl: 'https://redmine.example.com',
        apiKey: 'valid-api-key-12345678'
      };

      const result = ConfigValidator.validate(validConfig);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseUrl).toBe(validConfig.baseUrl);
        expect(result.data.apiKey).toBe(validConfig.apiKey);
        expect(result.data.logLevel).toBe('info'); // Default value is applied
      }
    });

    it('should reject invalid baseUrl', () => {
      const invalidConfig = {
        baseUrl: 'invalid-url',
        apiKey: 'valid-api-key-12345678'
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('baseUrl');
      }
    });

    it('should reject short API key', () => {
      const invalidConfig = {
        baseUrl: 'https://redmine.example.com',
        apiKey: 'short'
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('apiKey');
      }
    });

    it('should reject missing required fields', () => {
      const invalidConfig = {
        baseUrl: 'https://redmine.example.com'
        // Missing apiKey
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Environment Variable Validation (Red Phase - Should Fail Initially)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should validate environment variables successfully', () => {
      process.env.REDMINE_BASE_URL = 'https://redmine.example.com';
      process.env.REDMINE_API_KEY = 'valid-api-key-12345678';
      process.env.LOG_LEVEL = 'info';

      const result = ConfigValidator.validateEnvironment();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.baseUrl).toBe('https://redmine.example.com');
        expect(result.data.apiKey).toBe('valid-api-key-12345678');
      }
    });

    it('should use default log level when not specified', () => {
      process.env.REDMINE_BASE_URL = 'https://redmine.example.com';
      process.env.REDMINE_API_KEY = 'valid-api-key-12345678';
      delete process.env.LOG_LEVEL;

      const result = ConfigValidator.validateEnvironment();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.logLevel).toBe('info');
      }
    });

    it('should reject invalid log level', () => {
      process.env.REDMINE_BASE_URL = 'https://redmine.example.com';
      process.env.REDMINE_API_KEY = 'valid-api-key-12345678';
      process.env.LOG_LEVEL = 'invalid';

      const result = ConfigValidator.validateEnvironment();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject missing required environment variables', () => {
      delete process.env.REDMINE_BASE_URL;
      delete process.env.REDMINE_API_KEY;

      const result = ConfigValidator.validateEnvironment();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Advanced Configuration Options (Red Phase - Should Fail Initially)', () => {
    it('should validate optional timeout configuration', () => {
      const configWithTimeout = {
        baseUrl: 'https://redmine.example.com',
        apiKey: 'valid-api-key-12345678',
        timeout: 30000
      };

      const result = ConfigValidator.validate(configWithTimeout);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timeout).toBe(30000);
      }
    });

    it('should reject negative timeout', () => {
      const invalidConfig = {
        baseUrl: 'https://redmine.example.com',
        apiKey: 'valid-api-key-12345678',
        timeout: -1000
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate rate limiting configuration', () => {
      const configWithRateLimit = {
        baseUrl: 'https://redmine.example.com',
        apiKey: 'valid-api-key-12345678',
        rateLimit: {
          maxRequests: 100,
          windowMs: 60000
        }
      };

      const result = ConfigValidator.validate(configWithRateLimit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.rateLimit).toEqual({
          maxRequests: 100,
          windowMs: 60000
        });
      }
    });

    it('should validate log level enum', () => {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      
      for (const level of validLevels) {
        const config = {
          baseUrl: 'https://redmine.example.com',
          apiKey: 'valid-api-key-12345678',
          logLevel: level
        };

        const result = ConfigValidator.validate(config);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Server Integration with Config Validation (Red Phase - Should Fail Initially)', () => {
    it('should use ConfigValidator in server constructor', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'invalid-url',
          apiKey: 'short'
        });
      }).toThrow();
    });

    it('should accept valid configuration in server constructor', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://redmine.example.com',
          apiKey: 'valid-api-key-12345678'
        });
      }).not.toThrow();
    });

    it('should provide detailed validation error messages', () => {
      try {
        new RedmineMcpServer({
          baseUrl: 'invalid-url',
          apiKey: 'short'
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Configuration validation failed');
      }
    });
  });

  describe('Configuration File Support (Red Phase - Should Fail Initially)', () => {
    it('should support loading configuration from file', () => {
      const configFromFile = {
        baseUrl: 'https://file.redmine.com',
        apiKey: 'file-api-key-87654321',
        logLevel: 'debug',
        timeout: 15000
      };

      const result = ConfigValidator.validate(configFromFile);
      expect(result.success).toBe(true);
      expect(result.data).toEqual(configFromFile);
    });

    it('should support JSON schema validation for config files', () => {
      expect(ConfigValidator.getJsonSchema).toBeDefined();
      expect(typeof ConfigValidator.getJsonSchema).toBe('function');
      
      const jsonSchema = ConfigValidator.getJsonSchema();
      expect(jsonSchema).toBeDefined();
      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema.properties).toBeDefined();
    });

    it('should provide config template generation', () => {
      expect(ConfigValidator.generateTemplate).toBeDefined();
      expect(typeof ConfigValidator.generateTemplate).toBe('function');
      
      const template = ConfigValidator.generateTemplate();
      expect(template).toBeDefined();
      expect(typeof template).toBe('string');
      expect(template).toContain('baseUrl');
      expect(template).toContain('apiKey');
    });
  });

  describe('Error Messages and Formatting (Red Phase - Should Fail Initially)', () => {
    it('should provide human-readable error messages', () => {
      const invalidConfig = {
        baseUrl: 'not-a-url',
        apiKey: 'too-short'
      };

      const result = ConfigValidator.validate(invalidConfig);
      expect(result.success).toBe(false);
      
      const errorMessage = result.error ? ConfigValidator.formatErrors(result.error) : '';
      expect(errorMessage).toBeDefined();
      expect(typeof errorMessage).toBe('string');
      expect(errorMessage.length).toBeGreaterThan(0);
      expect(errorMessage).toContain('baseUrl');
    });

    it('should provide suggestions for common errors', () => {
      const invalidConfig = {
        baseUrl: 'http://redmine.com', // Missing https
        apiKey: 'valid-api-key-12345678'
      };

      const result = ConfigValidator.validate(invalidConfig);
      if (!result.success && result.error) {
        const suggestions = ConfigValidator.getSuggestions(result.error);
        expect(suggestions).toBeDefined();
        expect(Array.isArray(suggestions)).toBe(true);
        expect(suggestions.length).toBeGreaterThan(0);
      }
    });
  });
});