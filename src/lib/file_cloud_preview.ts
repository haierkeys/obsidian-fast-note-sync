import { MarkdownPostProcessorContext, parseLinktext, loadPdfJs, MarkdownView, Platform, requestUrl } from "obsidian";
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
    if (!this.plugin.settings.cloudPreviewEnabled) return;
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
    if (!this.plugin.settings.cloudPreviewEnabled) return;
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
    if (!this.plugin.settings.cloudPreviewEnabled) return;
    // 使用 requestAnimationFrame 或 setTimeout 避免频繁触发时的冲突
    window.setTimeout(() => {
      const embeds = view.dom.querySelectorAll(".mod-empty-attachment");
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

    // 尝试获取云端 URL
    const cloudUrl = await this.getCloudUrl(filePath, context.sourcePath, subpath);
    if (!cloudUrl) return;

    // 标记已处理，防止循环
    embed.dataset.cloudProcessed = "true";

    const ext = this.getFileExtension(filePath);
    const previewElement = await this.createPreviewElement(filePath, cloudUrl, ext, subpath);

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
      return this.createImagePreview(cloudUrl, filePath);
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

  private createImagePreview(cloudUrl: string, filePath: string): HTMLElement {
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
    if (Platform.isMobile) {
      return this.createMobilePdfPreview(filePath, cloudUrl, subpath);
    }

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

  private async createMobilePdfPreview(filePath: string, cloudUrl: string, subpath?: string): Promise<HTMLElement> {
    const container = document.createElement("div");
    container.addClass("pdf-container");
    // Remove flex-direction: column; align-items: center; which caused overflow on small screens
    // Use simple block display with padding, letting children fill width naturally111.
    
    container.style.cssText =
      "width: 100%; padding: 4px; background-color: var(--background-secondary); border-radius: 4px;";

    const loadingEl = container.createDiv({ cls: "pdf-loading" });
    loadingEl.setText("Loading PDF...");
    loadingEl.style.color = "var(--text-muted)";
    loadingEl.style.textAlign = "center";
    loadingEl.style.padding = "20px";

    // 异步加载和渲染，避免阻塞 UI
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        // 获取 PDF 数据 (ArrayBuffer)
        const response = await requestUrl({ url: cloudUrl });
        const data = response.arrayBuffer;

        // 加载文档
        const loadingTask = pdfjs.getDocument(data);
        const pdf = await loadingTask.promise;

        loadingEl.remove();

        // 简单的渲染逻辑：渲染所有页面
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);

          const scale = 2.0; // 进一步提高移动端清晰度，依赖 CSS 缩小适配屏幕
          const viewport = page.getViewport({ scale });

          // 创建 canvas 容器以保持宽高比
          const canvasWrapper = container.createDiv({ cls: "pdf-page-wrapper" });
          canvasWrapper.style.marginBottom = "4px"; // 减少页面间距
          canvasWrapper.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          canvasWrapper.style.lineHeight = "0"; // 防止 canvas 下方出现空隙
          canvasWrapper.style.width = "100%"; // 强制宽度适应容器

          const canvas = canvasWrapper.createEl("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          // 适应容器宽度，高度自动
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };

          await page.render(renderContext).promise;
        }
      } catch (e) {
        console.error("FastSync: Failed to load PDF on mobile", e);
        loadingEl.setText(`PDF Load Error: ${e.message}`);
        loadingEl.style.color = "var(--text-error)";

        // 提供一个下载/打开链接作为后备
        const link = container.createEl("a", {
          text: "Open PDF in Browser",
          href: cloudUrl,
        });
        link.style.display = "block";
        link.style.marginTop = "10px";
        link.style.textAlign = "center";
        link.target = "_blank";
      }
    })();

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
    if (subpath?.startsWith("#t=")) {
      const time = parseFloat(subpath.substring(3));
      return isNaN(time) ? null : time;
    }
    return null;
  }

  private async getCloudUrl(filePath: string, sourcePath: string, subpath: string): Promise<string | null> {
    const { api, vault, apiToken, cloudPreviewEnabled, cloudPreviewTypeRestricted, cloudPreviewRemoteUrl } = this.plugin.settings;
    if (!cloudPreviewEnabled || !api || !apiToken) return null;

    const vaultPath = await this.plugin.app.fileManager.getAvailablePathForAttachment(filePath, sourcePath);
    const ext = this.getFileExtension(vaultPath);
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

    let matchedUrl: string | null = null;

    if (cloudPreviewRemoteUrl) {
      const lines = cloudPreviewRemoteUrl.split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        const separatorIndex = trimmedLine.indexOf("#");
        if (separatorIndex === -1) continue;

        const rulePart = trimmedLine.substring(0, separatorIndex);
        const urlPart = trimmedLine.substring(separatorIndex + 1).trim();

        if (!rulePart || !urlPart) continue;

        let prefix = "";
        let extsPart = rulePart;

        if (rulePart.includes("@")) {
          const parts = rulePart.split("@");
          prefix = parts[0].trim().toLowerCase();
          extsPart = parts[1].trim();
        }

        const exts = extsPart.split("$").map(e => e.trim().toLowerCase());

        // 获取不带后缀的路径进行前缀匹配 (从 filePath 尾部去除 ext 的长度)
        const pathWithoutExt = filePath.toLowerCase().substring(0, filePath.length - ext.length);

        const matchesExt = exts.includes(ext);
        const matchesPrefix = !prefix || pathWithoutExt.startsWith(prefix);

        if (matchesExt && matchesPrefix) {
          matchedUrl = urlPart;
          break;
        }
      }
    }
    if (matchedUrl) {
      return matchedUrl
        .replace(/{path}/g, filePath)
        .replace(/{vaultPath}/g, vaultPath)
        .replace(/{subpath}/g, subpath)
        .replace(/{vault}/g, vault)
        .replace(/{type}/g, type);
    }

    const params = new URLSearchParams({
      vault,
      path: vaultPath,
      token: apiToken,
      pathHash: hashContent(vaultPath)
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

