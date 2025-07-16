import { db } from '../db';
import { sql } from 'drizzle-orm';
import { EmailService } from './email.service';
import { UploadService } from './upload.service';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
}

export interface DetailedHealthStatus extends HealthStatus {
  services: {
    database: ServiceHealth;
    email: ServiceHealth;
    upload: ServiceHealth;
    memory: ServiceHealth;
    disk: ServiceHealth;
  };
  metrics: {
    totalRequests: number;
    activeConnections: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastChecked: string;
  error?: string;
  details?: any;
}

export class HealthService {
  private static startTime = Date.now();
  private static requestCount = 0;
  private static totalResponseTime = 0;
  private static errorCount = 0;
  private static lastHealthCheck: DetailedHealthStatus | null = null;
  private static heartbeatInterval: NodeJS.Timeout | null = null;
  private static isShuttingDown = false;

  /**
   * Get basic health status
   */
  static getBasicHealth(): HealthStatus {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
  }

  /**
   * Get detailed health status with all service checks
   */
  static async getDetailedHealth(): Promise<DetailedHealthStatus> {
    const basicHealth = this.getBasicHealth();
    
    // Run all health checks in parallel
    const [
      databaseHealth,
      emailHealth,
      uploadHealth,
      memoryHealth,
      diskHealth
    ] = await Promise.allSettled([
      this.checkDatabaseHealth(),
      this.checkEmailHealth(),
      this.checkUploadHealth(),
      this.checkMemoryHealth(),
      this.checkDiskHealth()
    ]);

    const services = {
      database: this.getServiceResult(databaseHealth),
      email: this.getServiceResult(emailHealth),
      upload: this.getServiceResult(uploadHealth),
      memory: this.getServiceResult(memoryHealth),
      disk: this.getServiceResult(diskHealth)
    };

    // Determine overall status
    const serviceStatuses = Object.values(services).map(s => s.status);
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (serviceStatuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      overallStatus = 'degraded';
    }

    const detailedHealth: DetailedHealthStatus = {
      ...basicHealth,
      status: overallStatus,
      services,
      metrics: {
        totalRequests: this.requestCount,
        activeConnections: this.getActiveConnections(),
        averageResponseTime: this.requestCount > 0 ? this.totalResponseTime / this.requestCount : 0,
        errorRate: this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0
      }
    };

    this.lastHealthCheck = detailedHealth;
    return detailedHealth;
  }

  /**
   * Check database connectivity and performance
   */
  private static async checkDatabaseHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await db.execute(sql`SELECT 1 as health_check`);
      
      const responseTime = Date.now() - startTime;

      return {
        status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'unhealthy',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: {
          connectionStatus: 'active',
          queryTime: responseTime
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message,
        details: { connectionError: true }
      };
    }
  }

  /**
   * Check email service health
   */
  private static async checkEmailHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Test SMTP connection (mocked in test environment)
      if (process.env.NODE_ENV === 'test') {
        return {
          status: 'healthy',
          responseTime: 50,
          lastChecked: new Date().toISOString(),
          details: { mocked: true }
        };
      }

      // In production, test actual SMTP connection
      const testResult = await EmailService.sendEmail({
        to: process.env.HEALTH_CHECK_EMAIL || 'health@etour.rw',
        subject: 'Health Check',
        html: '<p>System health check - please ignore</p>',
        text: 'System health check - please ignore'
      });

      const responseTime = Date.now() - startTime;

