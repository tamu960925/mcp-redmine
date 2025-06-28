import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RedmineClient } from './redmine-client.js';
import { RedmineConfig, RedmineIssue } from './types.js';

export class RedmineMcpServer {
  private config: RedmineConfig;
  private mcpServer: McpServer;
  private redmineClient: RedmineClient;
  private registeredTools: string[] = [];

  constructor(config: RedmineConfig) {
    this.validateConfig(config);
    this.config = config;
    this.redmineClient = new RedmineClient(config);
    this.mcpServer = new McpServer({
      name: 'redmine-mcp-server',
      version: '1.0.0'
    });
    this.registerTools();
  }

  private validateConfig(config: RedmineConfig): void {
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      throw new Error('baseUrl is required');
    }
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('apiKey is required');
    }
  }

  private registerTools(): void {
    this.registerListIssues();
    this.registerCreateIssue();
    this.registerGetIssue();
    this.registerUpdateIssue();
    this.registerListProjects();
    this.registerGetProject();
    this.registerListUsers();
    this.registerGetUser();
  }

  private registerListIssues(): void {
    this.mcpServer.registerTool(
      'list-issues',
      {
        title: 'List Redmine Issues',
        description: 'List issues from Redmine with optional filtering'
      },
      async (params) => {
        const result = await this.redmineClient.listIssues(params);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('list-issues');
  }

  private registerCreateIssue(): void {
    this.mcpServer.registerTool(
      'create-issue',
      {
        title: 'Create Redmine Issue',
        description: 'Create a new issue in Redmine'
      },
      async (params) => {
        const issue = await this.redmineClient.createIssue(params as Omit<RedmineIssue, 'id'>);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issue, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('create-issue');
  }

  private registerGetIssue(): void {
    this.mcpServer.registerTool(
      'get-issue',
      {
        title: 'Get Redmine Issue',
        description: 'Get details of a specific issue'
      },
      async (params) => {
        const issue = await this.redmineClient.getIssue(params.id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issue, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('get-issue');
  }

  private registerUpdateIssue(): void {
    this.mcpServer.registerTool(
      'update-issue',
      {
        title: 'Update Redmine Issue',
        description: 'Update an existing issue in Redmine'
      },
      async (params) => {
        const { id, ...updateData } = params;
        const issue = await this.redmineClient.updateIssue(id, updateData);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(issue, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('update-issue');
  }

  private registerListProjects(): void {
    this.mcpServer.registerTool(
      'list-projects',
      {
        title: 'List Redmine Projects',
        description: 'List all projects in Redmine'
      },
      async () => {
        const result = await this.redmineClient.listProjects();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('list-projects');
  }

  private registerGetProject(): void {
    this.mcpServer.registerTool(
      'get-project',
      {
        title: 'Get Redmine Project',
        description: 'Get details of a specific project'
      },
      async (params) => {
        const project = await this.redmineClient.getProject(params.id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(project, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('get-project');
  }

  private registerListUsers(): void {
    this.mcpServer.registerTool(
      'list-users',
      {
        title: 'List Redmine Users',
        description: 'List all users in Redmine'
      },
      async () => {
        const result = await this.redmineClient.listUsers();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('list-users');
  }

  private registerGetUser(): void {
    this.mcpServer.registerTool(
      'get-user',
      {
        title: 'Get Redmine User',
        description: 'Get details of a specific user'
      },
      async (params) => {
        const user = await this.redmineClient.getUser(params.id);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(user, null, 2)
          }]
        };
      }
    );
    this.registeredTools.push('get-user');
  }

  getConfig(): RedmineConfig {
    return { ...this.config };
  }

  getMcpServer(): McpServer {
    return this.mcpServer;
  }

  getRegisteredTools(): string[] {
    return [...this.registeredTools];
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.mcpServer.connect(transport);
  }

  async stop(): Promise<void> {
    await this.mcpServer.close();
  }
}