import { requestUrl } from "obsidian";

import { hashContent, addRandomParam, showSyncNotice, dump, dumpError, nativeFetch } from "./helps";
import { getLocale } from "../i18n/lang";
import { CLIENT_TYPE } from "./types";
import type FastSync from "../main";


export interface NoteHistoryItem {
    id: number;
    noteId: number;
    vaultId: number;
    path: string;
    clientType: string;
    clientVersion: string;
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
    clientType: string;
    clientVersion: string;
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

export interface Pager {
    page: number;
    pageSize: number;
    totalRows: number;
    totalPages: number;
}

export interface SupportRecord {
    amount: string;
    item: string;
    message: string;
    name: string;
    time: string;
    unit: string;
}

export interface SupportPager {
    page: number;
    pageSize: number;
    totalRows: number;
}

export interface NoteListResponse {
    list: {
        id: number;
        path: string;
        pathHash: string;
        size: number;
        mtime: number;
        updatedAt: string;
    }[];
    pager: Pager;
}

export interface FileListResponse {
    list: {
        id: number;
        path: string;
        pathHash: string;
        size: number;
        mtime: number;
        updatedAt: string;
    }[];
    pager: Pager;
}

export interface WSClient {
    uid: number | string;
    username?: string;
    nickname?: string;
    client?: string;
    clientName: string;
    clientVersion: string;
    clientType?: string;
    ip?: string;
    remoteAddr?: string;
    connectedAt?: string;
    startTime?: string | number;
    traceId?: string;
    platformInfo?: {
        isMobile: boolean;
        platform: string;
    };
}

export interface FileInfoResponse {
    id: number;
    path: string;
    pathHash: string;
    size: number;
    mtime: number;
    contentHash: string;
    isRecycle: boolean;
    updatedAt: string;
}

export interface ApiResponse<T = unknown> {
    code: number;
    message?: string;
    data: T;
}

/**
 * 统一的 HTTP API 服务类
 */
export class HttpApiService {
    constructor(private plugin: FastSync) { }

    /**
     * 判断响应是否成功 (code > 0 && code < 300)
     */
    private isSuccess(json: unknown): boolean {
        const res = json as ApiResponse;
        return !!(res && res.code > 0 && res.code < 300);
    }

    /**
     * 探测 API 跳转情况。
     * 该方法应在插件加载、配置保存后、WebSocket 启动前调用。
     * 它基于 settings.api 进行探测，并同步更新运行时的 runApi。
     */
    async probeApiRedirect(targetUrl?: string): Promise<boolean> {
        const urlToProbe = targetUrl || this.plugin.settings.api;
        if (!urlToProbe) return false;

        const base = urlToProbe.replace(/\/+$/, "");

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);

