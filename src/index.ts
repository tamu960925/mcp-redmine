import { RedmineMcpServer } from './server.js';

async function main(): Promise<void> {
  const baseUrl = process.env.REDMINE_BASE_URL;
  const apiKey = process.env.REDMINE_API_KEY;

  if (!baseUrl) {
    console.error('REDMINE_BASE_URL environment variable is required');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('REDMINE_API_KEY environment variable is required');
    process.exit(1);
  }

  const server = new RedmineMcpServer({
    baseUrl,
    apiKey
  });

  try {
    await server.start();
    console.error('Redmine MCP Server started successfully');
  } catch (error) {
    console.error('Failed to start Redmine MCP Server:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}