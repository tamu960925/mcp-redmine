import { RedmineMcpServer } from '../server.js';
import { RedmineClient } from '../redmine-client.js';
import { ValidationError } from '../validation.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Security Features Tests (TDD)', () => {
  let server: RedmineMcpServer;
  let mcpServer: any;

  beforeEach(() => {
    const mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        response: {
          use: jest.fn()
        }
      }
    };
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
    
    server = new RedmineMcpServer({
      baseUrl: 'https://test.redmine.org',
      apiKey: 'test-key'
    });
    mcpServer = server.getMcpServer();
    jest.clearAllMocks();
  });

  describe('API Key Protection (Red Phase)', () => {
    it('should reject empty API key during initialization', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: ''
        });
      }).toThrow('API key cannot be empty');
    });

    it('should reject undefined API key during initialization', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: undefined as any
        });
      }).toThrow('API key is required');
    });

    it('should reject API key with only whitespace', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: '   '
        });
      }).toThrow('API key cannot be empty');
    });

    it('should reject API key shorter than minimum length', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: 'abc'
        });
      }).toThrow('API key must be at least 8 characters long');
    });

    it('should sanitize API key in error messages', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      const mockClient = server['redmineClient'];
      const unauthorizedError = new Error('Unauthorized: Invalid API key test-key');
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(unauthorizedError);

      try {
        await listIssuesTool.callback({});
      } catch (error) {
        expect((error as Error).message).not.toContain('test-key');
        expect((error as Error).message).toContain('[REDACTED]');
      }
    });
  });

  describe('Rate Limiting (Red Phase)', () => {
    it('should track request count per tool', async () => {
      const rateLimiter = server.getRateLimiter();
      expect(rateLimiter.getRequestCount('list-issues')).toBe(0);
      
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [],
        total_count: 0,
        offset: 0,
        limit: 25
      });

      await listIssuesTool.callback({});
      expect(rateLimiter.getRequestCount('list-issues')).toBe(1);
    });

    it('should reject requests when rate limit exceeded', async () => {
      const rateLimiter = server.getRateLimiter();
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [],
        total_count: 0,
        offset: 0,
        limit: 25
      });

      // Simulate rate limit exceeded
      rateLimiter.setRequestCount('list-issues', 100);

      await expect(listIssuesTool.callback({})).rejects.toThrow('Rate limit exceeded for tool list-issues');
    });

    it('should reset rate limit after time window', async () => {
      const rateLimiter = server.getRateLimiter();
      rateLimiter.setRequestCount('list-issues', 100);
      
      expect(rateLimiter.getRequestCount('list-issues')).toBe(100);
      
      // Simulate time window reset
      rateLimiter.resetTimeWindow();
      
      expect(rateLimiter.getRequestCount('list-issues')).toBe(0);
    });

    it('should have configurable rate limits per tool', () => {
      const rateLimiter = server.getRateLimiter();
      
      expect(rateLimiter.getLimit('list-issues')).toBe(60); // 60 requests per minute
      expect(rateLimiter.getLimit('create-issue')).toBe(30); // 30 requests per minute
      expect(rateLimiter.getLimit('update-issue')).toBe(30); // 30 requests per minute
    });

    it('should apply global rate limit across all tools', async () => {
      const rateLimiter = server.getRateLimiter();
      
      // Simulate global limit exceeded
      rateLimiter.setGlobalRequestCount(1000);
      
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      await expect(listIssuesTool.callback({})).rejects.toThrow('Global rate limit exceeded');
    });
  });

  describe('Input Sanitization (Red Phase)', () => {
    it('should sanitize SQL injection attempts in tool parameters', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const getIssueTool = registeredTools['get-issue'];
      
      const maliciousInput = { id: "1; DROP TABLE issues; --" };

      await expect(getIssueTool.callback(maliciousInput)).rejects.toThrow('Invalid input detected');
    });

    it('should sanitize XSS attempts in tool parameters', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const createIssueTool = registeredTools['create-issue'];
      
      const maliciousInput = {
        project_id: 1,
        subject: '<script>alert("xss")</script>'
      };

      await expect(createIssueTool.callback(maliciousInput)).rejects.toThrow('Invalid input detected');
    });

    it('should sanitize command injection attempts', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const createIssueTool = registeredTools['create-issue'];
      
      const maliciousInput = {
        project_id: 1,
        subject: 'Test; rm -rf /'
      };

      await expect(createIssueTool.callback(maliciousInput)).rejects.toThrow('Invalid input detected');
    });

    it('should allow safe input to pass through', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const createIssueTool = registeredTools['create-issue'];
      
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'createIssue').mockResolvedValue({
        id: 123,
        project_id: 1,
        subject: 'Safe Input'
      });

      const safeInput = {
        project_id: 1,
        subject: 'This is a safe input with normal characters'
      };

      const result = await createIssueTool.callback(safeInput);
      expect(result).toBeDefined();
    });
  });

  describe('Error Message Security (Red Phase)', () => {
    it('should not expose internal paths in error messages', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      const mockClient = server['redmineClient'];
      const internalError = new Error('ENOENT: no such file or directory, open \'/etc/passwd\'');
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(internalError);

      try {
        await listIssuesTool.callback({});
      } catch (error) {
        expect((error as Error).message).not.toContain('/etc/passwd');
        expect((error as Error).message).toContain('Internal server error');
      }
    });

    it('should not expose database connection strings in error messages', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      const mockClient = server['redmineClient'];
      const dbError = new Error('Connection failed: mysql://user:password@localhost:3306/redmine');
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(dbError);

      try {
        await listIssuesTool.callback({});
      } catch (error) {
        expect((error as Error).message).not.toContain('password');
        expect((error as Error).message).not.toContain('mysql://');
        expect((error as Error).message).toContain('Database connection error');
      }
    });

    it('should not expose stack traces in production mode', async () => {
      // Set production mode
      process.env.NODE_ENV = 'production';
      
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      const mockClient = server['redmineClient'];
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at /path/to/secret/file.js:123:45';
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(error);

      try {
        await listIssuesTool.callback({});
      } catch (caughtError) {
        expect((caughtError as Error).message).not.toContain('/path/to/secret/file.js');
        expect((caughtError as Error).message).not.toContain('123:45');
      }
      
      // Reset environment
      delete process.env.NODE_ENV;
    });
  });

  describe('Request Validation Security (Red Phase)', () => {
    it('should reject requests with excessive payload size', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const createIssueTool = registeredTools['create-issue'];
      
      const largePayload = {
        project_id: 1,
        subject: 'A'.repeat(10000), // 10KB subject
        description: 'B'.repeat(1000000) // 1MB description
      };

      await expect(createIssueTool.callback(largePayload)).rejects.toThrow('Request payload too large');
    });

    it('should reject requests with too many parameters', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const updateIssueTool = registeredTools['update-issue'];
      
      const manyParams: any = { id: 1 };
      for (let i = 0; i < 1000; i++) {
        manyParams[`param_${i}`] = `value_${i}`;
      }

      await expect(updateIssueTool.callback(manyParams)).rejects.toThrow('Too many parameters');
    });

    it('should validate parameter types strictly', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const getIssueTool = registeredTools['get-issue'];
      
      const invalidParams = {
        id: { malicious: 'object' } // Should be number
      };

      await expect(getIssueTool.callback(invalidParams)).rejects.toThrow('Invalid parameter type');
    });
  });
});