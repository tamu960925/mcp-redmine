import { RedmineMcpServer } from '../server.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

describe('RedmineMcpServer', () => {
  let server: RedmineMcpServer;

  beforeEach(() => {
    server = new RedmineMcpServer({
      baseUrl: 'https://test.redmine.org',
      apiKey: 'test-api-key'
    });
  });

  describe('initialization', () => {
    it('should create an instance with correct configuration', () => {
      expect(server).toBeInstanceOf(RedmineMcpServer);
      expect(server.getConfig()).toEqual({
        baseUrl: 'https://test.redmine.org',
        apiKey: 'test-api-key'
      });
    });

    it('should create underlying MCP server with correct metadata', () => {
      const mcpServer = server.getMcpServer();
      expect(mcpServer).toBeInstanceOf(McpServer);
    });

    it('should throw error if baseUrl is missing', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: '',
          apiKey: 'test-key'
        });
      }).toThrow('baseUrl is required');
    });

    it('should throw error if apiKey is missing', () => {
      expect(() => {
        new RedmineMcpServer({
          baseUrl: 'https://test.redmine.org',
          apiKey: ''
        });
      }).toThrow('apiKey is required');
    });
  });

  describe('tool registration', () => {
    it('should register all required Redmine tools', () => {
      const tools = server.getRegisteredTools();
      expect(tools).toContain('list-issues');
      expect(tools).toContain('create-issue');
      expect(tools).toContain('get-issue');
      expect(tools).toContain('update-issue');
      expect(tools).toContain('list-projects');
      expect(tools).toContain('get-project');
      expect(tools).toContain('list-users');
      expect(tools).toContain('get-user');
    });
  });

  describe('server lifecycle', () => {
    it('should start and stop server without errors', async () => {
      await expect(server.start()).resolves.not.toThrow();
      await expect(server.stop()).resolves.not.toThrow();
    });
  });
});