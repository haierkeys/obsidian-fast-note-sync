import { Notice } from "obsidian";

import { hashContent, addRandomParam } from "./helps";
import type FastSync from "../main";


export interface NoteHistoryItem {
    id: number;
    noteId: number;
    vaultId: number;
    path: string;
    clientName: string;
    version: number;
    createdAt: string;
}

export interface NoteHistoryDetail {
    id: number;
    noteId: number;
    vaultId: number;
    path: string;
    content: string;
    diffs: { Type: number; Text: string }[];
    clientName: string;
    version: number;
    createdAt: string;
}

/**
 * 统一的 HTTP API 服务类
 */
export class HttpApiService {
    constructor(private plugin: FastSync) { }

    /**
     * 获取笔记历史列表
     */
    async getNoteHistoryList(path: string, page = 1, pageSize = 20): Promise<{ list: NoteHistoryItem[], totalRows: number }> {
        const baseUrl = `${this.plugin.runApi}/api/note/histories`;
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path),
            page: page.toString(),
            pageSize: pageSize.toString()
        });

        const url = addRandomParam(`${baseUrl}?${params.toString()}`);

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });

            if (!res.ok) {
                const msg = `HTTP ${res.status}: Failed to fetch history list`;
                throw new Error(msg);
            }

            const json = await res.json();


            if (!json.status) {
                const msg = json?.message || "Failed to fetch history list";
                throw new Error(msg);
            }

            return {
                list: json.data?.list || [],
                totalRows: json.data?.pager?.totalRows || 0
            };
        } catch (e) {
            // Handle network errors specifically
            if (e instanceof TypeError && e.message.includes('fetch')) {
                throw new Error("无法连接到服务器，请检查网络连接");
            }

            throw e;
        }
    }

    /**
     * 获取笔记历史详情
     */
    async getNoteHistoryDetail(id: number): Promise<NoteHistoryDetail> {
        const url = addRandomParam(`${this.plugin.runApi}/api/note/history?id=${id}`);

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });
            const json = await res.json();

            if (res.status !== 200 || !json.status) {
                const msg = json?.message || "Failed to fetch history detail";
                new Notice(msg);
                throw new Error(msg);
            }

            return json.data;
        } catch (e) {
            //  new Notice("Failed to fetch history detail");
            throw e;
        }
    }

    /**
     * 恢复笔记到指定的历史版本
     */
    async restoreNoteVersion(historyId: number): Promise<boolean> {
        const url = `${this.plugin.runApi}/api/note/history/restore`;

        try {
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    historyId: historyId,
                    vault: this.plugin.settings.vault
                })
            });

            const json = await res.json();

            if (res.status !== 200 || !json.status) {
                const msg = json?.message || "Failed to restore note version";
                new Notice(msg);
                return false;
            }

            return true;
        } catch (e) {
            console.error("restoreNoteVersion error:", e);
            new Notice("恢复版本请求失败");
            return false;
        }
    }

    /**
     * 获取服务端文件信息
     * 用于在删除本地文件前核对状态
     */
    async getFileInfo(path: string): Promise<any> {
        const baseUrl = `${this.plugin.runApi}/api/file/info`;
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path).toString(),
            isRecycle: "false"
        });

        const url = addRandomParam(`${baseUrl}?${params.toString()}`);

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });

            if (!res.ok) {
                const msg = `HTTP ${res.status}: Failed to fetch file info`;
                throw new Error(msg);
            }

            const json = await res.json();
            return json;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 获取笔记列表（支持回收站模式）
     */
    async getNoteList(page = 1, pageSize = 20, isRecycle = false, keyword = ""): Promise<NoteListResponse> {
        let url = `${this.plugin.runApi}/api/notes`;
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            page: page.toString(),
            pageSize: pageSize.toString(),
            isRecycle: isRecycle ? "true" : "false"
        });

        if (keyword) {
            params.append("keyword", keyword);
        }

        if (isRecycle) {
            params.set("isRecycle", "true");
        }

        const requestUrl = addRandomParam(`${url}?${params.toString()}`);

        try {
            const res = await fetch(requestUrl, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });

            if (!res.ok) {
                const msg = `HTTP ${res.status}: Failed to fetch note list`;
                throw new Error(msg);
            }

            const json = await res.json();
            if (!json.status) {
                const msg = json?.message || "Failed to fetch note list";
                throw new Error(msg);
            }

            return json.data || { list: [], pager: { page, pageSize, totalRows: 0, totalPages: 0 } };

        } catch (e) {
            throw e;
        }
    }

    /**
     * 获取文件列表（支持回收站模式）
     */
    async getFileList(page = 1, pageSize = 20, isRecycle = false, keyword = ""): Promise<FileListResponse> {
        let url = `${this.plugin.runApi}/api/files`;
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            page: page.toString(),
            pageSize: pageSize.toString(),
            isRecycle: isRecycle ? "true" : "false"
        });

        if (keyword) {
            params.append("keyword", keyword);
        }

        const requestUrl = addRandomParam(`${url}?${params.toString()}`);

        try {
            const res = await fetch(requestUrl, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });

            if (!res.ok) {
                const msg = `HTTP ${res.status}: Failed to fetch file list`;
                throw new Error(msg);
            }

            const json = await res.json();
            if (!json.status) {
                const msg = json?.message || "Failed to fetch file list";
                throw new Error(msg);
            }

            return json.data || { list: [], pager: { page, pageSize, totalRows: 0, totalPages: 0 } };

        } catch (e) {
            throw e;
        }
    }

    /**
     * 恢复已删除的笔记
     */
    async restoreNote(path: string, pathHash?: string): Promise<boolean> {
        const url = `${this.plugin.runApi}/api/note/restore`;
        try {
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: path,
                    pathHash: pathHash,
                    vault: this.plugin.settings.vault
                })
            });

            const json = await res.json();
            if (res.status !== 200 || !json.status) {
                const msg = json?.message || "Failed to restore note";
                new Notice(msg);
                return false;
            }
            return true;

        } catch (e) {
            console.error("restoreNote error:", e);
            new Notice("恢复笔记失败");
            return false;
        }
    }

    /**
     * 恢复已删除的文件
     */
    async restoreFile(path: string, pathHash?: string): Promise<boolean> {
        const url = `${this.plugin.runApi}/api/file/restore`;
        try {
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: path,
                    pathHash: pathHash,
                    vault: this.plugin.settings.vault
                })
            });

            const json = await res.json();
            if (res.status !== 200 || !json.status) {
                const msg = json?.message || "Failed to restore file";
                new Notice(msg);
                return false;
            }
            return true;

        } catch (e) {
            console.error("restoreFile error:", e);
            new Notice("恢复文件失败");
            return false;
        }
    }

    /**
     * 删除文件（移动到回收站）
     */
    async deleteFile(path: string, pathHash?: string): Promise<boolean> {
        const url = `${this.plugin.runApi}/api/file/delete`;
        try {
            // 注意：Swagger 是 DELETE /api/file
            // 但通常 DELETE 请求参数在 query 或 body。根据 webgui:
            // DELETE /api/file, body: { vault, path, pathHash }
            const deleteUrl = `${this.plugin.runApi}/api/file`;
            const res = await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: path,
                    pathHash: pathHash,
                    vault: this.plugin.settings.vault
                })
            });

            const json = await res.json();
            if (res.status !== 200 || !json.status) {
                const msg = json?.message || "Failed to delete file";
                new Notice(msg);
                return false;
            }
            return true;

        } catch (e) {
            console.error("deleteFile error:", e);
            new Notice("删除文件失败");
            return false;
        }
    }

    /**
     * 清除回收站内容（支持批量和一键清空）
     */
    async clearRecycleBin(type: 'note' | 'file', paths?: string[], pathHashes?: string[]): Promise<boolean> {
        const endpoint = type === 'note' ? '/api/note/recycle-clear' : '/api/file/recycle-clear';
        const url = `${this.plugin.runApi}${endpoint}`;

        try {
            const res = await fetch(url, {
                method: "DELETE",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    vault: this.plugin.settings.vault,
                    paths: paths || [],
                    pathHashes: pathHashes || []
                })
            });

            const json = await res.json();
            if (res.status !== 200 || !json.status) {
                const msg = json?.message || (paths && paths.length > 0 ? "批量永久删除失败" : "清空回收站失败");
                new Notice(msg);
                return false;
            }
            return true;

        } catch (e) {
            console.error("clearRecycleBin error:", e);
            new Notice("请求失败，请检查网络");
            return false;
        }
    }
}

/**
 * 扩展 API 服务类以支持回收站功能
 */
export interface NoteListResponse {
    list: any[];
    pager: {
        page: number;
        pageSize: number;
        totalRows: number;
        totalPages: number;
    };
}

export interface FileListResponse {
    list: any[];
    pager: {
        page: number;
        pageSize: number;
        totalRows: number;
        totalPages: number;
    };
}