        try {
            // 如果未开启自动重定向检测，使用标准请求检查健康状态
            if (!this.plugin.settings.autoRedirectEnabled) {
                try {
                    const { status } = await this.request("/api/health", { method: "GET", signal: controller.signal });
                    // 2xx 表示健康，404 表示旧版服务端（也允许连接）
                    const isOk = (status >= 200 && status < 300) || status === 404;
                    if (isOk) {
                        this.plugin.updateRuntimeApi(base);
                    }
                    return isOk;
                } catch {
                    this.plugin.updateRuntimeApi(base);
                    return false;
                }
            }

            const probeUrl = addRandomParam(base + "/api/health");

            // 开启了自动重定向检测：使用 fetch 探测以获取 301/302 后的最终路径
            const res = await nativeFetch(probeUrl, {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal
            });
            if (res.url) {
                dump("probeApiRedirect", res.url);
                const healthIndex = res.url.indexOf("/api/health");
                if (healthIndex !== -1) {
                    const newBase = res.url.substring(0, healthIndex).replace(/\/+$/, "");
                    this.plugin.updateRuntimeApi(newBase);
                } else {
                    this.plugin.updateRuntimeApi(base);
                }
            }

            // 进一步校验业务状态码 (若返回的是 JSON)
            try {
                const json = (await res.clone().json()) as ApiResponse<unknown>;
                return (res.ok || res.status === 404) && (res.status === 404 || this.isSuccess(json));
            } catch {
                // 如果不是 JSON，回退到 HTTP 状态码判断
                return res.ok || res.status === 404;
            }
        } catch (e) {
            // 即使失败，也确保 runApi 有值（回退到探测的 base）
            dumpError("probeApiRedirect error/timeout:", e);
            this.plugin.updateRuntimeApi(base);
            return false;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    /**
     * 服务端自动升级
     * 调用 /api/admin/upgrade
     */
    async adminUpgrade(version: string = "latest"): Promise<boolean> {
        const endpoint = `/api/admin/upgrade?version=${version}`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET"
            });
            return status === 200 && this.isSuccess(json);
        } catch (e) {
            dumpError("adminUpgrade error:", e);
            return false;
        }
    }

    /**
     * 检查当前用户是否具有管理员权限
     * GET /api/admin/check
     */
    async checkAdmin(signal?: AbortSignal): Promise<boolean> {
        const endpoint = `/api/admin/check`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                signal
            });
            // 根据用户提供的结构，isAdmin 位于 data 中
            const res = json as ApiResponse<{ isAdmin: boolean }>;
            return status === 200 && res.data?.isAdmin === true;
        } catch (e) {
            dumpError("checkAdmin error:", e);
            return false;
        }
    }

    /**
     * 简单的健康检查探测
     * 用于升级后的轮询
     */
    async checkHealth(signal?: AbortSignal): Promise<boolean> {
        try {
            const { status } = await this.request("/api/health", { method: "GET", signal });
            return (status >= 200 && status < 300) || status === 404;
        } catch {
            return false;
        }
    }

    /**
     * 下载二进制文件 (用于插件升级 Zip)
     */
    async downloadBinary(url: string): Promise<ArrayBuffer | null> {
        try {
            const response = await requestUrl({
                url: url,
                method: "GET",
            });
            if (response.status === 200) {
                return response.arrayBuffer;
            }
            return null;
        } catch (e) {
            dumpError("downloadBinary error:", e);
            return null;
        }
    }

    /**
     * 内部通用请求方法，支持网络库切换
     * @param endpoint 接口相对路径（如 /api/notes，不包含主机名）
     * @param options 请求选项
     */
    private async request(endpoint: string, options: { method: string, headers?: Record<string, string>, body?: string, signal?: AbortSignal }): Promise<{ status: number, json: unknown, finalUrl: string }> {
        const networkLibrary = this.plugin.settings.networkLibrary;
        // 使用 runApi 作为基准
        const base = (this.plugin.runApi || this.plugin.settings.api).replace(/\/+$/, "");
        const url = addRandomParam(base + endpoint);

        // 默认 Header 标准化
        const headers: Record<string, string> = {
            ...options.headers,
            "x-client": CLIENT_TYPE,
            "x-client-name": encodeURIComponent(this.plugin.getClientName()),
            "x-client-version": (this.plugin.manifest as { version?: string }).version || ""
        };

        if (this.plugin.settings.apiToken) {
            headers["Authorization"] = `Bearer ${this.plugin.settings.apiToken}`;
        }

        if (options.body && !headers["Content-Type"]) {
            headers["Content-Type"] = "application/json";
        }

        if (networkLibrary === 'requestUrl') {
            const requestPromise = requestUrl({
                url: url,
                method: options.method,
                headers: headers,
                body: options.body,
                throw: false
            }).then(response => ({
                status: response.status,
                json: response.json as unknown,
                finalUrl: (response as unknown as { url?: string }).url || url
            }));

            if (options.signal) {
                const timeoutPromise = new Promise<{ status: number, json: unknown, finalUrl: string }>((_, reject) => {
                    options.signal!.addEventListener('abort', () => reject(new Error('Network request timeout')));
                    if (options.signal!.aborted) reject(new Error('Network request timeout'));
                });
                return await Promise.race([requestPromise, timeoutPromise]);
            }

            return await requestPromise;
        } else {
            const fetchOptions: RequestInit = {
                method: options.method,
                headers: headers,
                body: options.body,
                redirect: "follow",
                signal: options.signal
            };
            const res = await nativeFetch(url, fetchOptions);
            let json: unknown = null;
            try {
                json = await res.json();
            } catch {
                // ignore
            }

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
                } catch {
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
                method: "GET"
            });

            if (status !== 200) {
                throw new Error(`HTTP ${status}: Failed to fetch history list`);
            }

            const res = json as ApiResponse<{ list: NoteHistoryItem[], pager?: { totalRows: number } }>;
            if (!this.isSuccess(res)) {
                throw new Error(res?.message || "Failed to fetch history list");
            }

            return {
                list: res.data?.list || [],
                totalRows: res.data?.pager?.totalRows || 0
            };
        } catch (e) {
            if (e instanceof Error && e.message.includes('fetch')) {
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

        const { status, json } = await this.request(endpoint, {
            method: "GET"
        });

        if (status !== 200 || !this.isSuccess(json)) {
            const res = json as ApiResponse<unknown>;
            const msg = res?.message || "Failed to fetch history detail";
            showSyncNotice(msg);
            throw new Error(msg);
        }

        const res = json as ApiResponse<NoteHistoryDetail>;
        return res.data;
    }

    /**
     * 恢复笔记到指定的历史版本
     */
    async restoreNoteVersion(historyId: number): Promise<boolean> {
        const endpoint = `/api/note/history/restore`;

        try {
            const { status, json } = await this.request(endpoint, {
                method: "PUT",
                body: JSON.stringify({
                    historyId: historyId,
                    vault: this.plugin.settings.vault
                })
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to restore note version";
                showSyncNotice(msg);
                return false;
            }

            return true;
        } catch (e) {
            dumpError("restoreNoteVersion error:", e);
            showSyncNotice("恢复版本请求失败");
            return false;
        }
    }

    /**
     * 获取服务端文件信息
     * 用于在删除本地文件前核对状态
     */
    async getFileInfo(path: string): Promise<FileInfoResponse> {
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path).toString(),
            isRecycle: "false"
        });

        const endpoint = `/api/file/info?${params.toString()}`;

        const { status, json } = await this.request(endpoint, {
            method: "GET"
        });

        if (status !== 200 || !this.isSuccess(json)) {
            const res = json as ApiResponse<unknown>;
            throw new Error(res?.message || `HTTP ${status}: Failed to fetch file info`);
        }

        const res = json as ApiResponse<FileInfoResponse>;
        return res.data;
    }

    /**
     * 获取笔记列表（支持回收站模式）
     */
    async getNoteList(page = 1, pageSize = 20, isRecycle = false, keyword = "", signal?: AbortSignal): Promise<NoteListResponse> {
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

        const { status, json } = await this.request(endpoint, {
            method: "GET",
            signal
        });

        if (status !== 200) {
            throw new Error(`HTTP ${status}: Failed to fetch note list`);
        }

        const res = json as ApiResponse<NoteListResponse>;
        if (!this.isSuccess(res)) {
            throw new Error(res?.message || "Failed to fetch note list");
        }

        return res.data || { list: [], pager: { page, pageSize, totalRows: 0, totalPages: 0 } };
    }

    /**
     * 获取文件列表（支持回收站模式）
     */
    async getFileList(page = 1, pageSize = 20, isRecycle = false, keyword = "", signal?: AbortSignal): Promise<FileListResponse> {
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

        const { status, json } = await this.request(endpoint, {
            method: "GET",
            signal
        });

        if (status !== 200) {
            throw new Error(`HTTP ${status}: Failed to fetch file list`);
        }

        const res = json as ApiResponse<FileListResponse>;
        if (!this.isSuccess(res)) {
            throw new Error(res?.message || "Failed to fetch file list");
        }

        return res.data || { list: [], pager: { page, pageSize, totalRows: 0, totalPages: 0 } };
    }

    /**
     * 恢复已删除的笔记
     */
    async restoreNote(path: string, pathHash?: string, signal?: AbortSignal): Promise<boolean> {
        const endpoint = `/api/note/restore`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "PUT",
                body: JSON.stringify({
                    path: path,
                    pathHash: pathHash,
                    vault: this.plugin.settings.vault
                }),
                signal
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to restore note";
                showSyncNotice(msg);
                return false;
            }
            return true;
        } catch (e) {
            dumpError("restoreNote error:", e);
            showSyncNotice("恢复笔记失败");
            return false;
        }
    }

    /**
     * 恢复已删除的文件
     */
    async restoreFile(path: string, pathHash?: string, signal?: AbortSignal): Promise<boolean> {
        const endpoint = `/api/file/restore`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "PUT",
                body: JSON.stringify({
                    path: path,
                    pathHash: pathHash,
                    vault: this.plugin.settings.vault
                }),
                signal
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to restore file";
                showSyncNotice(msg);
                return false;
            }
            return true;
        } catch (e) {
            dumpError("restoreFile error:", e);
            showSyncNotice("恢复文件失败");
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
                body: JSON.stringify({
                    path: path,
                    pathHash: pathHash,
                    vault: this.plugin.settings.vault
                })
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to delete file";
                showSyncNotice(msg);
                return false;
            }
            return true;
        } catch (e) {
            dumpError("deleteFile error:", e);
            showSyncNotice("删除文件失败");
            return false;
        }
    }

    /**
     * 清除回收站内容（支持批量和一键清空）
     */
    async clearRecycleBin(type: 'note' | 'file', path?: string, pathHash?: string, signal?: AbortSignal): Promise<boolean> {
        const endpoint = type === 'note' ? '/api/note/recycle-clear' : '/api/file/recycle-clear';

        try {
            const { status, json } = await this.request(endpoint, {
                method: "DELETE",
                body: JSON.stringify({
                    vault: this.plugin.settings.vault,
                    path: path || "",
                    pathHash: pathHash || ""
                }),
                signal
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || (path ? "永久删除失败" : "清空回收站失败");
                showSyncNotice(msg);
                return false;
            }
            return true;
        } catch (e) {
            dumpError("clearRecycleBin error:", e);
            showSyncNotice("请求失败，请检查网络");
            return false;
        }
    }

    /**
     * 创建分享链接
     */
    async createShare(path: string): Promise<{ id: number, token: string, isPassword?: boolean, shortLink?: string, baseUrl?: string } | null> {
        const endpoint = `/api/share`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    path: path,
                    pathHash: hashContent(path),
                    vault: this.plugin.settings.vault
                })
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to create share";
                showSyncNotice(msg);
                return null;
            }
            const res = json as ApiResponse<{ id: number, token: string, isPassword?: boolean, shortLink?: string, baseUrl?: string }>;
            return res.data;
        } catch (e) {
            dumpError("createShare error:", e);
            showSyncNotice("创建分享失败");
            return null;
        }
    }

    /**
     * 查询分享状态
     */
    async getShare(path: string): Promise<{ id: number, token: string, isPassword?: boolean, shortLink?: string, baseUrl?: string } | null> {
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            pathHash: hashContent(path)
        });
        const endpoint = `/api/share?${params.toString()}`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET"
            });

            if (status !== 200 || !this.isSuccess(json)) {
                return null;
            }
            const res = json as ApiResponse<{ id: number, token: string, isPassword?: boolean, shortLink?: string, baseUrl?: string }>;
            return res.data;
        } catch (e) {
            dumpError("getShare error:", e);
            return null;
        }
    }

    /**
     * 更新分享密码
     */
    async updateSharePassword(path: string, password?: string): Promise<boolean> {
        const endpoint = `/api/share/password`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "POST",
                body: JSON.stringify({
                    path: path,
                    pathHash: hashContent(path),
                    vault: this.plugin.settings.vault,
                    password: password
                })
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to update password";
                showSyncNotice(msg);
                return false;
            }
            return true;
        } catch (e) {
            dumpError("updateSharePassword error:", e);
            showSyncNotice("设置密码失败");
            return false;
        }
    }

    /**
     * 创建或强制重新生成短链接
     */
    async createShortLink(path: string, isForce = false, shareUrl?: string): Promise<string | null> {
        const endpoint = `/api/share/short_link`;
        try {
            const body = {
                path,
                pathHash: hashContent(path),
                vault: this.plugin.settings.vault,
                isForce,
                ...(shareUrl ? { url: shareUrl } : {}),
            };
            const { status, json } = await this.request(endpoint, {
                method: "POST",
                body: JSON.stringify(body)
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to create short link";
                showSyncNotice(msg);
                return null;
            }
            // 根据 Web GUI 逻辑，res.data 直接就是短链接字符串
            const res = json as ApiResponse<string>;
            return res.data || null;
        } catch (e) {
            dumpError("createShortLink error:", e);
            showSyncNotice("生成短链接失败");
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
                body: JSON.stringify({
                    path: path,
                    pathHash: hashContent(path),
                    vault: this.plugin.settings.vault
                })
            });

            if (status !== 200 || !this.isSuccess(json)) {
                const res = json as ApiResponse<unknown>;
                const msg = res?.message || "Failed to cancel share";
                showSyncNotice(msg);
                return false;
            }
            return true;
        } catch (e) {
            dumpError("cancelShare error:", e);
            showSyncNotice("取消分享失败");
            return false;
        }
    }

    /**
     * 获取当前 vault 所有分享中的笔记路径列表（全量）
     * Get all actively shared note paths for the current vault (full list)
     */
    async getSharePaths(): Promise<string[] | null> {
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault
        });
        const endpoint = `/api/notes/share-paths?${params.toString()}`;
        try {
            const { status, json } = await this.request(endpoint, { method: "GET" });
            if (status !== 200 || !this.isSuccess(json)) return null;
            const res = json as ApiResponse<string[]>;
            return res.data || [];
        } catch (e) {
            dumpError("getSharePaths error:", e);
            return null;
        }
    }

    /**
     * 获取当前用户信息
     */
    async getUserInfo(): Promise<UserDTO> {
        const endpoint = `/api/user/info`;

        const { status, json } = await this.request(endpoint, {
            method: "GET"
        });

        if (status !== 200 || !this.isSuccess(json)) {
            const res = json as ApiResponse<unknown>;
            throw new Error(res?.message || "Failed to fetch user info");
        }

        const res = json as ApiResponse<UserDTO>;
        return res.data;
    }

    /**
     * 获取在线客户端列表
     */
    async getWSClients(): Promise<WSClient[]> {
        const endpoint = `/api/admin/ws_clients`;
        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET"
            });

            if (status !== 200 || !this.isSuccess(json)) {
                return [];
            }
            const res = json as ApiResponse<WSClient[]>;
            return res.data || [];
        } catch (e) {
            dumpError("getWSClients error:", e);
            return [];
        }
    }

    /**
     * 获取支持记录列表
     */
    async getSupportRecordsPage(page: number = 1, pageSize: number = 15, sortBy: string = "amount", sortOrder: string = "desc"): Promise<{ list: SupportRecord[], pager: SupportPager }> {

        const params = new URLSearchParams({
            page: page.toString(),
            pageSize: pageSize.toString(),
            sortBy: sortBy,
            sortOrder: sortOrder,
            lang: getLocale()
        });

        const endpoint = `/api/support?${params.toString()}`;

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 2000);

        try {
            const { status, json } = await this.request(endpoint, {
                method: "GET",
                signal: controller.signal
            });

            if (status !== 200) {
                throw new Error(`HTTP ${status}: Failed to fetch support records`);
            }

            const res = json as ApiResponse<{ list: SupportRecord[], pager: SupportPager }>;
            if (!this.isSuccess(res)) {
                throw new Error(res?.message || "Failed to fetch support records");
            }

            return {
                list: res.data?.list || [],
                pager: res.data?.pager || { page, pageSize, totalRows: 0 }
            };
        } catch (e) {
            dump("getSupportRecordsPage error:", e);
            throw e;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }
}

/**
 * 扩展 API 服务类以支持回收站功能
 */
