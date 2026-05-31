import { dump, sleep } from "./helps";


export class LockManager {
    private fallbackLocks: Set<string> | null = null;

    constructor() {
        this.fallbackLocks = new Set();
        dump("LockManager: Using Fallback mode (Set)");
    }


    /**
     * 尝试获取锁，如果失败则按策略重试
     * @param key 锁的标识（如文件路径）
     * @param retryCount 当前重试次数
     * @param maxRetries 最大重试次数
     * @param retryInterval 重试间隔(ms)
     */
    private async tryAcquire(key: string, retryCount: number = 0, maxRetries: number = 10, retryInterval: number = 50): Promise<boolean> {
        let acquired = false;

        if (this.fallbackLocks && !this.fallbackLocks.has(key)) {
            this.fallbackLocks.add(key);
            acquired = true;
        }

        if (acquired) {
            return true;
        }

        if (retryCount < maxRetries) {
            await sleep(retryInterval);
            return this.tryAcquire(key, retryCount + 1, maxRetries, retryInterval);
        }

        dump(`LockManager: Failed to acquire lock for [${key}] after ${maxRetries} retries.`);
        return false;
    }

    /**
     * 释放锁
     */
    private release(key: string) {
        if (this.fallbackLocks) {
            this.fallbackLocks.delete(key);
        }
    }

    /**
     * 带锁执行任务
     * @param key 标识
     * @param task 任务函数
     * @param options 配置
     */
    public async withLock<T>(
        key: string,
        task: () => Promise<T> | T,
        options: { maxRetries?: number; retryInterval?: number } = {}
    ): Promise<T | null> {
        const acquired = await this.tryAcquire(key, 0, options.maxRetries, options.retryInterval);
        if (!acquired) return null;

        try {
            return await task();
        } finally {
            this.release(key);
        }
    }
}
