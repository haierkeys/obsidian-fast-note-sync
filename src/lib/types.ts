export type SyncMode = "auto" | "note" | "config";

export interface SnapFile {
    path: string;
    pathHash: string;
    contentHash: string;
    mtime: number;
    size: number;
    baseHash?: string | null;
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
}

export interface ReceiveFileSyncUpdateMessage {
    path: string;
    vault: string;
    pathHash: string;
    contentHash: string;
    savePath: string;
    size: number;
    mtime: number;
    ctime: number;
    lastTime: number;
}

export interface FileUploadMessage {
    path: string;
    ctime: number;
    mtime: number;
    sessionId: string;
    chunkSize: number;
}

export interface FileSyncChunkDownloadMessage {
    path: string;
    ctime: number;
    mtime: number;
    sessionId: string;
    chunkSize: number;
    totalChunks: number;
    size: number;
}

export interface FileDownloadSession {
    path: string;
    ctime: number;
    mtime: number;
    lastTime: number;
    sessionId: string;
    totalChunks: number;
    size: number;
    chunks: Map<number, ArrayBuffer>;
}

export interface ReceiveMtimeMessage {
    path: string;
    ctime: number;
    mtime: number;
}

export interface ReceivePathMessage {
    path: string;
}

export interface SyncEndData {
    lastTime: number;
    needUploadCount: number;
    needModifyCount: number;
    needSyncMtimeCount: number;
    needDeleteCount: number;
}
