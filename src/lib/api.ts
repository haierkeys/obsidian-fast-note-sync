import { Notice } from "obsidian";

import { hashContent } from "./helps";
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
        const baseUrl = `${this.plugin.settings.api}/api/note/histories`;
        const params = new URLSearchParams({
            vault: this.plugin.settings.vault,
            path: path,
            path_hash: hashContent(path),
            page: page.toString(),
            pageSize: pageSize.toString()
        });

        const url = `${baseUrl}?${params.toString()}`;
        console.log("getNoteHistoryList request:", url);

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
            console.log("getNoteHistoryList response:", res.status, json);

            if (!json.status) {
                const msg = json?.message || "Failed to fetch history list";
                throw new Error(msg);
            }

            return {
                list: json.data?.list || [],
                totalRows: json.data?.pager?.totalRows || 0
            };
        } catch (e) {
            console.log("getNoteHistoryList error:", e);

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
        const url = `${this.plugin.settings.api}/api/note/history?id=${id}`;
        console.log("getNoteHistoryDetail request:", url);

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "token": this.plugin.settings.apiToken
                }
            });
            const json = await res.json();
            console.log("getNoteHistoryDetail response:", res.status, json);

            if (res.status !== 200 || !json.status) {
                const msg = json?.message || "Failed to fetch history detail";
                new Notice(msg);
                throw new Error(msg);
            }

            return json.data;
        } catch (e) {
            console.log("getNoteHistoryDetail error:", e);
            // new Notice("Failed to fetch history detail");
            throw e;
        }
    }
}
