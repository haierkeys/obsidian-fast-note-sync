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

        interface DiffSegment {
            type: 'normal' | 'add' | 'delete';
            text: string;
        }

        interface Line {
            segments: DiffSegment[];
            hasChange: boolean;
            lineNumber?: number;
        }

        const lines: Line[] = [];
        let currentLine: Line = { segments: [], hasChange: false };
        let lineNumberCounter = 1;

        diffs.forEach(diff => {
            const type = diff.Type === 1 ? 'add' : diff.Type === -1 ? 'delete' : 'normal';
            const textLines = diff.Text.split('\n');

            textLines.forEach((text, index) => {
                if (index > 0) {
                    lines.push(currentLine);
                    currentLine = { segments: [], hasChange: false };
                }

                if (text !== "" || textLines.length === 1) {
                    currentLine.segments.push({ type, text });
                    if (type !== 'normal') {
                        currentLine.hasChange = true;
                    }
                    if (type !== 'delete' && currentLine.lineNumber === undefined) {
                        currentLine.lineNumber = lineNumberCounter++;
                    }
                }
            });
        });
        lines.push(currentLine);

        const filteredLines = showOnlyDiff
            ? lines.filter(line => line.hasChange)
            : lines;

        return filteredLines.map((line, index) => (
            <div key={index} className={`history-detail-line ${line.hasChange ? 'has-change' : 'type-normal'} ${!line.lineNumber ? 'is-deleted-line' : ''}`}>
                <div className="line-number">{line.lineNumber || ""}</div>
                <div className="line-content">
                    {line.segments.map((seg, i) => (
                        <span key={i} className={`diff-seg type-${seg.type}`}>
                            {seg.text}
                        </span>
                    ))}
                </div>
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
                    {showOriginal ? $("修改前内容") : $("ui.history.diff")}
                </div>
                {!showOriginal && (
                    <div className="header-tags">
                        <span className="tag-add">{$("ui.history.added")}</span>
                        <span className="tag-delete">{$("ui.history.deleted")}</span>
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
                        title={$("ui.history.copy")}
                    >
                        <LucideIcon icon={copied ? "check" : "copy"} size={14} />
                        {copied ? $("ui.history.copied") : $("ui.history.copy")}
                    </button>
                )}
                {renderLines()}
            </div>
        </div>
    );
};
