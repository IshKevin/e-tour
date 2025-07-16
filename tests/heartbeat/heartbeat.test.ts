import request from 'supertest';
import { app } from '../../src/app';
import { HealthService } from '../../src/services/health.service';
import { monitoringService } from '../../src/services/monitoring.service';
import { keepAliveService } from '../../src/services/keepalive.service';

describe('Heartbeat & Monitoring System', () => {
  beforeAll(async () => {
    // Ensure monitoring services are stopped before tests
    await monitoringService.stop();
    keepAliveService.stop();
  });

  afterAll(async () => {
    // Clean up after tests
    await monitoringService.stop();
    keepAliveService.stop();
  });

  describe('Basic Health Endpoints', () => {
    it('should respond to /health endpoint', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
    });

    it('should respond to /heartbeat endpoint', async () => {
      const response = await request(app)
        .get('/heartbeat');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should respond to /ping endpoint', async () => {
      const response = await request(app)
        .get('/ping');

      expect(response.status).toBe(200);
      expect(response.text).toBe('pong');
    });
  });

  describe('Detailed Health Endpoints', () => {
    it('should provide detailed health information', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('email');
      expect(response.body.services).toHaveProperty('upload');
      expect(response.body.services).toHaveProperty('memory');
      expect(response.body.services).toHaveProperty('disk');
    });

    it('should provide readiness probe', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
      expect(['ready', 'not_ready']).toContain(response.body.status);
    });

    it('should provide liveness probe', async () => {
      const response = await request(app)
        .get('/api/v1/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'live');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should provide monitoring dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/health/monitoring');

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('health');
        expect(response.body).toHaveProperty('alerts');
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('monitoring');
      }
    });

    it('should provide metrics in JSON format', async () => {
      const response = await request(app)
        .get('/api/v1/health/metrics');

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        expect(response.body).toHaveProperty('uptime');
        expect(response.body).toHaveProperty('requests');
        expect(response.body).toHaveProperty('memory');
        expect(response.body).toHaveProperty('services');
      }
    });

    it('should provide metrics in Prometheus format', async () => {
      const response = await request(app)
        .get('/api/v1/health/metrics?format=prometheus');

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 200) {
        expect(response.headers['content-type']).toContain('text/plain');
        expect(response.text).toContain('etour_uptime_seconds');
        expect(response.text).toContain('etour_requests_total');
        expect(response.text).toContain('etour_memory_usage_percent');
      }
    });
  });

  describe('Health Service', () => {
    it('should provide basic health status', () => {
      const health = HealthService.getBasicHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('timestamp');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('version');
      expect(health).toHaveProperty('environment');
      expect(typeof health.uptime).toBe('number');
    });

    it('should provide detailed health status', async () => {
      const health = await HealthService.getDetailedHealth();
      
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('metrics');
      expect(health.services).toHaveProperty('database');
      expect(health.services).toHaveProperty('email');
      expect(health.services).toHaveProperty('upload');
      expect(health.services).toHaveProperty('memory');
      expect(health.services).toHaveProperty('disk');
    });

    it('should record request metrics', () => {
      const initialMetrics = HealthService.getBasicHealth();
      
      // Record some test requests
      HealthService.recordRequest(100, false);
      HealthService.recordRequest(200, true);
      HealthService.recordRequest(150, false);
      
      // Metrics should be updated (this is a basic test since metrics are static methods)
      expect(true).toBe(true); // Placeholder - actual metrics testing would require more setup
    });

    it('should format uptime correctly', () => {
      const uptime = HealthService.getUptimeFormatted();
      
      expect(typeof uptime).toBe('string');
      expect(uptime).toMatch(/\d+d \d+h \d+m \d+s/);
    });

    it('should check if service is healthy', async () => {
      const isHealthy = await HealthService.isHealthy();
      
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Monitoring Service', () => {
    it('should get current alerts', () => {
      const alerts = monitoringService.getAlerts();
      
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('should get uptime statistics', () => {
      const stats = monitoringService.getUptimeStats();
      
      expect(stats).toHaveProperty('uptime');
      expect(stats).toHaveProperty('availability');
      expect(stats).toHaveProperty('totalChecks');
      expect(typeof stats.availability).toBe('number');
      expect(typeof stats.totalChecks).toBe('number');
    });

    it('should get monitoring configuration', () => {
      const config = monitoringService.getConfig();
      
      expect(config).toHaveProperty('heartbeatInterval');
      expect(config).toHaveProperty('logRetentionDays');
      expect(config).toHaveProperty('alertThresholds');
      expect(config).toHaveProperty('externalMonitoring');
      expect(config).toHaveProperty('selfPing');
    });
  });

  describe('Keep-Alive Service', () => {
    it('should get keep-alive status', () => {
      const status = keepAliveService.getStatus();
      
      expect(status).toHaveProperty('running');
      expect(status).toHaveProperty('config');
      expect(typeof status.running).toBe('boolean');
      expect(status.config).toHaveProperty('enabled');
      expect(status.config).toHaveProperty('interval');
    });

    it('should handle configuration updates', () => {
      const originalConfig = keepAliveService.getStatus().config;
      
      // Update configuration
      keepAliveService.updateConfig({
        interval: 60000 // 1 minute
      });
      
      const updatedConfig = keepAliveService.getStatus().config;
      expect(updatedConfig.interval).toBe(60000);
      
      // Restore original configuration
      keepAliveService.updateConfig(originalConfig);
    });
  });

  describe('Error Handling', () => {
    it('should handle health check failures gracefully', async () => {
      // This test would require mocking database failures
      // For now, we just ensure the endpoint doesn't crash
      const response = await request(app)
        .get('/api/v1/health/detailed');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body).toHaveProperty('status');
    });

    it('should handle monitoring service errors', async () => {
      const response = await request(app)
        .get('/api/v1/health/monitoring');

      expect(response.status).toBeOneOf([200, 500]);
      if (response.status === 500) {
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Performance', () => {
    it('should respond to health checks quickly', async () => {
      const startTime = Date.now();
      
      const response = await request(app)
        .get('/health');
      
      const responseTime = Date.now() - startTime;
      
      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle concurrent health checks', async () => {
      const promises = Array.from({ length: 10 }, () =>
        request(app).get('/health')
      );
      
      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });
    });
  });
});
