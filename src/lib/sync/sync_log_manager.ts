import { moment } from "obsidian";

import FastSync from "../../main";
import { dumpError } from "../utils/helpers";


export type LogType = 'send' | 'receive' | 'info' | 'error';
export type LogStatus = 'success' | 'error' | 'pending' | 'cancelled';

export type LogCategory = 'note' | 'attachment' | 'config' | 'folder' | 'summary' | 'other';

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
    vault?: string;
}

interface SyncSummaryStats {
    syncType?: string;
    note?: { upload: number; modify: number; delete: number };
    file?: { upload: number; modify: number; delete: number };
    config?: { upload: number; modify: number; delete: number };
}

export class SyncLogManager {
    private static instance: SyncLogManager;
    private logs: SyncLog[] = [];
    private readonly MAX_LOGS = 5000;
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
    }

    private getCategory(action: string): LogCategory {
        if (action === 'SyncSummary') return 'summary';
        if (action.startsWith('Note')) return 'note';
        if (action.startsWith('File')) return 'attachment';
        if (action.startsWith('Setting') || action.startsWith('Config')) return 'config';
        if (action.startsWith('Folder')) return 'folder';
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

            // --- 保持原有顺序，避免分页时由于状态更新导致记录在页面间跳变 ---
            // --- Keep original order to prevent items jumping between pages during status updates ---
            this.logs[index] = updatedLog;

            // 仅在状态从 pending 变为 success/error 时记录到文件，避免进度更新刷屏
            if (statusChanged && targetStatus !== 'pending') {
                void this.persistToFile(updatedLog);
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
                message: log.message,
                vault: log.vault
            };
            this.logs.unshift(newLog);
            if (this.logs.length > this.MAX_LOGS) {
                this.logs.pop();
            }

            // 新增记录时持久化到文件（除非是 pending 状态的进度条开头，这种通常之后会有 success）
            if (newLog.status !== 'pending') {
                void this.persistToFile(newLog);
            }
        }
        this.notify();
    }

    public addLog(type: LogType, action: string, message?: string, status: LogStatus = 'success', path?: string, vault?: string) {
        this.addOrUpdateLog({
            id: Math.random().toString(36).substring(2, 11),
            type,
            action,
            message,
            status,
            path,
            vault,
            timestamp: Date.now()
        });
    }

    /**
     * 记录接收到的 WebSocket 消息
     * @param action 消息动作类型
     * @param data 消息数据
     * @param currentSyncType 当前同步类型
     */
    public logReceivedMessage(action: string, data: unknown, currentSyncType: string): void {
        // 过滤不需要记录的消息类型 / Filter out unnecessary message types from logging
        const excludedActions = [
            "Pong", "Authorization", "ClientInfo", "FileUploadCheck", "FileChunkDownload", "NoteSyncNeedPush", "FileSyncUpdate", "FileSyncChunkDownload",
            "FolderSyncBatchAck", "NoteSyncBatchAck", "FileSyncBatchAck", "SettingSyncBatchAck",
            "FolderSyncPage", "NoteSyncPage", "FileSyncPage", "SettingSyncPage",
            "FolderSyncPageAck", "NoteSyncPageAck", "FileSyncPageAck", "SettingSyncPageAck"
        ];
        if (excludedActions.includes(action)) {
            return;
        }

        const msgData = data as { 
            data?: { Path?: string; path?: string; Vault?: string; vault?: string; sessionId?: string; SessionID?: string };
            Path?: string; path?: string; Vault?: string; vault?: string; sessionId?: string; SessionID?: string;
            code?: number; message?: string;
        };

        // 提取路径信息
        const logPath = msgData.data?.Path || msgData.Path || msgData.path || msgData.data?.path;
        // 提取 Vault 信息
        const logVault = msgData.Vault || msgData.vault || msgData.data?.Vault || msgData.data?.vault;

        // 根据消息类型调整 action 名称
        let logAction = action;
        const syncTypeActions = ["NoteSync", "FileSync", "SettingSync", "FolderSync", "NoteSyncEnd", "FileSyncEnd", "SettingSyncEnd", "FolderSyncEnd", "SyncEnd"];
        if (syncTypeActions.includes(action)) {
            logAction = `${action}_${currentSyncType}`;
        }

        // 提取 sessionId
        const sessionId = msgData.sessionId || msgData.data?.sessionId || msgData.data?.SessionID;

        if (sessionId) {
            // 根据 code 判断状态
            const hasCode = msgData.code !== undefined;
            const isError = hasCode && (msgData.code === 0 || (msgData.code as number) > 200);

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
                vault: logVault,
                message: msgData.message || (msgData.code !== undefined ? `Code: ${msgData.code}` : undefined)
            });
        } else {
            // 没有 sessionId 的消息
            const status = (msgData.code !== undefined && (msgData.code === 0 || (msgData.code) > 200)) ? 'error' : 'success';
            const message = msgData.message || (msgData.code !== undefined ? `Code: ${msgData.code}` : undefined);
            this.addLog('receive', logAction, message, status, logPath, logVault);
        }
    }

    /**
     * 记录发送的 WebSocket 消息
     * @param action 消息动作类型
     * @param data 消息数据(可能是对象或字符串)
     * @param currentSyncType 当前同步类型
     */
    public logSentMessage(action: string, data: object | string, currentSyncType: string): void {
        // 过滤不需要记录的消息类型 / Filter out unnecessary message types from logging
        const excludedActions = [
            "Ping", "Authorization", "ClientInfo", "FileUploadCheck", "FileChunkDownload", "NoteSyncNeedPush",
            "FolderSyncBatchAck", "NoteSyncBatchAck", "FileSyncBatchAck", "SettingSyncBatchAck",
            "FolderSyncPage", "NoteSyncPage", "FileSyncPage", "SettingSyncPage",
            "FolderSyncPageAck", "NoteSyncPageAck", "FileSyncPageAck", "SettingSyncPageAck"
        ];
        if (excludedActions.includes(action)) {
            return;
        }

        // 提取路径和 Vault 信息(仅当 data 是对象时)
        let logPath: string | undefined = undefined;
        let logVault: string | undefined = undefined;
        if (typeof data === "object" && data !== null) {
            const d = data as { Path?: string, path?: string, Vault?: string, vault?: string, data?: { Path?: string, path?: string, Vault?: string, vault?: string } };
            logPath = d.Path || d.path || d.data?.Path || d.data?.path;
            logVault = d.Vault || d.vault || d.data?.Vault || d.data?.vault;
        }

        // 根据消息类型调整 action 名称
        let logAction = action;
        if (["NoteSync", "FileSync", "SettingSync", "FolderSync"].includes(action)) {
            logAction = `${action}_${currentSyncType}`;
        }

        // 根据 action 类型判断状态:分片传输类指令标记为 pending,其他为 success
        const targetStatus: LogStatus = ['FileUpload', 'FileDownload', 'ConfigUpload'].includes(action) ? 'pending' : 'success';

        // 提取 sessionId
        const d = data as { sessionId?: string, SessionID?: string, data?: { sessionId?: string, SessionID?: string } };
        const sessionId = d?.sessionId || d?.SessionID || d?.data?.sessionId || d?.data?.SessionID;

        if (sessionId) {
            this.addOrUpdateLog({
                id: sessionId,
                type: 'send',
                action: logAction,
                status: targetStatus,
                path: logPath,
                vault: logVault,
            });
        } else {
            this.addLog('send', logAction, undefined, targetStatus, logPath, logVault);
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
                dumpError("Failed to clear sync log file:", e);
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
            
            let msgStr = log.message ? ` [Msg: ${log.message.replace(/\n/g, ' ')}]` : "";
            // 如果是同步小结，将 JSON 格式化为易读的文本字符串写入文件
            // If it is a sync summary, format the JSON into an easy-to-read text string for the log file
            if (log.category === 'summary' && log.message) {
                try {
                    const stats = JSON.parse(log.message) as SyncSummaryStats;
                    const parts: string[] = [];
                    if (stats.note) parts.push(`Note(up:${stats.note.upload},recv:${stats.note.modify},del:${stats.note.delete})`);
                    if (stats.file) parts.push(`Attachment(up:${stats.file.upload},recv:${stats.file.modify},del:${stats.file.delete})`);
                    if (stats.config) parts.push(`Config(up:${stats.config.upload},recv:${stats.config.modify},del:${stats.config.delete})`);
                    msgStr = ` [Msg: Sync completed (${stats.syncType === 'full' ? 'Full' : 'Incremental'}): ${parts.join(', ')}]`;
                } catch {
                    // 解析失败时使用默认逻辑
                    // Fall back to default logic if parsing fails
                }
            }

            const line = `[${timeStr}] [${typeStr}] [${categoryStr}] [${statusStr}] ${actionStr}${pathStr}${msgStr}\n`;

            // 使用 Obsidian API 追加文件
            await this.plugin.app.vault.adapter.append(this.logFilePath, line);
        } catch (e) {
            dumpError("Failed to write sync log to file:", e);
        }
    }
}
