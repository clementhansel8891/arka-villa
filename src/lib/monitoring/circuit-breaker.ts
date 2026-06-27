/**
 * Circuit Breaker - Protects external service calls from cascading failures.
 *
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: requests flow normally
 * - OPEN: requests fail fast without calling the service
 * - HALF_OPEN: limited requests are allowed to test recovery
 *
 * Used for external API calls (Stripe, Midtrans, Booking.com, Airbnb,
 * Meta Ads, Google Ads, WhatsApp, Telegram, SMTP).
 *
 * Requirements: 16.6, 37.6
 */

// --- Types ---

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms to wait before moving from open to half-open */
  resetTimeoutMs: number;
  /** Number of test requests allowed in half-open state */
  halfOpenMaxAttempts: number;
  /** Optional: timeout for individual calls (ms) */
  callTimeoutMs?: number;
  /** Name of the service being protected */
  serviceName: string;
}

export interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastStateChange: number;
  halfOpenAttempts: number;
}

export interface CircuitBreakerEvent {
  type: 'state_change' | 'call_success' | 'call_failure' | 'call_rejected';
  serviceName: string;
  previousState?: CircuitState;
  currentState: CircuitState;
  timestamp: number;
  error?: string;
}

export type CircuitBreakerListener = (event: CircuitBreakerEvent) => void;

// --- Default Configuration ---

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: Omit<CircuitBreakerConfig, 'serviceName'> = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000, // 30 seconds
  halfOpenMaxAttempts: 3,
  callTimeoutMs: 10_000, // 10 seconds
};

// --- Circuit Breaker Implementation ---

export function createCircuitBreakerState(): CircuitBreakerState {
  return {
    state: 'closed',
    failureCount: 0,
    successCount: 0,
    lastFailureTime: null,
    lastStateChange: Date.now(),
    halfOpenAttempts: 0,
  };
}

/**
 * Determines if a request should be allowed through based on circuit state.
 */
export function shouldAllowRequest(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig,
  now: number = Date.now()
): boolean {
  switch (state.state) {
    case 'closed':
      return true;

    case 'open': {
      // Check if reset timeout has elapsed -> move to half-open
      const elapsed = now - (state.lastFailureTime ?? state.lastStateChange);
      return elapsed >= config.resetTimeoutMs;
    }

    case 'half_open':
      return state.halfOpenAttempts < config.halfOpenMaxAttempts;

    default:
      return false;
  }
}

/**
 * Transitions the circuit state after a request is allowed through
 * (moving from open to half-open when timeout has elapsed).
 */
export function transitionToHalfOpen(
  state: CircuitBreakerState,
  now: number = Date.now()
): CircuitBreakerState {
  if (state.state !== 'open') return state;

  return {
    ...state,
    state: 'half_open',
    halfOpenAttempts: 0,
    lastStateChange: now,
  };
}

/**
 * Records a successful call and updates circuit state.
 */
export function recordSuccess(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig,
  now: number = Date.now()
): { state: CircuitBreakerState; event: CircuitBreakerEvent | null } {
  const previousState = state.state;

  if (state.state === 'half_open') {
    const newSuccessCount = state.successCount + 1;
    // If enough successes in half-open, close the circuit
    if (newSuccessCount >= config.halfOpenMaxAttempts) {
      const newState: CircuitBreakerState = {
        state: 'closed',
        failureCount: 0,
        successCount: 0,
        lastFailureTime: null,
        lastStateChange: now,
        halfOpenAttempts: state.halfOpenAttempts,
      };
      return {
        state: newState,
        event: {
          type: 'state_change',
          serviceName: config.serviceName,
          previousState,
          currentState: 'closed',
          timestamp: now,
        },
      };
    }

    return {
      state: {
        ...state,
        successCount: newSuccessCount,
        halfOpenAttempts: state.halfOpenAttempts + 1,
      },
      event: {
        type: 'call_success',
        serviceName: config.serviceName,
        currentState: state.state,
        timestamp: now,
      },
    };
  }

  // In closed state, reset failure count on success
  return {
    state: {
      ...state,
      failureCount: 0,
      successCount: state.successCount + 1,
    },
    event: {
      type: 'call_success',
      serviceName: config.serviceName,
      currentState: state.state,
      timestamp: now,
    },
  };
}

