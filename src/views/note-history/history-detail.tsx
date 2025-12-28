import * as React from "react";

import { LucideIcon } from "./lucide-icon";
import { $ } from "../../lang/lang";


interface HistoryDetailProps {
    content: string;
    diffs: { Type: number; Text: string }[];
    showOnlyDiff: boolean;
    showOriginal: boolean;
    path: string;
}

export const HistoryDetail: React.FC<HistoryDetailProps> = ({ content, diffs, showOnlyDiff, showOriginal, path }) => {
    // 处理差异数据，将其转换为行
    const renderLines = () => {
        if (showOriginal) {
            // 只显示内容，不显示差异
            const contentLines = content.split('\n');
            return contentLines.map((line, index) => (
                <div key={index} className="history-detail-line type-normal">
                    <div className="line-number">{index + 1}</div>
                    <div className="line-content">{line}</div>
                </div>
            ));
        }

        const lines: { type: 'normal' | 'add' | 'delete', text: string, lineNumber?: number }[] = [];
        let currentLineNumber = 1;

        diffs.forEach(diff => {
            const type = diff.Type === 1 ? 'add' : diff.Type === -1 ? 'delete' : 'normal';
            const textLines = diff.Text.split('\n');

            textLines.forEach((line, index) => {
                // 如果是最后一行且是空的（由于 split('\n') 产生的），通常可以忽略，除非它是唯一的行
                if (index === textLines.length - 1 && line === "" && textLines.length > 1) return;

                lines.push({
                    type,
                    text: line,
                    lineNumber: type !== 'delete' ? currentLineNumber++ : undefined
                });
            });
        });

        const filteredLines = showOnlyDiff
            ? lines.filter(line => line.type !== 'normal')
            : lines;

        return filteredLines.map((line, index) => (
            <div key={index} className={`history-detail-line type-${line.type}`}>
                <div className="line-number">{line.lineNumber || ""}</div>
                <div className="line-content">{line.text}</div>
            </div>
        ));
    };

    const [copied, setCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="history-detail-container">
            <div className="history-detail-header">
                <div className="header-title">
                    <LucideIcon icon="file-text" size={16} className="icon" />
                    {showOriginal ? $("修改前内容") : $("差异详情")}
                </div>
                {!showOriginal && (
                    <div className="header-tags">
                        <span className="tag-add">{$("新增")}</span>
                        <span className="tag-delete">{$("删除")}</span>
                    </div>
                )}
            </div>
            <div className="history-detail-content">
                <div className="history-detail-path">
                    <span>{path}</span>
                </div>
                {showOriginal && (
                    <button
                        className={`content-copy-btn ${copied ? 'is-copied' : ''}`}
                        onClick={handleCopy}
                        title={$("复制")}
                    >
                        <LucideIcon icon={copied ? "check" : "copy"} size={14} />
                        {copied ? $("已复制") : $("复制")}
                    </button>
                )}
                {renderLines()}
            </div>
        </div>
    );
};
