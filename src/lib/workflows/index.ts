/**
 * Workflows library exports.
 *
 * n8n workflow engine configuration, schedule definitions,
 * and internal service authentication for the platform ↔ n8n integration.
 */

export {
  INTERNAL_SERVICE_KEY_HEADER,
  validateInternalServiceKey,
  WORKFLOW_CONFIGS,
  VALID_OPERATIONS,
  isValidOperation,
  getN8nConnectionConfig,
  getActiveWorkflows,
  getWorkflowById,
  type CronExpression,
  type IntervalSchedule,
  type CronSchedule,
  type WorkflowSchedule,
  type N8nWorkflowConfig,
  type ValidOperation,
  type N8nConnectionConfig,
} from './n8n-config';
