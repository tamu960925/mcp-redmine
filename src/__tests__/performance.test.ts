import { RedmineMcpServer } from '../server.js';
import { RedmineClient } from '../redmine-client.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Performance and Load Tests (TDD)', () => {
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

  describe('Server Initialization Performance', () => {
    it('should initialize server within acceptable time', () => {
      const startTime = performance.now();
      
      const newServer = new RedmineMcpServer({
        baseUrl: 'https://test.redmine.org',
        apiKey: 'test-key'
      });
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      expect(newServer).toBeDefined();
      expect(initTime).toBeLessThan(100); // Should initialize in less than 100ms
    });

    it('should register all tools efficiently', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toHaveLength(8);
      
      // All tools should be registered instantly
      const registeredTools = (mcpServer as any)._registeredTools;
      expect(Object.keys(registeredTools)).toHaveLength(8);
    });
  });

  describe('Tool Execution Performance', () => {
    it('should execute list-issues tool within acceptable time', async () => {
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          project_id: 1,
          subject: `Issue ${i + 1}`
        })),
        total_count: 25,
        offset: 0,
        limit: 25
      });

      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      const startTime = performance.now();
      const result = await listIssuesTool.callback({});
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(executionTime).toBeLessThan(50); // Should execute in less than 50ms
    });

    it('should handle multiple concurrent tool executions', async () => {
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [{ id: 1, project_id: 1, subject: 'Test Issue' }],
        total_count: 1,
        offset: 0,
        limit: 25
      });

      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      const startTime = performance.now();
      
      // Execute 10 concurrent tool calls
      const promises = Array.from({ length: 10 }, () => 
        listIssuesTool.callback({})
      );
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(10);
      expect(results.every(r => r.content)).toBe(true);
      expect(totalTime).toBeLessThan(200); // Should handle 10 concurrent calls in less than 200ms
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory footprint', () => {
      const initialMemory = process.memoryUsage();
      
      // Create multiple server instances to test memory usage
      const servers = Array.from({ length: 10 }, () => 
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: 'test-key'
        })
      );
      
      const afterMemory = process.memoryUsage();
      
      // Memory increase should be reasonable (less than 50MB for 10 servers)
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB
      
      expect(servers).toHaveLength(10);
      servers.forEach(s => expect(s.getRegisteredTools()).toHaveLength(8));
    });

    it('should handle large response data efficiently', async () => {
      const mockClient = server['redmineClient'];
      
      // Mock a large response (1000 issues)
      const largeResponse = {
        issues: Array.from({ length: 1000 }, (_, i) => ({
          id: i + 1,
          project_id: 1,
          subject: `Large Issue ${i + 1}`,
          description: 'A'.repeat(1000) // 1KB description per issue
        })),
        total_count: 1000,
        offset: 0,
        limit: 1000
      };
      
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue(largeResponse);

      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      const startTime = performance.now();
      const initialMemory = process.memoryUsage();
      
      const result = await listIssuesTool.callback({});
      
      const endTime = performance.now();
      const afterMemory = process.memoryUsage();
      
      const executionTime = endTime - startTime;
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      
      expect(result).toBeDefined();
      expect(result.content[0].text).toContain('Large Issue');
      expect(executionTime).toBeLessThan(100); // Should handle large data in less than 100ms
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Should not increase memory by more than 10MB
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors efficiently without performance degradation', async () => {
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(new Error('Test Error'));

      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      const startTime = performance.now();
      
      // Execute multiple error scenarios
      const errorPromises = Array.from({ length: 5 }, () => 
        listIssuesTool.callback({}).catch(() => 'error')
      );
      
      const results = await Promise.all(errorPromises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r === 'error')).toBe(true);
      expect(totalTime).toBeLessThan(100); // Error handling should be fast
    });

    it('should not leak memory during error conditions', async () => {
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(new Error('Memory Test Error'));

      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      const initialMemory = process.memoryUsage();
      
      // Execute many error scenarios
      const errorPromises = Array.from({ length: 100 }, () => 
        listIssuesTool.callback({}).catch(() => null)
      );
      
      await Promise.all(errorPromises);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const afterMemory = process.memoryUsage();
      const memoryIncrease = afterMemory.heapUsed - initialMemory.heapUsed;
      
      // Should not significantly increase memory during error handling
      // Note: Error handling with logging can increase memory temporarily
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB max increase (includes security features)
    });
  });

  describe('Scalability Tests', () => {
    it('should handle multiple tools execution simultaneously', async () => {
      const mockClient = server['redmineClient'];
      
      // Mock all client methods
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [{ id: 1, project_id: 1, subject: 'Test' }],
        total_count: 1, offset: 0, limit: 25
      });
      jest.spyOn(mockClient, 'listProjects').mockResolvedValue({
        projects: [{ id: 1, name: 'Test Project', identifier: 'test' }],
        total_count: 1, offset: 0, limit: 25
      });
      jest.spyOn(mockClient, 'listUsers').mockResolvedValue({
        users: [{ id: 1, firstname: 'Test', lastname: 'User' }],
        total_count: 1, offset: 0, limit: 25
      });

      const registeredTools = (mcpServer as any)._registeredTools;
      
      const startTime = performance.now();
      
      // Execute different tools simultaneously
      const promises = [
        registeredTools['list-issues'].callback({}),
        registeredTools['list-projects'].callback({}),
        registeredTools['list-users'].callback({}),
        registeredTools['list-issues'].callback({ limit: 50 }),
        registeredTools['list-projects'].callback({})
      ];
      
      const results = await Promise.all(promises);
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.content)).toBe(true);
      expect(totalTime).toBeLessThan(150); // All tools should execute quickly
    });

    it('should maintain performance with rapid successive calls', async () => {
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [{ id: 1, project_id: 1, subject: 'Rapid Test' }],
        total_count: 1, offset: 0, limit: 25
      });

      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];

      const startTime = performance.now();
      
      // Execute 50 rapid successive calls
      for (let i = 0; i < 50; i++) {
        await listIssuesTool.callback({});
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // 50 calls should complete in reasonable time
      expect(totalTime).toBeLessThan(500); // 10ms per call average max
    });
  });
});