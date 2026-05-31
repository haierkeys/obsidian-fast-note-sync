import { App, Modal, setIcon, ButtonComponent, setTooltip } from "obsidian";
import type FastSync from "../main";
import { $ } from "../i18n/lang";
import { showSyncNotice } from "../lib/helps";

export class ShareModal extends Modal {
    private plugin: FastSync;
    private path: string;
    private loading: boolean = false;
    private shareData: { id: number, token: string, isPassword?: boolean, shortLink?: string, baseUrl?: string } | null = null;
    
    // 密码状态相关
    private isPasswordVisible: boolean = false;
    private passwordValue: string = "";
    private isPasswordDirty: boolean = false;

    constructor(app: App, plugin: FastSync, path: string) {
        super(app);
        this.plugin = plugin;
        this.path = path;
    }

    onOpen() {
        void this.checkShareStatus();
    }

    private async checkShareStatus() {
        if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
            this.render();
            return;
        }
        this.loading = true;
        this.render();
        const res = await this.plugin.api.getShare(this.path);
        this.shareData = res;
        this.loading = false;
        this.isPasswordDirty = false;
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

        // 1. Hero Section (Header + File Badge)
        this.titleEl.empty();
        const headerContainer = this.titleEl.createDiv("fns-share-header-group");
        const titleIcon = headerContainer.createSpan("fns-share-title-icon");
        setIcon(titleIcon, "share-2");
        headerContainer.createSpan({ text: $("ui.share.title") });

        const container = contentEl.createDiv("fns-share-container");

        // File Badge
        const fileBadge = container.createDiv("fns-file-badge");
        const fileIcon = fileBadge.createSpan("fns-file-icon");
        setIcon(fileIcon, "file-text");
        fileBadge.createSpan({ text: this.path.split("/").pop() || this.path });
        setTooltip(fileBadge, this.path);

        // offline check
        if (!this.plugin.websocket || !this.plugin.websocket.isAuth) {
            const emptyState = container.createDiv("fns-share-empty-state");
            
            const emptyIcon = emptyState.createDiv("fns-empty-icon");
            setIcon(emptyIcon, "wifi-off");
            
            emptyState.createDiv({ text: $("setting.remote.disconnected"), cls: "fns-empty-text" });
            return;
        }
 
        if (this.loading) {
            const loadingEl = container.createDiv("fns-share-loading-state");
            loadingEl.createDiv("fns-spinner");
            loadingEl.createDiv({ text: $("ui.share.checking"), cls: "fns-loading-text" });
            return;
        }

