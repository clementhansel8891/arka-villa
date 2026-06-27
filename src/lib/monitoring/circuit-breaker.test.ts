import { describe, it, expect } from 'vitest';
import {
  createCircuitBreakerState,
  shouldAllowRequest,
  transitionToHalfOpen,
  recordSuccess,
  recordFailure,
  createRejectionEvent,
  executeWithCircuitBreaker,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  type CircuitBreakerConfig,
  type CircuitBreakerState,
} from './circuit-breaker';

const testConfig: CircuitBreakerConfig = {
  ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
  serviceName: 'test-service',
};

describe('Circuit Breaker', () => {
  describe('createCircuitBreakerState', () => {
    it('creates initial state as closed', () => {
      const state = createCircuitBreakerState();
      expect(state.state).toBe('closed');
      expect(state.failureCount).toBe(0);
      expect(state.successCount).toBe(0);
      expect(state.lastFailureTime).toBeNull();
      expect(state.halfOpenAttempts).toBe(0);
    });
  });

  describe('shouldAllowRequest', () => {
    it('allows requests when circuit is closed', () => {
      const state = createCircuitBreakerState();
      expect(shouldAllowRequest(state, testConfig)).toBe(true);
    });

    it('rejects requests when circuit is open and timeout not elapsed', () => {
      const now = Date.now();
      const state: CircuitBreakerState = {
        state: 'open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: now - 10_000, // 10s ago (timeout is 30s)
        lastStateChange: now - 10_000,
        halfOpenAttempts: 0,
      };
      expect(shouldAllowRequest(state, testConfig, now)).toBe(false);
    });

    it('allows request when circuit is open and timeout has elapsed', () => {
      const now = Date.now();
      const state: CircuitBreakerState = {
        state: 'open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: now - 35_000, // 35s ago (timeout is 30s)
        lastStateChange: now - 35_000,
        halfOpenAttempts: 0,
      };
      expect(shouldAllowRequest(state, testConfig, now)).toBe(true);
    });

    it('allows requests in half-open if under max attempts', () => {
      const state: CircuitBreakerState = {
        state: 'half_open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 1,
      };
      expect(shouldAllowRequest(state, testConfig)).toBe(true);
    });

    it('rejects requests in half-open if at max attempts', () => {
      const state: CircuitBreakerState = {
        state: 'half_open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 3, // equals halfOpenMaxAttempts
      };
      expect(shouldAllowRequest(state, testConfig)).toBe(false);
    });
  });

  describe('transitionToHalfOpen', () => {
    it('transitions from open to half-open', () => {
      const state: CircuitBreakerState = {
        state: 'open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: Date.now() - 60_000,
        lastStateChange: Date.now() - 60_000,
        halfOpenAttempts: 0,
      };

      const newState = transitionToHalfOpen(state);
      expect(newState.state).toBe('half_open');
      expect(newState.halfOpenAttempts).toBe(0);
    });

    it('does not transition if not in open state', () => {
      const state = createCircuitBreakerState();
      const newState = transitionToHalfOpen(state);
      expect(newState.state).toBe('closed');
    });
  });

  describe('recordSuccess', () => {
    it('resets failure count in closed state', () => {
      const state: CircuitBreakerState = {
        state: 'closed',
        failureCount: 3,
        successCount: 5,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 0,
      };

      const { state: newState } = recordSuccess(state, testConfig);
      expect(newState.failureCount).toBe(0);
      expect(newState.successCount).toBe(6);
    });

    it('closes circuit after enough successes in half-open', () => {
      const state: CircuitBreakerState = {
        state: 'half_open',
        failureCount: 5,
        successCount: 2, // one more success needed (halfOpenMaxAttempts = 3)
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 2,
      };

      const { state: newState, event } = recordSuccess(state, testConfig);
      expect(newState.state).toBe('closed');
      expect(newState.failureCount).toBe(0);
      expect(event?.type).toBe('state_change');
      expect(event?.currentState).toBe('closed');
    });

    it('increments success count in half-open without closing if not enough', () => {
      const state: CircuitBreakerState = {
        state: 'half_open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 0,
      };

      const { state: newState } = recordSuccess(state, testConfig);
      expect(newState.state).toBe('half_open');
      expect(newState.successCount).toBe(1);
      expect(newState.halfOpenAttempts).toBe(1);
    });
  });

  describe('recordFailure', () => {
    it('increments failure count below threshold', () => {
      const state = createCircuitBreakerState();
      const { state: newState, event } = recordFailure(state, testConfig, 'error');
      expect(newState.failureCount).toBe(1);
      expect(newState.state).toBe('closed');
      expect(event?.type).toBe('call_failure');
    });

    it('opens circuit when failure threshold is reached', () => {
      const state: CircuitBreakerState = {
        state: 'closed',
        failureCount: 4, // one more failure opens the circuit (threshold = 5)
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 0,
      };

      const { state: newState, event } = recordFailure(state, testConfig, 'fatal');
      expect(newState.state).toBe('open');
      expect(newState.failureCount).toBe(5);
      expect(event?.type).toBe('state_change');
      expect(event?.currentState).toBe('open');
    });

    it('reopens circuit on failure in half-open state', () => {
      const state: CircuitBreakerState = {
        state: 'half_open',
        failureCount: 5,
        successCount: 1,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 1,
      };

      const { state: newState, event } = recordFailure(state, testConfig, 'still broken');
      expect(newState.state).toBe('open');
      expect(event?.type).toBe('state_change');
      expect(event?.previousState).toBe('half_open');
      expect(event?.currentState).toBe('open');
    });
  });

  describe('createRejectionEvent', () => {
    it('creates a proper rejection event', () => {
      const state: CircuitBreakerState = {
        state: 'open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: Date.now(),
        lastStateChange: Date.now(),
        halfOpenAttempts: 0,
      };

      const event = createRejectionEvent(testConfig, state);
      expect(event.type).toBe('call_rejected');
      expect(event.serviceName).toBe('test-service');
      expect(event.currentState).toBe('open');
      expect(event.error).toContain('test-service');
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('executes function when circuit is closed', async () => {
      const state = createCircuitBreakerState();
      const fn = async () => 'success';

      const result = await executeWithCircuitBreaker(fn, state, testConfig);
      expect(result.result).toBe('success');
      expect(result.error).toBeUndefined();
      expect(result.newState.successCount).toBe(1);
    });

    it('rejects when circuit is open and timeout not elapsed', async () => {
      const now = Date.now();
      const state: CircuitBreakerState = {
        state: 'open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: now - 10_000,
        lastStateChange: now - 10_000,
        halfOpenAttempts: 0,
      };

      const fn = async () => 'should not run';
      const result = await executeWithCircuitBreaker(fn, state, testConfig, now);

      expect(result.error).toContain('Circuit breaker OPEN');
      expect(result.result).toBeUndefined();
      expect(result.events.some((e) => e.type === 'call_rejected')).toBe(true);
    });

    it('transitions to half-open when timeout has elapsed', async () => {
      const now = Date.now();
      const state: CircuitBreakerState = {
        state: 'open',
        failureCount: 5,
        successCount: 0,
        lastFailureTime: now - 35_000,
        lastStateChange: now - 35_000,
        halfOpenAttempts: 0,
      };

      const fn = async () => 'recovery';
      const result = await executeWithCircuitBreaker(fn, state, testConfig, now);

      expect(result.result).toBe('recovery');
      expect(result.events.some((e) => e.type === 'state_change' && e.currentState === 'half_open')).toBe(true);
    });

    it('records failure and opens circuit on function error', async () => {
      // Start with 4 failures so the next one opens it
      const state: CircuitBreakerState = {
        state: 'closed',
        failureCount: 4,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: Date.now(),
        halfOpenAttempts: 0,
      };

      const fn = async () => { throw new Error('service unavailable'); };
      const result = await executeWithCircuitBreaker(fn, state, testConfig);

      expect(result.error).toBe('service unavailable');
      expect(result.newState.state).toBe('open');
    });
  });

  describe('DEFAULT_CIRCUIT_BREAKER_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBe(5);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.resetTimeoutMs).toBe(30_000);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.halfOpenMaxAttempts).toBe(3);
      expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.callTimeoutMs).toBe(10_000);
    });
  });
});
