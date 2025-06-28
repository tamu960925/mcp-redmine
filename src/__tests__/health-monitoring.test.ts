import { RedmineMcpServer } from '../server.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Health Check and Monitoring Tests (TDD Implementation)', () => {
  let server: RedmineMcpServer;

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
      apiKey: 'test-key-12345678'
    });
    jest.clearAllMocks();
  });

  describe('Health Check Tool (Red Phase - Should Fail Initially)', () => {
    it('should register health-check tool', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toContain('health-check');
    });

    it('should have proper health-check tool metadata', () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      expect(healthTool).toBeDefined();
      expect(healthTool.title).toBe('System Health Check');
      expect(healthTool.description).toBe('Check the health status of the Redmine MCP server');
    });

    it('should execute health-check tool without errors', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      expect(healthTool).toBeDefined();
      expect(healthTool.callback).toBeInstanceOf(Function);

      // Mock successful Redmine response for healthy status
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listProjects').mockResolvedValue({
        projects: [{ id: 1, name: 'Test Project', identifier: 'test-project' }],
        total_count: 1,
        offset: 0,
        limit: 25
      });

      const result = await healthTool.callback({});
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const healthData = JSON.parse(result.content[0].text);
      expect(healthData.status).toBe('healthy');
      expect(healthData.timestamp).toBeDefined();
      expect(healthData.uptime).toBeDefined();
      expect(healthData.version).toBe('1.0.0');
    });

    it('should return detailed health status', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      // Mock successful Redmine response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listProjects').mockResolvedValue({
        projects: [{ id: 1, name: 'Test Project', identifier: 'test-project' }],
        total_count: 1,
        offset: 0,
        limit: 25
      });
      
      const result = await healthTool.callback({});
      const healthData = JSON.parse(result.content[0].text);
      
      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('timestamp');
      expect(healthData).toHaveProperty('uptime');
      expect(healthData).toHaveProperty('version');
      expect(healthData).toHaveProperty('memory');
      expect(healthData).toHaveProperty('redmine');
      expect(healthData).toHaveProperty('tools');
      expect(healthData.tools.registered).toBe(10); // 8 original + 2 monitoring tools
    });

    it('should check Redmine API connectivity', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      // Mock successful Redmine response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listProjects').mockResolvedValue({
        projects: [{ id: 1, name: 'Test Project', identifier: 'test-project' }],
        total_count: 1,
        offset: 0,
        limit: 25
      });

      const result = await healthTool.callback({});
      const healthData = JSON.parse(result.content[0].text);
      
      expect(healthData.redmine.status).toBe('connected');
      expect(healthData.redmine.response_time).toBeDefined();
    });

    it('should handle Redmine API connectivity failures', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      // Mock failed Redmine response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listProjects').mockRejectedValue(new Error('Connection failed'));

      const result = await healthTool.callback({});
      const healthData = JSON.parse(result.content[0].text);
      
      expect(healthData.redmine.status).toBe('error');
      expect(healthData.redmine.error).toBe('Connection failed');
    });
  });

  describe('System Metrics Tool (Red Phase - Should Fail Initially)', () => {
    it('should register system-metrics tool', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toContain('system-metrics');
    });

    it('should have proper system-metrics tool metadata', () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const metricsTool = registeredTools['system-metrics'];
      
      expect(metricsTool).toBeDefined();
      expect(metricsTool.title).toBe('System Metrics');
      expect(metricsTool.description).toBe('Get detailed system performance metrics');
    });

    it('should execute system-metrics tool without errors', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const metricsTool = registeredTools['system-metrics'];
      
      expect(metricsTool).toBeDefined();
      expect(metricsTool.callback).toBeInstanceOf(Function);

      const result = await metricsTool.callback({});
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      
      const metricsData = JSON.parse(result.content[0].text);
      expect(metricsData.memory).toBeDefined();
      expect(metricsData.cpu).toBeDefined();
      expect(metricsData.uptime).toBeDefined();
      expect(metricsData.requests).toBeDefined();
    });

    it('should return memory usage metrics', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const metricsTool = registeredTools['system-metrics'];
      
      const result = await metricsTool.callback({});
      const metricsData = JSON.parse(result.content[0].text);
      
      expect(metricsData.memory).toHaveProperty('used');
      expect(metricsData.memory).toHaveProperty('total');
      expect(metricsData.memory).toHaveProperty('free');
      expect(metricsData.memory).toHaveProperty('percentage');
      expect(typeof metricsData.memory.used).toBe('number');
      expect(typeof metricsData.memory.percentage).toBe('number');
      expect(metricsData.memory.percentage).toBeGreaterThanOrEqual(0);
      expect(metricsData.memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should return request statistics', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const metricsTool = registeredTools['system-metrics'];
      
      const result = await metricsTool.callback({});
      const metricsData = JSON.parse(result.content[0].text);
      
      expect(metricsData.requests).toHaveProperty('total');
      expect(metricsData.requests).toHaveProperty('success');
      expect(metricsData.requests).toHaveProperty('errors');
      expect(metricsData.requests).toHaveProperty('rate_limited');
      expect(typeof metricsData.requests.total).toBe('number');
      expect(typeof metricsData.requests.success).toBe('number');
      expect(typeof metricsData.requests.errors).toBe('number');
    });

    it('should include timing metrics', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const metricsTool = registeredTools['system-metrics'];
      
      const result = await metricsTool.callback({});
      const metricsData = JSON.parse(result.content[0].text);
      
      expect(metricsData).toHaveProperty('uptime');
      expect(metricsData).toHaveProperty('timestamp');
      expect(typeof metricsData.uptime).toBe('number');
      expect(typeof metricsData.timestamp).toBe('string');
    });
  });

  describe('Tool Registration Count Update', () => {
    it('should register exactly 10 tools (8 original + 2 monitoring)', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toHaveLength(10);
      
      const expectedTools = [
        'list-issues',
        'create-issue',
        'get-issue', 
        'update-issue',
        'list-projects',
        'get-project',
        'list-users',
        'get-user',
        'health-check',
        'system-metrics'
      ];
      
      for (const tool of expectedTools) {
        expect(tools).toContain(tool);
      }
    });
  });

  describe('Health Check Integration with Error Handling', () => {
    it('should handle health check errors gracefully', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      // Force an error in health check
      const originalProcess = process.memoryUsage;
      (process as any).memoryUsage = () => {
        throw new Error('Memory check failed');
      };

      try {
        const result = await healthTool.callback({});
        const healthData = JSON.parse(result.content[0].text);
        
        expect(healthData.status).toBe('degraded');
        expect(healthData.errors.some((error: string) => error.includes('Memory check failed'))).toBe(true);
      } finally {
        process.memoryUsage = originalProcess;
      }
    });

    it('should mark system as unhealthy when critical components fail', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const healthTool = registeredTools['health-check'];
      
      // Mock critical failure
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listProjects').mockRejectedValue(new Error('Critical API failure'));
      
      const result = await healthTool.callback({});
      const healthData = JSON.parse(result.content[0].text);
      
      expect(['degraded', 'unhealthy']).toContain(healthData.status);
      expect(healthData.redmine.status).toBe('error');
    });
  });
});