        if (this.shareData) {
            this.renderShareResult(container);
        } else {
            this.renderCreateButton(container);
        }
    }

    private renderCreateButton(parent: HTMLElement) {
        const emptyState = parent.createDiv("fns-share-empty-state");
        const emptyIcon = emptyState.createDiv("fns-empty-icon");
        setIcon(emptyIcon, "share-2");
        
        emptyState.createDiv({ text: $("ui.share.not_shared_yet"), cls: "fns-empty-text" });

        const btn = new ButtonComponent(emptyState)
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
                    showSyncNotice($("ui.share.success"));
                    void this.plugin.shareIndicatorManager?.addSharedPath(this.path);
                }
                this.render();
            });
        btn.buttonEl.addClass("fns-share-create-btn");
    }

    private renderShareResult(parent: HTMLElement) {
        const resultContainer = parent.createDiv("fns-share-result-layout");
        
        // 创建统一的主卡片容器 / Create a single main card container
        const mainCard = resultContainer.createDiv("fns-share-card");

        // --- 1. 分享链接部分 (Link Section) ---
        const linkSection = mainCard.createDiv("fns-share-section");
        const linkHeader = linkSection.createDiv("fns-share-card-header");
        setIcon(linkHeader.createSpan("fns-header-icon"), "globe");
        linkHeader.createSpan({ text: $("ui.share.link"), cls: "fns-header-title" });

        const apiBase = this.shareData?.baseUrl || (this.plugin.runApi || this.plugin.settings.api).replace(/\/+$/, "");
        const shareUrl = `${apiBase}/share/${this.shareData?.id}/${this.shareData?.token}`;

        const linkActionGroup = linkSection.createDiv("fns-share-input-group");
        
        const linkInputWrapper = linkActionGroup.createDiv("fns-input-wrapper");
        const linkInput = linkInputWrapper.createEl("input", {
            type: "text",
            value: shareUrl,
            cls: "fns-share-input"
        });
        linkInput.readOnly = true;

        const linkCopyBtn = new ButtonComponent(linkInputWrapper)
            .setIcon("copy")
            .setTooltip($("ui.share.copy"));
        linkCopyBtn.buttonEl.addClass("fns-input-action-btn");
        linkCopyBtn.onClick(() => {
            void navigator.clipboard.writeText(shareUrl);
            showSyncNotice($("ui.share.copy_success"));
        });

        const externalBtn = new ButtonComponent(linkActionGroup)
            .setIcon("external-link")
            .setTooltip($("ui.share.viewShare"));
        externalBtn.buttonEl.addClass("fns-share-icon-btn");
        externalBtn.onClick(() => window.open(shareUrl, "_blank"));


        // --- 2. 访问密码部分 (Password Section) ---
        const pwdSection = mainCard.createDiv("fns-share-section");
        const pwdHeader = pwdSection.createDiv("fns-share-card-header");
        setIcon(pwdHeader.createSpan("fns-header-icon"), "lock");
        pwdHeader.createSpan({ text: $("ui.share.password"), cls: "fns-header-title" });

        const pwdActionGroup = pwdSection.createDiv("fns-share-input-group");
        const pwdInputWrapper = pwdActionGroup.createDiv("fns-input-wrapper");

        let displayValue = this.passwordValue;
        if (this.shareData?.isPassword && !this.isPasswordVisible && !this.passwordValue) {
            displayValue = "******";
        }

        const pwdInput = pwdInputWrapper.createEl("input", {
            type: this.isPasswordVisible ? "text" : "password",
            value: displayValue,
            placeholder: $("ui.share.passwordPlaceholder"),
            cls: "fns-share-input"
        });

        const eyeBtn = new ButtonComponent(pwdInputWrapper)
            .setIcon(this.isPasswordVisible ? "eye-off" : "eye");
        eyeBtn.buttonEl.addClass("fns-input-action-btn");
        eyeBtn.onClick(() => {
            this.isPasswordVisible = !this.isPasswordVisible;
            if (this.isPasswordVisible && this.shareData?.isPassword && !this.passwordValue) {
                this.passwordValue = "";
            }
            this.render();
        });

        const savePwdBtn = new ButtonComponent(pwdActionGroup)
            .setIcon("check")
            .setTooltip($("ui.common.save"))
            .setDisabled(this.loading);
        savePwdBtn.buttonEl.addClass("fns-share-icon-btn");
        if (this.isPasswordDirty) savePwdBtn.buttonEl.addClass("is-dirty");

        pwdInput.addEventListener("input", (e) => {
            this.passwordValue = (e.target as HTMLInputElement).value;
            this.isPasswordDirty = true;
            savePwdBtn.buttonEl.addClass("is-dirty");
        });

        savePwdBtn.onClick(async () => {
            if (!this.isPasswordDirty) {
                showSyncNotice($("ui.common.noChange"));
                return;
            }
            this.loading = true;
            this.render();
            const success = await this.plugin.api.updateSharePassword(this.path, this.passwordValue);
            this.loading = false;
            if (success) {
                showSyncNotice($("ui.common.saveSuccess"));
                this.shareData!.isPassword = !!this.passwordValue;
                this.isPasswordDirty = false;
                if (this.passwordValue) {
                    this.passwordValue = "";
                    this.isPasswordVisible = false;
                }
            }
            this.render();
        });


        // --- 3. 短链接部分 (Short Link Section) ---
        const shortSection = mainCard.createDiv("fns-share-section");
        const shortHeader = shortSection.createDiv("fns-share-card-header");
        setIcon(shortHeader.createSpan("fns-header-icon"), "link-2");
        shortHeader.createSpan({ text: $("ui.share.shortLink"), cls: "fns-header-title" });

        const shortActionGroup = shortSection.createDiv("fns-share-input-group");

        if (this.shareData?.shortLink) {
            const shortInputWrapper = shortActionGroup.createDiv("fns-input-wrapper");
            const shortInput = shortInputWrapper.createEl("input", {
                type: "text",
                value: this.shareData.shortLink,
                cls: "fns-share-input"
            });
            shortInput.readOnly = true;

            const shortCopyBtn = new ButtonComponent(shortInputWrapper)
                .setIcon("copy")
                .setTooltip($("ui.share.shortLinkCopy"));
            shortCopyBtn.buttonEl.addClass("fns-input-action-btn");
            shortCopyBtn.onClick(() => {
                void navigator.clipboard.writeText(this.shareData!.shortLink!);
                showSyncNotice($("ui.share.copy_success"));
            });
            
            const refreshBtn = new ButtonComponent(shortActionGroup)
                .setIcon("refresh-cw")
                .setTooltip($("ui.share.shortLinkCreate"))
                .setDisabled(this.loading);
            refreshBtn.buttonEl.addClass("fns-share-icon-btn");
            refreshBtn.onClick(async () => {
                refreshBtn.setDisabled(true);
                const newShortLink = await this.plugin.api.createShortLink(this.path, true, shareUrl);
                if (newShortLink) {
                    this.shareData!.shortLink = newShortLink;
                    this.render();
                }
                refreshBtn.setDisabled(false);
            });

        } else {
            const shortInputWrapper = shortActionGroup.createDiv("fns-input-wrapper");
            
            const shortInput = shortInputWrapper.createEl("input", {
                type: "text",
                placeholder: $("ui.share.shortLink"),
                cls: "fns-share-input"
            });
            shortInput.readOnly = true; // 占位显示

            const createShortBtn = new ButtonComponent(shortActionGroup)
                .setIcon("plus-circle")
                .setTooltip($("ui.share.shortLinkCreate"))
                .setDisabled(this.loading);
            createShortBtn.buttonEl.addClass("fns-share-icon-btn");
            createShortBtn.onClick(async () => {
                this.loading = true;
                this.render();
                const shortLink = await this.plugin.api.createShortLink(this.path, false, shareUrl);
                this.loading = false;
                if (shortLink) {
                    this.shareData!.shortLink = shortLink;
                }
                this.render();
            });
        }

        // --- 4. Footer Section ---
        const footer = resultContainer.createDiv("fns-share-footer-v2");
        
        const statusTip = footer.createDiv("fns-share-status-tip");
        setIcon(statusTip.createSpan(), "check-circle-2");
        statusTip.createSpan({ text: $("ui.share.success") });

        const cancelBtn = new ButtonComponent(footer)
            .setDisabled(this.loading)
            .onClick(async () => {
                this.loading = true;
                this.render();
                const success = await this.plugin.api.cancelShare(this.path);
                this.loading = false;
                if (success) {
                    this.shareData = null;
                    this.passwordValue = "";
                    this.isPasswordVisible = false;
                    this.isPasswordDirty = false;
                    showSyncNotice($("ui.share.cancel_success"));
                    void this.plugin.shareIndicatorManager?.removeSharedPath(this.path);
                }
                this.render();
            });
        
        cancelBtn.buttonEl.addClass("fns-share-cancel-btn");
        cancelBtn.buttonEl.empty();
        setIcon(cancelBtn.buttonEl.createSpan(), "unlink"); 
        cancelBtn.buttonEl.createSpan({ text: $("ui.share.cancel") });
    }
}
