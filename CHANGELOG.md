# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-28

### Added
- Initial implementation of Redmine MCP Server using Test-Driven Development (TDD)
- Complete TypeScript project setup with proper configuration
- Redmine REST API client with full CRUD operations for issues, projects, and users
- MCP server with 8 tools for Redmine operations:
  - `list-issues`: List issues with optional filtering
  - `create-issue`: Create new issues
  - `get-issue`: Get specific issue details
  - `update-issue`: Update existing issues
  - `list-projects`: List all projects
  - `get-project`: Get specific project details
  - `list-users`: List all users
  - `get-user`: Get specific user details
- Comprehensive error handling with user-friendly messages
- HTTP status code handling (401, 403, 404, 422, 500, timeouts)
- Complete input validation system with custom ValidationError class
- Structured logging system with configurable log levels
- Graceful shutdown handling for production deployment
- Full test suite with 50+ tests covering:
  - Unit tests for RedmineClient and RedmineMcpServer
  - Integration tests for API and MCP integration
  - Validation tests for all input types
  - Error handling tests for various scenarios
- Type-safe implementation with proper TypeScript types
- Configuration validation and environment setup
- Complete documentation and usage examples

### Technical Details
- Built with MCP SDK v1.0.0
- TypeScript 5.0+ with strict type checking
- Jest test framework with comprehensive coverage
- Axios for HTTP client with interceptors
- ESM module support
- Production-ready logging and monitoring
- Environment-based configuration

### Documentation
- Complete README.md with installation and usage instructions
- API reference and examples
- Configuration guide with .env.example
- Contributing guidelines
- MIT license

### Development
- TDD methodology following t-wada principles
- ESLint configuration for code quality
- Jest configuration for testing
- TypeScript configuration for modern development
- Git configuration with proper .gitignore