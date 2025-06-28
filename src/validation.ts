import { RedmineIssue, RedmineProject, RedmineUser } from './types.js';

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateIssueData(issue: Partial<RedmineIssue>): void {
  if (issue.project_id !== undefined && (!Number.isInteger(issue.project_id) || issue.project_id <= 0)) {
    throw new ValidationError('project_id must be a positive integer', 'project_id');
  }

  if (issue.subject !== undefined && (!issue.subject || issue.subject.trim().length === 0)) {
    throw new ValidationError('subject cannot be empty', 'subject');
  }

  if (issue.subject && issue.subject.length > 255) {
    throw new ValidationError('subject cannot exceed 255 characters', 'subject');
  }

  if (issue.done_ratio !== undefined && (issue.done_ratio < 0 || issue.done_ratio > 100)) {
    throw new ValidationError('done_ratio must be between 0 and 100', 'done_ratio');
  }

  if (issue.estimated_hours !== undefined && issue.estimated_hours < 0) {
    throw new ValidationError('estimated_hours cannot be negative', 'estimated_hours');
  }
}

export function validateProjectData(project: Partial<RedmineProject>): void {
  if (project.name !== undefined && (!project.name || project.name.trim().length === 0)) {
    throw new ValidationError('name cannot be empty', 'name');
  }

  if (project.identifier !== undefined && (!project.identifier || project.identifier.trim().length === 0)) {
    throw new ValidationError('identifier cannot be empty', 'identifier');
  }

  if (project.identifier && !/^[a-z0-9\-_]+$/.test(project.identifier)) {
    throw new ValidationError('identifier must contain only lowercase letters, numbers, hyphens, and underscores', 'identifier');
  }
}

export function validateUserData(user: Partial<RedmineUser>): void {
  if (user.firstname !== undefined && (!user.firstname || user.firstname.trim().length === 0)) {
    throw new ValidationError('firstname cannot be empty', 'firstname');
  }

  if (user.lastname !== undefined && (!user.lastname || user.lastname.trim().length === 0)) {
    throw new ValidationError('lastname cannot be empty', 'lastname');
  }

  if (user.mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.mail)) {
    throw new ValidationError('invalid email format', 'mail');
  }
}

export function validatePaginationParams(params: { limit?: number; offset?: number }): void {
  if (params.limit !== undefined && (!Number.isInteger(params.limit) || params.limit <= 0 || params.limit > 100)) {
    throw new ValidationError('limit must be a positive integer between 1 and 100', 'limit');
  }

  if (params.offset !== undefined && (!Number.isInteger(params.offset) || params.offset < 0)) {
    throw new ValidationError('offset must be a non-negative integer', 'offset');
  }
}

export function validateId(id: number | string, fieldName: string = 'id'): void {
  if (typeof id === 'number') {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(`${fieldName} must be a positive integer`, fieldName);
    }
  } else if (typeof id === 'string') {
    if (!id || id.trim().length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
    }
  } else {
    throw new ValidationError(`${fieldName} must be a number or string`, fieldName);
  }
}