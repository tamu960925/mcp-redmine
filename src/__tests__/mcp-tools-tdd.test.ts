import { RedmineMcpServer } from '../server.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCP Tools Tests (TDD Implementation)', () => {
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
      apiKey: 'test-key'
    });
    jest.clearAllMocks();
  });

  describe('Tool Registration', () => {
    it('should register exactly 10 tools', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toHaveLength(10);
    });

    it('should register all required Redmine tools', () => {
      const tools = server.getRegisteredTools();
      const expectedTools = [
        'list-issues',
        'create-issue', 
        'get-issue',
        'update-issue',
        'list-projects',
        'get-project',
        'list-users',
        'get-user'
      ];
      
      for (const tool of expectedTools) {
        expect(tools).toContain(tool);
      }
    });
  });

  describe('MCP Server Structure', () => {
    it('should have valid MCP server instance', () => {
      const mcpServer = server.getMcpServer();
      expect(mcpServer).toBeDefined();
    });

    it('should have registered tools in MCP server', () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      
      expect(registeredTools).toBeDefined();
      expect(typeof registeredTools).toBe('object');
      expect(Object.keys(registeredTools)).toHaveLength(10);
    });

    it('should have properly structured tool definitions', () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      
      for (const toolName of server.getRegisteredTools()) {
        const tool = registeredTools[toolName];
        expect(tool).toBeDefined();
        expect(tool.title).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.callback).toBeInstanceOf(Function);
        expect(tool.enabled).toBe(true);
      }
    });
  });

  describe('Tool Execution', () => {
    it('should execute list-issues tool without errors', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      expect(listIssuesTool).toBeDefined();
      expect(listIssuesTool.callback).toBeInstanceOf(Function);
      
      // Mock successful response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [{ id: 1, project_id: 1, subject: 'Test Issue' }],
        total_count: 1,
        offset: 0,
        limit: 25
      });

      const result = await listIssuesTool.callback({});
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should execute create-issue tool without errors', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const createIssueTool = registeredTools['create-issue'];
      
      expect(createIssueTool).toBeDefined();
      expect(createIssueTool.callback).toBeInstanceOf(Function);
      
      // Mock successful response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'createIssue').mockResolvedValue({
        id: 123,
        project_id: 1,
        subject: 'New Issue'
      });

      const result = await createIssueTool.callback({
        project_id: 1,
        subject: 'New Issue'
      });
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('Tool Metadata', () => {
    it('should have correct titles for each tool', () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      
      expect(registeredTools['list-issues'].title).toBe('List Redmine Issues');
      expect(registeredTools['create-issue'].title).toBe('Create Redmine Issue');
      expect(registeredTools['get-issue'].title).toBe('Get Redmine Issue');
      expect(registeredTools['update-issue'].title).toBe('Update Redmine Issue');
      expect(registeredTools['list-projects'].title).toBe('List Redmine Projects');
      expect(registeredTools['get-project'].title).toBe('Get Redmine Project');
      expect(registeredTools['list-users'].title).toBe('List Redmine Users');
      expect(registeredTools['get-user'].title).toBe('Get Redmine User');
    });

    it('should have proper descriptions for each tool', () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      
      expect(registeredTools['list-issues'].description).toBe('List issues from Redmine with optional filtering');
      expect(registeredTools['create-issue'].description).toBe('Create a new issue in Redmine');
    });
  });

  describe('Error Handling in Tools', () => {
    it('should propagate client errors in tool execution', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      // Mock error
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(new Error('API Error'));

      await expect(listIssuesTool.callback({})).rejects.toThrow('API Error');
    });

    it('should handle validation errors gracefully', async () => {
      const mcpServer = server.getMcpServer();
      const registeredTools = (mcpServer as any)._registeredTools;
      const getIssueTool = registeredTools['get-issue'];
      
      // Mock validation error
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'getIssue').mockRejectedValue(new Error('Validation error: id must be a positive integer'));

      await expect(getIssueTool.callback({ id: -1 })).rejects.toThrow();
    });
  });
});