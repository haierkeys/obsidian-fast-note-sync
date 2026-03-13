import { App, Modal, Notice, setIcon, ButtonComponent } from "obsidian";
import type FastSync from "../main";
import { $ } from "../i18n/lang";

export class ShareModal extends Modal {
    private plugin: FastSync;
    private path: string;
    private loading: boolean = false;
    private shareData: { id: number, token: string } | null = null;

    constructor(app: App, plugin: FastSync, path: string) {
        super(app);
        this.plugin = plugin;
        this.path = path;
    }

    onOpen() {
        this.checkShareStatus();
    }

    private async checkShareStatus() {
        this.loading = true;
        this.render();
        const res = await this.plugin.api.getShare(this.path);
        this.shareData = res;
        this.loading = false;
        this.render();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

    private render() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("fns-share-modal");

        this.titleEl.innerText = $("ui.share.title");

        const container = contentEl.createDiv("fns-share-container");
        container.style.padding = "10px";

        const filePathEl = container.createDiv("fns-share-file-path");
        filePathEl.style.marginBottom = "20px";
        filePathEl.style.color = "var(--text-muted)";
        filePathEl.innerText = this.path;
 
        if (this.loading) {
            const loadingEl = container.createDiv("fns-share-loading");
            loadingEl.style.textAlign = "center";
            loadingEl.style.padding = "20px";
            loadingEl.style.color = "var(--text-muted)";
            loadingEl.innerText = $("ui.share.checking");
            return;
        }

        if (this.shareData) {
            this.renderShareResult(container);
        } else {
            this.renderCreateButton(container);
        }
    }

    private renderCreateButton(parent: HTMLElement) {
        const btnContainer = parent.createDiv("fns-share-btn-container");
        btnContainer.style.textAlign = "center";

        const btn = new ButtonComponent(btnContainer)
            .setButtonText(this.loading ? $("ui.share.button_creating") : $("ui.share.create"))
            .setCta()
            .setDisabled(this.loading)
            .onClick(async () => {
                this.loading = true;
                this.render();
                const res = await this.plugin.api.createShare(this.path);
                this.loading = false;
                if (res) {
                    this.shareData = res;
                    new Notice($("ui.share.success"));
                }
                this.render();
            });
    }

    private renderShareResult(parent: HTMLElement) {
        const resultContainer = parent.createDiv("fns-share-result");
        
        const labelEl = resultContainer.createDiv("fns-share-label");
        labelEl.innerText = $("ui.share.link") + ":";
        labelEl.style.marginBottom = "8px";
        labelEl.style.fontWeight = "bold";

        const apiBase = (this.plugin.runApi || this.plugin.settings.api).replace(/\/+$/, "");
        const shareUrl = `${apiBase}/share/${this.shareData?.id}/${this.shareData?.token}`;

        const linkContainer = resultContainer.createDiv("fns-share-link-container");
        linkContainer.style.display = "flex";
        linkContainer.style.gap = "10px";
        linkContainer.style.marginBottom = "20px";

        const inputEl = linkContainer.createEl("input", {
            type: "text",
            value: shareUrl,
        });
        inputEl.style.flex = "1";
        inputEl.readOnly = true;

        new ButtonComponent(linkContainer)
            .setButtonText($("ui.share.copy"))
            .onClick(() => {
                navigator.clipboard.writeText(shareUrl);
                new Notice($("ui.share.copy_success"));
            });
            
        const actionContainer = resultContainer.createDiv("fns-share-actions");
        actionContainer.style.textAlign = "right";

        new ButtonComponent(actionContainer)
            .setButtonText($("ui.share.cancel"))
            .setWarning()
            .setDisabled(this.loading)
            .onClick(async () => {
                this.loading = true;
                this.render();
                const success = await this.plugin.api.cancelShare(this.path);
                this.loading = false;
                if (success) {
                    this.shareData = null;
                    new Notice($("ui.share.cancel_success"));
                }
                this.render();
            });

        const tipEl = resultContainer.createDiv("fns-share-tip");
        tipEl.style.marginTop = "20px";
        tipEl.style.fontSize = "0.85em";
        tipEl.style.color = "var(--text-accent)";
        tipEl.style.display = "flex";
        tipEl.style.alignItems = "center";
        tipEl.style.gap = "5px";
        const iconSpan = tipEl.createSpan();
        iconSpan.style.display = "inline-flex";
        iconSpan.style.alignItems = "center";
        iconSpan.style.transform = "translateY(1px)";
        setIcon(iconSpan, "info");
        tipEl.createSpan({ text: $("ui.share.success") });
    }
}
