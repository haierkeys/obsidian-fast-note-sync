import { App, Menu, MenuItem } from "obsidian";

/**
 * Client type identifier sent to the server in HTTP headers, WebSocket URL,
 * and API request parameters to distinguish the Obsidian plugin client.
 * 发送给服务端的客户端类型标识符，用于 HTTP 请求头、WebSocket URL 及 API 参数中标识 Obsidian 插件客户端。
 */
export const CLIENT_TYPE = "ObsidianPlugin";

export type SyncMode = "auto" | "note" | "config";

export interface SnapFile {
    path: string;
    pathHash: string;
    contentHash: string;
    mtime: number;
    ctime: number;
    size: number;
    baseHash?: string | null;
}

export interface SnapFolder {
    path: string;
    pathHash: string;
}

export interface PathHashFile {
    path: string;
    pathHash: string;
}

export interface ReceiveMessage {
    vault: string;
    path: string;
    pathHash: string;
    action: string;
    content: string;
    contentHash: string;
    ctime: number;
    mtime: number;
    lastTime: number;
    context?: string;
}

export interface SyncMessage {
    action: string;
    data: unknown;
}

export interface ReceiveFileSyncUpdateMessage {
    path: string;
    vault: string;
    pathHash: string;
    contentHash: string;
    size: number;
    mtime: number;
    ctime: number;
    lastTime: number;
}

export interface FileUploadMessage {
    path: string;
    pathHash: string;
    ctime: number;
    mtime: number;
    sessionId: string;
    chunkSize: number;
}

export interface FileSyncChunkDownloadMessage {
    path: string;
    contentHash?: string;
    ctime: number;
    mtime: number;
    sessionId: string;
    chunkSize: number;
    totalChunks: number;
    size: number;
}

export interface FileDownloadSession {
    path: string;
    contentHash?: string;
    ctime: number;
    mtime: number;
    lastTime: number;
    sessionId: string;
    totalChunks: number;
    size: number;
    chunks?: Map<number, ArrayBuffer>;
    tempDir?: string;
    downloadedChunks?: Set<number>;
}

export interface ReceiveMtimeMessage {
    path: string;
    ctime: number;
    mtime: number;
    lastTime?: number;
}

export interface ReceivePathMessage {
    path: string;
    lastTime?: number;
}

export interface SyncEndData {
    lastTime: number;
    messages: SyncMessage[];
    needUploadCount?: number;
    needModifyCount?: number;
    needSyncMtimeCount?: number;
    needDeleteCount?: number;
    context?: string;
}

export interface NoteSyncData {
    lastTime: number;
    notes: SnapFile[];
    delNotes: PathHashFile[];
    missingNotes: PathHashFile[];
    context?: string;
}

export interface FileSyncData {
    lastTime: number;
    files: SnapFile[];
    delFiles: PathHashFile[];
    missingFiles: PathHashFile[];
    context?: string;
}

export interface ConfigSyncData {
    lastTime: number;
    configs: SnapFile[];
    delConfigs: PathHashFile[];
    missingConfigs: PathHashFile[];
    context?: string;
}


export interface FolderSyncRequest {
    vault: string;
    lastTime: number;
    folders: SnapFolder[];
    delFolders?: PathHashFile[];
    missingFolders?: PathHashFile[];
    context?: string;
}

export interface FolderSyncRenameMessage {
    path: string;
    pathHash: string;
    ctime: number;
    mtime: number;
    oldPath: string;
    oldPathHash: string;
    lastTime?: number;
}

export interface FolderSyncData {
    lastTime: number;
    folders: SnapFolder[];
    delFolders: PathHashFile[];
    missingFolders: PathHashFile[];
    context?: string;
}

/**
 * Internal Obsidian types for better type safety when accessing unofficial APIs.
 */
export interface AppWithInternal extends App {
    setting?: {
        open(): void;
        openTabById(id: string): void;
        activeTab?: {
            display(): void;
        };
        containerEl: HTMLElement;
        close(): void;
    };
    plugins?: {
        enabledPlugins: Set<string>;
        disablePlugin(id: string): Promise<void>;
        enablePlugin(id: string): Promise<void>;
        loadManifests(): Promise<void>;
        manifests: Record<string, unknown>;
        plugins: Record<string, unknown>;
    };
    internalPlugins?: {
        getPluginById(id: string): unknown;
        plugins: Record<string, unknown>;
    };
    hotkeys?: {
        load(): Promise<void>;
    };
}

export interface MenuItemWithDom {
    dom: HTMLElement;
}

/**
 * Obsidian Menu internal hide method type.
 * Obsidian Menu 内部 hide 方法的类型定义。
 */
export interface MenuWithHide {
    hide(): void;
}

export interface MenuItemWithInternal extends MenuItem {
    setSubmenu(): Menu;
    titleEl?: HTMLElement;
}


export interface WorkspaceWithInternal {
    on(name: 'file-menu', callback: (menu: Menu, file: import("obsidian").TAbstractFile) => void, ctx?: unknown): import("obsidian").EventRef;
    on(name: 'editor-menu', callback: (menu: Menu, editor: import("obsidian").Editor, view: import("obsidian").MarkdownView) => void, ctx?: unknown): import("obsidian").EventRef;
}


