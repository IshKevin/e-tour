import { HealthService } from './health.service';

export interface SimpleHeartbeatConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  selfPingEnabled: boolean;
  selfPingUrl?: string;
  logHeartbeat: boolean;
}

class SimpleHeartbeatService {
  private static instance: SimpleHeartbeatService;
  private config: SimpleHeartbeatConfig;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private startTime: number;
  private heartbeatCount = 0;
  private lastHeartbeat: Date | null = null;

  constructor() {
    this.config = this.getDefaultConfig();
    this.startTime = Date.now();
  }

  static getInstance(): SimpleHeartbeatService {
    if (!SimpleHeartbeatService.instance) {
      SimpleHeartbeatService.instance = new SimpleHeartbeatService();
    }
    return SimpleHeartbeatService.instance;
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): SimpleHeartbeatConfig {
    return {
      enabled: process.env.SIMPLE_HEARTBEAT_ENABLED !== 'false',
      interval: parseInt(process.env.HEARTBEAT_INTERVAL || '30000'), // 30 seconds
      selfPingEnabled: process.env.SELF_PING_ENABLED !== 'false',
      selfPingUrl: process.env.SELF_PING_URL || `http://localhost:${process.env.PORT || 3000}/ping`,
      logHeartbeat: process.env.LOG_HEARTBEAT !== 'false'
    };
  }

  /**
   * Start the simple heartbeat service
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('⏸️ Simple heartbeat service is disabled');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️ Simple heartbeat service is already running');
      return;
    }

    console.log(`🫀 Starting simple heartbeat service (interval: ${this.config.interval}ms)`);
    this.isRunning = true;

    // Start the heartbeat loop
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, this.config.interval);

    // Perform initial heartbeat
    this.performHeartbeat();
  }

  /**
   * Stop the heartbeat service
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Simple heartbeat service stopped');
  }

  /**
   * Perform a heartbeat check
   */
  private async performHeartbeat(): Promise<void> {
    if (!this.isRunning) return;

    try {
      this.heartbeatCount++;
      this.lastHeartbeat = new Date();

      // Get basic health status
      const health = HealthService.getBasicHealth();
      
      // Log heartbeat if enabled (reduce logging in production)
      if (this.config.logHeartbeat && process.env.NODE_ENV !== 'production') {
        const uptime = this.getUptimeFormatted();
        console.log(`💓 Heartbeat #${this.heartbeatCount} | Status: ${health.status} | Uptime: ${uptime}`);
      } else if (process.env.NODE_ENV === 'production' && this.heartbeatCount % 20 === 0) {
        // Log every 20th heartbeat in production (every 10 minutes with 30s interval)
        const uptime = this.getUptimeFormatted();
        console.log(`💓 Production Heartbeat #${this.heartbeatCount} | Status: ${health.status} | Uptime: ${uptime}`);
      }

      // Perform self-ping if enabled
      if (this.config.selfPingEnabled) {
        await this.performSelfPing();
      }

    } catch (error) {
      console.error('❌ Heartbeat failed:', error);
    }
  }

  /**
   * Perform self-ping to keep service alive
   */
  private async performSelfPing(): Promise<void> {
    if (!this.config.selfPingUrl) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this.config.selfPingUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Simple-Heartbeat/1.0',
          'X-Heartbeat': 'true'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('🔄 Self-ping successful');
        }
      } else {
        console.warn(`⚠️ Self-ping failed: HTTP ${response.status}`);
      }
    } catch (error: any) {
      // Don't log fetch errors in detail to avoid spam
      console.debug('Self-ping error:', error.message);
    }
  }

  /**
   * Get uptime in human readable format
   */
  private getUptimeFormatted(): string {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  /**
   * Get heartbeat status
   */
  getStatus(): {
    running: boolean;
    heartbeatCount: number;
    lastHeartbeat: string | null;
    uptime: string;
    config: SimpleHeartbeatConfig;
  } {
    return {
      running: this.isRunning,
      heartbeatCount: this.heartbeatCount,
      lastHeartbeat: this.lastHeartbeat?.toISOString() || null,
      uptime: this.getUptimeFormatted(),
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<SimpleHeartbeatConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  /**
   * Get heartbeat statistics
   */
  getStats(): {
    totalHeartbeats: number;
    averageInterval: number;
    uptime: number;
    lastHeartbeat: Date | null;
  } {
    const uptimeMs = Date.now() - this.startTime;
    const averageInterval = this.heartbeatCount > 0 ? uptimeMs / this.heartbeatCount : 0;

    return {
      totalHeartbeats: this.heartbeatCount,
      averageInterval: Math.round(averageInterval),
      uptime: Math.floor(uptimeMs / 1000),
      lastHeartbeat: this.lastHeartbeat
    };
  }

  /**
   * Check if heartbeat is healthy (last heartbeat within expected interval)
   */
  isHealthy(): boolean {
    if (!this.isRunning) return false;
    if (!this.lastHeartbeat) return false;

    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
    const maxExpectedInterval = this.config.interval * 2; // Allow 2x interval as buffer

    return timeSinceLastHeartbeat <= maxExpectedInterval;
  }

  /**
   * Force a heartbeat (useful for testing)
   */
  async forceHeartbeat(): Promise<void> {
    await this.performHeartbeat();
  }

  /**
   * Reset heartbeat statistics
   */
  resetStats(): void {
    this.heartbeatCount = 0;
    this.startTime = Date.now();
    this.lastHeartbeat = null;
  }
}

export const simpleHeartbeatService = SimpleHeartbeatService.getInstance();
