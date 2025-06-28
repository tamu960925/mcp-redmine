import { RedmineMcpServer } from '../server.js';
import { RedmineClient } from '../redmine-client.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCP Tools Tests', () => {
  let server: RedmineMcpServer;
  let mockRedmineClient: jest.Mocked<RedmineClient>;

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
      apiKey: 'test-api-key'
    });
    
    mockRedmineClient = {
      listIssues: jest.fn(),
      getIssue: jest.fn(),
      createIssue: jest.fn(),
      updateIssue: jest.fn(),
      listProjects: jest.fn(),
      getProject: jest.fn(),
      listUsers: jest.fn(),
      getUser: jest.fn(),
      getConfig: jest.fn()
    } as any;

    (server as any).redmineClient = mockRedmineClient;
    jest.clearAllMocks();
  });

  describe('list-issues tool', () => {
    it('should call RedmineClient.listIssues with correct parameters', async () => {
      const mockResponse = {
        issues: [{ id: 1, project_id: 1, subject: 'Test Issue' }],
        total_count: 1,
        offset: 0,
        limit: 25
      };
      mockRedmineClient.listIssues.mockResolvedValue(mockResponse);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const listIssuesTool = tools['list-issues'];

      const result = await listIssuesTool.callback({ project_id: 1, limit: 10 });

      expect(mockRedmineClient.listIssues).toHaveBeenCalledWith({ project_id: 1, limit: 10 });
      expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
    });

    it('should handle empty parameters', async () => {
      const mockResponse = { issues: [], total_count: 0, offset: 0, limit: 25 };
      mockRedmineClient.listIssues.mockResolvedValue(mockResponse);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const listIssuesTool = tools['list-issues'];

      const result = await listIssuesTool.callback({});

      expect(mockRedmineClient.listIssues).toHaveBeenCalledWith({});
      expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
    });
  });

  describe('create-issue tool', () => {
    it('should call RedmineClient.createIssue with correct data', async () => {
      const mockIssue = {
        id: 123,
        project_id: 1,
        subject: 'New Issue',
        description: 'Test description'
      };
      mockRedmineClient.createIssue.mockResolvedValue(mockIssue);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const createIssueTool = tools['create-issue'];

      const issueData = {
        project_id: 1,
        subject: 'New Issue',
        description: 'Test description'
      };

      const result = await createIssueTool.callback(issueData);

      expect(mockRedmineClient.createIssue).toHaveBeenCalledWith(issueData);
      expect(result.content[0].text).toBe(JSON.stringify(mockIssue, null, 2));
    });
  });

  describe('get-issue tool', () => {
    it('should call RedmineClient.getIssue with correct ID', async () => {
      const mockIssue = {
        id: 1,
        project_id: 1,
        subject: 'Test Issue',
        description: 'Test description'
      };
      mockRedmineClient.getIssue.mockResolvedValue(mockIssue);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const getIssueTool = tools['get-issue'];

      const result = await getIssueTool.callback({ id: 1 });

      expect(mockRedmineClient.getIssue).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toBe(JSON.stringify(mockIssue, null, 2));
    });
  });

  describe('update-issue tool', () => {
    it('should call RedmineClient.updateIssue with correct parameters', async () => {
      const mockIssue = {
        id: 1,
        project_id: 1,
        subject: 'Updated Issue',
        description: 'Updated description'
      };
      mockRedmineClient.updateIssue.mockResolvedValue(mockIssue);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const updateIssueTool = tools['update-issue'];

      const updateData = {
        id: 1,
        subject: 'Updated Issue',
        description: 'Updated description'
      };

      const result = await updateIssueTool.callback(updateData);

      expect(mockRedmineClient.updateIssue).toHaveBeenCalledWith(1, {
        subject: 'Updated Issue',
        description: 'Updated description'
      });
      expect(result.content[0].text).toBe(JSON.stringify(mockIssue, null, 2));
    });
  });

  describe('list-projects tool', () => {
    it('should call RedmineClient.listProjects', async () => {
      const mockResponse = {
        projects: [{ id: 1, name: 'Test Project', identifier: 'test' }],
        total_count: 1,
        offset: 0,
        limit: 25
      };
      mockRedmineClient.listProjects.mockResolvedValue(mockResponse);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const listProjectsTool = tools['list-projects'];

      const result = await listProjectsTool.callback();

      expect(mockRedmineClient.listProjects).toHaveBeenCalled();
      expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
    });
  });

  describe('get-project tool', () => {
    it('should call RedmineClient.getProject with numeric ID', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        identifier: 'test'
      };
      mockRedmineClient.getProject.mockResolvedValue(mockProject);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const getProjectTool = tools['get-project'];

      const result = await getProjectTool.callback({ id: 1 });

      expect(mockRedmineClient.getProject).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toBe(JSON.stringify(mockProject, null, 2));
    });

    it('should call RedmineClient.getProject with string identifier', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        identifier: 'test-project'
      };
      mockRedmineClient.getProject.mockResolvedValue(mockProject);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const getProjectTool = tools['get-project'];

      const result = await getProjectTool.callback({ id: 'test-project' });

      expect(mockRedmineClient.getProject).toHaveBeenCalledWith('test-project');
      expect(result.content[0].text).toBe(JSON.stringify(mockProject, null, 2));
    });
  });

  describe('list-users tool', () => {
    it('should call RedmineClient.listUsers', async () => {
      const mockResponse = {
        users: [{ id: 1, firstname: 'Test', lastname: 'User' }],
        total_count: 1,
        offset: 0,
        limit: 25
      };
      mockRedmineClient.listUsers.mockResolvedValue(mockResponse);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const listUsersTool = tools['list-users'];

      const result = await listUsersTool.callback();

      expect(mockRedmineClient.listUsers).toHaveBeenCalled();
      expect(result.content[0].text).toBe(JSON.stringify(mockResponse, null, 2));
    });
  });

  describe('get-user tool', () => {
    it('should call RedmineClient.getUser with correct ID', async () => {
      const mockUser = {
        id: 1,
        firstname: 'Test',
        lastname: 'User',
        email: 'test@example.com'
      };
      mockRedmineClient.getUser.mockResolvedValue(mockUser);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const getUserTool = tools['get-user'];

      const result = await getUserTool.callback({ id: 1 });

      expect(mockRedmineClient.getUser).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toBe(JSON.stringify(mockUser, null, 2));
    });
  });

  describe('error handling', () => {
    it('should propagate errors from client methods', async () => {
      const error = new Error('API Error');
      mockRedmineClient.listIssues.mockRejectedValue(error);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const listIssuesTool = tools['list-issues'];

      await expect(listIssuesTool.callback({})).rejects.toThrow('API Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      mockRedmineClient.getIssue.mockRejectedValue(timeoutError);

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._registeredTools;
      const getIssueTool = tools['get-issue'];

      await expect(getIssueTool.callback({ id: 1 })).rejects.toThrow('Request timeout');
    });
  });
});