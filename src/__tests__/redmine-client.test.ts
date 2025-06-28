import { RedmineClient } from '../redmine-client.js';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RedmineClient', () => {
  let client: RedmineClient;

  beforeEach(() => {
    mockedAxios.create.mockReturnValue(mockedAxios);
    client = new RedmineClient({
      baseUrl: 'https://test.redmine.org',
      apiKey: 'test-api-key'
    });
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should create client with correct configuration', () => {
      expect(client).toBeInstanceOf(RedmineClient);
      expect(client.getConfig()).toEqual({
        baseUrl: 'https://test.redmine.org',
        apiKey: 'test-api-key'
      });
    });

    it('should throw error for invalid baseUrl', () => {
      expect(() => {
        new RedmineClient({
          baseUrl: 'invalid-url',
          apiKey: 'test-key'
        });
      }).toThrow('Invalid baseUrl format');
    });
  });

  describe('listIssues', () => {
    it('should fetch issues successfully', async () => {
      const mockResponse = {
        data: {
          issues: [
            { id: 1, subject: 'Test Issue 1' },
            { id: 2, subject: 'Test Issue 2' }
          ],
          total_count: 2
        }
      };
      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await client.listIssues();

      expect(mockedAxios.get).toHaveBeenCalledWith('/issues.json', {
        params: {}
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle query parameters correctly', async () => {
      const mockResponse = { data: { issues: [], total_count: 0 } };
      mockedAxios.get.mockResolvedValue(mockResponse);

      await client.listIssues({
        project_id: 1,
        status_id: 'open',
        limit: 50,
        offset: 10
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/issues.json', {
        params: {
          project_id: 1,
          status_id: 'open',
          limit: 50,
          offset: 10
        }
      });
    });
  });

  describe('createIssue', () => {
    it('should create issue successfully', async () => {
      const mockResponse = {
        data: {
          issue: { id: 123, subject: 'New Issue' }
        }
      };
      mockedAxios.post.mockResolvedValue(mockResponse);

      const issueData = {
        project_id: 1,
        subject: 'New Issue',
        description: 'Issue description'
      };

      const result = await client.createIssue(issueData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/issues.json', {
        issue: issueData
      });
      expect(result).toEqual(mockResponse.data.issue);
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('Network Error');
      mockedAxios.get.mockRejectedValue(error);

      await expect(client.listIssues()).rejects.toThrow('Network Error');
    });
  });
});