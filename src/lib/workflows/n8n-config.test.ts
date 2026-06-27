/**
 * Unit tests for n8n workflow configuration module.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  validateInternalServiceKey,
  WORKFLOW_CONFIGS,
  VALID_OPERATIONS,
  isValidOperation,
  getN8nConnectionConfig,
  getActiveWorkflows,
  getWorkflowById,
  INTERNAL_SERVICE_KEY_HEADER,
} from './n8n-config';

describe('n8n-config', () => {
  describe('validateInternalServiceKey', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    it('returns false when key is null', () => {
      process.env.N8N_INTERNAL_SERVICE_KEY = 'test-key-123';
      expect(validateInternalServiceKey(null)).toBe(false);
    });

    it('returns false when environment variable is not set', () => {
      delete process.env.N8N_INTERNAL_SERVICE_KEY;
      expect(validateInternalServiceKey('some-key')).toBe(false);
    });

    it('returns false when key does not match', () => {
      process.env.N8N_INTERNAL_SERVICE_KEY = 'correct-key';
      expect(validateInternalServiceKey('wrong-key!!')).toBe(false);
    });

    it('returns false when key length differs', () => {
      process.env.N8N_INTERNAL_SERVICE_KEY = 'short';
      expect(validateInternalServiceKey('a-much-longer-key')).toBe(false);
    });

    it('returns true when key matches exactly', () => {
      process.env.N8N_INTERNAL_SERVICE_KEY = 'my-secret-service-key-42';
      expect(validateInternalServiceKey('my-secret-service-key-42')).toBe(true);
    });

    it('returns false for empty string when env is set', () => {
      process.env.N8N_INTERNAL_SERVICE_KEY = 'nonempty';
      expect(validateInternalServiceKey('')).toBe(false);
    });

    it('returns false for empty env variable', () => {
      process.env.N8N_INTERNAL_SERVICE_KEY = '';
      expect(validateInternalServiceKey('')).toBe(false);
    });
  });

  describe('INTERNAL_SERVICE_KEY_HEADER', () => {
    it('is x-internal-service-key', () => {
      expect(INTERNAL_SERVICE_KEY_HEADER).toBe('x-internal-service-key');
    });
  });

  describe('WORKFLOW_CONFIGS', () => {
    it('defines all 7 scheduled workflows', () => {
      const configs = Object.keys(WORKFLOW_CONFIGS);
      expect(configs).toHaveLength(7);
      expect(configs).toContain('MARKETING_METRICS_SYNC');
      expect(configs).toContain('FINANCIAL_REPORT_GENERATION');
      expect(configs).toContain('RECURRING_MAINTENANCE_CHECK');
      expect(configs).toContain('GUEST_PRE_ARRIVAL_MESSAGES');
      expect(configs).toContain('IOT_RETENTION_CLEANUP');
      expect(configs).toContain('CHANNEL_POLLING');
      expect(configs).toContain('ESCALATION_DIGEST');
    });

    it('marketing metrics sync is hourly interval', () => {
      const config = WORKFLOW_CONFIGS.MARKETING_METRICS_SYNC;
      expect(config.schedule).toEqual({ type: 'interval', value: 1, unit: 'hours' });
      expect(config.enabled).toBe(true);
    });

    it('financial report generation is daily at 02:00', () => {
      const config = WORKFLOW_CONFIGS.FINANCIAL_REPORT_GENERATION;
      expect(config.schedule).toEqual({ type: 'cron', expression: '0 2 * * *' });
      expect(config.enabled).toBe(true);
    });

    it('recurring maintenance check is daily', () => {
      const config = WORKFLOW_CONFIGS.RECURRING_MAINTENANCE_CHECK;
      expect(config.schedule.type).toBe('cron');
      expect(config.enabled).toBe(true);
    });

    it('guest pre-arrival messages run every 6 hours', () => {
      const config = WORKFLOW_CONFIGS.GUEST_PRE_ARRIVAL_MESSAGES;
      expect(config.schedule).toEqual({ type: 'interval', value: 6, unit: 'hours' });
      expect(config.enabled).toBe(true);
    });

    it('IoT retention cleanup is weekly', () => {
      const config = WORKFLOW_CONFIGS.IOT_RETENTION_CLEANUP;
      expect(config.schedule).toEqual({ type: 'interval', value: 1, unit: 'weeks' });
      expect(config.enabled).toBe(true);
    });

    it('channel polling runs every 60 seconds', () => {
      const config = WORKFLOW_CONFIGS.CHANNEL_POLLING;
      expect(config.schedule).toEqual({ type: 'interval', value: 60, unit: 'seconds' });
      expect(config.enabled).toBe(true);
    });

    it('escalation digest is daily', () => {
      const config = WORKFLOW_CONFIGS.ESCALATION_DIGEST;
      expect(config.schedule.type).toBe('cron');
      expect(config.enabled).toBe(true);
    });

    it('all configs have a unique id', () => {
      const ids = Object.values(WORKFLOW_CONFIGS).map((w) => w.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('all configs have positive timeoutMs', () => {
      for (const config of Object.values(WORKFLOW_CONFIGS)) {
        expect(config.timeoutMs).toBeGreaterThan(0);
      }
    });

    it('all configs have at least one target stream', () => {
      for (const config of Object.values(WORKFLOW_CONFIGS)) {
        expect(config.targetStreams.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('VALID_OPERATIONS', () => {
    it('contains all expected operations', () => {
      expect(VALID_OPERATIONS).toContain('marketing.syncMetrics');
      expect(VALID_OPERATIONS).toContain('financial.generateReports');
      expect(VALID_OPERATIONS).toContain('maintenance.checkRecurring');
      expect(VALID_OPERATIONS).toContain('notifications.sendPreArrival');
      expect(VALID_OPERATIONS).toContain('iot.cleanupRetention');
      expect(VALID_OPERATIONS).toContain('channels.poll');
      expect(VALID_OPERATIONS).toContain('escalations.sendDigest');
      expect(VALID_OPERATIONS).toContain('bookings.syncAvailability');
      expect(VALID_OPERATIONS).toContain('staff.checkOverdue');
      expect(VALID_OPERATIONS).toContain('ai.pruneContext');
    });

    it('has 10 valid operations', () => {
      expect(VALID_OPERATIONS).toHaveLength(10);
    });
  });

  describe('isValidOperation', () => {
    it('returns true for valid operations', () => {
      expect(isValidOperation('channels.poll')).toBe(true);
      expect(isValidOperation('financial.generateReports')).toBe(true);
    });

    it('returns false for invalid operations', () => {
      expect(isValidOperation('invalid.operation')).toBe(false);
      expect(isValidOperation('')).toBe(false);
      expect(isValidOperation('channels')).toBe(false);
    });
  });

  describe('getN8nConnectionConfig', () => {
    const ORIGINAL_ENV = process.env;

    beforeEach(() => {
      process.env = { ...ORIGINAL_ENV };
    });

    afterEach(() => {
      process.env = ORIGINAL_ENV;
    });

    it('uses default values when env vars not set', () => {
      delete process.env.N8N_WEBHOOK_URL;
      delete process.env.N8N_BASIC_AUTH_USER;
      delete process.env.N8N_BASIC_AUTH_PASSWORD;

      const config = getN8nConnectionConfig();
      expect(config.baseUrl).toBe('http://n8n:5678');
      expect(config.basicAuth.user).toBe('admin');
      expect(config.basicAuth.password).toBe('');
    });

    it('uses environment variables when set', () => {
      process.env.N8N_WEBHOOK_URL = 'http://custom:9999';
      process.env.N8N_BASIC_AUTH_USER = 'myuser';
      process.env.N8N_BASIC_AUTH_PASSWORD = 'mypass';

      const config = getN8nConnectionConfig();
      expect(config.baseUrl).toBe('http://custom:9999');
      expect(config.basicAuth.user).toBe('myuser');
      expect(config.basicAuth.password).toBe('mypass');
    });
  });

  describe('getActiveWorkflows', () => {
    it('returns all enabled workflows', () => {
      const active = getActiveWorkflows();
      expect(active.length).toBeGreaterThan(0);
      for (const workflow of active) {
        expect(workflow.enabled).toBe(true);
      }
    });

    it('returns all 7 workflows (all enabled by default)', () => {
      const active = getActiveWorkflows();
      expect(active).toHaveLength(7);
    });
  });

  describe('getWorkflowById', () => {
    it('returns a workflow by its id', () => {
      const workflow = getWorkflowById('channel-polling');
      expect(workflow).toBeDefined();
      expect(workflow!.name).toBe('Channel Polling');
    });

    it('returns undefined for unknown id', () => {
      const workflow = getWorkflowById('nonexistent');
      expect(workflow).toBeUndefined();
    });
  });
});