      return {
        status: testResult && responseTime < 5000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: { emailSent: testResult }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check upload service (Cloudinary) health
   */
  private static async checkUploadHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      if (process.env.NODE_ENV === 'test') {
        return {
          status: 'healthy',
          responseTime: 100,
          lastChecked: new Date().toISOString(),
          details: { mocked: true }
        };
      }

      // Test Cloudinary connection by getting account details
      const cloudinary = require('cloudinary').v2;
      const result = await cloudinary.api.ping();

      const responseTime = Date.now() - startTime;

      return {
        status: result && responseTime < 3000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        details: { cloudinaryPing: result }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check memory usage
   */
  private static async checkMemoryHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (memoryUsagePercent > 90) {
        status = 'unhealthy';
      } else if (memoryUsagePercent > 75) {
        status = 'degraded';
      }

      return {
        status,
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent)
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Check disk usage (simplified)
   */
  private static async checkDiskHealth(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // For now, just return healthy status
      // In production, you might want to check actual disk usage
      return {
        status: 'healthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        details: {
          available: 'N/A',
          note: 'Disk monitoring not implemented'
        }
      };
    } catch (error: any) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Helper to extract service result from Promise.allSettled
   */
  private static getServiceResult(result: PromiseSettledResult<ServiceHealth>): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        responseTime: 0,
        lastChecked: new Date().toISOString(),
        error: result.reason?.message || 'Unknown error'
      };
    }
  }

  /**
   * Get active connections (simplified)
   */
  private static getActiveConnections(): number {
    // This is a simplified implementation
    // In production, you might want to track actual connection counts
    return 0;
  }

  /**
   * Record request metrics
   */
  static recordRequest(responseTime: number, isError: boolean = false) {
    this.requestCount++;
    this.totalResponseTime += responseTime;
    if (isError) {
      this.errorCount++;
    }
  }

  /**
   * Get last health check result (cached)
   */
  static getLastHealthCheck(): DetailedHealthStatus | null {
    return this.lastHealthCheck;
  }

  /**
   * Reset metrics (useful for testing)
   */
  static resetMetrics() {
    this.requestCount = 0;
    this.totalResponseTime = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
  }

  /**
   * Start heartbeat monitoring
   */
  static startHeartbeat(intervalMs: number = 30000) {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    console.log(`🫀 Starting heartbeat monitoring every ${intervalMs}ms`);

    this.heartbeatInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        const health = await this.getDetailedHealth();

        // Log heartbeat status
        console.log(`💓 Heartbeat: ${health.status} | Uptime: ${Math.floor(health.uptime / 1000)}s | Memory: ${health.services.memory.details?.usagePercent}%`);

        // Send heartbeat to external monitoring if configured
        await this.sendExternalHeartbeat(health);

        // Self-ping to keep service alive
        await this.selfPing();

      } catch (error) {
        console.error('❌ Heartbeat check failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop heartbeat monitoring
   */
  static stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('🛑 Heartbeat monitoring stopped');
    }
  }

  /**
   * Send heartbeat to external monitoring service
   */
  private static async sendExternalHeartbeat(health: DetailedHealthStatus) {
    const heartbeatUrl = process.env.HEARTBEAT_URL;
    const heartbeatToken = process.env.HEARTBEAT_TOKEN;

    if (!heartbeatUrl) return;

    try {
      const response = await fetch(heartbeatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': heartbeatToken ? `Bearer ${heartbeatToken}` : '',
          'User-Agent': 'E-Tour-Backend-Heartbeat/1.0'
        },
        body: JSON.stringify({
          service: 'e-tour-backend',
          status: health.status,
          timestamp: health.timestamp,
          uptime: health.uptime,
          environment: health.environment,
          version: health.version,
          metrics: {
            requests: health.metrics.totalRequests,
            errors: health.metrics.errorRate,
            responseTime: health.metrics.averageResponseTime,
            memory: health.services.memory.details?.usagePercent
          }
        }),
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        console.warn(`⚠️ External heartbeat failed: ${response.status}`);
      }
    } catch (error) {
      // Silently fail external heartbeat to not affect main service
      console.debug('External heartbeat error:', error);
    }
  }

  /**
   * Self-ping to keep service alive (prevents sleeping)
   */
  private static async selfPing() {
    const selfUrl = process.env.SELF_PING_URL || `http://localhost:${process.env.PORT || 3000}/health`;

    try {
      const response = await fetch(selfUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'E-Tour-Self-Ping/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (response.ok) {
        console.debug('🔄 Self-ping successful');
      } else {
        console.warn(`⚠️ Self-ping failed: ${response.status}`);
      }
    } catch (error) {
      console.debug('Self-ping error:', error);
    }
  }

  /**
   * Graceful shutdown
   */
  static async gracefulShutdown() {
    console.log('🔄 Starting graceful shutdown...');
    this.isShuttingDown = true;

    // Stop heartbeat
    this.stopHeartbeat();

    // Wait for ongoing requests to complete
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ Graceful shutdown complete');
  }

  /**
   * Get uptime in human readable format
   */
  static getUptimeFormatted(): string {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Check if service is healthy
   */
  static async isHealthy(): Promise<boolean> {
    try {
      const health = await this.getDetailedHealth();
      return health.status === 'healthy';
    } catch {
      return false;
    }
  }
}
