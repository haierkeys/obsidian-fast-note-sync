import { Notice, requestUrl } from "obsidian";

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

export interface UserDTO {
    uid: number;
    username: string;
    email: string;
    avatar: string;
    token: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * 统一的 HTTP API 服务类
 */
export class HttpApiService {
    constructor(private plugin: FastSync) { }

    /**
     * 探测 API 跳转情况。
     * 该方法应在插件加载、配置保存后、WebSocket 启动前调用。
     * 它基于 settings.api 进行探测，并同步更新运行时的 runApi。
     */
    async probeApiRedirect() {
        if (!this.plugin.settings.api) return;

        const base = this.plugin.settings.api.replace(/\/+$/, "");
        const probeUrl = addRandomParam(base + "/api/health");

        try {
            // 默认优先用 fetch 探测以获取 301/302 后的最终路径
            const res = await fetch(probeUrl, { method: 'GET', redirect: 'follow' });
            if (res.url) {
                const healthIndex = res.url.indexOf("/api/health");
                if (healthIndex !== -1) {
                    const newBase = res.url.substring(0, healthIndex).replace(/\/+$/, "");
                    this.plugin.updateRuntimeApi(newBase);
                }
            }
        } catch (e) {
            // 即使失败，也确保 runApi 有值（回退到配置值）
            this.plugin.updateRuntimeApi(base);
        }
    }

    /**
     * 内部通用请求方法，支持网络库切换
     * @param endpoint 接口相对路径（如 /api/notes，不包含主机名）
     * @param options 请求选项
     */
    private async request(endpoint: string, options: { method: string, headers?: Record<string, string>, body?: string }): Promise<{ status: number, json: any, finalUrl: string }> {
        const networkLibrary = this.plugin.settings.networkLibrary;
        // 使用 runApi 作为基准，由于已经通过 probeApiRedirect 探测过，此处直接使用
        const base = (this.plugin.runApi || this.plugin.settings.api).replace(/\/+$/, "");
        const url = addRandomParam(base + endpoint);

        if (networkLibrary === 'requestUrl') {
            // 使用 Obsidian 官方 requestUrl
            try {
                const response = await requestUrl({
                    url: url,
                    method: options.method,
                    headers: options.headers,
                    body: options.body,
                    throw: false
                });

                return {
                    status: response.status,
                    json: response.json,
                    finalUrl: url
                };
            } catch (e) {
                throw e;
            }
        } else {
            // 使用原生 fetch
            const fetchOptions: RequestInit = {
                method: options.method,
                headers: options.headers,
                body: options.body,
                redirect: "follow"
            };

            const res = await fetch(url, fetchOptions);
            const json = await res.json();

            // 业务请求内部不再由于业务地址跳转而频繁更新 runApi，
            // 除非发生了明显的域名变更（作为冗余安全措施）
            if (res.url && res.url !== url) {
                try {
                    const finalUrlObj = new URL(res.url);
                    const originalUrlObj = new URL(url);
                    if (finalUrlObj.origin !== originalUrlObj.origin) {
                        const apiIndex = res.url.indexOf("/api/");
                        if (apiIndex !== -1) {
                            const newBase = res.url.substring(0, apiIndex).replace(/\/+$/, "");
                            this.plugin.updateRuntimeApi(newBase);
                        }
                    }
                } catch (e) {
                    // ignore
                }
            }

            return {
                status: res.status,
                json: json,
                finalUrl: res.url
            };
        }
    }

    /**
     * 获取笔记历史列表
     */
    async getNoteHistoryList(path: string, page = 1, pageSize = 20): Promise<{ list: NoteHistoryItem[], totalRows: number }> {
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path),
            page: page.toString(),
            pageSize: pageSize.toString()
        });

        const endpoint = `/api/note/histories?${params.toString()}`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: { "token": this.plugin.settings.apiToken }
            });

            if (status !== 200) {
                throw new Error(`HTTP ${status}: Failed to fetch history list`);
            }

            if (!json.status) {
                throw new Error(json?.message || "Failed to fetch history list");
            }

            return {
                list: json.data?.list || [],
                totalRows: json.data?.pager?.totalRows || 0
            };
        } catch (e) {
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
        const endpoint = `/api/note/history?id=${id}`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: { "token": this.plugin.settings.apiToken }
            });

            if (status !== 200 || !json.status) {
                const msg = json?.message || "Failed to fetch history detail";
                new Notice(msg);
                throw new Error(msg);
            }

            return json.data;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 恢复笔记到指定的历史版本
     */
    async restoreNoteVersion(historyId: number): Promise<boolean> {
        const endpoint = `/api/note/history/restore`;

        try {
            const { status, json } = await this.request(endpoint, {
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

            if (status !== 200 || !json.status) {
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
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path).toString(),
            isRecycle: "false"
        });

        const endpoint = `/api/file/info?${params.toString()}`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: { "token": this.plugin.settings.apiToken }
            });

            if (status !== 200) {
                throw new Error(`HTTP ${status}: Failed to fetch file info`);
            }

            return json;
        } catch (e) {
            throw e;
        }
    }

    /**
     * 获取笔记列表（支持回收站模式）
     */
    async getNoteList(page = 1, pageSize = 20, isRecycle = false, keyword = ""): Promise<NoteListResponse> {
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            page: page.toString(),
            pageSize: pageSize.toString(),
            isRecycle: isRecycle ? "true" : "false"
        });

        if (keyword) {
            params.append("keyword", keyword);
        }

        const endpoint = `/api/notes?${params.toString()}`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: { "token": this.plugin.settings.apiToken }
            });

            if (status !== 200) {
                throw new Error(`HTTP ${status}: Failed to fetch note list`);
            }

            if (!json.status) {
                throw new Error(json?.message || "Failed to fetch note list");
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
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            page: page.toString(),
            pageSize: pageSize.toString(),
            isRecycle: isRecycle ? "true" : "false"
        });

        if (keyword) {
            params.append("keyword", keyword);
        }

        const endpoint = `/api/files?${params.toString()}`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: { "token": this.plugin.settings.apiToken }
            });

            if (status !== 200) {
                throw new Error(`HTTP ${status}: Failed to fetch file list`);
            }

            if (!json.status) {
                throw new Error(json?.message || "Failed to fetch file list");
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
        const endpoint = `/api/note/restore`;
        try {
            const { status, json } = await this.request(endpoint, {
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

            if (status !== 200 || !json.status) {
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
        const endpoint = `/api/file/restore`;
        try {
            const { status, json } = await this.request(endpoint, {
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

            if (status !== 200 || !json.status) {
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
        const endpoint = `/api/file`;
        try {
            const { status, json } = await this.request(endpoint, {
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

            if (status !== 200 || !json.status) {
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

        try {
            const { status, json } = await this.request(endpoint, {
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

            if (status !== 200 || !json.status) {
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

    /**
     * 创建分享链接
     */
    async createShare(path: string): Promise<{ id: number, token: string } | null> {
        const endpoint = `/api/share`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "POST",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: path,
                    pathHash: hashContent(path),
                    vault: this.plugin.settings.vault
                })
            });

            if (status !== 200 || !json.status) {
                const msg = json?.message || "Failed to create share";
                new Notice(msg);
                return null;
            }
            return json.data;
        } catch (e) {
            console.error("createShare error:", e);
            new Notice("创建分享失败");
            return null;
        }
    }

    /**
     * 查询分享状态
     */
    async getShare(path: string): Promise<{ id: number, token: string } | null> {
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path)
        });
        const endpoint = `/api/share?${params.toString()}`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });

            if (status !== 200 || !json.status) {
                return null;
            }
            return json.data;
        } catch (e) {
            console.error("getShare error:", e);
            return null;
        }
    }

    /**
     * 取消分享
     */
    async cancelShare(path: string): Promise<boolean> {
        const endpoint = `/api/share`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "DELETE",
                headers: {
                    "token": this.plugin.settings.apiToken,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    path: path,
                    pathHash: hashContent(path),
                    vault: this.plugin.settings.vault
                })
            });

            if (status !== 200 || !json.status) {
                const msg = json?.message || "Failed to cancel share";
                new Notice(msg);
                return false;
            }
            return true;
        } catch (e) {
            console.error("cancelShare error:", e);
            new Notice("取消分享失败");
            return false;
        }
    }

    /**
     * 获取当前用户信息
     */
    async getUserInfo(): Promise<UserDTO> {
        const endpoint = `/api/user/info`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                headers: { "token": this.plugin.settings.apiToken }
            });

            if (status !== 200 || !json.status) {
                throw new Error(json?.message || "Failed to fetch user info");
            }

            return json.data;
        } catch (e) {
            throw e;
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
