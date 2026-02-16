/**
 * 指数退避重试机制
 * @param fn 要执行的函数
 * @param maxRetries 最大重试次数 (默认3)
 * @param baseDelayMs 基础延迟毫秒 (默认1000)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 最后一次尝试，抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 指数退避延迟: 1s, 2s, 4s
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  // 不应该到达这里，但为了类型安全
  throw lastError ?? new Error('Retry failed with unknown error');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
