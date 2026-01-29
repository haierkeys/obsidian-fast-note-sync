import { moment, TFile } from "obsidian";

import FastSync from "../main";


export type LogType = 'send' | 'receive' | 'info' | 'error';
export type LogStatus = 'success' | 'error' | 'pending';

export type LogCategory = 'note' | 'attachment' | 'config' | 'other';

export interface SyncLog {
    id: string;
    timestamp: number;
    type: LogType;
    category: LogCategory;
    action: string;
    path?: string;
    status: LogStatus;
    progress?: number;
    message?: string;
}

export class SyncLogManager {
    private static instance: SyncLogManager;
    private logs: SyncLog[] = [];
    private readonly MAX_LOGS = 200;
    private listeners: Set<(logs: SyncLog[]) => void> = new Set();
    private plugin: FastSync | null = null;
    private logFilePath: string = "";

    private constructor() { }

    public static getInstance(): SyncLogManager {
        if (!SyncLogManager.instance) {
            SyncLogManager.instance = new SyncLogManager();
        }
        return SyncLogManager.instance;
    }

    public init(plugin: FastSync) {
        this.plugin = plugin;
        this.logFilePath = `${plugin.manifest.dir}/sync.log`;
    }

    private getCategory(action: string): LogCategory {
        if (action.startsWith('Note')) return 'note';
        if (action.startsWith('File')) return 'attachment';
        if (action.startsWith('Setting') || action.startsWith('Config')) return 'config';
        return 'other';
    }

    public addOrUpdateLog(log: Partial<SyncLog> & { id: string, action: string, type: LogType }) {
        const index = this.logs.findIndex(l => l.id === log.id);
        const category = this.getCategory(log.action);

        if (index !== -1) {
            // Update existing log - PRESERVE existing timestamp
            const existingLog = this.logs[index];

            // 如果旧状态已经是成功或失败，则不允许被改回 pending
            let targetStatus = log.status || existingLog.status;
            const statusChanged = existingLog.status !== targetStatus;

            if (existingLog.status !== 'pending' && targetStatus === 'pending') {
                targetStatus = existingLog.status;
            }

            // 确保进度条只增不减，防止由于分片乱序完成导致的进度跳变
            let targetProgress = log.progress ?? existingLog.progress;
            if (existingLog.progress !== undefined && targetProgress !== undefined) {
                targetProgress = Math.max(existingLog.progress, targetProgress);
            }

            const updatedLog: SyncLog = {
                ...existingLog,
                ...log,
                category,
                status: targetStatus,
                progress: targetProgress,
                timestamp: existingLog.timestamp // Keep the original start time
            };
            this.logs[index] = updatedLog;

            // 仅在状态从 pending 变为 success/error 时记录到文件，避免进度更新刷屏
            if (statusChanged && targetStatus !== 'pending') {
                this.persistToFile(updatedLog);
            }
        } else {
            // Add new log
            const newLog: SyncLog = {
                id: log.id,
                timestamp: log.timestamp || Date.now(),
                type: log.type,
                category,
                action: log.action,
                path: log.path,
                status: log.status || 'success',
                progress: log.progress,
                message: log.message
            };
            this.logs.unshift(newLog);
            if (this.logs.length > this.MAX_LOGS) {
                this.logs.pop();
            }

            // 新增记录时持久化到文件（除非是 pending 状态的进度条开头，这种通常之后会有 success）
            if (newLog.status !== 'pending') {
                this.persistToFile(newLog);
            }
        }
        this.notify();
    }

    public addLog(type: LogType, action: string, message?: string, status: LogStatus = 'success', path?: string) {
        this.addOrUpdateLog({
            id: Math.random().toString(36).substring(2, 11),
            type,
            action,
            message,
            status,
            path,
            timestamp: Date.now()
        });
    }

