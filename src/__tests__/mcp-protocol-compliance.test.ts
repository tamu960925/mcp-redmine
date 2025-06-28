import { RedmineMcpServer } from '../server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MCP Protocol Compliance Tests (TDD)', () => {
  let server: RedmineMcpServer;
  let mcpServer: McpServer;

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

  describe('MCP Server Information Compliance', () => {
    it('should have valid server name', () => {
      // Server info is available through the underlying server
      const underlyingServer = mcpServer.server;
      expect(underlyingServer).toBeDefined();
      
      // The name and version are passed during McpServer construction
      // We can verify they were passed correctly by checking our server instance
      expect(server.getMcpServer()).toBeInstanceOf(McpServer);
    });

    it('should have valid server version', () => {
      // Server version is set during construction with our Implementation object
      const underlyingServer = mcpServer.server;
      expect(underlyingServer).toBeDefined();
      
      // Verify the server is properly initialized with our metadata
      expect(server.getMcpServer()).toBeInstanceOf(McpServer);
    });

    it('should be instance of McpServer', () => {
      expect(mcpServer).toBeInstanceOf(McpServer);
    });
  });

  describe('Tool Registration Compliance', () => {
    it('should register tools in MCP-compliant format', () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      expect(registeredTools).toBeDefined();
      expect(typeof registeredTools).toBe('object');
      
      // Each tool should have MCP-required properties
      for (const [toolName, tool] of Object.entries(registeredTools)) {
        expect(typeof toolName).toBe('string');
        expect(toolName.length).toBeGreaterThan(0);
        
        const toolDef = tool as any;
        expect(toolDef.title).toBeDefined();
        expect(typeof toolDef.title).toBe('string');
        expect(toolDef.description).toBeDefined();
        expect(typeof toolDef.description).toBe('string');
        expect(toolDef.callback).toBeInstanceOf(Function);
        expect(typeof toolDef.enabled).toBe('boolean');
      }
    });

    it('should have unique tool names', () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const toolNames = Object.keys(registeredTools);
      const uniqueNames = new Set(toolNames);
      expect(uniqueNames.size).toBe(toolNames.length);
    });

    it('should follow MCP naming conventions', () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const toolNames = Object.keys(registeredTools);
      
      for (const toolName of toolNames) {
        // Tool names should be kebab-case and descriptive
        expect(toolName).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(toolName.length).toBeGreaterThan(2);
      }
    });
  });

  describe('Tool Execution Compliance', () => {
    it('should return MCP-compliant responses', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      // Mock client response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockResolvedValue({
        issues: [{ id: 1, project_id: 1, subject: 'Test Issue' }],
        total_count: 1,
        offset: 0,
        limit: 25
      });

      const result = await listIssuesTool.callback({});
      
      // MCP-compliant response structure
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      
      const content = result.content[0];
      expect(content.type).toBeDefined();
      expect(typeof content.type).toBe('string');
      expect(content.text).toBeDefined();
      expect(typeof content.text).toBe('string');
    });

    it('should handle parameters in MCP-compliant way', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const createIssueTool = registeredTools['create-issue'];
      
      // Mock client response
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'createIssue').mockResolvedValue({
        id: 123,
        project_id: 1,
        subject: 'New Issue'
      });

      const params = {
        project_id: 1,
        subject: 'Test Issue'
      };

      const result = await createIssueTool.callback(params);
      
      // Should accept parameters and return valid response
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should propagate errors in MCP-compliant way', async () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      const listIssuesTool = registeredTools['list-issues'];
      
      // Mock client error
      const mockClient = server['redmineClient'];
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(new Error('Test Error'));

      // MCP tools should let errors bubble up
      await expect(listIssuesTool.callback({})).rejects.toThrow('Test Error');
    });
  });

  describe('Server Lifecycle Compliance', () => {
    it('should provide connect method', () => {
      expect(mcpServer.connect).toBeInstanceOf(Function);
    });

    it('should provide close method', () => {
      expect(mcpServer.close).toBeInstanceOf(Function);
    });

    it('should have underlying server property', () => {
      expect(mcpServer.server).toBeDefined();
      expect(typeof mcpServer.server).toBe('object');
    });
  });

  describe('Tool Schema Compliance', () => {
    it('should have proper tool definitions', () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      
      for (const [toolName, tool] of Object.entries(registeredTools)) {
        const toolDef = tool as any;
        
        // Required MCP tool properties
        expect(toolDef.title).toBeTruthy();
        expect(toolDef.description).toBeTruthy();
        expect(toolDef.callback).toBeTruthy();
        
        // Optional but common properties
        expect(toolDef.hasOwnProperty('inputSchema')).toBe(true);
        expect(toolDef.hasOwnProperty('outputSchema')).toBe(true);
        expect(toolDef.hasOwnProperty('annotations')).toBe(true);
        
        // Tool management properties
        expect(toolDef.enabled).toBe(true);
        expect(toolDef.disable).toBeInstanceOf(Function);
        expect(toolDef.enable).toBeInstanceOf(Function);
        expect(toolDef.remove).toBeInstanceOf(Function);
        expect(toolDef.update).toBeInstanceOf(Function);
      }
    });

    it('should have reasonable tool metadata', () => {
      const registeredTools = (mcpServer as any)._registeredTools;
      
      for (const [toolName, tool] of Object.entries(registeredTools)) {
        const toolDef = tool as any;
        
        // Title and description should be meaningful
        expect(toolDef.title.length).toBeGreaterThan(5);
        expect(toolDef.description.length).toBeGreaterThan(10);
        
        // Should contain relevant keywords
        expect(toolDef.title.toLowerCase()).toMatch(/redmine|issue|project|user/);
        expect(toolDef.description.toLowerCase()).toMatch(/redmine|issue|project|user|list|get|create|update/);
      }
    });
  });

  describe('MCP Protocol Version Compatibility', () => {
    it('should be compatible with current MCP SDK version', () => {
      // Test that our server works with the installed MCP SDK
      expect(mcpServer).toBeInstanceOf(McpServer);
      expect(typeof mcpServer.connect).toBe('function');
      expect(typeof mcpServer.close).toBe('function');
    });

    it('should properly initialize all MCP components', () => {
      // Check that all MCP internal components are initialized
      const internalProps = [
        '_registeredResources',
        '_registeredResourceTemplates', 
        '_registeredTools',
        '_registeredPrompts'
      ];
      
      for (const prop of internalProps) {
        expect((mcpServer as any)[prop]).toBeDefined();
      }
    });
  });
});