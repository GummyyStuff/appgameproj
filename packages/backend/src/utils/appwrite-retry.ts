/**
 * Retry wrapper for Appwrite operations
 * Handles intermittent socket connection errors
 */

export interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: boolean;
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryAppwriteOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      const isSocketError = error.message?.includes('socket connection') || 
                           error.message?.includes('ECONNRESET') ||
                           error.message?.includes('ETIMEDOUT');
      
      // Don't retry for non-network errors
      if (!isSocketError && attempt < maxRetries) {
        console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed (non-network error), not retrying:`, error.message);
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;
        console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ All ${maxRetries} attempts failed:`, error.message);
      }
    }
  }
  
  throw lastError;
}

/**
 * Wrap an Appwrite client operation with retry logic
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: Parameters<T>) => {
    return retryAppwriteOperation(() => fn(...args), options);
  }) as T;
}

