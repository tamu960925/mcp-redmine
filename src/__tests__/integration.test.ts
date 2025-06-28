import { RedmineClient } from '../redmine-client.js';
import { RedmineMcpServer } from '../server.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Integration Tests', () => {
  beforeEach(() => {
    mockedAxios.create.mockReturnValue(mockedAxios);
    jest.clearAllMocks();
  });

  describe('Redmine API Integration', () => {
    let client: RedmineClient;

    beforeEach(() => {
      client = new RedmineClient({
        baseUrl: 'https://demo.redmine.org',
        apiKey: 'test-key'
      });
    });

    describe('Issues API', () => {
      it('should list issues with filters', async () => {
        const mockResponse = {
          data: {
            issues: [
              { id: 1, subject: 'Bug fix', project_id: 1, status_id: 1 },
              { id: 2, subject: 'Feature request', project_id: 2, status_id: 2 }
            ],
            total_count: 2,
            offset: 0,
            limit: 25
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.listIssues({
          project_id: 1,
          status_id: 'open',
          limit: 10
        });

        expect(mockedAxios.get).toHaveBeenCalledWith('/issues.json', {
          params: { project_id: 1, status_id: 'open', limit: 10 }
        });
        expect(result.issues).toHaveLength(2);
        expect(result.total_count).toBe(2);
      });

      it('should get specific issue details', async () => {
        const mockResponse = {
          data: {
            issue: {
              id: 1,
              subject: 'Test Issue',
              description: 'Test description',
              project_id: 1,
              status_id: 1,
              priority_id: 2
            }
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.getIssue(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('/issues/1.json');
        expect(result.id).toBe(1);
        expect(result.subject).toBe('Test Issue');
      });

      it('should create new issue', async () => {
        const mockResponse = {
          data: {
            issue: {
              id: 123,
              subject: 'New Issue',
              project_id: 1,
              description: 'New issue description'
            }
          }
        };
        mockedAxios.post.mockResolvedValue(mockResponse);

        const issueData = {
          project_id: 1,
          subject: 'New Issue',
          description: 'New issue description'
        };

        const result = await client.createIssue(issueData);

        expect(mockedAxios.post).toHaveBeenCalledWith('/issues.json', {
          issue: issueData
        });
        expect(result.id).toBe(123);
        expect(result.subject).toBe('New Issue');
      });

      it('should update existing issue', async () => {
        const mockResponse = {
          data: {
            issue: {
              id: 1,
              subject: 'Updated Issue',
              status_id: 3,
              done_ratio: 50
            }
          }
        };
        mockedAxios.put.mockResolvedValue(mockResponse);

        const updateData = {
          subject: 'Updated Issue',
          status_id: 3,
          done_ratio: 50
        };

        const result = await client.updateIssue(1, updateData);

        expect(mockedAxios.put).toHaveBeenCalledWith('/issues/1.json', {
          issue: updateData
        });
        expect(result.subject).toBe('Updated Issue');
        expect(result.done_ratio).toBe(50);
      });
    });

    describe('Projects API', () => {
      it('should list all projects', async () => {
        const mockResponse = {
          data: {
            projects: [
              { id: 1, name: 'Project 1', identifier: 'project1' },
              { id: 2, name: 'Project 2', identifier: 'project2' }
            ],
            total_count: 2,
            offset: 0,
            limit: 25
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.listProjects();

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects.json');
        expect(result.projects).toHaveLength(2);
        expect(result.total_count).toBe(2);
      });

      it('should get project by ID', async () => {
        const mockResponse = {
          data: {
            project: {
              id: 1,
              name: 'Test Project',
              identifier: 'test-project',
              description: 'Test project description'
            }
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.getProject(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects/1.json');
        expect(result.id).toBe(1);
        expect(result.name).toBe('Test Project');
      });

      it('should get project by identifier', async () => {
        const mockResponse = {
          data: {
            project: {
              id: 1,
              name: 'Test Project',
              identifier: 'test-project'
            }
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.getProject('test-project');

        expect(mockedAxios.get).toHaveBeenCalledWith('/projects/test-project.json');
        expect(result.identifier).toBe('test-project');
      });
    });

    describe('Users API', () => {
      it('should list all users', async () => {
        const mockResponse = {
          data: {
            users: [
              { id: 1, firstname: 'John', lastname: 'Doe', mail: 'john@example.com' },
              { id: 2, firstname: 'Jane', lastname: 'Smith', mail: 'jane@example.com' }
            ],
            total_count: 2,
            offset: 0,
            limit: 25
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.listUsers();

        expect(mockedAxios.get).toHaveBeenCalledWith('/users.json');
        expect(result.users).toHaveLength(2);
        expect(result.total_count).toBe(2);
      });

      it('should get specific user details', async () => {
        const mockResponse = {
          data: {
            user: {
              id: 1,
              login: 'jdoe',
              firstname: 'John',
              lastname: 'Doe',
              mail: 'john@example.com'
            }
          }
        };
        mockedAxios.get.mockResolvedValue(mockResponse);

        const result = await client.getUser(1);

        expect(mockedAxios.get).toHaveBeenCalledWith('/users/1.json');
        expect(result.id).toBe(1);
        expect(result.login).toBe('jdoe');
      });
    });
  });

  describe('MCP Server Integration', () => {
    let server: RedmineMcpServer;

    beforeEach(() => {
      server = new RedmineMcpServer({
        baseUrl: 'https://demo.redmine.org',
        apiKey: 'test-key'
      });
    });

    it('should integrate with MCP protocol correctly', () => {
      expect(server.getRegisteredTools()).toEqual([
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

    it('should handle server lifecycle', async () => {
      const mockTransport = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };

      jest.spyOn(server.getMcpServer(), 'connect').mockImplementation(mockTransport.connect);
      jest.spyOn(server.getMcpServer(), 'close').mockImplementation(mockTransport.close);

      await server.start();
      expect(mockTransport.connect).toHaveBeenCalled();

      await server.stop();
      expect(mockTransport.close).toHaveBeenCalled();
    });
  });
});