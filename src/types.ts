export interface RedmineConfig {
  baseUrl: string;
  apiKey: string;
}

export interface RedmineIssue {
  id?: number;
  project_id: number;
  tracker_id?: number;
  status_id?: number;
  priority_id?: number;
  subject: string;
  description?: string;
  assigned_to_id?: number;
  parent_id?: number;
  estimated_hours?: number;
  done_ratio?: number;
  custom_fields?: CustomField[];
  created_on?: string;
  updated_on?: string;
}

export interface RedmineProject {
  id?: number;
  name: string;
  identifier: string;
  description?: string;
  status?: number;
  is_public?: boolean;
  parent_id?: number;
  created_on?: string;
  updated_on?: string;
}

export interface RedmineUser {
  id?: number;
  login?: string;
  firstname: string;
  lastname: string;
  mail?: string;
  created_on?: string;
  last_login_on?: string;
}

export interface CustomField {
  id: number;
  name: string;
  value: string | number | boolean;
}

export interface IssueListParams {
  project_id?: number;
  tracker_id?: number;
  status_id?: string | number;
  assigned_to_id?: number;
  parent_id?: number;
  limit?: number;
  offset?: number;
  sort?: string;
}

export interface IssueListResponse {
  issues: RedmineIssue[];
  total_count: number;
  offset: number;
  limit: number;
}

export interface ProjectListResponse {
  projects: RedmineProject[];
  total_count: number;
  offset: number;
  limit: number;
}

export interface UserListResponse {
  users: RedmineUser[];
  total_count: number;
  offset: number;
  limit: number;
}