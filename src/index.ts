import { RedmineMcpServer } from './server.js';
import { logger, LogLevel } from './logger.js';

async function main(): Promise<void> {
  // Set log level from environment variable
  const logLevel = process.env.LOG_LEVEL || 'info';
  switch (logLevel.toLowerCase()) {
    case 'debug':
      logger.setLevel(LogLevel.DEBUG);
      break;
    case 'info':
      logger.setLevel(LogLevel.INFO);
      break;
    case 'warn':
      logger.setLevel(LogLevel.WARN);
      break;
    case 'error':
      logger.setLevel(LogLevel.ERROR);
      break;
    default:
      logger.setLevel(LogLevel.INFO);
  }

  const baseUrl = process.env.REDMINE_BASE_URL;
  const apiKey = process.env.REDMINE_API_KEY;

  if (!baseUrl) {
    logger.error('REDMINE_BASE_URL environment variable is required');
    process.exit(1);
  }

  if (!apiKey) {
    logger.error('REDMINE_API_KEY environment variable is required');
    process.exit(1);
  }

  const server = new RedmineMcpServer({
    baseUrl,
    apiKey
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully');
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error as Error);
      process.exit(1);
    }
  });

  try {
    await server.start();
  } catch (error) {
    logger.error('Failed to start Redmine MCP Server', error as Error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}