    /**
     * 记录接收到的 WebSocket 消息
     * @param action 消息动作类型
     * @param data 消息数据
     * @param currentSyncType 当前同步类型
     */
    public logReceivedMessage(action: string, data: any, currentSyncType: string): void {
        // 过滤不需要记录的消息类型
        const excludedActions = ["Pong", "Authorization", "ClientInfo", "FileUploadCheck", "FileChunkDownload", "NoteSyncNeedPush", "FileSyncUpdate", "FileSyncChunkDownload"];
        if (excludedActions.includes(action)) {
            return;
        }

        // 提取路径信息
        const logPath = data.data?.Path || data.Path || data.path || data.data?.path;

        // 根据消息类型调整 action 名称
        let logAction = action;
        const syncTypeActions = ["NoteSync", "FileSync", "SettingSync", "NoteSyncEnd", "FileSyncEnd", "SettingSyncEnd", "SyncEnd"];
        if (syncTypeActions.includes(action)) {
            logAction = `${action}_${currentSyncType}`;
        }

        // 提取 sessionId
        const sessionId = data.sessionId || data.data?.sessionId || data.data?.SessionID;

        if (sessionId) {
            // 根据 code 判断状态
            const hasCode = data.code !== undefined;
            const isError = hasCode && (data.code === 0 || data.code > 200);

            let targetStatus: LogStatus = 'pending';
            if (isError) {
                targetStatus = 'error';
            } else if (hasCode) {
                // 对于分片传输类指令,即使有 code 也不立即标记为 success,因为后续还有传输过程
                if (['FileUpload', 'FileDownload', 'ConfigUpload'].includes(action)) {
                    targetStatus = 'pending';
                } else {
                    targetStatus = 'success';
                }
            }

            this.addOrUpdateLog({
                id: sessionId,
                type: 'receive',
                action: logAction,
                status: targetStatus,
                path: logPath,
                message: data.message || (data.code !== undefined ? `Code: ${data.code}` : undefined)
            });
        } else {
            // 没有 sessionId 的消息
            const status = (data.code === 0 || data.code > 200) ? 'error' : 'success';
            const message = data.message || (data.code !== undefined ? `Code: ${data.code}` : undefined);
            this.addLog('receive', logAction, message, status, logPath);
        }
    }

    /**
     * 记录发送的 WebSocket 消息
     * @param action 消息动作类型
     * @param data 消息数据(可能是对象或字符串)
     * @param currentSyncType 当前同步类型
     */
    public logSentMessage(action: string, data: object | string, currentSyncType: string): void {
        // 过滤不需要记录的消息类型
        const excludedActions = ["Ping", "Authorization", "ClientInfo", "FileUploadCheck", "FileChunkDownload", "NoteSyncNeedPush"];
        if (excludedActions.includes(action)) {
            return;
        }

        // 提取路径信息(仅当 data 是对象时)
        let logPath: string | undefined = undefined;
        if (typeof data === "object" && data !== null) {
            logPath = (data as any).Path || (data as any).path || (data as any).data?.Path || (data as any).data?.path;
        }

        // 根据消息类型调整 action 名称
        let logAction = action;
        if (["NoteSync", "FileSync", "SettingSync"].includes(action)) {
            logAction = `${action}_${currentSyncType}`;
        }

        // 根据 action 类型判断状态:分片传输类指令标记为 pending,其他为 success
        const targetStatus: LogStatus = ['FileUpload', 'FileDownload', 'ConfigUpload'].includes(action) ? 'pending' : 'success';

        // 提取 sessionId
        const sessionId = (data as any)?.sessionId || (data as any)?.SessionID || (data as any)?.data?.sessionId || (data as any)?.data?.SessionID;

        if (sessionId) {
            this.addOrUpdateLog({
                id: sessionId,
                type: 'send',
                action: logAction,
                status: targetStatus,
                path: logPath,
            });
        } else {
            this.addLog('send', logAction, undefined, targetStatus, logPath);
        }
    }


    public async clearLogs() {
        this.logs = [];
        this.notify();

        // 同时清空日志文件
        if (this.plugin && this.logFilePath) {
            try {
                await this.plugin.app.vault.adapter.write(this.logFilePath, "");
            } catch (e) {
                console.error("Failed to clear sync log file:", e);
            }
        }
    }

    public getLogs(): SyncLog[] {
        return [...this.logs];
    }

    public subscribe(listener: (logs: SyncLog[]) => void) {
        this.listeners.add(listener);
        listener(this.getLogs());
        return () => this.listeners.delete(listener);
    }

    private notify() {
        this.listeners.forEach(listener => listener(this.getLogs()));
    }

    private async persistToFile(log: SyncLog) {
        if (!this.plugin || !this.logFilePath) return;

        try {
            const timeStr = moment(log.timestamp).format("YYYY-MM-DD HH:mm:ss");
            const typeStr = log.type.toUpperCase().padEnd(7);
            const categoryStr = log.category.toUpperCase().padEnd(12);
            const statusStr = log.status.toUpperCase().padEnd(8);
            const actionStr = log.action.padEnd(25);
            const pathStr = log.path ? ` [Path: ${log.path}]` : "";
            const msgStr = log.message ? ` [Msg: ${log.message.replace(/\n/g, ' ')}]` : "";

            const line = `[${timeStr}] [${typeStr}] [${categoryStr}] [${statusStr}] ${actionStr}${pathStr}${msgStr}\n`;

            // 使用 Obsidian API 追加文件
            await this.plugin.app.vault.adapter.append(this.logFilePath, line);
        } catch (e) {
            console.error("Failed to write sync log to file:", e);
        }
    }
}
