import { TFile, TAbstractFile, normalizePath } from "obsidian";

import { ReceiveMessage, ReceiveMtimeMessage, ReceivePathMessage } from "./types";
import { hashContent, dump } from "./helps";
import type FastSync from "../main";


/**
 * 笔记修改事件处理
 */
export const noteModify = async function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return;
    if (!(file instanceof TFile)) return;
    if (!file.path.endsWith(".md")) return;
    if (eventEnter && !plugin.getWatchEnabled()) return;
    if (eventEnter && plugin.ignoredFiles.has(file.path)) return;

    plugin.addIgnoredFile(file.path);

    const content: string = await plugin.app.vault.cachedRead(file);
    const contentHash = hashContent(content);

    const data = {
        vault: plugin.settings.vault,
        ctime: file.stat.ctime,
        mtime: file.stat.mtime,
        path: file.path,
        pathHash: hashContent(file.path),
        content: content,
        contentHash: contentHash,
    };
    plugin.websocket.MsgSend("NoteModify", data);
    dump(`Note modify send`, data.path, data.contentHash, data.mtime, data.pathHash);
    plugin.removeIgnoredFile(file.path);
};

/**
 * 笔记删除事件处理
 */
export const noteDelete = function (file: TAbstractFile, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return;
    if (!(file instanceof TFile)) return;
    if (!file.path.endsWith(".md")) return;
    if (eventEnter && !plugin.getWatchEnabled()) return;
    if (eventEnter && plugin.ignoredFiles.has(file.path)) return;

    plugin.addIgnoredFile(file.path);

    const data = {
        vault: plugin.settings.vault,
        path: file.path,
        pathHash: hashContent(file.path),
    };
    plugin.websocket.MsgSend("NoteDelete", data);

    dump(`Note delete send`, file.path);
    plugin.removeIgnoredFile(file.path);
};

/**
 * 笔记重命名事件处理
 */
export const noteRename = async function (file: TAbstractFile, oldfile: string, plugin: FastSync, eventEnter: boolean = false) {
    if (plugin.settings.syncEnabled == false) return;
    if (!(file instanceof TFile)) return;
    if (!file.path.endsWith(".md")) return;
    if (eventEnter && !plugin.getWatchEnabled()) return;
    if (eventEnter && plugin.ignoredFiles.has(file.path)) return;

    plugin.addIgnoredFile(file.path);

    const content: string = await plugin.app.vault.cachedRead(file);
    const contentHash = hashContent(content);

    const data = {
        vault: plugin.settings.vault,
        ctime: file.stat.ctime,
        mtime: file.stat.mtime,
        path: file.path,
        pathHash: hashContent(file.path),
        content: content,
        contentHash: contentHash,
        oldPath: oldfile,
        oldPathHash: hashContent(oldfile),
    };

    plugin.websocket.MsgSend("NoteRename", data);
    dump(`Note rename send`, data.path, data.contentHash, data.mtime, data.pathHash);

    plugin.removeIgnoredFile(file.path);
};


/**
 * 接收服务端笔记修改通知
 */
export const receiveNoteSyncModify = async function (data: ReceiveMessage, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return;
    dump(`Receive note modify:`, data.path, data.contentHash, data.mtime, data.pathHash);



    const normalizedPath = normalizePath(data.path);
    const file = plugin.app.vault.getFileByPath(normalizedPath);
    plugin.addIgnoredFile(normalizedPath);
    if (file) {
        await plugin.app.vault.modify(file, data.content, { ctime: data.ctime, mtime: data.mtime });
    } else {
        const folder = normalizedPath.split("/").slice(0, -1).join("/");
        if (folder != "") {
            const dirExists = plugin.app.vault.getFolderByPath(folder);
            if (dirExists == null) await plugin.app.vault.createFolder(folder);
        }
        await plugin.app.vault.create(normalizedPath, data.content, { ctime: data.ctime, mtime: data.mtime });
    }
    if (plugin.settings.lastNoteSyncTime < data.lastTime) {
        plugin.settings.lastNoteSyncTime = data.lastTime;
        await plugin.saveData(plugin.settings);
    }
    plugin.removeIgnoredFile(normalizedPath);
};

/**
 * 接收服务端请求上传笔记
 */
export const receiveNoteUpload = async function (data: ReceivePathMessage, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return;
    dump(`Receive note need push:`, data.path);
    const file = plugin.app.vault.getFileByPath(normalizePath(data.path));
    if (file) {
        await noteModify(file, plugin, false);
    }
};

/**
 * 接收服务端笔记元数据(mtime)更新通知
 */
export const receiveNoteSyncMtime = async function (data: ReceiveMtimeMessage, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return;
    dump(`Receive note sync mtime:`, data.path, data.mtime);

    const normalizedPath = normalizePath(data.path);
    const file = plugin.app.vault.getFileByPath(normalizedPath);
    if (file) {
        const content: string = await plugin.app.vault.cachedRead(file);
        plugin.addIgnoredFile(normalizedPath);
        await plugin.app.vault.modify(file, content, { ctime: data.ctime, mtime: data.mtime });
        plugin.removeIgnoredFile(normalizedPath);
    }
};

/**
 * 接收服务端笔记删除通知
 */
export const receiveNoteSyncDelete = async function (data: ReceiveMessage, plugin: FastSync) {
    if (plugin.settings.syncEnabled == false) return;
    dump(`Receive note delete:`, data.action, data.path, data.mtime, data.pathHash);
    const normalizedPath = normalizePath(data.path);
    const file = plugin.app.vault.getFileByPath(normalizedPath);
    if (file instanceof TFile) {
        plugin.addIgnoredFile(normalizedPath);
        await plugin.app.vault.delete(file);
        plugin.removeIgnoredFile(normalizedPath);
    }
};

/**
 * 接收笔记同步结束通知
 */
export const receiveNoteSyncEnd = async function (data: ReceiveMessage, plugin: FastSync, checkCompletion: (plugin: FastSync) => void) {
    if (plugin.settings.syncEnabled == false) return;
    dump(`Receive note end:`, data.vault, data, data.lastTime);
    plugin.settings.lastNoteSyncTime = data.lastTime;
    await plugin.saveData(plugin.settings);
    plugin.syncTypeCompleteCount++;

    checkCompletion(plugin);
};
