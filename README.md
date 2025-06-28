# Redmine MCP Server

[![CI](https://github.com/tamu960925/mcp-redmine/workflows/CI/badge.svg)](https://github.com/tamu960925/mcp-redmine/actions)
[![CodeQL](https://github.com/tamu960925/mcp-redmine/workflows/CodeQL/badge.svg)](https://github.com/tamu960925/mcp-redmine/actions)

A Model Context Protocol (MCP) server for Redmine integration, built with TypeScript following TDD methodology. This server allows AI assistants to interact with Redmine instances to manage issues, projects, and users with comprehensive security and monitoring features.

## Features

- **Issue Management**: Create, read, update, and list issues
- **Project Management**: List and view project details
- **User Management**: List and view user information
- **Error Handling**: Comprehensive error handling with meaningful error messages
- **Type Safety**: Full TypeScript implementation with proper type definitions

## Installation

```bash
npm install
npm run build
```

## Configuration

The server requires two environment variables:

- `REDMINE_BASE_URL`: The base URL of your Redmine instance (e.g., `https://redmine.example.com`)
- `REDMINE_API_KEY`: Your Redmine API key (found in your account settings)

## Usage

### Running the Server

```bash
export REDMINE_BASE_URL="https://your-redmine-instance.com"
export REDMINE_API_KEY="your-api-key-here"
npm run dev
```

### Building and Running

```bash
npm run build
export REDMINE_BASE_URL="https://your-redmine-instance.com"
export REDMINE_API_KEY="your-api-key-here"
npm start
```

### Production Deployment

```bash
# Build the project
npm run build

# Set production environment variables
export REDMINE_BASE_URL="https://your-redmine-instance.com"
export REDMINE_API_KEY="your-api-key-here"
export LOG_LEVEL="info"

# Start the server
npm start
```

## Available Tools

### Issue Tools

- **list-issues**: List issues with optional filtering
  - Parameters: `project_id`, `status_id`, `assigned_to_id`, `limit`, `offset`
  
- **create-issue**: Create a new issue
  - Required: `project_id`, `subject`
  - Optional: `description`, `tracker_id`, `status_id`, `priority_id`, `assigned_to_id`
  
- **get-issue**: Get details of a specific issue
  - Required: `id`
  
- **update-issue**: Update an existing issue
  - Required: `id`
  - Optional: `subject`, `description`, `status_id`, `priority_id`, `assigned_to_id`, `done_ratio`

### Project Tools

- **list-projects**: List all projects
  
- **get-project**: Get details of a specific project
  - Required: `id` (can be numeric ID or string identifier)

### User Tools

- **list-users**: List all users
  
- **get-user**: Get details of a specific user
  - Required: `id`

## Development

### Running Tests

```bash
npm test
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

### Running in Watch Mode

```bash
npm run test:watch
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

### Clean Build Directory

```bash
npm run clean
```

## API Reference

### RedmineClient

The core client for interacting with Redmine's REST API.

```typescript
const client = new RedmineClient({
  baseUrl: 'https://redmine.example.com',
  apiKey: 'your-api-key'
});
```

### RedmineMcpServer

The MCP server that exposes Redmine functionality as MCP tools.

```typescript
const server = new RedmineMcpServer({
  baseUrl: 'https://redmine.example.com',
  apiKey: 'your-api-key'
});

await server.start();
```

## Error Handling

The server provides comprehensive error handling for common scenarios:

- **Authentication errors (401)**: Invalid API key
- **Authorization errors (403)**: Insufficient permissions
- **Not found errors (404)**: Resource doesn't exist
- **Validation errors (422)**: Invalid data provided
- **Server errors (500)**: Internal server issues
- **Network errors**: Connection timeouts and network issues
- **Input validation**: Client-side validation with detailed error messages

## Logging

The server includes structured logging with configurable levels:

- **DEBUG**: Detailed execution information and request/response data
- **INFO**: General operational information (default)
- **WARN**: Warning conditions that don't affect operation
- **ERROR**: Error conditions that require attention

Configure the log level using the `LOG_LEVEL` environment variable:

```bash
export LOG_LEVEL="debug"  # For development
export LOG_LEVEL="info"   # For production (default)
export LOG_LEVEL="error"  # For minimal logging
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT License