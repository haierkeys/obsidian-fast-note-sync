import { TFile, TAbstractFile, Notice, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveFileSyncUpdateMessage, FileUploadMessage, FileSyncChunkDownloadMessage, FileDownloadSession, ReceiveMtimeMessage, ReceivePathMessage } from "./types";
import { hashContent, hashArrayBuffer, dump } from "./helps";
import type FastSync from "../main";
import { $ } from "../lang/lang";


export const BINARY_PREFIX_FILE_SYNC = "00";

/**
 * 文件（非笔记）修改事件处理
 */
export const fileModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
    if (!(file instanceof TFile)) return;
    if (file.path.endsWith(".md")) return;
    if (eventEnter && !plugin.getWatchEnabled()) return;
    if (eventEnter && !plugin.settings.syncEnabled) return;
    if (eventEnter && plugin.ignoredFiles.has(file.path)) return;

    plugin.addIgnoredFile(file.path);

    const content: ArrayBuffer = await plugin.app.vault.readBinary(file);
    const contentHash = hashArrayBuffer(content);

    const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
        contentHash: contentHash,
        mtime: file.stat.mtime,
        ctime: file.stat.ctime,
        size: file.stat.size,
    };
    plugin.websocket.MsgSend("FileUploadCheck", data);
    dump(`File modify check sent`, data.path, data.contentHash);
    plugin.removeIgnoredFile(file.path);
};

/**
 * 文件删除事件处理
 */
export const fileDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
    if (!(file instanceof TFile)) return;
    if (file.path.endsWith(".md")) return;
    if (eventEnter && !plugin.getWatchEnabled()) return;
    if (eventEnter && !plugin.settings.syncEnabled) return;
    if (eventEnter && plugin.ignoredFiles.has(file.path)) return;

    plugin.addIgnoredFile(file.path);
    handleFileDeleteByPath(file.path, plugin);
    dump(`File delete send`, file.path);
    plugin.removeIgnoredFile(file.path);
};

/**
 * 文件重命名事件处理
 */
export const fileRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
    if (file.path.endsWith(".md")) return;
    if ((!plugin.getWatchEnabled() || !plugin.settings.syncEnabled) && eventEnter) return;
    if (plugin.ignoredFiles.has(file.path) && eventEnter) return;
    if (!(file instanceof TFile)) return;

    plugin.addIgnoredFile(file.path);
    await fileModify(file, plugin, false);
    dump(`File rename modify send`, file.path);
    handleFileDeleteByPath(oldfile, plugin);
    dump(`File rename delete send`, oldfile);
    plugin.removeIgnoredFile(file.path);
};




/**
 * 接收服务端文件开始上传请求 只有 hash
 */
export const receiveFileNeedUpload = async function (data: ReceivePathMessage, plugin: FastSync) {
    dump(`Receive file need upload: `, data.path);
    const file = plugin.app.vault.getFileByPath(normalizePath(data.path));
    if (!file) {
        dump(`File not found for upload: ${data.path} `);
        return;
    }
    fileModify(file, plugin, false);
};

/**
 * 接收服务端文件上传指令 (FileUpload)
 */
export const receiveFileUpload = async function (data: FileUploadMessage, plugin: FastSync) {
    dump(`Receive file need upload: `, data.path, data.sessionId);
    const file = plugin.app.vault.getFileByPath(normalizePath(data.path));
    if (!file) {
        dump(`File not found for upload: ${data.path} `);
        return;
    }

    const content: ArrayBuffer = await plugin.app.vault.readBinary(file);
    const chunkSize = data.chunkSize || 1024 * 1024;
    const totalChunks = Math.ceil(content.byteLength / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, content.byteLength);
        const chunk = content.slice(start, end);

        const sessionIdBytes = new TextEncoder().encode(data.sessionId);
        const chunkIndexBytes = new Uint8Array(4);
        const view = new DataView(chunkIndexBytes.buffer);
        view.setUint32(0, i, false);

        const frame = new Uint8Array(36 + 4 + chunk.byteLength);
        frame.set(sessionIdBytes, 0);
        frame.set(chunkIndexBytes, 36);
        frame.set(new Uint8Array(chunk), 40);
        plugin.websocket.SendBinary(frame, BINARY_PREFIX_FILE_SYNC);
    }
};

