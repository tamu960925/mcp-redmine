import {
  ValidationError,
  validateIssueData,
  validateProjectData,
  validateUserData,
  validatePaginationParams,
  validateId
} from '../validation.js';

describe('Validation Tests', () => {
  describe('validateIssueData', () => {
    it('should validate valid issue data', () => {
      const validIssue = {
        project_id: 1,
        subject: 'Valid issue',
        description: 'Valid description',
        done_ratio: 50,
        estimated_hours: 8
      };

      expect(() => validateIssueData(validIssue)).not.toThrow();
    });

    it('should throw error for invalid project_id', () => {
      expect(() => validateIssueData({ project_id: 0 })).toThrow(ValidationError);
      expect(() => validateIssueData({ project_id: -1 })).toThrow(ValidationError);
      expect(() => validateIssueData({ project_id: 1.5 })).toThrow(ValidationError);
    });

    it('should throw error for empty subject', () => {
      expect(() => validateIssueData({ subject: '' })).toThrow(ValidationError);
      expect(() => validateIssueData({ subject: '   ' })).toThrow(ValidationError);
    });

    it('should throw error for subject too long', () => {
      const longSubject = 'a'.repeat(256);
      expect(() => validateIssueData({ subject: longSubject })).toThrow(ValidationError);
    });

    it('should throw error for invalid done_ratio', () => {
      expect(() => validateIssueData({ done_ratio: -1 })).toThrow(ValidationError);
      expect(() => validateIssueData({ done_ratio: 101 })).toThrow(ValidationError);
    });

    it('should throw error for negative estimated_hours', () => {
      expect(() => validateIssueData({ estimated_hours: -1 })).toThrow(ValidationError);
    });
  });

  describe('validateProjectData', () => {
    it('should validate valid project data', () => {
      const validProject = {
        name: 'Valid Project',
        identifier: 'valid-project',
        description: 'Valid description'
      };

      expect(() => validateProjectData(validProject)).not.toThrow();
    });

    it('should throw error for empty name', () => {
      expect(() => validateProjectData({ name: '' })).toThrow(ValidationError);
      expect(() => validateProjectData({ name: '   ' })).toThrow(ValidationError);
    });

    it('should throw error for empty identifier', () => {
      expect(() => validateProjectData({ identifier: '' })).toThrow(ValidationError);
      expect(() => validateProjectData({ identifier: '   ' })).toThrow(ValidationError);
    });

    it('should throw error for invalid identifier format', () => {
      expect(() => validateProjectData({ identifier: 'Invalid Identifier' })).toThrow(ValidationError);
      expect(() => validateProjectData({ identifier: 'invalid@identifier' })).toThrow(ValidationError);
      expect(() => validateProjectData({ identifier: 'INVALID' })).toThrow(ValidationError);
    });

    it('should accept valid identifier formats', () => {
      expect(() => validateProjectData({ identifier: 'valid-identifier' })).not.toThrow();
      expect(() => validateProjectData({ identifier: 'valid_identifier' })).not.toThrow();
      expect(() => validateProjectData({ identifier: 'valid123' })).not.toThrow();
    });
  });

  describe('validateUserData', () => {
    it('should validate valid user data', () => {
      const validUser = {
        firstname: 'John',
        lastname: 'Doe',
        mail: 'john.doe@example.com'
      };

      expect(() => validateUserData(validUser)).not.toThrow();
    });

    it('should throw error for empty firstname', () => {
      expect(() => validateUserData({ firstname: '' })).toThrow(ValidationError);
      expect(() => validateUserData({ firstname: '   ' })).toThrow(ValidationError);
    });

    it('should throw error for empty lastname', () => {
      expect(() => validateUserData({ lastname: '' })).toThrow(ValidationError);
      expect(() => validateUserData({ lastname: '   ' })).toThrow(ValidationError);
    });

    it('should throw error for invalid email format', () => {
      expect(() => validateUserData({ mail: 'invalid-email' })).toThrow(ValidationError);
      expect(() => validateUserData({ mail: '@example.com' })).toThrow(ValidationError);
      expect(() => validateUserData({ mail: 'user@' })).toThrow(ValidationError);
    });

    it('should accept valid email formats', () => {
      expect(() => validateUserData({ mail: 'user@example.com' })).not.toThrow();
      expect(() => validateUserData({ mail: 'user.name@example.co.uk' })).not.toThrow();
    });
  });

  describe('validatePaginationParams', () => {
    it('should validate valid pagination params', () => {
      expect(() => validatePaginationParams({ limit: 25, offset: 0 })).not.toThrow();
      expect(() => validatePaginationParams({ limit: 100 })).not.toThrow();
      expect(() => validatePaginationParams({ offset: 50 })).not.toThrow();
      expect(() => validatePaginationParams({})).not.toThrow();
    });

    it('should throw error for invalid limit', () => {
      expect(() => validatePaginationParams({ limit: 0 })).toThrow(ValidationError);
      expect(() => validatePaginationParams({ limit: -1 })).toThrow(ValidationError);
      expect(() => validatePaginationParams({ limit: 101 })).toThrow(ValidationError);
      expect(() => validatePaginationParams({ limit: 1.5 })).toThrow(ValidationError);
    });

    it('should throw error for invalid offset', () => {
      expect(() => validatePaginationParams({ offset: -1 })).toThrow(ValidationError);
      expect(() => validatePaginationParams({ offset: 1.5 })).toThrow(ValidationError);
    });
  });

  describe('validateId', () => {
    it('should validate valid numeric IDs', () => {
      expect(() => validateId(1)).not.toThrow();
      expect(() => validateId(123)).not.toThrow();
    });

    it('should validate valid string IDs', () => {
      expect(() => validateId('project-identifier')).not.toThrow();
      expect(() => validateId('user123')).not.toThrow();
    });

    it('should throw error for invalid numeric IDs', () => {
      expect(() => validateId(0)).toThrow(ValidationError);
      expect(() => validateId(-1)).toThrow(ValidationError);
      expect(() => validateId(1.5)).toThrow(ValidationError);
    });

    it('should throw error for empty string IDs', () => {
      expect(() => validateId('')).toThrow(ValidationError);
      expect(() => validateId('   ')).toThrow(ValidationError);
    });

    it('should throw error for invalid types', () => {
      expect(() => validateId(null as any)).toThrow(ValidationError);
      expect(() => validateId(undefined as any)).toThrow(ValidationError);
      expect(() => validateId({} as any)).toThrow(ValidationError);
    });

    it('should use custom field name in error messages', () => {
      try {
        validateId(0, 'project_id');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('project_id');
      }
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with message and field', () => {
      const error = new ValidationError('Test error', 'test_field');
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('test_field');
      expect(error.name).toBe('ValidationError');
    });

    it('should create validation error without field', () => {
      const error = new ValidationError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.field).toBeUndefined();
      expect(error.name).toBe('ValidationError');
    });
  });
});