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
    maxRetries = 5, // Increased from 3
    delayMs = 500,  // Reduced initial delay
    backoff = true
  } = options;

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout wrapper (60s for database operations - network latency issues)
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timeout')), 60000)
      );
      
      const result = await Promise.race([operation(), timeoutPromise]);
      
      // Success!
      if (attempt > 1) {
        console.log(`✅ Succeeded on attempt ${attempt}/${maxRetries}`);
      }
      return result;
    } catch (error: any) {
      lastError = error;
      
      const isSocketError = error.message?.includes('socket connection') || 
                           error.message?.includes('ECONNRESET') ||
                           error.message?.includes('ETIMEDOUT') ||
                           error.message?.includes('timeout');
      
      // Don't retry for non-network errors (except on first attempt)
      if (!isSocketError && attempt > 1) {
        console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed (non-network error), not retrying:`, error.message);
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = backoff ? delayMs * Math.pow(1.5, attempt - 1) : delayMs;
        console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed, retrying in ${Math.round(delay)}ms:`, error.message?.substring(0, 100));
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

