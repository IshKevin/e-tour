import { HealthService } from './health.service';

export interface KeepAliveConfig {
  enabled: boolean;
  interval: number; // in milliseconds
  url?: string;
  timeout: number;
  retries: number;
  services: {
    uptimeRobot?: {
      enabled: boolean;
      monitors: string[];
    };
    pingdom?: {
      enabled: boolean;
      url: string;
    };
    newRelic?: {
      enabled: boolean;
      licenseKey: string;
    };
    custom?: {
      enabled: boolean;
      webhooks: string[];
    };
  };
}

class KeepAliveService {
  private static instance: KeepAliveService;
  private config: KeepAliveConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): KeepAliveService {
    if (!KeepAliveService.instance) {
      KeepAliveService.instance = new KeepAliveService();
    }
    return KeepAliveService.instance;
  }

  /**
   * Get default keep-alive configuration
   */
  private getDefaultConfig(): KeepAliveConfig {
    return {
      enabled: process.env.KEEP_ALIVE_ENABLED !== 'false',
      interval: parseInt(process.env.KEEP_ALIVE_INTERVAL || '300000'), // 5 minutes
      url: process.env.KEEP_ALIVE_URL || process.env.SELF_PING_URL,
      timeout: parseInt(process.env.KEEP_ALIVE_TIMEOUT || '30000'), // 30 seconds
      retries: parseInt(process.env.KEEP_ALIVE_RETRIES || '3'),
      services: {
        uptimeRobot: {
          enabled: process.env.UPTIME_ROBOT_ENABLED === 'true',
          monitors: process.env.UPTIME_ROBOT_MONITORS?.split(',') || []
        },
        pingdom: {
          enabled: process.env.PINGDOM_ENABLED === 'true',
          url: process.env.PINGDOM_WEBHOOK_URL || ''
        },
        newRelic: {
          enabled: process.env.NEW_RELIC_ENABLED === 'true',
          licenseKey: process.env.NEW_RELIC_LICENSE_KEY || ''
        },
        custom: {
          enabled: process.env.CUSTOM_MONITORING_ENABLED === 'true',
          webhooks: process.env.CUSTOM_MONITORING_WEBHOOKS?.split(',') || []
        }
      }
    };
  }

  /**
   * Start keep-alive service
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('⏸️ Keep-alive service is disabled');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️ Keep-alive service is already running');
      return;
    }

    console.log(`🔄 Starting keep-alive service (interval: ${this.config.interval}ms)`);
    this.isRunning = true;

    // Start the keep-alive loop
    this.intervalId = setInterval(() => {
      this.performKeepAlive();
    }, this.config.interval);

    // Perform initial keep-alive
    this.performKeepAlive();
  }

  /**
   * Stop keep-alive service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Keep-alive service stopped');
  }

  /**
   * Perform keep-alive operations
   */
  private async performKeepAlive(): Promise<void> {
    if (!this.isRunning) return;

    try {
      console.log('💓 Performing keep-alive check...');

      // Self-ping to prevent sleeping
      await this.selfPing();

      // Notify external monitoring services
      await this.notifyExternalServices();

      console.log('✅ Keep-alive check completed');
    } catch (error) {
      console.error('❌ Keep-alive check failed:', error);
    }
  }

  /**
   * Self-ping to keep the service alive
   */
  private async selfPing(): Promise<void> {
    const url = this.config.url || `http://localhost:${process.env.PORT || 3000}/ping`;
    
    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'E-Tour-KeepAlive/1.0',
            'X-Keep-Alive': 'true'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          console.log(`🔄 Self-ping successful (attempt ${attempt})`);
          return;
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error: any) {
        console.warn(`⚠️ Self-ping attempt ${attempt} failed:`, error.message);
        
        if (attempt === this.config.retries) {
          throw new Error(`Self-ping failed after ${this.config.retries} attempts`);
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Notify external monitoring services
   */
  private async notifyExternalServices(): Promise<void> {
    const promises: Promise<void>[] = [];

    // UptimeRobot
    if (this.config.services.uptimeRobot?.enabled) {
      promises.push(this.notifyUptimeRobot());
    }

    // Pingdom
    if (this.config.services.pingdom?.enabled) {
      promises.push(this.notifyPingdom());
    }

    // New Relic
    if (this.config.services.newRelic?.enabled) {
      promises.push(this.notifyNewRelic());
    }

    // Custom webhooks
    if (this.config.services.custom?.enabled) {
      promises.push(this.notifyCustomWebhooks());
    }

    // Execute all notifications in parallel
    await Promise.allSettled(promises);
  }

  /**
   * Notify UptimeRobot
   */
  private async notifyUptimeRobot(): Promise<void> {
    try {
      const health = await HealthService.getDetailedHealth();
      
      // UptimeRobot typically uses HTTP monitoring, so we just ensure our endpoint is accessible
      console.log('📊 UptimeRobot monitoring active');
    } catch (error) {
      console.warn('⚠️ UptimeRobot notification failed:', error);
    }
  }

  /**
   * Notify Pingdom
   */
  private async notifyPingdom(): Promise<void> {
    if (!this.config.services.pingdom?.url) return;

    try {
      const health = await HealthService.getDetailedHealth();
      
      await fetch(this.config.services.pingdom.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'E-Tour-KeepAlive/1.0'
        },
        body: JSON.stringify({
          service: 'e-tour-backend',
          status: health.status,
          timestamp: health.timestamp,
          uptime: health.uptime
        }),
        signal: AbortSignal.timeout(10000)
      });

      console.log('📊 Pingdom notification sent');
    } catch (error) {
      console.warn('⚠️ Pingdom notification failed:', error);
    }
  }

  /**
   * Notify New Relic
   */
  private async notifyNewRelic(): Promise<void> {
    if (!this.config.services.newRelic?.licenseKey) return;

    try {
      const health = await HealthService.getDetailedHealth();
      
      await fetch('https://insights-collector.newrelic.com/v1/accounts/YOUR_ACCOUNT_ID/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Insert-Key': this.config.services.newRelic.licenseKey,
          'User-Agent': 'E-Tour-KeepAlive/1.0'
        },
        body: JSON.stringify([{
          eventType: 'ETourHeartbeat',
          service: 'e-tour-backend',
          status: health.status,
          uptime: health.uptime,
          memoryUsage: health.services.memory.details?.usagePercent,
          responseTime: health.metrics.averageResponseTime,
          errorRate: health.metrics.errorRate,
          timestamp: Date.now()
        }]),
        signal: AbortSignal.timeout(10000)
      });

      console.log('📊 New Relic event sent');
    } catch (error) {
      console.warn('⚠️ New Relic notification failed:', error);
    }
  }

  /**
   * Notify custom webhooks
   */
  private async notifyCustomWebhooks(): Promise<void> {
    const webhooks = this.config.services.custom?.webhooks || [];
    
    if (webhooks.length === 0) return;

    try {
      const health = await HealthService.getDetailedHealth();
      
      const payload = {
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
        },
        services: {
          database: health.services.database.status,
          email: health.services.email.status,
          upload: health.services.upload.status
        }
      };

      const promises = webhooks.map(webhook =>
        fetch(webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'E-Tour-KeepAlive/1.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000)
        }).catch(error => {
          console.warn(`⚠️ Custom webhook failed (${webhook}):`, error.message);
        })
      );

      await Promise.allSettled(promises);
      console.log(`📊 Custom webhooks notified (${webhooks.length})`);
    } catch (error) {
      console.warn('⚠️ Custom webhook notifications failed:', error);
    }
  }

  /**
   * Get keep-alive status
   */
  getStatus(): { running: boolean; config: KeepAliveConfig; nextCheck?: string } {
    return {
      running: this.isRunning,
      config: this.config,
      nextCheck: this.isRunning ? 
        new Date(Date.now() + this.config.interval).toISOString() : 
        undefined
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<KeepAliveConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

export const keepAliveService = KeepAliveService.getInstance();
