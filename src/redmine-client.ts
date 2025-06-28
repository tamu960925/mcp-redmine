import axios, { AxiosInstance } from 'axios';
import {
  RedmineConfig,
  RedmineIssue,
  RedmineProject,
  RedmineUser,
  IssueListParams,
  IssueListResponse,
  ProjectListResponse,
  UserListResponse
} from './types.js';
import { validateIssueData, validateId, validatePaginationParams } from './validation.js';

export class RedmineClient {
  private config: RedmineConfig;
  private httpClient: AxiosInstance;

  constructor(config: RedmineConfig) {
    this.validateConfig(config);
    this.config = config;
    this.httpClient = this.createHttpClient();
  }

  private validateConfig(config: RedmineConfig): void {
    if (!config.baseUrl || config.baseUrl.trim() === '') {
      throw new Error('baseUrl is required');
    }
    if (!config.apiKey || config.apiKey.trim() === '') {
      throw new Error('apiKey is required');
    }
    
    try {
      new URL(config.baseUrl.trim());
    } catch {
      throw new Error('Invalid baseUrl format');
    }
  }

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.baseUrl.trim(),
      headers: {
        'X-Redmine-API-Key': this.config.apiKey.trim(),
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          switch (status) {
            case 401:
              throw new Error(`Authentication failed: ${data?.error || 'Invalid API key'}`);
            case 403:
              throw new Error(`Access forbidden: ${data?.error || 'Insufficient permissions'}`);
            case 404:
              throw new Error(`Resource not found: ${data?.error || 'The requested resource does not exist'}`);
            case 422:
              const validationErrors = data?.errors || {};
              const errorMessages = Object.entries(validationErrors)
                .map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
                .join('; ');
              throw new Error(`Validation failed: ${errorMessages || 'Invalid data provided'}`);
            case 500:
              throw new Error(`Server error: ${data?.error || 'Internal server error occurred'}`);
            default:
              throw new Error(`Request failed: ${error.response.statusText || 'Unknown error'}`);
          }
        } else if (error.request) {
          if (error.code === 'ECONNABORTED') {
            throw new Error('Request timeout: The server took too long to respond');
          }
          throw new Error(`Network error: Unable to connect to Redmine server`);
        } else {
          throw new Error(`Request configuration error: ${error.message}`);
        }
      }
    );

    return client;
  }

  getConfig(): RedmineConfig {
    return { ...this.config };
  }

  async listIssues(params: IssueListParams = {}): Promise<IssueListResponse> {
    validatePaginationParams(params);
    if (params.project_id !== undefined) {
      validateId(params.project_id, 'project_id');
    }
    if (params.assigned_to_id !== undefined) {
      validateId(params.assigned_to_id, 'assigned_to_id');
    }
    if (params.parent_id !== undefined) {
      validateId(params.parent_id, 'parent_id');
    }
    
    const response = await this.httpClient.get('/issues.json', { params });
    return response.data;
  }

  async getIssue(id: number): Promise<RedmineIssue> {
    validateId(id, 'id');
    const response = await this.httpClient.get(`/issues/${id}.json`);
    return response.data.issue;
  }

  async createIssue(issue: Omit<RedmineIssue, 'id'>): Promise<RedmineIssue> {
    validateIssueData(issue);
    const response = await this.httpClient.post('/issues.json', { issue });
    return response.data.issue;
  }

  async updateIssue(id: number, issue: Partial<RedmineIssue>): Promise<RedmineIssue> {
    validateId(id, 'id');
    validateIssueData(issue);
    const response = await this.httpClient.put(`/issues/${id}.json`, { issue });
    return response.data.issue;
  }

  async listProjects(): Promise<ProjectListResponse> {
    const response = await this.httpClient.get('/projects.json');
    return response.data;
  }

  async getProject(id: number | string): Promise<RedmineProject> {
    validateId(id, 'id');
    const response = await this.httpClient.get(`/projects/${id}.json`);
    return response.data.project;
  }

  async listUsers(): Promise<UserListResponse> {
    const response = await this.httpClient.get('/users.json');
    return response.data;
  }

  async getUser(id: number): Promise<RedmineUser> {
    validateId(id, 'id');
    const response = await this.httpClient.get(`/users/${id}.json`);
    return response.data.user;
  }
}