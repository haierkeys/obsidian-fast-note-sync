import { Notice } from "obsidian";
import * as React from "react";

import { NoteHistoryItem, HttpApiService, NoteHistoryDetail as NoteHistoryDetailData } from "../../lib/api";
import { HistoryDetail } from "./history-detail";
import { LucideIcon } from "./lucide-icon";
import type FastSync from "../../main";
import { $ } from "../../lang/lang";


interface HistoryViewProps {
    plugin: FastSync;
    filePath: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ plugin, filePath }) => {
    const [historyList, setHistoryList] = React.useState<NoteHistoryItem[]>([]);
    const [selectedHistory, setSelectedHistory] = React.useState<NoteHistoryDetailData | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [showOnlyDiff, setShowOnlyDiff] = React.useState(false);
    const [showOriginal, setShowOriginal] = React.useState(false);
    const [page, setPage] = React.useState(1);
    const [totalRows, setTotalRows] = React.useState(0);
    const pageSize = 5;
    const service = React.useMemo(() => new HttpApiService(plugin), [plugin]);

    React.useEffect(() => {
        loadHistory(1);
    }, [filePath]);

    React.useEffect(() => {
    }, [error, loading, historyList]);

    const loadHistory = async (targetPage = 1) => {
        try {
            setLoading(true);
            setError(null);
            const data = await service.getNoteHistoryList(filePath, targetPage, pageSize);
            setHistoryList(data?.list || []);
            setTotalRows(data?.totalRows || 0);
            setPage(targetPage);
        } catch (e) {
            console.error("loadHistory error:", e);
            const errorMessage = e instanceof Error ? e.message : $("ui.history.load_failed");
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalRows / pageSize) || 1;

    const handleView = async (id: number) => {
        try {
            const detail = await service.getNoteHistoryDetail(id);
            setSelectedHistory(detail);
        } catch (e) {
            console.error(e);
        }
    };

    const handleRestore = async (id: number) => {
        const confirm = window.confirm($("ui.history.restore_confirm"));
        if (!confirm) return;

        try {
            setLoading(true);
            const success = await service.restoreNoteVersion(id);
            if (success) {
                new Notice($("ui.history.restore_success"));
                loadHistory(page);
            }
        } catch (e) {
            console.error("handleRestore error:", e);
        } finally {
            setLoading(false);
        }
    };

    const getClientIcon = (clientName: string) => {
        const name = (clientName || "Unknown").toLowerCase();
        if (name.includes("web")) return "globe";
        if (name.includes("mac")) return "laptop";
        if (name.includes("win") || name.includes("iwin")) return "monitor";
        if (name.includes("android")) return "bot";
        if (name.includes("ios") || name.includes("os")) return "smartphone";
        return "help-circle";
    };

    return (
        <div className={`note-history-view ${selectedHistory ? "has-selection" : "no-selection"}`}>
            <div className="history-list-section">
                <div className="history-table-container">
                    <table className="history-table">
                        <thead>
                            <tr>
                                <th>{$("ui.history.version")}</th>
                                <th>{$("ui.history.client")}</th>
                                <th>{$("ui.history.time")}</th>
                                <th>{$("ui.history.action")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {error ? (
                                <tr>
                                    <td colSpan={4} className="state error-state">
                                        <span>{error}</span>
                                    </td>
                                </tr>
                            ) : loading ? (
                                <tr>
                                    <td colSpan={4} className="state">{$("ui.history.loading")}</td>
                                </tr>
                            ) : historyList.length > 0 ? (
                                historyList.map(item => (
                                    <tr key={item.id} className={selectedHistory?.id === item.id ? "is-selected" : ""}>
                                        <td>v{item.version}</td>
                                        <td>
                                            <span className="client-info">
                                                {item.clientName || "Unknown"}
                                                <LucideIcon icon={getClientIcon(item.clientName)} size={14} />
                                            </span>
                                        </td>
                                        <td>{item.createdAt}</td>
                                        <td>
                                            <div className="history-actions">
                                                <button className="view-btn" onClick={() => handleView(item.id)}>
                                                    <LucideIcon icon="eye" size={14} />
                                                    {$("ui.history.view")}
                                                </button>
                                                <button className="restore-btn" onClick={() => handleRestore(item.id)}>
                                                    <LucideIcon icon="rotate-ccw" size={14} />
                                                    {$("ui.history.restore")}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="state">{$("ui.history.no_history")}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="history-pagination">
                    <button
                        className="pagination-btn"
                        disabled={page <= 1 || loading}
                        onClick={() => loadHistory(page - 1)}
                        title={$("ui.history.page_prev")}
                    >
                        <LucideIcon icon="chevron-left" size={14} />
                    </button>
                    <span className="pagination-info">
                        {$("ui.history.page_info")
                            .replace("{page}", page.toString())
                            .replace("{total}", totalPages.toString())}
                    </span>
                    <button
                        className="pagination-btn"
                        disabled={page >= totalPages || loading}
                        onClick={() => loadHistory(page + 1)}
                        title={$("ui.history.page_next")}
                    >
                        <LucideIcon icon="chevron-right" size={14} />
                    </button>
                </div>
            </div>

            {selectedHistory && (
                <div className="history-detail-section">
                    <div className="detail-controls">
                        <div className="detail-title">
                            <LucideIcon icon="file-diff" size={16} className="title-icon" />
                            {$("ui.history.version")} v{selectedHistory.version} {$("ui.history.diff")}
                            <span className="type-badge badge-add">{$("ui.history.added")}</span>
                            <span className="type-badge badge-delete">{$("ui.history.deleted")}</span>
                        </div>
                        <div className="detail-toggles">
                            <label className="detail-toggle-item">
                                <input
                                    type="checkbox"
                                    checked={showOnlyDiff}
                                    onChange={(e) => {
                                        setShowOnlyDiff(e.target.checked);
                                        if (e.target.checked) setShowOriginal(false);
                                    }}
                                />
                                {$("ui.history.diff_only")}
                            </label>
                            <label className="detail-toggle-item">
                                <input
                                    type="checkbox"
                                    checked={showOriginal}
                                    onChange={(e) => {
                                        setShowOriginal(e.target.checked);
                                        if (e.target.checked) setShowOnlyDiff(false);
                                    }}
                                />
                                {$("ui.history.content_pre")}
                            </label>
                        </div>
                    </div>
                    <div className="history-detail-container">
                        <HistoryDetail
                            content={selectedHistory.content}
                            diffs={selectedHistory.diffs}
                            showOnlyDiff={showOnlyDiff}
                            showOriginal={showOriginal}
                            path={selectedHistory.path}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
