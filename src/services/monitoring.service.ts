import { HealthService } from './health.service';
import fs from 'fs/promises';
import path from 'path';

export interface MonitoringConfig {
  heartbeatInterval: number;
  logRetentionDays: number;
  alertThresholds: {
    memoryUsage: number;
    responseTime: number;
    errorRate: number;
    diskUsage: number;
  };
  externalMonitoring: {
    enabled: boolean;
    url?: string;
    token?: string;
    interval: number;
  };
  selfPing: {
    enabled: boolean;
    url?: string;
    interval: number;
  };
}

export interface MonitoringAlert {
  id: string;
  type: 'memory' | 'response_time' | 'error_rate' | 'disk_usage' | 'service_down';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface UptimeRecord {
  timestamp: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  details?: any;
}

class MonitoringService {
  private static instance: MonitoringService;
  private readonly config: MonitoringConfig;
  private alerts: MonitoringAlert[] = [];
  private uptimeRecords: UptimeRecord[] = [];
  private readonly logDirectory: string;
  private isRunning = false;

  constructor() {
    this.config = this.getDefaultConfig();
    this.logDirectory = path.join(process.cwd(), 'logs', 'monitoring');
    // Initialize log directory asynchronously
    this.ensureLogDirectory().catch(console.error);
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Get default monitoring configuration
   */
  private getDefaultConfig(): MonitoringConfig {
    return {
      heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'), // 30 seconds
      logRetentionDays: parseInt(process.env.LOG_RETENTION_DAYS || '7'),
      alertThresholds: {
        memoryUsage: parseInt(process.env.MEMORY_ALERT_THRESHOLD || '85'),
        responseTime: parseInt(process.env.RESPONSE_TIME_ALERT_THRESHOLD || '5000'),
        errorRate: parseInt(process.env.ERROR_RATE_ALERT_THRESHOLD || '5'),
        diskUsage: parseInt(process.env.DISK_ALERT_THRESHOLD || '90')
      },
      externalMonitoring: {
        enabled: process.env.EXTERNAL_MONITORING_ENABLED === 'true',
        url: process.env.EXTERNAL_MONITORING_URL,
        token: process.env.EXTERNAL_MONITORING_TOKEN,
        interval: parseInt(process.env.EXTERNAL_MONITORING_INTERVAL || '60000') // 1 minute
      },
      selfPing: {
        enabled: process.env.SELF_PING_ENABLED !== 'false', // Default enabled
        url: process.env.SELF_PING_URL || `http://localhost:${process.env.PORT || 3000}/health`,
        interval: parseInt(process.env.SELF_PING_INTERVAL || '300000') // 5 minutes
      }
    };
  }

  /**
   * Start monitoring service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Monitoring service is already running');
      return;
    }

    console.log('🚀 Starting E-Tour monitoring service...');
    this.isRunning = true;

    // Start health service heartbeat
    HealthService.startHeartbeat(this.config.heartbeatInterval);

    // Start uptime tracking
    this.startUptimeTracking();

    // Start alert monitoring
    this.startAlertMonitoring();

    // Start log cleanup
    this.startLogCleanup();

    // Setup graceful shutdown
    this.setupGracefulShutdown();

    console.log('✅ Monitoring service started successfully');
    console.log(`📊 Configuration:
    - Heartbeat interval: ${this.config.heartbeatInterval}ms
    - External monitoring: ${this.config.externalMonitoring.enabled ? 'enabled' : 'disabled'}
    - Self-ping: ${this.config.selfPing.enabled ? 'enabled' : 'disabled'}
    - Log retention: ${this.config.logRetentionDays} days`);
  }

  /**
   * Stop monitoring service
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping monitoring service...');
    this.isRunning = false;

    // Stop health service heartbeat
    HealthService.stopHeartbeat();

    // Save final logs
    await this.saveUptimeRecords();
    await this.saveAlerts();

    console.log('✅ Monitoring service stopped');
  }

  /**
   * Start uptime tracking
   */
  private startUptimeTracking(): void {
    const trackUptime = async () => {
      if (!this.isRunning) return;

      try {
        const health = await HealthService.getDetailedHealth();
        
        let status: 'up' | 'down' | 'degraded';
        if (health.status === 'healthy') {
          status = 'up';
        } else if (health.status === 'degraded') {
          status = 'degraded';
        } else {
          status = 'down';
        }

        const record: UptimeRecord = {
          timestamp: new Date().toISOString(),
          status,
          responseTime: health.metrics.averageResponseTime,
          details: {
            memoryUsage: health.services.memory.details?.usagePercent,
            errorRate: health.metrics.errorRate,
            requestCount: health.metrics.totalRequests
          }
        };

        this.uptimeRecords.push(record);

        // Keep only last 1000 records in memory
        if (this.uptimeRecords.length > 1000) {
          this.uptimeRecords = this.uptimeRecords.slice(-1000);
        }

        // Save to file every 10 minutes
        if (this.uptimeRecords.length % 20 === 0) {
          await this.saveUptimeRecords();
        }

      } catch (error) {
        console.error('❌ Uptime tracking error:', error);
      }

      // Schedule next check
      setTimeout(trackUptime, this.config.heartbeatInterval);
    };

    trackUptime();
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    const checkAlerts = async () => {
      if (!this.isRunning) return;

      try {
        const health = await HealthService.getDetailedHealth();
        
        // Check memory usage
        const memoryUsage = health.services.memory.details?.usagePercent || 0;
        if (memoryUsage > this.config.alertThresholds.memoryUsage) {
          this.createAlert('memory', 'high', `Memory usage is ${memoryUsage}%`);
        }

        // Check response time
        const responseTime = health.metrics.averageResponseTime;
        if (responseTime > this.config.alertThresholds.responseTime) {
          this.createAlert('response_time', 'medium', `Average response time is ${responseTime}ms`);
        }

        // Check error rate
        const errorRate = health.metrics.errorRate;
        if (errorRate > this.config.alertThresholds.errorRate) {
          this.createAlert('error_rate', 'high', `Error rate is ${errorRate}%`);
        }

        // Check service status
        if (health.status === 'unhealthy') {
          this.createAlert('service_down', 'critical', 'Service is unhealthy');
        }

      } catch (error) {
        console.error('❌ Alert monitoring error:', error);
        this.createAlert('service_down', 'critical', 'Health check failed');
      }

      // Schedule next check
      setTimeout(checkAlerts, this.config.heartbeatInterval * 2); // Check every 2 heartbeats
    };

    checkAlerts();
  }

  /**
   * Create an alert
   */
  private createAlert(type: MonitoringAlert['type'], severity: MonitoringAlert['severity'], message: string): void {
    // Check if similar alert already exists and is not resolved
    const existingAlert = this.alerts.find(alert => 
      alert.type === type && 
      !alert.resolved && 
      Date.now() - new Date(alert.timestamp).getTime() < 300000 // 5 minutes
    );

    if (existingAlert) return; // Don't create duplicate alerts

    const alert: MonitoringAlert = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type,
      severity,
      message,
      timestamp: new Date().toISOString(),
      resolved: false
    };

    this.alerts.push(alert);
    
    console.log(`🚨 ALERT [${severity.toUpperCase()}]: ${message}`);
    
    // Keep only last 100 alerts in memory
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Start log cleanup
   */
  private startLogCleanup(): void {
    const cleanup = async () => {
      if (!this.isRunning) return;

      try {
        await this.cleanupOldLogs();
      } catch (error) {
        console.error('❌ Log cleanup error:', error);
      }

      // Schedule next cleanup (daily)
      setTimeout(cleanup, 24 * 60 * 60 * 1000);
    };

    // Start cleanup after 1 hour
    setTimeout(cleanup, 60 * 60 * 1000);
  }

  /**
   * Setup graceful shutdown
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      console.log(`📡 Received ${signal}, starting graceful shutdown...`);
      await this.stop();
      await HealthService.gracefulShutdown();
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // Nodemon restart
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('❌ Failed to create log directory:', error);
    }
  }

  /**
   * Save uptime records to file
   */
  private async saveUptimeRecords(): Promise<void> {
    if (this.uptimeRecords.length === 0) return;

    try {
      const filename = `uptime_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.logDirectory, filename);
      
      await fs.writeFile(filepath, JSON.stringify(this.uptimeRecords, null, 2));
    } catch (error) {
      console.error('❌ Failed to save uptime records:', error);
    }
  }

  /**
   * Save alerts to file
   */
  private async saveAlerts(): Promise<void> {
    if (this.alerts.length === 0) return;

    try {
      const filename = `alerts_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.logDirectory, filename);
      
      await fs.writeFile(filepath, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('❌ Failed to save alerts:', error);
    }
  }

  /**
   * Cleanup old log files
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const files = await fs.readdir(this.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);

      for (const file of files) {
        const filepath = path.join(this.logDirectory, file);
        const stats = await fs.stat(filepath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filepath);
          console.log(`🗑️ Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error('❌ Log cleanup failed:', error);
    }
  }

  /**
   * Get current alerts
   */
  getAlerts(): MonitoringAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get uptime statistics
   */
  getUptimeStats(): { uptime: string; availability: number; totalChecks: number } {
    const totalChecks = this.uptimeRecords.length;
    const upChecks = this.uptimeRecords.filter(record => record.status === 'up').length;

    return {
      uptime: HealthService.getUptimeFormatted(),
      availability: totalChecks > 0 ? (upChecks / totalChecks) * 100 : 100,
      totalChecks
    };
  }

  /**
   * Get monitoring configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config };
  }
}

export const monitoringService = MonitoringService.getInstance();
