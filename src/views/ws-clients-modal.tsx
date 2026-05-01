import { App, Modal } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import * as React from "react";

import type FastSync from "../main";
import { $ } from "../i18n/lang";
import { LucideIcon } from "./note-history/lucide-icon";

export class WSClientsModal extends Modal {
    private root: Root | null = null;
    private plugin: FastSync;

    constructor(app: App, plugin: FastSync) {
        super(app);
        this.plugin = plugin;
    }

    onOpen() {
        const { contentEl } = this;
        this.titleEl.setText($("ui.system.websocketClients"));
        this.containerEl.addClass("fns-ws-clients-modal-container");

        this.root = createRoot(contentEl);
        this.root.render(
            <WSClientsView plugin={this.plugin} />
        );
    }

    onClose() {
        this.containerEl.removeClass("fns-ws-clients-modal-container");
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        this.contentEl.empty();
    }
}

const WSClientsView = ({ plugin }: { plugin: FastSync }) => {
    const [clients, setClients] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const loadClients = async () => {
        setIsLoading(true);
        const data = await plugin.api.getWSClients();
        setClients(data);
        setIsLoading(false);
    };

    React.useEffect(() => {
        loadClients();
    }, []);

    return (
        <div className="fns-ws-clients-view" style={{ padding: '16px 0' }}>
            <div className="fns-ws-clients-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1em', fontWeight: 'bold' }}>
                    <LucideIcon icon="monitor" size={20} />
                    {$("ui.system.websocketClients")}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {clients.length > 0 && (
                        <span style={{ fontSize: '0.85em', opacity: 0.7, border: '1px solid var(--background-modifier-border)', padding: '2px 8px', borderRadius: '12px' }}>
                            {clients.length} {$("ui.system.wsClientName")}
                        </span>
                    )}
                    <button 
                        className="clickable-icon" 
                        onClick={loadClients} 
                        disabled={isLoading}
                        style={{ padding: '4px', background: 'transparent', boxShadow: 'none' }}
                        aria-label={$("ui.common.refresh")}
                    >
                        <LucideIcon icon="refresh-cw" size={16} className={isLoading ? "is-spinning" : ""} />
                    </button>
                </div>
            </div>

            <div className="fns-ws-clients-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {clients.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', fontSize: '0.9em', color: 'var(--text-muted)', fontStyle: 'italic', border: '1px dashed var(--background-modifier-border)', borderRadius: '8px' }}>
                        {isLoading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <LucideIcon icon="loader-2" className="is-spinning" size={16} />
                                <span>{$("ui.history.loading")}</span>
                            </div>
                        ) : (
                            $("ui.system.wsNoClients")
                        )}
                    </div>
                ) : (
                    clients.map((client) => (
                        <div key={client.traceId} style={{ padding: '12px', background: 'var(--background-secondary)', borderRadius: '8px', border: '1px solid var(--background-modifier-border)', display: 'flex', flexDirection: 'column', gap: '8px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '6px', background: 'var(--background-primary)', borderRadius: '6px', border: '1px solid var(--background-modifier-border)' }}>
                                        <LucideIcon icon={client.platformInfo?.isMobile ? "smartphone" : "laptop"} size={16} style={{ color: 'var(--text-accent)' }} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.95em', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {client.clientName || client.nickname || $("ui.common.na")}
                                            <span style={{ fontSize: '0.8em', fontWeight: 'normal', color: 'var(--text-muted)' }}>v{client.clientVersion}</span>
                                        </div>
                                        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: '4px', fontFamily: 'var(--font-monospace)' }}>
                                            {client.remoteAddr}
                                        </div>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.8em', padding: '2px 8px', background: 'var(--background-modifier-hover)', borderRadius: '12px', fontWeight: '500' }}>
                                    {client.clientType}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', marginTop: '4px', borderTop: '1px solid var(--background-modifier-border)' }}>
                                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>
                                    {$("ui.system.wsStartTime")}: {new Date(client.startTime).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', fontFamily: 'var(--font-monospace)', opacity: 0.5 }}>
                                    UID: {client.uid}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
