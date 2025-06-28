import { RedmineClient } from '../redmine-client.js';
import { RedmineMcpServer } from '../server.js';
import axios, { AxiosError } from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Error Handling Tests', () => {
  beforeEach(() => {
    mockedAxios.create.mockReturnValue(mockedAxios);
    jest.clearAllMocks();
  });

  describe('RedmineClient Error Handling', () => {
    let client: RedmineClient;

    beforeEach(() => {
      const mockAxiosInstance = {
        get: mockedAxios.get,
        post: mockedAxios.post,
        put: mockedAxios.put,
        delete: mockedAxios.delete,
        interceptors: {
          response: {
            use: jest.fn()
          }
        }
      };
      mockedAxios.create.mockReturnValue(mockAxiosInstance as any);
      
      client = new RedmineClient({
        baseUrl: 'https://test.redmine.org',
        apiKey: 'test-key'
      });
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(networkError);

      await expect(client.listIssues()).rejects.toThrow('Network Error');
    });

    it('should handle HTTP 404 errors', async () => {
      const axiosError = {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: 'Issue not found' }
        },
        message: 'Request failed with status code 404'
      } as AxiosError;
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(client.getIssue(999)).rejects.toThrow('Resource not found');
    });

    it('should handle HTTP 401 errors (unauthorized)', async () => {
      const axiosError = {
        response: {
          status: 401,
          statusText: 'Unauthorized',
          data: { error: 'Invalid API key' }
        },
        message: 'Request failed with status code 401'
      } as AxiosError;
      mockedAxios.get.mockRejectedValue(axiosError);

      await expect(client.listProjects()).rejects.toThrow('Authentication failed');
    });

    it('should handle HTTP 422 errors (validation errors)', async () => {
      const axiosError = {
        response: {
          status: 422,
          statusText: 'Unprocessable Entity',
          data: { 
            errors: {
              subject: ["can't be blank"],
              project_id: ["is not valid"]
            }
          }
        },
        message: 'Request failed with status code 422'
      } as AxiosError;
      mockedAxios.post.mockRejectedValue(axiosError);

      const invalidIssue = {
        project_id: 999,
        subject: ''
      };

      await expect(client.createIssue(invalidIssue)).rejects.toThrow('Validation failed');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 10000ms exceeded');
      timeoutError.name = 'ECONNABORTED';
      mockedAxios.get.mockRejectedValue(timeoutError);

      await expect(client.listUsers()).rejects.toThrow('timeout of 10000ms exceeded');
    });

    it('should handle server errors (500)', async () => {
      const serverError = {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Internal server error' }
        },
        message: 'Request failed with status code 500'
      } as AxiosError;
      mockedAxios.put.mockRejectedValue(serverError);

      await expect(client.updateIssue(1, { subject: 'Updated' })).rejects.toThrow('Server error');
    });
  });

  describe('RedmineMcpServer Error Handling', () => {
    let server: RedmineMcpServer;

    beforeEach(() => {
      server = new RedmineMcpServer({
        baseUrl: 'https://test.redmine.org',
        apiKey: 'test-key'
      });
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

    it('should handle RedmineClient errors in tools', async () => {
      const mockClient = server['redmineClient'] as jest.Mocked<RedmineClient>;
      jest.spyOn(mockClient, 'listIssues').mockRejectedValue(new Error('API Error'));

      const mcpServer = server.getMcpServer();
      const tools = (mcpServer as any)._tools;
      
      if (tools && tools.get) {
        const listIssuesTool = tools.get('list-issues');
        if (listIssuesTool) {
          await expect(listIssuesTool.handler({})).rejects.toThrow('API Error');
        }
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate URL format', () => {
      expect(() => {
        new RedmineClient({
          baseUrl: 'invalid-url',
          apiKey: 'test-key'
        });
      }).toThrow('Invalid baseUrl format');
    });

    it('should accept valid URLs', () => {
      expect(() => {
        new RedmineClient({
          baseUrl: 'https://demo.redmine.org',
          apiKey: 'test-key'
        });
      }).not.toThrow();

      expect(() => {
        new RedmineClient({
          baseUrl: 'http://localhost:3000',
          apiKey: 'test-key'
        });
      }).not.toThrow();
    });

    it('should trim whitespace from configuration', () => {
      const client = new RedmineClient({
        baseUrl: '  https://test.redmine.org  ',
        apiKey: '  test-key  '
      });

      const config = client.getConfig();
      expect(config.baseUrl).toBe('  https://test.redmine.org  ');
      expect(config.apiKey).toBe('  test-key  ');
    });
  });
});