/**
 * 接收服务端文件更新通知 (FileSyncUpdate)
 */
export const receiveFileSyncUpdate = async function (data: ReceiveFileSyncUpdateMessage, plugin: FastSync) {
    dump(`Receive file sync update(download): `, data.path);
    const tempKey = `temp_${data.path} `;
    const tempSession = {
        path: data.path,
        ctime: data.ctime,
        mtime: data.mtime,
        lastTime: data.lastTime,
        sessionId: "",
        totalChunks: 0,
        size: data.size,
        chunks: new Map<number, ArrayBuffer>(),
    };
    plugin.fileDownloadSessions.set(tempKey, tempSession);

    const requestData = {
        vault: plugin.settings.vault,
        path: data.path,
        pathHash: data.pathHash,
    };
    plugin.websocket.MsgSend("FileChunkDownload", requestData);
    plugin.totalFilesToDownload++;
};

/**
 * 接收服务端文件删除通知
 */
export const receiveFileSyncDelete = async function (data: ReceivePathMessage, plugin: FastSync) {
    dump(`Receive file delete: `, data.path);
    const normalizedPath = normalizePath(data.path);
    const file = plugin.app.vault.getFileByPath(normalizedPath);
    if (file instanceof TFile) {
        plugin.addIgnoredFile(normalizedPath);
        await plugin.app.vault.delete(file);
        plugin.removeIgnoredFile(normalizedPath);
    }
};

/**
 * 接收服务端文件元数据(mtime)更新通知
 */
export const receiveFileSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
    dump(`Receive file sync mtime: `, data.path, data.mtime);
    const normalizedPath = normalizePath(data.path);
    const file = plugin.app.vault.getFileByPath(normalizedPath);
    if (file) {
        const content = await plugin.app.vault.readBinary(file);
        plugin.addIgnoredFile(normalizedPath);
        await plugin.app.vault.modifyBinary(file, content, { ctime: data.ctime, mtime: data.mtime });
        plugin.removeIgnoredFile(normalizedPath);
    }
};

/**
 * 接收服务端分片下载响应 (FileSyncChunkDownload)
 */
export const receiveFileSyncChunkDownload = async function (data: FileSyncChunkDownloadMessage, plugin: FastSync) {
    dump(`Receive file chunk download: `, data.path, data.sessionId, `totalChunks: ${data.totalChunks} `);
    const tempKey = `temp_${data.path} `;
    const tempSession = plugin.fileDownloadSessions.get(tempKey);

    if (tempSession) {
        const session: FileDownloadSession = {
            path: data.path,
            ctime: data.ctime,
            mtime: data.mtime,
            lastTime: tempSession.lastTime,
            sessionId: data.sessionId,
            totalChunks: data.totalChunks,
            size: data.size,
            chunks: new Map<number, ArrayBuffer>(),
        };
        plugin.fileDownloadSessions.set(data.sessionId, session);
        plugin.fileDownloadSessions.delete(tempKey);
    } else {
        const session: FileDownloadSession = {
            path: data.path,
            ctime: data.ctime,
            mtime: data.mtime,
            lastTime: 0,
            sessionId: data.sessionId,
            totalChunks: data.totalChunks,
            size: data.size,
            chunks: new Map<number, ArrayBuffer>(),
        };
        plugin.fileDownloadSessions.set(data.sessionId, session);
    }

    plugin.totalChunksToDownload += data.totalChunks;
    plugin.updateStatusBar($("同步中"), plugin.downloadedChunksCount, plugin.totalChunksToDownload);
};

/**
 * 接收文件同步结束通知
 */
