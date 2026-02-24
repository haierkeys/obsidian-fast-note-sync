import { dump, sleep } from "./helps";


export class LockManager {
    private atomicStates: Int32Array | null = null;
    private fallbackLocks: Set<string> | null = null;
    private static readonly IDLE = 0;
    private static readonly LOCKED = 1;
    private slotCount: number;

    constructor(slotCount: number = 1024) {
        this.slotCount = slotCount;

        // 环境检测：检查 SharedArrayBuffer 是否可用
        if (typeof SharedArrayBuffer !== 'undefined') {
            try {
                this.atomicStates = new Int32Array(new SharedArrayBuffer(slotCount * 4));
                dump("LockManager: Using Atomic mode (SharedArrayBuffer)");
            } catch (e) {
                dump("LockManager: Failed to init SharedArrayBuffer, falling back to Set mode");
                this.fallbackLocks = new Set();
            }
        } else {
            dump("LockManager: SharedArrayBuffer not supported, using Fallback mode (Set)");
            this.fallbackLocks = new Set();
        }
    }

    /**
     * 简单的哈希函数将字符串映射到原子槽位索引
     */
    private getIndex(key: string): number {
        let hash = 0;
        for (let i = 0; i < key.length; i++) {
            hash = ((hash << 5) - hash) + key.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        return Math.abs(hash) % this.slotCount;
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

        if (this.atomicStates) {
            // 原子模式
            const idx = this.getIndex(key);
            const prev = Atomics.compareExchange(this.atomicStates, idx, LockManager.IDLE, LockManager.LOCKED);
            acquired = (prev === LockManager.IDLE);
        } else if (this.fallbackLocks) {
            // 降级模式 (Set)
            if (!this.fallbackLocks.has(key)) {
                this.fallbackLocks.add(key);
                acquired = true;
            }
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
        if (this.atomicStates) {
            const idx = this.getIndex(key);
            Atomics.store(this.atomicStates, idx, LockManager.IDLE);
        } else if (this.fallbackLocks) {
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
