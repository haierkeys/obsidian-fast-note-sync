import { MarkdownPostProcessorContext, parseLinktext, loadPdfJs, MarkdownView } from "obsidian";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

import { hashContent } from "./helps";
import type FastSync from "../main";


/**
 * 嵌入元素预览处理器
 * 处理本地不存在但云端存在的附件预览
 */
export class FileCloudPreview {
  public static IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".wximage"];
  public static VIDEO_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
  public static AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];
  public static PDF_EXTS = [".pdf"];

  private plugin: FastSync;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    if (!this.plugin.settings.cloudPreviewEnabled) return;

    this.registerMarkdownPostProcessor();
    this.registerLivePreviewProcessor();
  }

  /**
   * 检查是否为受限预览类型 (图片、视频、音频、PDF)
   */
  public static isRestrictedType(ext: string): boolean {
    const e = ext.toLowerCase();
    return (
      this.IMAGE_EXTS.includes(e) ||
      this.VIDEO_EXTS.includes(e) ||
      this.AUDIO_EXTS.includes(e) ||
      this.PDF_EXTS.includes(e)
    );
  }

  /**
   * 注册 Markdown 后处理器 (阅读模式)
   */
  private registerMarkdownPostProcessor() {
    this.plugin.registerMarkdownPostProcessor(
      async (element: HTMLElement, context: MarkdownPostProcessorContext) => {
        const embeds = element.querySelectorAll(".internal-embed");
        for (const embed of Array.from(embeds)) {
          await this.processEmbed(embed as HTMLElement, context);
        }
      },
      0, // 低优先级，确保在其他处理器之后运行
    );
  }

  /**
   * 注册 Live Preview 处理器 (编辑模式)
   */
  private registerLivePreviewProcessor() {
    const self = this;
    this.plugin.registerEditorExtension([
      ViewPlugin.fromClass(class {
        constructor(view: EditorView) {
          // 初始加载时也尝试处理一次，解决单行笔记或初次打开不触发 update 的问题
          self.handleLivePreviewUpdate(view);
        }
        update(update: ViewUpdate) {
          // 只要文档变化、视口变化或插件状态变化，都尝试更新
          if (update.docChanged || update.viewportChanged || update.geometryChanged) {
            self.handleLivePreviewUpdate(update.view);
          }
        }
      })
    ]);
  }

  /**
   * 处理实时预览更新
   */
  private handleLivePreviewUpdate(view: EditorView) {
    // 使用 requestAnimationFrame 或 setTimeout 避免频繁触发时的冲突
    window.setTimeout(() => {
      const embeds = view.dom.querySelectorAll(".internal-embed");
      if (embeds.length === 0) return;

      const activeView = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
      const sourcePath = activeView?.file?.path || "";

      for (const embed of Array.from(embeds)) {
        this.processEmbed(embed as HTMLElement, {
          sourcePath,
          frontmatter: {}
        } as MarkdownPostProcessorContext);
      }
    }, 50);
  }

  /**
   * 处理单个嵌入元素
   */
  private async processEmbed(
    embed: HTMLElement,
    context: MarkdownPostProcessorContext,
  ) {


    const src = embed.getAttribute("src");
    if (!src || embed.dataset.cloudProcessed === "true") return;

    const { path: filePath, subpath } = parseLinktext(src);

    // 检查文件是否在本地存在
    const file = this.plugin.app.metadataCache.getFirstLinkpathDest(
      filePath,
      context.sourcePath,
    );
    if (file) return;

    // 文件不存在本地，尝试获取预期路径
    const resolvedPath = await this.plugin.app.fileManager.getAvailablePathForAttachment(filePath, context.sourcePath);

    // 尝试获取云端 URL
    const cloudUrl = this.getCloudUrl(resolvedPath);
    console.log("FastSync: Cloud URL", cloudUrl);
    if (!cloudUrl) return;

    // 标记已处理，防止循环
    embed.dataset.cloudProcessed = "true";

    const ext = this.getFileExtension(resolvedPath);
    const previewElement = await this.createPreviewElement(resolvedPath, cloudUrl, ext, subpath);

    console.log("FastSync: Preview element created", previewElement);

    if (previewElement) {
      embed.innerHTML = "";

      // 增加动态类名处理
      const classNames = this.getEmbedClass(ext);
      if (classNames) {
        // 先移除可能冲突的旧类名
        embed.removeClass("file-embed", "mod-empty-attachment");
        // 支持多个类名，以空格分隔
        classNames.split(" ").forEach(cls => {
          if (cls) embed.addClass(cls);
        });
      }

      // 修复双滚动条问题：确保 embed 容器本身不滚动，并消除底部空白
      embed.style.overflow = "hidden";
      embed.style.verticalAlign = "middle";

      embed.appendChild(previewElement);

    }
  }

  /**
   * 根据扩展名获取嵌入容器的类名
   */
  private getEmbedClass(ext: string): string {
    if (FileCloudPreview.IMAGE_EXTS.includes(ext)) return "media-embed image-embed file-cloud-preview";
    if (FileCloudPreview.VIDEO_EXTS.includes(ext)) return "media-embed video-embed file-cloud-preview";
    if (FileCloudPreview.AUDIO_EXTS.includes(ext)) return "media-embed audio-embed file-cloud-preview";
    if (FileCloudPreview.PDF_EXTS.includes(ext)) return "pdf-embed file-cloud-preview";
    return "file-embed mod-generic file-cloud-preview";
  }

  /**
   * 根据文件类型创建预览元素
   */
  private async createPreviewElement(
    filePath: string,
    cloudUrl: string,
    ext: string,
    subpath?: string,
  ): Promise<HTMLElement | null> {
    if (FileCloudPreview.IMAGE_EXTS.includes(ext)) {
      return this.createImagePreview(filePath, cloudUrl);
    }

    if (FileCloudPreview.VIDEO_EXTS.includes(ext)) {
      return this.createVideoPreview(cloudUrl, subpath);
    }

    if (FileCloudPreview.AUDIO_EXTS.includes(ext)) {
      return this.createAudioPreview(cloudUrl, subpath);
    }

    if (FileCloudPreview.PDF_EXTS.includes(ext)) {
      return this.createPdfPreview(filePath, cloudUrl, subpath);
    }

    return this.createGenericPreview(filePath, cloudUrl);
  }

  private createImagePreview(filePath: string, cloudUrl: string): HTMLElement {
    const img = document.createElement("img");
    img.src = cloudUrl;
    img.alt = filePath;
    return img;
  }

  private createVideoPreview(cloudUrl: string, subpath?: string): HTMLElement {
    const video = document.createElement("video");
    video.src = cloudUrl;
    video.controls = true;
    video.preload = "metadata";

    const time = this.parseTimeSubpath(subpath);
    if (time !== null) video.currentTime = time;

    return video;
  }

  private createAudioPreview(cloudUrl: string, subpath?: string): HTMLElement {
    const audio = document.createElement("audio");
    audio.src = cloudUrl;
    audio.controls = true;
    // @ts-ignore
    //audio.concontrolstrolsList.add("nodownload");

    const time = this.parseTimeSubpath(subpath);
    if (time !== null) audio.currentTime = time;
    return audio;
  }

  private async createPdfPreview(filePath: string, cloudUrl: string, subpath?: string): Promise<HTMLElement> {
    // 异步加载 PDF.js 库，但不阻塞主 UI
    loadPdfJs().catch(err => console.error("FastSync: Failed to load PDF.js", err));

    // 解析 subpath (例如 page=5, height=500)
    const params = new URLSearchParams(subpath || "");
    const page = params.get("page") || params.get("p");
    const height = params.get("height") || "600";

    // 构建带分页信息的 URL 片段
    const hashParams: string[] = [];
    if (page) hashParams.push(`page=${page}`);
    // 支持官方的其他参数，如 view=FitH
    const view = params.get("view");
    if (view) hashParams.push(`view=${view}`);

    let finalUrl = cloudUrl;
    if (hashParams.length > 0) {
      finalUrl += `#${hashParams.join("&")}`;
    }

    const container = document.createElement("div");
    container.addClass("pdf-container");
    // 确保容器高度严格受控，移除冗余的 display: block
    container.style.cssText = `width: 100%; height: ${height}px; border: 1px solid var(--background-secondary); border-radius: 4px; overflow: hidden;`;

    const viewerContainer = document.createElement("div");
    viewerContainer.addClass("pdf-viewer-container");
    viewerContainer.style.cssText = "width: 100%; height: 100%;";

    const iframe = document.createElement("iframe");
    iframe.src = finalUrl;
    iframe.style.cssText = "width: 100%; height: 100%; border: none; display: block;";
    iframe.title = `PDF Preview: ${filePath}`;
    iframe.setAttribute("allowfullscreen", "true");

    viewerContainer.appendChild(iframe);
    container.appendChild(viewerContainer);

    return container;
  }

  private createGenericPreview(filePath: string, cloudUrl: string): HTMLElement {
    const container = document.createElement("div");
    container.addClass("file-embed-title");

    const fileName = filePath.split("/").pop() || filePath;
    container.innerHTML = `
        <span class="file-embed-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="svg-icon lucide-file">
            <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"></path>
            <path d="M14 2v5a1 1 0 0 0 1 1h5"></path>
          </svg>
        </span>
        ${fileName}
    `;

    container.onclick = () => window.open(cloudUrl, "_blank");
    return container;
  }

  /**
   * 解析时间戳子路径 (如 #t=30)
   */
  private parseTimeSubpath(subpath?: string): number | null {
    if (subpath?.startsWith("t=")) {
      const time = parseFloat(subpath.substring(2));
      return isNaN(time) ? null : time;
    }
    return null;
  }

  private getCloudUrl(filePath: string): string | null {
    const { api, vault, apiToken, cloudPreviewEnabled, cloudPreviewTypeRestricted, cloudPreviewRemoteUrl } = this.plugin.settings;
    if (!cloudPreviewEnabled || !api || !apiToken) return null;

    const ext = this.getFileExtension(filePath);
    if (!ext) return null;

    let type = "other";
    if (FileCloudPreview.IMAGE_EXTS.includes(ext)) type = "image";
    else if (FileCloudPreview.VIDEO_EXTS.includes(ext)) type = "video";
    else if (FileCloudPreview.AUDIO_EXTS.includes(ext)) type = "audio";
    else if (FileCloudPreview.PDF_EXTS.includes(ext)) type = "pdf";

    // 如果开启了类型限制，检查扩展名是否在允许列表中 (图片、视频、音频、PDF)
    if (cloudPreviewTypeRestricted) {
      if (type === "other") return null;
    }

    const pathHash = hashContent(filePath);
    let matchedUrl: string | null = null;

    if (cloudPreviewRemoteUrl) {
      const lines = cloudPreviewRemoteUrl.split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const colonIndex = trimmedLine.indexOf(":");
        if (colonIndex === -1) continue;

        const extsPart = trimmedLine.substring(0, colonIndex);
        const urlPart = trimmedLine.substring(colonIndex + 1).trim();

        if (!extsPart || !urlPart) continue;

        const exts = extsPart.split(";").map(e => e.trim().toLowerCase());
        if (exts.includes(ext)) {
          matchedUrl = urlPart;
          break;
        }
      }
    }

    if (matchedUrl) {
      return matchedUrl
        .replace(/{path}/g, filePath)
        .replace(/{vault}/g, vault)
        .replace(/{pathHash}/g, pathHash)
        .replace(/{type}/g, type);
    }

    const params = new URLSearchParams({
      vault,
      path: filePath,
      token: apiToken,
      pathHash: hashContent(filePath)
    });

    return `${api}/api/file?${params.toString()}`;
  }

  /**
   * 获取文件扩展名 (包含点)
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    return lastDot === -1 ? "" : filePath.substring(lastDot).toLowerCase();
  }
}
