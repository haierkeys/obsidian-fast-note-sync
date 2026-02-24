import { dump, sleep } from "./helps";


export class LockManager {
    private atomicStates: Int32Array;
    private static readonly IDLE = 0;
    private static readonly LOCKED = 1;
    private slotCount: number;

    constructor(slotCount: number = 1024) {
        this.slotCount = slotCount;
        // 使用 SharedArrayBuffer 以支持可能的跨线程/Worker 扩展，即使目前在主线程
        this.atomicStates = new Int32Array(new SharedArrayBuffer(slotCount * 4));
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
        const idx = this.getIndex(key);

        // 使用 Atomics 原子地尝试获取锁
        const prev = Atomics.compareExchange(this.atomicStates, idx, LockManager.IDLE, LockManager.LOCKED);

        if (prev === LockManager.IDLE) {
            return true; // 获取锁成功
        }

        if (retryCount < maxRetries) {
            // dump(`LockManager: [${key}] is locked, retrying ${retryCount + 1}/${maxRetries}...`);
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
        const idx = this.getIndex(key);
        Atomics.store(this.atomicStates, idx, LockManager.IDLE);
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
