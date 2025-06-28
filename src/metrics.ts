/**
 * System metrics collection and health monitoring
 */

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  memory: MemoryMetrics;
  redmine: RedmineHealthCheck;
  tools: ToolsMetrics;
  errors?: string[];
}

export interface SystemMetrics {
  memory: MemoryMetrics;
  cpu: CpuMetrics;
  uptime: number;
  timestamp: string;
  requests: RequestMetrics;
}

export interface MemoryMetrics {
  used: number;
  total: number;
  free: number;
  percentage: number;
}

export interface CpuMetrics {
  usage: number;
  load_average: number[];
}

export interface RedmineHealthCheck {
  status: 'connected' | 'error' | 'unknown';
  response_time?: number;
  error?: string;
}

export interface ToolsMetrics {
  registered: number;
  available: string[];
}

export interface RequestMetrics {
  total: number;
  success: number;
  errors: number;
  rate_limited: number;
}

export class MetricsCollector {
  private startTime: number;
  private requestStats: RequestMetrics;

  constructor() {
    this.startTime = Date.now();
    this.requestStats = {
      total: 0,
      success: 0,
      errors: 0,
      rate_limited: 0
    };
  }

  getUptime(): number {
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  getMemoryMetrics(): MemoryMetrics {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = require('os').totalmem();
      const freeMemory = require('os').freemem();
      const usedMemory = memUsage.heapUsed;
      
      return {
        used: usedMemory,
        total: totalMemory,
        free: freeMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100 * 100) / 100
      };
    } catch (error) {
      throw new Error(`Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getCpuMetrics(): CpuMetrics {
    try {
      const os = require('os');
      const loadavg = os.loadavg();
      const cpus = os.cpus();
      
      // Simple CPU usage calculation
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach((cpu: any) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = Math.round((100 - (idle / total) * 100) * 100) / 100;
      
      return {
        usage: usage,
        load_average: loadavg
      };
    } catch (error) {
      return {
        usage: 0,
        load_average: [0, 0, 0]
      };
    }
  }

  getSystemMetrics(): SystemMetrics {
    return {
      memory: this.getMemoryMetrics(),
      cpu: this.getCpuMetrics(),
      uptime: this.getUptime(),
      timestamp: new Date().toISOString(),
      requests: { ...this.requestStats }
    };
  }

  recordRequest(success: boolean, rateLimited: boolean = false): void {
    this.requestStats.total++;
    if (success) {
      this.requestStats.success++;
    } else {
      this.requestStats.errors++;
    }
    if (rateLimited) {
      this.requestStats.rate_limited++;
    }
  }

  getRequestMetrics(): RequestMetrics {
    return { ...this.requestStats };
  }

  async checkRedmineHealth(redmineClient: any): Promise<RedmineHealthCheck> {
    try {
      const startTime = Date.now();
      await redmineClient.listProjects({ limit: 1 });
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'connected',
        response_time: responseTime
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getHealthStatus(redmineClient: any, toolsCount: number): Promise<HealthStatus> {
    const errors: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    try {
      const memory = this.getMemoryMetrics();
      const redmineHealth = await this.checkRedmineHealth(redmineClient);
      
      // Determine overall health status
      if (redmineHealth.status === 'error') {
        status = 'degraded';
      }
      
      if (memory.percentage > 90) {
        status = 'degraded';
        errors.push('High memory usage detected');
      }

      const healthStatus: HealthStatus = {
        status,
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        version: '1.0.0',
        memory,
        redmine: redmineHealth,
        tools: {
          registered: toolsCount,
          available: [] // Will be populated by server
        }
      };

      if (errors.length > 0) {
        healthStatus.errors = errors;
      }

      return healthStatus;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown health check error');
      
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        uptime: this.getUptime(),
        version: '1.0.0',
        memory: { used: 0, total: 0, free: 0, percentage: 0 },
        redmine: { status: 'unknown' },
        tools: { registered: toolsCount, available: [] },
        errors
      };
    }
  }
}