/**
 * Deployment Configuration
 *
 * Centralized configuration for the single-VPS Docker deployment pipeline.
 * Covers service definitions, health check parameters, rollback policy,
 * and resource limits for the 8 CPU / 32GB RAM / 500GB target.
 *
 * Requirements: 38.1, 38.2, 38.3, 38.4, 38.5, 38.6, 38.7, 38.8, 37.7
 */

export interface ServiceConfig {
  /** Docker Compose service name */
  name: string;
  /** Health check URL (relative to container network) */
  healthCheckUrl: string;
  /** Health check timeout in ms */
  healthCheckTimeout: number;
  /** Max retries before marking unhealthy */
  healthCheckRetries: number;
  /** Interval between health checks in ms */
  healthCheckInterval: number;
  /** Whether this service is critical (blocks deployment) */
  critical: boolean;
  /** Expected startup time in ms */
  startupGracePeriod: number;
}

export interface DeploymentConfig {
  /** Deployment strategy: 'rolling' uses container-level rolling updates */
  strategy: 'rolling';
  /** Maximum time for deployment to complete (ms) */
  deploymentTimeout: number;
  /** Time window after deploy for health checks before auto-rollback (ms) */
  healthCheckWindow: number;
  /** Number of previous image versions to retain for rollback */
  retainedVersions: number;
  /** Maximum total compressed image size (bytes) */
  maxImageSizeBytes: number;
  /** Maximum cold-start time (ms) */
  maxColdStartTime: number;
  /** Pre-deployment test command */
  preDeployTestCommand: string;
  /** Docker Compose project name */
  composeProject: string;
  /** Path to docker-compose file */
  composeFile: string;
  /** Services managed by this pipeline */
  services: ServiceConfig[];
  /** Manifest retention days */
  manifestRetentionDays: number;
  /** Deploy manifests directory */
  manifestsDir: string;
}

/**
 * Service definitions for the Arka Villa platform
 */
export const services: ServiceConfig[] = [
  {
    name: 'nextjs',
    healthCheckUrl: 'http://localhost:3000/api/health',
    healthCheckTimeout: 5000,
    healthCheckRetries: 10,
    healthCheckInterval: 3000,
    critical: true,
    startupGracePeriod: 30000,
  },
  {
    name: 'postgres',
    healthCheckUrl: '', // Uses docker healthcheck (pg_isready)
    healthCheckTimeout: 5000,
    healthCheckRetries: 10,
    healthCheckInterval: 5000,
    critical: true,
    startupGracePeriod: 30000,
  },
  {
    name: 'redis',
    healthCheckUrl: '', // Uses docker healthcheck (redis-cli ping)
    healthCheckTimeout: 3000,
    healthCheckRetries: 5,
    healthCheckInterval: 3000,
    critical: true,
    startupGracePeriod: 10000,
  },
  {
    name: 'nginx',
    healthCheckUrl: 'http://localhost:80/health',
    healthCheckTimeout: 3000,
    healthCheckRetries: 5,
    healthCheckInterval: 3000,
    critical: true,
    startupGracePeriod: 10000,
  },
  {
    name: 'minio',
    healthCheckUrl: '', // Uses docker healthcheck (mc ready local)
    healthCheckTimeout: 10000,
    healthCheckRetries: 5,
    healthCheckInterval: 10000,
    critical: false,
    startupGracePeriod: 20000,
  },
  {
    name: 'n8n',
    healthCheckUrl: 'http://localhost:5678/healthz',
    healthCheckTimeout: 5000,
    healthCheckRetries: 5,
    healthCheckInterval: 5000,
    critical: false,
    startupGracePeriod: 30000,
  },
];

/**
 * Main deployment configuration
 */
export const deployConfig: DeploymentConfig = {
  strategy: 'rolling',
  deploymentTimeout: 300000, // 5 minutes max
  healthCheckWindow: 120000, // 2 minutes for auto-rollback check
  retainedVersions: 2,
  maxImageSizeBytes: 5 * 1024 * 1024 * 1024, // 5GB compressed
  maxColdStartTime: 300000, // 5 minutes
  preDeployTestCommand: 'npm run test',
  composeProject: 'arka-villa',
  composeFile: 'docker-compose.yml',
  services,
  manifestRetentionDays: 365, // 1 year retention
  manifestsDir: '/opt/arka-villa/deploy-manifests',
};

/**
 * Deployment manifest recorded per deployment
 */
export interface DeployManifest {
  version: string;
  timestamp: string;
  deployer: string;
  gitCommit: string;
  gitBranch: string;
  configChanges: string[];
  servicesDeployed: string[];
  previousVersion: string;
  status: 'success' | 'failed' | 'rolled_back';
  duration: number; // ms
  healthChecksPassed: boolean;
}

export default deployConfig;