/**
 * Records a failed call and updates circuit state.
 */
export function recordFailure(
  state: CircuitBreakerState,
  config: CircuitBreakerConfig,
  error?: string,
  now: number = Date.now()
): { state: CircuitBreakerState; event: CircuitBreakerEvent | null } {
  const previousState = state.state;

  if (state.state === 'half_open') {
    // Any failure in half-open reopens the circuit
    const newState: CircuitBreakerState = {
      state: 'open',
      failureCount: state.failureCount + 1,
      successCount: 0,
      lastFailureTime: now,
      lastStateChange: now,
      halfOpenAttempts: 0,
    };
    return {
      state: newState,
      event: {
        type: 'state_change',
        serviceName: config.serviceName,
        previousState,
        currentState: 'open',
        timestamp: now,
        error,
      },
    };
  }

  // Closed state
  const newFailureCount = state.failureCount + 1;

  if (newFailureCount >= config.failureThreshold) {
    // Open the circuit
    const newState: CircuitBreakerState = {
      state: 'open',
      failureCount: newFailureCount,
      successCount: 0,
      lastFailureTime: now,
      lastStateChange: now,
      halfOpenAttempts: 0,
    };
    return {
      state: newState,
      event: {
        type: 'state_change',
        serviceName: config.serviceName,
        previousState,
        currentState: 'open',
        timestamp: now,
        error,
      },
    };
  }

  return {
    state: {
      ...state,
      failureCount: newFailureCount,
      lastFailureTime: now,
    },
    event: {
      type: 'call_failure',
      serviceName: config.serviceName,
      currentState: state.state,
      timestamp: now,
      error,
    },
  };
}

/**
 * Creates a rejection event when a call is blocked by an open circuit.
 */
export function createRejectionEvent(
  config: CircuitBreakerConfig,
  state: CircuitBreakerState,
  now: number = Date.now()
): CircuitBreakerEvent {
  return {
    type: 'call_rejected',
    serviceName: config.serviceName,
    currentState: state.state,
    timestamp: now,
    error: `Circuit breaker is ${state.state} for service: ${config.serviceName}`,
  };
}

/**
 * High-level function to execute a call through the circuit breaker.
 * Returns the result or throws with a descriptive error.
 */
export async function executeWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  state: CircuitBreakerState,
  config: CircuitBreakerConfig,
  now: number = Date.now()
): Promise<{
  result?: T;
  error?: string;
  newState: CircuitBreakerState;
  events: CircuitBreakerEvent[];
}> {
  const events: CircuitBreakerEvent[] = [];

  // Check if request should be allowed
  if (!shouldAllowRequest(state, config, now)) {
    events.push(createRejectionEvent(config, state, now));
    return {
      error: `Circuit breaker OPEN for ${config.serviceName}. Retry after ${config.resetTimeoutMs}ms.`,
      newState: state,
      events,
    };
  }

  // Transition to half-open if coming from open state
  let currentState = state;
  if (state.state === 'open') {
    currentState = transitionToHalfOpen(state, now);
    events.push({
      type: 'state_change',
      serviceName: config.serviceName,
      previousState: 'open',
      currentState: 'half_open',
      timestamp: now,
    });
  }

  // Execute the call
  try {
    let result: T;
    if (config.callTimeoutMs) {
      result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Circuit breaker call timeout')), config.callTimeoutMs)
        ),
      ]);
    } else {
      result = await fn();
    }

    const { state: newState, event } = recordSuccess(currentState, config, now);
    if (event) events.push(event);

    return { result, newState, events };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const { state: newState, event } = recordFailure(currentState, config, errorMessage, now);
    if (event) events.push(event);

    return { error: errorMessage, newState, events };
  }
}
