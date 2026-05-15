import { safeStringify } from "./helps";

export class DebugLogManager {
    private static instance: DebugLogManager;
    private logs: string[] = [];
    private readonly MAX_LOGS = 1000;
    private listeners: Set<(logs: string[]) => void> = new Set();

    private constructor() {}

    public static getInstance(): DebugLogManager {
        if (!DebugLogManager.instance) {
            DebugLogManager.instance = new DebugLogManager();
        }
        return DebugLogManager.instance;
    }

    public addLog(...message: unknown[]) {
        const timestamp = new Date().toLocaleTimeString();
        const msg = message.map(m => safeStringify(m)).join(' ');
        
        this.logs.push(`[${timestamp}] ${msg}`);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }
        this.notify();
    }

    public getLogs(): string[] {
        return [...this.logs];
    }

    public clearLogs() {
        this.logs = [];
        this.notify();
    }

    public subscribe(listener: (logs: string[]) => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(l => l(this.getLogs()));
    }
}
