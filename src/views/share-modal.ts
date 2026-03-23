import { App, Modal, Notice, setIcon, ButtonComponent } from "obsidian";
import type FastSync from "../main";
import { $ } from "../i18n/lang";

export class ShareModal extends Modal {
    private plugin: FastSync;
    private path: string;
    private loading: boolean = false;
    private shareData: { id: number, token: string, isPassword?: boolean, shortLink?: string } | null = null;
    
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
        this.checkShareStatus();
    }

    private async checkShareStatus() {
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

        // 标题增加图标
        this.titleEl.empty();
        const titleIcon = this.titleEl.createSpan();
        titleIcon.style.marginRight = "8px";
        titleIcon.style.display = "inline-flex";
        titleIcon.style.alignItems = "center";
        setIcon(titleIcon, "share-2");
        this.titleEl.createSpan({ text: $("ui.share.title") });

        const container = contentEl.createDiv("fns-share-container");
        container.style.padding = "10px";

        const filePathEl = container.createDiv("fns-share-file-path");
        filePathEl.style.marginBottom = "20px";
        filePathEl.style.color = "var(--text-muted)";
        filePathEl.style.fontSize = "0.9em";
        filePathEl.style.wordBreak = "break-all";
        filePathEl.style.backgroundColor = "var(--background-modifier-form-field)";
        filePathEl.style.padding = "10px";
        filePathEl.style.borderRadius = "8px";
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
        btnContainer.style.padding = "20px 0";

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
        
        // --- 1. 分享链接部分 ---
        const labelEl = resultContainer.createDiv("fns-share-label");
        labelEl.style.marginBottom = "8px";
        labelEl.style.fontWeight = "bold";
        labelEl.style.display = "flex";
        labelEl.style.alignItems = "center";
        labelEl.style.gap = "5px";
        labelEl.style.fontSize = "0.85em";
        labelEl.style.color = "var(--text-muted)";
        const linkLabelIcon = labelEl.createSpan();
        setIcon(linkLabelIcon, "globe");
        labelEl.createSpan({ text: $("ui.share.link") });

        const apiBase = (this.plugin.runApi || this.plugin.settings.api).replace(/\/+$/, "");
        const shareUrl = `${apiBase}/share/${this.shareData?.id}/${this.shareData?.token}`;

        const linkContainer = resultContainer.createDiv("fns-share-link-container");
        linkContainer.style.display = "flex";
        linkContainer.style.gap = "10px";
        linkContainer.style.marginBottom = "20px";

        // 输入框包装容器
        const inputWrapper = linkContainer.createDiv();
        inputWrapper.style.position = "relative";
        inputWrapper.style.flex = "1";

        const inputEl = inputWrapper.createEl("input", {
            type: "text",
            value: shareUrl,
        });
        inputEl.style.width = "100%";
        inputEl.style.paddingRight = "35px"; // 为复制按钮留位
        inputEl.readOnly = true;

        // 内嵌复制按钮
        const copyBtn = new ButtonComponent(inputWrapper)
            .setIcon("copy")
            .setTooltip($("ui.share.copy"));
        
        copyBtn.buttonEl.style.position = "absolute";
        copyBtn.buttonEl.style.right = "2px";
        copyBtn.buttonEl.style.top = "50%";
        copyBtn.buttonEl.style.transform = "translateY(-50%)";
        copyBtn.buttonEl.style.boxShadow = "none";
        copyBtn.buttonEl.style.border = "none";
        copyBtn.buttonEl.style.backgroundColor = "transparent";
        copyBtn.buttonEl.style.color = "var(--text-muted)";
        copyBtn.buttonEl.style.display = "flex";
        copyBtn.buttonEl.style.height = "auto";
        copyBtn.buttonEl.style.padding = "5px";
        copyBtn.buttonEl.style.opacity = "0.5";

        copyBtn.buttonEl.addEventListener("mouseenter", () => copyBtn.buttonEl.style.opacity = "1");
        copyBtn.buttonEl.addEventListener("mouseleave", () => copyBtn.buttonEl.style.opacity = "0.5");

        copyBtn.onClick(() => {
            navigator.clipboard.writeText(shareUrl);
            new Notice($("ui.share.copy_success"));
        });

        // 查看分享按钮 (保持在外面)
        new ButtonComponent(linkContainer)
            .setIcon("external-link")
            .setTooltip($("ui.share.viewShare"))
            .onClick(() => {
                window.open(shareUrl, "_blank");
            });

        // --- 2. 密码管理部分 ---
        const passwordLabelEl = resultContainer.createDiv("fns-share-label");
        passwordLabelEl.style.marginBottom = "8px";
        passwordLabelEl.style.fontWeight = "bold";
        passwordLabelEl.style.display = "flex";
        passwordLabelEl.style.alignItems = "center";
        passwordLabelEl.style.gap = "5px";
        passwordLabelEl.style.fontSize = "0.85em";
        passwordLabelEl.style.color = "var(--text-muted)";
        const pwdLabelIcon = passwordLabelEl.createSpan();
        setIcon(pwdLabelIcon, "lock");
        passwordLabelEl.createSpan({ text: $("ui.share.password") });

        const passwordContainer = resultContainer.createDiv("fns-share-password-container");
        passwordContainer.style.display = "flex";
        passwordContainer.style.gap = "10px";
        passwordContainer.style.marginBottom = "20px";

        // 密码输入框包装容器
        const pwdInputWrapper = passwordContainer.createDiv();
        pwdInputWrapper.style.position = "relative";
        pwdInputWrapper.style.flex = "1";

        // 如果已经有密码且用户还没修改，显示假密码
        let displayValue = this.passwordValue;
        if (this.shareData?.isPassword && !this.isPasswordVisible && !this.passwordValue) {
            displayValue = "******";
        }

        const pwdInputEl = pwdInputWrapper.createEl("input", {
            type: this.isPasswordVisible ? "text" : "password",
            value: displayValue,
            placeholder: $("ui.share.passwordPlaceholder")
        });
        pwdInputEl.style.width = "100%";
        pwdInputEl.style.paddingRight = "35px"; // 为眼睛图标留位

        // 眼睛按钮逻辑 (内嵌至容器最右侧，使用 ButtonComponent 确保与复制按钮尺寸一致)
        const eyeBtn = new ButtonComponent(pwdInputWrapper)
            .setIcon(this.isPasswordVisible ? "eye-off" : "eye")
            .onClick(() => {
                this.isPasswordVisible = !this.isPasswordVisible;
                if (this.isPasswordVisible && this.shareData?.isPassword && !this.passwordValue) {
                    this.passwordValue = "";
                }
                this.render();
            });
        
        eyeBtn.buttonEl.style.position = "absolute";
        eyeBtn.buttonEl.style.right = "2px"; 
        eyeBtn.buttonEl.style.top = "50%";
        eyeBtn.buttonEl.style.transform = "translateY(-50%)";
        eyeBtn.buttonEl.style.boxShadow = "none";
        eyeBtn.buttonEl.style.border = "none";
        eyeBtn.buttonEl.style.backgroundColor = "transparent";
        eyeBtn.buttonEl.style.color = "var(--text-muted)";
        eyeBtn.buttonEl.style.display = "flex";
        eyeBtn.buttonEl.style.height = "auto";
        eyeBtn.buttonEl.style.padding = "5px";
        eyeBtn.buttonEl.style.opacity = "0.5";

        eyeBtn.buttonEl.addEventListener("mouseenter", () => eyeBtn.buttonEl.style.opacity = "1");
        eyeBtn.buttonEl.addEventListener("mouseleave", () => eyeBtn.buttonEl.style.opacity = "0.5");

        pwdInputEl.addEventListener("input", (e) => {
            this.passwordValue = (e.target as HTMLInputElement).value;
            this.isPasswordDirty = true;
        });

        // 保存密码按钮
        new ButtonComponent(passwordContainer)
            .setIcon("check")
            .setTooltip($("ui.common.save"))
            .setDisabled(this.loading)
            .onClick(async () => {
                if (!this.isPasswordDirty) {
                    new Notice($("ui.common.noChange"));
                    return;
                }
                this.loading = true;
                this.render();
                const success = await this.plugin.api.updateSharePassword(this.path, this.passwordValue);
                this.loading = false;
                if (success) {
                    new Notice($("ui.common.saveSuccess"));
                    this.shareData!.isPassword = !!this.passwordValue;
                    this.isPasswordDirty = false;
                    if (this.passwordValue) {
                        this.passwordValue = "";
                        this.isPasswordVisible = false;
                    }
                }
                this.render();
            });

        // --- 3. 短链接部分 ---
        const shortLinkLabelEl = resultContainer.createDiv("fns-share-label");
        shortLinkLabelEl.style.marginBottom = "8px";
        shortLinkLabelEl.style.fontWeight = "bold";
        shortLinkLabelEl.style.display = "flex";
        shortLinkLabelEl.style.alignItems = "center";
        shortLinkLabelEl.style.gap = "5px";
        shortLinkLabelEl.style.fontSize = "0.85em";
        shortLinkLabelEl.style.color = "var(--text-muted)";
        const shortLinkIcon = shortLinkLabelEl.createSpan();
        setIcon(shortLinkIcon, "link-2");
        shortLinkLabelEl.createSpan({ text: $("ui.share.shortLink") });

        const shortLinkContainer = resultContainer.createDiv("fns-share-short-link-container");
        shortLinkContainer.style.display = "flex";
        shortLinkContainer.style.gap = "10px";
        shortLinkContainer.style.marginBottom = "20px";

        if (this.shareData?.shortLink) {
            // 短链接输入框包装容器
            const shortInputWrapper = shortLinkContainer.createDiv();
            shortInputWrapper.style.position = "relative";
            shortInputWrapper.style.flex = "1";

            const shortInputEl = shortInputWrapper.createEl("input", {
                type: "text",
                value: this.shareData.shortLink,
            });
            shortInputEl.style.width = "100%";
            shortInputEl.style.paddingRight = "35px";
            shortInputEl.readOnly = true;

            // 内嵌复制按钮
            const shortCopyBtn = new ButtonComponent(shortInputWrapper)
                .setIcon("copy")
                .setTooltip($("ui.share.shortLinkCopy"));
            
            shortCopyBtn.buttonEl.style.position = "absolute";
            shortCopyBtn.buttonEl.style.right = "2px";
            shortCopyBtn.buttonEl.style.top = "50%";
            shortCopyBtn.buttonEl.style.transform = "translateY(-50%)";
            shortCopyBtn.buttonEl.style.boxShadow = "none";
            shortCopyBtn.buttonEl.style.border = "none";
            shortCopyBtn.buttonEl.style.backgroundColor = "transparent";
            shortCopyBtn.buttonEl.style.color = "var(--text-muted)";
            shortCopyBtn.buttonEl.style.display = "flex";
            shortCopyBtn.buttonEl.style.height = "auto";
            shortCopyBtn.buttonEl.style.padding = "5px";
            shortCopyBtn.buttonEl.style.opacity = "0.5";

            shortCopyBtn.buttonEl.addEventListener("mouseenter", () => shortCopyBtn.buttonEl.style.opacity = "1");
            shortCopyBtn.buttonEl.addEventListener("mouseleave", () => shortCopyBtn.buttonEl.style.opacity = "0.5");

            shortCopyBtn.onClick(() => {
                navigator.clipboard.writeText(this.shareData!.shortLink!);
                new Notice($("ui.share.copy_success"));
            });
            
            // 刷新/重新生成按钮
            const refreshBtn = new ButtonComponent(shortLinkContainer)
                .setIcon("refresh-cw")
                .setTooltip($("ui.share.shortLinkCreate"))
                .setDisabled(this.loading);
            
            refreshBtn.onClick(async () => {
                refreshBtn.setDisabled(true);
                const newShortLink = await this.plugin.api.createShortLink(this.path, true);
                if (newShortLink) {
                    this.shareData!.shortLink = newShortLink;
                    this.render();
                }
                refreshBtn.setDisabled(false);
            });

        } else {
            const emptyInput = shortLinkContainer.createEl("input", {
                type: "text",
                placeholder: $("ui.share.shortLink"),
            });
            emptyInput.style.flex = "1";
            emptyInput.readOnly = true;
            emptyInput.disabled = true;

            new ButtonComponent(shortLinkContainer)
                .setIcon("link-2")
                .setButtonText($("ui.share.shortLinkCreate"))
                .setDisabled(this.loading)
                .onClick(async () => {
                    this.loading = true;
                    this.render();
                    const shortLink = await this.plugin.api.createShortLink(this.path);
                    this.loading = false;
                    if (shortLink) {
                        this.shareData!.shortLink = shortLink;
                    }
                    this.render();
                });
        }

        // --- 4. 底部操作栏 (左右布局) ---
        const footerContainer = resultContainer.createDiv("fns-share-footer");
        footerContainer.style.display = "flex";
        footerContainer.style.justifyContent = "space-between";
        footerContainer.style.alignItems = "center";
        footerContainer.style.marginTop = "20px";
        footerContainer.style.paddingTop = "15px";
        footerContainer.style.borderTop = "1px solid var(--background-modifier-border)";

        // 左侧：分享成功提示
        const tipEl = footerContainer.createDiv("fns-share-tip");
        tipEl.style.fontSize = "0.85em";
        tipEl.style.color = "var(--text-accent)";
        tipEl.style.display = "flex";
        tipEl.style.alignItems = "center";
        tipEl.style.gap = "5px";
        const iconSpan = tipEl.createSpan();
        iconSpan.style.display = "inline-flex";
        iconSpan.style.alignItems = "center";
        setIcon(iconSpan, "check-circle-2");
        tipEl.createSpan({ text: $("ui.share.success") });

        // 右侧：取消分享按钮
        const cancelBtn = new ButtonComponent(footerContainer)
            .setCta()
            .setDisabled(this.loading);
        
        cancelBtn.buttonEl.style.display = "flex";
        cancelBtn.buttonEl.style.alignItems = "center";
        cancelBtn.buttonEl.style.justifyContent = "center";
        cancelBtn.buttonEl.style.gap = "8px";

        // 确保按钮内容为空后再手动构建，防止重复或冲突
        cancelBtn.buttonEl.empty();

        // 分别创建图标和文字的 span
        const cancelIconSpan = cancelBtn.buttonEl.createSpan();
        cancelIconSpan.style.display = "inline-flex";
        cancelIconSpan.style.alignItems = "center";
        setIcon(cancelIconSpan, "unlink"); 
        
        cancelBtn.buttonEl.createSpan({ text: $("ui.share.cancel") });

        cancelBtn.onClick(async () => {
            this.loading = true;
            this.render();
            const success = await this.plugin.api.cancelShare(this.path);
            this.loading = false;
            if (success) {
                this.shareData = null;
                this.passwordValue = "";
                this.isPasswordVisible = false;
                this.isPasswordDirty = false;
                new Notice($("ui.share.cancel_success"));
            }
            this.render();
        });
    }
}
