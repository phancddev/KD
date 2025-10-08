/**
 * Socket.IO Helper Functions
 * Utilities để xử lý timeout và error handling cho socket communications
 */

/**
 * Emit socket event với timeout
 * @param {Socket} socket - Socket.IO socket instance
 * @param {string} eventName - Tên event
 * @param {object} data - Dữ liệu gửi đi
 * @param {number} timeoutMs - Timeout (milliseconds)
 * @returns {Promise} - Promise resolve với response hoặc reject với timeout/error
 */
export function emitWithTimeout(socket, eventName, data, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    if (!socket) {
      return reject(new Error('Socket is not connected'));
    }

    let timeoutHandle;
    let isResolved = false;

    // Tạo timeout
    timeoutHandle = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        reject(new Error(`Timeout after ${timeoutMs}ms waiting for '${eventName}' response`));
      }
    }, timeoutMs);

    // Emit event với callback
    try {
      socket.emit(eventName, data, (response) => {
        if (!isResolved) {
          isResolved = true;
          clearTimeout(timeoutHandle);

          if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || `Event '${eventName}' failed`));
          }
        }
      });
    } catch (error) {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutHandle);
        reject(error);
      }
    }

    // Cleanup timeout nếu socket disconnect
    const disconnectHandler = () => {
      if (!isResolved) {
        isResolved = true;
        clearTimeout(timeoutHandle);
        reject(new Error(`Socket disconnected while waiting for '${eventName}' response`));
      }
    };

    socket.once('disconnect', disconnectHandler);

    // Cleanup disconnect handler sau khi resolve/reject
    const cleanup = () => {
      socket.off('disconnect', disconnectHandler);
    };

    // Attach cleanup to promise
    Promise.resolve().then(() => {
      if (isResolved) {
        cleanup();
      }
    });
  });
}

/**
 * Retry logic cho socket operations
 * @param {Function} operation - Async function cần retry
 * @param {number} maxRetries - Số lần retry tối đa
 * @param {number} delayMs - Delay giữa các lần retry (milliseconds)
 * @returns {Promise} - Promise resolve với kết quả hoặc reject sau khi hết retries
 */
export async function retryOperation(operation, maxRetries = 3, delayMs = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
      const result = await operation();
      console.log(`✅ Operation succeeded on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`❌ Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (attempt < maxRetries) {
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Operation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Batch operations với concurrency limit
 * @param {Array} items - Danh sách items cần xử lý
 * @param {Function} operation - Async function xử lý từng item
 * @param {number} concurrency - Số lượng operations chạy đồng thời
 * @returns {Promise<Array>} - Promise resolve với array kết quả
 */
export async function batchOperation(items, operation, concurrency = 3) {
  const results = [];
  const errors = [];

  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    console.log(`📦 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(items.length / concurrency)}`);

    const batchPromises = batch.map(async (item, index) => {
      try {
        const result = await operation(item, i + index);
        return { success: true, result, index: i + index };
      } catch (error) {
        return { success: false, error, index: i + index };
      }
    });

    const batchResults = await Promise.all(batchPromises);

    batchResults.forEach(({ success, result, error, index }) => {
      if (success) {
        results[index] = result;
      } else {
        errors.push({ index, error });
      }
    });
  }

  if (errors.length > 0) {
    console.warn(`⚠️  ${errors.length}/${items.length} operations failed`);
  }

  return { results, errors };
}

/**
 * Circuit breaker pattern cho socket operations
 */
export class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.threshold = threshold; // Số lần fail liên tiếp trước khi open circuit
    this.timeout = timeout; // Thời gian chờ trước khi thử lại (ms)
    this.failureCount = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
  }

  async execute(operation) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN - too many failures');
      }
      // Chuyển sang HALF_OPEN để thử lại
      this.state = 'HALF_OPEN';
      console.log('🔄 Circuit breaker: OPEN → HALF_OPEN');
    }

    try {
      const result = await operation();

      // Success → Reset
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        console.log('✅ Circuit breaker: HALF_OPEN → CLOSED');
      }
      this.failureCount = 0;

      return result;
    } catch (error) {
      this.failureCount++;

      if (this.failureCount >= this.threshold) {
        this.state = 'OPEN';
        this.nextAttempt = Date.now() + this.timeout;
        console.error(`❌ Circuit breaker: CLOSED → OPEN (${this.failureCount} failures)`);
      }

      throw error;
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    console.log('🔄 Circuit breaker reset');
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt
    };
  }
}

export default {
  emitWithTimeout,
  retryOperation,
  batchOperation,
  CircuitBreaker
};

