import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { RedmineClient } from './redmine-client.js';
import { RedmineConfig, RedmineIssue } from './types.js';
import { ValidationError } from './validation.js';
import { logger } from './logger.js';
import { RateLimiter, SecurityValidator, RateLimitConfig } from './security.js';
import { MetricsCollector } from './metrics.js';
import { ConfigValidator } from './config-validator.js';

export class RedmineMcpServer {
  private config: RedmineConfig;
  private mcpServer: McpServer;
  private redmineClient: RedmineClient;
  private registeredTools: string[] = [];
  private rateLimiter: RateLimiter;
  private metricsCollector: MetricsCollector;

  constructor(config: RedmineConfig) {
    // Use ConfigValidator for comprehensive validation
    this.config = ConfigValidator.validateOrThrow(config);
    this.redmineClient = new RedmineClient(config);
    this.mcpServer = new McpServer({
      name: 'redmine-mcp-server',
      version: '1.0.0'
    });
    
    // Initialize rate limiter
    const rateLimitConfig: RateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 1000, // Global limit
      globalMaxRequests: 1000,
      toolLimits: {
        'list-issues': 60,
        'create-issue': 30,
        'update-issue': 30,
        'get-issue': 100,
        'list-projects': 60,
        'get-project': 100,
        'list-users': 60,
        'get-user': 100,
        'health-check': 120,
        'system-metrics': 60
      }
    };
    this.rateLimiter = new RateLimiter(rateLimitConfig);
    this.metricsCollector = new MetricsCollector();
    
    this.registerTools();
    logger.info('Redmine MCP Server initialized');
  }

  private validateConfig(config: RedmineConfig): void {
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      throw new Error('baseUrl is required');
    }
    SecurityValidator.validateApiKey(config.apiKey);
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
    this.registerHealthCheck();
    this.registerSystemMetrics();
  }

  private registerListIssues(): void {
    this.mcpServer.registerTool(
      'list-issues',
      {
        title: 'List Redmine Issues',
        description: 'List issues from Redmine with optional filtering'
      },
      async (params) => {
        try {
          await this.rateLimiter.checkRateLimit('list-issues');
          SecurityValidator.validateInput(params);
          logger.debug('Executing list-issues tool', { params });
          const result = await this.redmineClient.listIssues(params);
          logger.info(`Listed ${result.issues.length} issues`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          logger.error('Error in list-issues tool', error as Error);
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          if (error instanceof ValidationError) {
            throw new Error(`Validation error: ${error.message}`);
          }
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('create-issue');
          SecurityValidator.validateInput(params);
          SecurityValidator.validateParameterTypes(params, {
            project_id: 'number',
            subject: 'string'
          });
          logger.debug('Executing create-issue tool', { params });
          const issue = await this.redmineClient.createIssue(params as Omit<RedmineIssue, 'id'>);
          logger.info(`Created issue ${issue.id}: ${issue.subject}`);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }]
          };
        } catch (error) {
          logger.error('Error in create-issue tool', error as Error);
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          if (error instanceof ValidationError) {
            throw new Error(`Validation error: ${error.message}`);
          }
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('get-issue');
          SecurityValidator.validateInput(params);
          SecurityValidator.validateParameterTypes(params, {
            id: 'number'
          });
          const issue = await this.redmineClient.getIssue(params.id);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }]
          };
        } catch (error) {
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('update-issue');
          SecurityValidator.validateInput(params);
          SecurityValidator.validateParameterTypes(params, {
            id: 'number'
          });
          const { id, ...updateData } = params;
          const issue = await this.redmineClient.updateIssue(id, updateData);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }]
          };
        } catch (error) {
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('list-projects');
          const result = await this.redmineClient.listProjects();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('get-project');
          SecurityValidator.validateInput(params);
          SecurityValidator.validateParameterTypes(params, {
            id: ['number', 'string']
          });
          const project = await this.redmineClient.getProject(params.id);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(project, null, 2)
            }]
          };
        } catch (error) {
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('list-users');
          const result = await this.redmineClient.listUsers();
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }]
          };
        } catch (error) {
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          throw sanitizedError;
        }
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
        try {
          await this.rateLimiter.checkRateLimit('get-user');
          SecurityValidator.validateInput(params);
          SecurityValidator.validateParameterTypes(params, {
            id: 'number'
          });
          const user = await this.redmineClient.getUser(params.id);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(user, null, 2)
            }]
          };
        } catch (error) {
          const sanitizedError = SecurityValidator.sanitizeErrorMessage(error as Error);
          throw sanitizedError;
        }
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

  getRateLimiter(): RateLimiter {
    return this.rateLimiter;
  }

  async start(): Promise<void> {
    try {
      logger.info('Starting Redmine MCP Server');
      const transport = new StdioServerTransport();
      await this.mcpServer.connect(transport);
      logger.info('Redmine MCP Server started successfully');
    } catch (error) {
      logger.error('Failed to start Redmine MCP Server', error as Error);
      throw error;
    }
  }

  private registerHealthCheck(): void {
    this.mcpServer.registerTool(
      'health-check',
      {
        title: 'System Health Check',
        description: 'Check the health status of the Redmine MCP server'
      },
      async () => {
        try {
          await this.rateLimiter.checkRateLimit('health-check');
          logger.debug('Executing health-check tool');
          
          const healthStatus = await this.metricsCollector.getHealthStatus(
            this.redmineClient,
            this.registeredTools.length
          );
          
          // Update tools list in health status
          healthStatus.tools.available = [...this.registeredTools];
          
          this.metricsCollector.recordRequest(true);
          logger.info('Health check completed successfully');
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(healthStatus, null, 2)
            }]
          };
        } catch (error) {
          this.metricsCollector.recordRequest(false, error instanceof Error && error.message.includes('Rate limit'));
          logger.error('Error in health-check tool', error as Error);
          throw error;
        }
      }
    );
    this.registeredTools.push('health-check');
  }

  private registerSystemMetrics(): void {
    this.mcpServer.registerTool(
      'system-metrics',
      {
        title: 'System Metrics',
        description: 'Get detailed system performance metrics'
      },
      async () => {
        try {
          await this.rateLimiter.checkRateLimit('system-metrics');
          logger.debug('Executing system-metrics tool');
          
          const systemMetrics = this.metricsCollector.getSystemMetrics();
          
          this.metricsCollector.recordRequest(true);
          logger.info('System metrics collected successfully');
          
          return {
            content: [{
              type: 'text',
              text: JSON.stringify(systemMetrics, null, 2)
            }]
          };
        } catch (error) {
          this.metricsCollector.recordRequest(false, error instanceof Error && error.message.includes('Rate limit'));
          logger.error('Error in system-metrics tool', error as Error);
          throw error;
        }
      }
    );
    this.registeredTools.push('system-metrics');
  }

  async stop(): Promise<void> {
    try {
      logger.info('Stopping Redmine MCP Server');
      await this.mcpServer.close();
      logger.info('Redmine MCP Server stopped successfully');
    } catch (error) {
      logger.error('Error stopping Redmine MCP Server', error as Error);
      throw error;
    }
  }
}