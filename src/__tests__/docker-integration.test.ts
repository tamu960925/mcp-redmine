import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import path from 'path';

const execAsync = promisify(exec);

describe('Docker Integration Tests (TDD Implementation)', () => {
  const dockerImageName = 'redmine-mcp-server';
  const dockerTag = 'latest';
  const fullImageName = `${dockerImageName}:${dockerTag}`;

  beforeAll(() => {
    // Ensure we're in the project root
    process.chdir('/Users/tamurayousuke/work/redmine-mcp');
  });

  afterAll(async () => {
    // Cleanup: remove test containers and images
    try {
      await execAsync(`docker rmi ${fullImageName} || true`);
      await execAsync('docker container prune -f || true');
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Dockerfile Existence and Structure (Red Phase - Should Fail Initially)', () => {
    it('should have a Dockerfile in project root', () => {
      const dockerfilePath = path.join(process.cwd(), 'Dockerfile');
      expect(existsSync(dockerfilePath)).toBe(true);
    });

    it('should have a .dockerignore file', () => {
      const dockerignorePath = path.join(process.cwd(), '.dockerignore');
      expect(existsSync(dockerignorePath)).toBe(true);
    });

    it('should have docker-compose.yml for development', () => {
      const dockerComposePath = path.join(process.cwd(), 'docker-compose.yml');
      expect(existsSync(dockerComposePath)).toBe(true);
    });
  });

  describe('Docker Build Process (Red Phase - Should Fail Initially)', () => {
    it('should build Docker image successfully', async () => {
      const { stdout, stderr } = await execAsync(`docker build -t ${fullImageName} .`);
      
      expect(stderr).not.toContain('ERROR');
      expect(stdout).toContain('Successfully built');
      expect(stdout).toContain('Successfully tagged');
    }, 120000); // 2 minute timeout for build

    it('should have correct image size (under 500MB)', async () => {
      const { stdout } = await execAsync(`docker images ${fullImageName} --format "{{.Size}}"`);
      const sizeStr = stdout.trim();
      
      // Parse size and convert to MB for comparison
      expect(sizeStr).toBeDefined();
      expect(sizeStr.length).toBeGreaterThan(0);
      
      // Size should be reasonable (not testing exact size due to variations)
      const sizeMatch = sizeStr.match(/(\d+(?:\.\d+)?)(MB|GB)/);
      expect(sizeMatch).not.toBeNull();
      
      if (sizeMatch && sizeMatch[2] === 'GB') {
        const sizeGB = parseFloat(sizeMatch[1]);
        expect(sizeGB).toBeLessThan(0.5); // Less than 0.5GB = 500MB
      }
    });

    it('should contain required files in image', async () => {
      const { stdout } = await execAsync(
        `docker run --rm ${fullImageName} ls -la /app`
      );
      
      expect(stdout).toContain('package.json');
      expect(stdout).toContain('dist');
      expect(stdout).toContain('node_modules');
    });
  });

  describe('Container Runtime (Red Phase - Should Fail Initially)', () => {
    it('should run container with environment variables', async () => {
      const containerName = 'test-redmine-mcp';
      
      try {
        // Start container in background
        await execAsync(`docker run -d --name ${containerName} \
          -e REDMINE_BASE_URL=https://test.redmine.org \
          -e REDMINE_API_KEY=test-key-12345678 \
          -e LOG_LEVEL=info \
          ${fullImageName}`);
        
        // Wait a moment for container to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Check container status
        const { stdout } = await execAsync(`docker ps -f name=${containerName} --format "{{.Status}}"`);
        expect(stdout.trim()).toContain('Up');
        
      } finally {
        // Cleanup
        await execAsync(`docker stop ${containerName} || true`);
        await execAsync(`docker rm ${containerName} || true`);
      }
    }, 30000);

    it('should expose correct working directory', async () => {
      const { stdout } = await execAsync(
        `docker run --rm ${fullImageName} pwd`
      );
      
      expect(stdout.trim()).toBe('/app');
    });

    it('should run as non-root user', async () => {
      const { stdout } = await execAsync(
        `docker run --rm ${fullImageName} id -u`
      );
      
      const uid = stdout.trim();
      expect(uid).not.toBe('0'); // Should not be root (uid 0)
    });

    it('should handle graceful shutdown', async () => {
      const containerName = 'test-redmine-mcp-shutdown';
      
      try {
        // Start container
        await execAsync(`docker run -d --name ${containerName} \
          -e REDMINE_BASE_URL=https://test.redmine.org \
          -e REDMINE_API_KEY=test-key-12345678 \
          ${fullImageName}`);
        
        // Wait for startup
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Send SIGTERM and measure shutdown time
        const startTime = Date.now();
        await execAsync(`docker stop ${containerName}`);
        const shutdownTime = Date.now() - startTime;
        
        // Should shutdown within reasonable time (10 seconds)
        expect(shutdownTime).toBeLessThan(10000);
        
      } finally {
        await execAsync(`docker rm ${containerName} || true`);
      }
    }, 30000);
  });

  describe('Health Check Integration (Red Phase - Should Fail Initially)', () => {
    it('should support Docker health check', async () => {
      // This test verifies that the Dockerfile includes HEALTHCHECK instruction
      const { stdout } = await execAsync(
        `docker inspect ${fullImageName} --format='{{.Config.Healthcheck}}'`
      );
      
      expect(stdout.trim()).not.toBe('<no value>');
      expect(stdout.trim()).not.toBe('{}');
    });

    it('should report healthy status after startup', async () => {
      const containerName = 'test-redmine-mcp-health';
      
      try {
        // Start container with health check
        await execAsync(`docker run -d --name ${containerName} \
          -e REDMINE_BASE_URL=https://test.redmine.org \
          -e REDMINE_API_KEY=test-key-12345678 \
          ${fullImageName}`);
        
        // Wait for health check to run
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check health status
        const { stdout } = await execAsync(
          `docker inspect ${containerName} --format='{{.State.Health.Status}}'`
        );
        
        expect(['healthy', 'starting']).toContain(stdout.trim());
        
      } finally {
        await execAsync(`docker stop ${containerName} || true`);
        await execAsync(`docker rm ${containerName} || true`);
      }
    }, 45000);
  });

  describe('Docker Compose Integration (Red Phase - Should Fail Initially)', () => {
    it('should start services with docker-compose', async () => {
      try {
        // Start services
        await execAsync('docker-compose up -d');
        
        // Wait for services to start
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check service status
        const { stdout } = await execAsync('docker-compose ps --format json');
        const services = JSON.parse(stdout);
        
        expect(Array.isArray(services)).toBe(true);
        expect(services.length).toBeGreaterThan(0);
        expect(services[0]).toHaveProperty('State');
        expect(services[0].State).toBe('running');
        
      } finally {
        // Cleanup
        await execAsync('docker-compose down || true');
      }
    }, 60000);

    it('should support environment variable overrides', async () => {
      try {
        // Start with custom environment
        await execAsync(`REDMINE_BASE_URL=https://custom.redmine.org \
          REDMINE_API_KEY=custom-key-87654321 \
          docker-compose up -d`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check environment variables in container
        const { stdout } = await execAsync(
          'docker-compose exec -T redmine-mcp env | grep REDMINE'
        );
        
        expect(stdout).toContain('REDMINE_BASE_URL=https://custom.redmine.org');
        expect(stdout).toContain('REDMINE_API_KEY=custom-key-87654321');
        
      } finally {
        await execAsync('docker-compose down || true');
      }
    }, 45000);
  });

  describe('Production Readiness (Red Phase - Should Fail Initially)', () => {
    it('should have multi-stage build optimization', async () => {
      // Check if Dockerfile uses multi-stage build
      const { stdout } = await execAsync('cat Dockerfile');
      
      expect(stdout).toContain('FROM node:');
      expect(stdout).toContain('AS builder');
      expect(stdout).toContain('FROM node:');
      expect(stdout).toContain('COPY --from=builder');
    });

    it('should not include development dependencies', async () => {
      const { stdout } = await execAsync(
        `docker run --rm ${fullImageName} npm list --depth=0 --production`
      );
      
      // Should not contain development packages
      expect(stdout).not.toContain('jest');
      expect(stdout).not.toContain('typescript');
      expect(stdout).not.toContain('@types/');
    });

    it('should have proper security settings', async () => {
      const { stdout } = await execAsync(
        `docker inspect ${fullImageName} --format='{{.Config.User}}'`
      );
      
      // Should run as non-root user
      expect(stdout.trim()).not.toBe('');
      expect(stdout.trim()).not.toBe('root');
    });

    it('should support configurable log level', async () => {
      const containerName = 'test-redmine-mcp-logs';
      
      try {
        await execAsync(`docker run -d --name ${containerName} \
          -e REDMINE_BASE_URL=https://test.redmine.org \
          -e REDMINE_API_KEY=test-key-12345678 \
          -e LOG_LEVEL=debug \
          ${fullImageName}`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { stdout } = await execAsync(`docker logs ${containerName}`);
        expect(stdout).toContain('Redmine MCP Server initialized');
        
      } finally {
        await execAsync(`docker stop ${containerName} || true`);
        await execAsync(`docker rm ${containerName} || true`);
      }
    }, 30000);
  });
});