export const receiveFileSyncEnd = async function (data: ReceiveMessage, plugin: FastSync, checkCompletion: (plugin: FastSync) => void) {
    dump(`Receive file sync end: `, data.vault, data.lastTime);
    plugin.settings.lastFileSyncTime = data.lastTime;
    await plugin.saveData(plugin.settings);
    plugin.syncTypeCompleteCount++;

    checkCompletion(plugin);
};



/**
 * 根据路径发送文件删除消息
 */
const handleFileDeleteByPath = function (path: string, plugin: FastSync) {
    if (path.endsWith(".md")) return;
    const data = {
        vault: plugin.settings.vault,
        path: path,
        pathHash: hashContent(path),
    };
    plugin.websocket.MsgSend("FileDelete", data);
};

/**
 * 处理接收到的二进制文件分片
 */
export const handleFileChunkDownload = async function (buf: ArrayBuffer | Blob, plugin: FastSync, checkCompletion: (plugin: FastSync) => void) {
    const binaryData = buf instanceof Blob ? await buf.arrayBuffer() : buf;
    if (binaryData.byteLength < 40) return;

    const sessionIdBytes = new Uint8Array(binaryData, 0, 36);
    const sessionId = new TextDecoder().decode(sessionIdBytes);
    const chunkIndexBytes = new Uint8Array(binaryData, 36, 4);
    const view = new DataView(chunkIndexBytes.buffer, chunkIndexBytes.byteOffset, 4);
    const chunkIndex = view.getUint32(0, false);
    const chunkData = binaryData.slice(40);

    const session = plugin.fileDownloadSessions.get(sessionId);
    if (!session) return;

    session.chunks.set(chunkIndex, chunkData);
    plugin.downloadedChunksCount++;
    plugin.updateStatusBar($("同步中"), plugin.downloadedChunksCount, plugin.totalChunksToDownload);

    if (session.chunks.size === session.totalChunks) {
        await handleFileChunkDownloadComplete(session, plugin, checkCompletion);
    }
};

/**
 * 完成文件下载
 */
const handleFileChunkDownloadComplete = async function (session: FileDownloadSession, plugin: FastSync, checkCompletion: (plugin: FastSync) => void) {
    try {
        const chunks: ArrayBuffer[] = [];
        for (let i = 0; i < session.totalChunks; i++) {
            const chunk = session.chunks.get(i);
            if (!chunk) {
                plugin.fileDownloadSessions.delete(session.sessionId);
                return;
            }
            chunks.push(chunk);
        }

        const totalSize = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
        const completeFile = new Uint8Array(totalSize);
        let offset = 0;
        for (const chunk of chunks) {
            completeFile.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
        }

        if (completeFile.byteLength !== session.size) {
            plugin.fileDownloadSessions.delete(session.sessionId);
            return;
        }

        const normalizedPath = normalizePath(session.path);
        plugin.addIgnoredFile(normalizedPath);
        const file = plugin.app.vault.getFileByPath(normalizedPath);
        if (file) {
            await plugin.app.vault.modifyBinary(file, completeFile.buffer, { ctime: session.ctime, mtime: session.mtime });
        } else {
            const folder = normalizedPath.split("/").slice(0, -1).join("/");
            if (folder != "") {
                const dirExists = plugin.app.vault.getFolderByPath(folder);
                if (dirExists == null) await plugin.app.vault.createFolder(folder);
            }
            await plugin.app.vault.createBinary(normalizedPath, completeFile.buffer, { ctime: session.ctime, mtime: session.mtime });
        }
        plugin.removeIgnoredFile(normalizedPath);

        if (plugin.settings.lastFileSyncTime < session.lastTime) {
            plugin.settings.lastFileSyncTime = session.lastTime;
            await plugin.saveData(plugin.settings);
        }

        plugin.fileDownloadSessions.delete(session.sessionId);
        plugin.downloadedFilesCount++;
        checkCompletion(plugin);
    } catch (e) {
        plugin.fileDownloadSessions.delete(session.sessionId);
        checkCompletion(plugin);
    }
}

