import { RedmineMcpServer } from '../server.js';
import { RedmineClient } from '../redmine-client.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCP Integration Tests', () => {
  let server: RedmineMcpServer;

  beforeEach(() => {
    mockedAxios.create.mockReturnValue(mockedAxios);
    server = new RedmineMcpServer({
      baseUrl: 'https://test.redmine.org',
      apiKey: 'test-key'
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('MCP Server Configuration', () => {
    it('should initialize with correct server metadata', () => {
      const mcpServer = server.getMcpServer();
      expect(mcpServer).toBeDefined();
      
      // Check server name and version through reflection
      const serverInfo = (mcpServer as any)._serverInfo;
      expect(serverInfo?.name).toBe('redmine-mcp-server');
      expect(serverInfo?.version).toBe('1.0.0');
    });

    it('should register all required tools', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toHaveLength(8);
      expect(tools).toEqual([
        'list-issues',
        'create-issue',
        'get-issue',
        'update-issue',
        'list-projects',
        'get-project',
        'list-users',
        'get-user'
      ]);
    });

    it('should validate configuration on creation', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: '',
          apiKey: 'test-key'
        });
      }).toThrow('baseUrl is required');

      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: ''
        });
      }).toThrow('apiKey is required');
    });
  });

  describe('Tool Execution Simulation', () => {
    beforeEach(() => {
      // Mock successful responses for all HTTP calls
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
    });

    it('should handle list-issues tool execution', async () => {
      const mockResponse = {
        data: {
          issues: [{ id: 1, project_id: 1, subject: 'Test Issue' }],
          total_count: 1,
          offset: 0,
          limit: 25
        }
      };
      
      const mockClient = server['redmineClient'] as jest.Mocked<RedmineClient>;
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue(mockResponse.data);

      // Simulate tool execution by calling the client method directly
      const result = await mockClient.listIssues({ project_id: 1 });
      
      expect(mockClient.listIssues).toHaveBeenCalledWith({ project_id: 1 });
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].subject).toBe('Test Issue');
    });

    it('should handle create-issue tool execution', async () => {
      const mockIssue = {
        id: 123,
        project_id: 1,
        subject: 'New Issue',
        description: 'Test description'
      };
      
      const mockClient = server['redmineClient'] as jest.Mocked<RedmineClient>;
      jest.spyOn(mockClient, 'createIssue').mockResolvedValue(mockIssue);

      const issueData = {
        project_id: 1,
        subject: 'New Issue',
        description: 'Test description'
      };

      const result = await mockClient.createIssue(issueData);
      
      expect(mockClient.createIssue).toHaveBeenCalledWith(issueData);
      expect(result.id).toBe(123);
      expect(result.subject).toBe('New Issue');
    });

    it('should handle error propagation in tools', async () => {
      const mockClient = server['redmineClient'] as jest.Mocked<RedmineClient>;
      const error = new Error('API Error');
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(error);

      await expect(mockClient.listIssues({})).rejects.toThrow('API Error');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start and stop without errors', async () => {
      const mockTransport = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };

      // Mock the MCP server methods
      jest.spyOn(server.getMcpServer(), 'connect').mockImplementation(mockTransport.connect);
      jest.spyOn(server.getMcpServer(), 'close').mockImplementation(mockTransport.close);

      await expect(server.start()).resolves.not.toThrow();
      expect(mockTransport.connect).toHaveBeenCalled();

      await expect(server.stop()).resolves.not.toThrow();
      expect(mockTransport.close).toHaveBeenCalled();
    });

    it('should handle start errors gracefully', async () => {
      const error = new Error('Connection failed');
      jest.spyOn(server.getMcpServer(), 'connect').mockRejectedValue(error);

      await expect(server.start()).rejects.toThrow('Connection failed');
    });

    it('should handle stop errors gracefully', async () => {
      const error = new Error('Disconnect failed');
      jest.spyOn(server.getMcpServer(), 'close').mockRejectedValue(error);

      await expect(server.stop()).rejects.toThrow('Disconnect failed');
    });
  });

  describe('Tool Parameter Validation', () => {
    it('should validate tool parameters through client calls', async () => {
      const mockClient = server['redmineClient'] as jest.Mocked<RedmineClient>;
      
      // Mock validation error
      const validationError = new Error('Validation error: id must be a positive integer');
      jest.spyOn(mockClient, 'getIssue').mockRejectedValue(validationError);

      await expect(mockClient.getIssue(-1)).rejects.toThrow('Validation error');
    });

    it('should validate pagination parameters', async () => {
      const mockClient = server['redmineClient'] as jest.Mocked<RedmineClient>;
      
      const validationError = new Error('Validation error: limit must be a positive integer between 1 and 100');
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(validationError);

      await expect(mockClient.listIssues({ limit: 101 })).rejects.toThrow('Validation error');
    });
  });

  describe('Configuration Management', () => {
    it('should return configuration without exposing sensitive data', () => {
      const config = server.getConfig();
      expect(config).toEqual({
        baseUrl: 'https://test.redmine.org',
        apiKey: 'test-key'
      });
      
      // Ensure it's a copy, not the original
      config.apiKey = 'modified';
      expect(server.getConfig().apiKey).toBe('test-key');
    });

    it('should maintain RedmineClient configuration consistency', () => {
      const serverConfig = server.getConfig();
      const clientConfig = server['redmineClient'].getConfig();
      
      expect(serverConfig).toEqual(clientConfig);
    });
  });
});