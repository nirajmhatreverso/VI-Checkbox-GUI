// utils/polling.ts

interface PollingConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const OPERATION_CONFIGS: Record<string, PollingConfig> = {
  PURCHASE: {
    maxAttempts: 8,
    initialDelay: 1000,      // Start with 1s
    maxDelay: 5000,          // Cap at 5s
    backoffMultiplier: 1.5,  // Exponential: 1s → 1.5s → 2.25s → 3.37s → 5s
  },
  PLAN_CHANGE: {
    maxAttempts: 12,
    initialDelay: 1500,
    maxDelay: 4000,
    backoffMultiplier: 1.3,
  },
  OFFER_CHANGE: {
    maxAttempts: 12,
    initialDelay: 1500,
    maxDelay: 4000,
    backoffMultiplier: 1.3,
  },
  TERMINATION: {
    maxAttempts: 15,
    initialDelay: 2000,
    maxDelay: 6000,
    backoffMultiplier: 1.4,
  },
  SUSPENSION: {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 3000,
    backoffMultiplier: 1.2,
  },
  RECONNECTION: {
    maxAttempts: 10,
    initialDelay: 1000,
    maxDelay: 3000,
    backoffMultiplier: 1.2,
  },
  RENEWAL: {
    maxAttempts: 10,
    initialDelay: 1500,
    maxDelay: 4000,
    backoffMultiplier: 1.3,
  },
  HARDWARE_REPLACEMENT: {
    maxAttempts: 8,
    initialDelay: 2000,
    maxDelay: 5000,
    backoffMultiplier: 1.5,
  },
  ADD_ON: {
    maxAttempts: 10,
    initialDelay: 1500,
    maxDelay: 4000,
    backoffMultiplier: 1.3,
  },
};

interface PollResult<T> {
  success: boolean;
  data?: T;
  attempts: number;
  totalTime: number;
}

export async function pollWithBackoff<T>(
  operationType: string,
  pollFn: () => Promise<{ found: boolean; data?: T }>,
  abortSignal?: AbortSignal
): Promise<PollResult<T>> {
  const config = OPERATION_CONFIGS[operationType] || OPERATION_CONFIGS.PLAN_CHANGE;
  
  let attempts = 0;
  let currentDelay = config.initialDelay;
  const startTime = Date.now();

  while (attempts < config.maxAttempts) {
    // ✅ Check for cancellation
    if (abortSignal?.aborted) {
      return { success: false, attempts, totalTime: Date.now() - startTime };
    }

    try {
      const result = await pollFn();
      
      if (result.found) {
        return {
          success: true,
          data: result.data,
          attempts: attempts + 1,
          totalTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.error(`Polling attempt ${attempts + 1} failed:`, error);
    }

    attempts++;

    // ✅ Don't wait after last attempt
    if (attempts < config.maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, currentDelay));
      
      // ✅ Exponential backoff with cap
      currentDelay = Math.min(
        currentDelay * config.backoffMultiplier,
        config.maxDelay
      );
    }
  }

  return {
    success: false,
    attempts,
    totalTime: Date.now() - startTime,
  };
}