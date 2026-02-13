import { MarkdownPostProcessorContext, parseLinktext, loadPdfJs, MarkdownView, requestUrl, setIcon, Notice, Menu, TFile } from "obsidian";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

import { hashContent } from "./helps";
import type FastSync from "../main";


/**
 * Simple Event Bus to mimic pdfjsViewer.EventBus
 */
class SimpleEventBus {
  private listeners: Record<string, Function[]> = {};

  on(eventName: string, listener: Function) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  off(eventName: string, listener: Function) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach((l, i) => {
      if (l === listener) {
        this.listeners[eventName].splice(i, 1);
      }
    });
  }

  dispatch(eventName: string, data?: any) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(listener => listener(data));
  }

  // Internal method for compatibility if needed
  _on(eventName: string, listener: Function) {
    this.on(eventName, listener);
  }
}

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
    // Parse height from subpath if available (default to 600px for desktop-like feel, or rely on CSS)
    const params = new URLSearchParams(subpath || "");
    const height = params.get("height") || "800";

    // --- 1. DOM Structure (Matching Obsidian's Internal Structure) ---
    const loadingContainer = document.createElement("div"); // The root wrapper we return
    loadingContainer.addClass("pdf-preview-wrapper");
    loadingContainer.style.cssText = `width: 100%; height: ${height}px; display: flex; flex-direction: column; background-color: var(--background-secondary); border-radius: 4px; overflow: hidden; position: relative;`;

    // Create PDF Main Container
    const pdfContainer = loadingContainer.createDiv("pdf-container");
    pdfContainer.style.cssText = "display: flex; flex-direction: column; flex: 1; overflow: hidden; position: relative; background-color: var(--background-primary);"; // Ensure it takes space

    // Check Theme (Simulated)
    const isThemed = this.plugin.app.loadLocalStorage("pdfjs-is-themed");
    if (isThemed) {
      pdfContainer.addClass("mod-themed");
    }

    // Create Content Container1
    const contentEl = pdfContainer.createDiv("pdf-content-container");
    contentEl.style.cssText = "display: flex; flex: 1; overflow: hidden; position: relative;";

    // Create Sidebar Container
    const sidebarContainer = contentEl.createDiv("pdf-sidebar-container");
    sidebarContainer.style.cssText = "width: 200px; display: none; flex-direction: column; border-right: 1px solid var(--background-modifier-border); background-color: var(--background-secondary); z-index: 1;"; // Hidden by default
    sidebarContainer.setAttribute("data-view", "thumbnail"); // Default view

    const sidebarContentWrapper = sidebarContainer.createDiv("pdf-sidebar-content-wrapper");
    sidebarContentWrapper.style.cssText = "flex: 1; overflow-y: auto; overflow-x: hidden;";
    const sidebarContent = sidebarContentWrapper.createDiv("pdf-sidebar-content");

    const thumbnailViewEl = sidebarContent.createDiv("pdf-thumbnail-view");
    const outlineViewEl = sidebarContent.createDiv("pdf-outline-view hidden"); // hidden class usually means display: none

    // Create Viewer Container
    const viewerContainer = contentEl.createDiv("pdf-viewer-container");
    viewerContainer.style.cssText = "flex: 1; overflow: auto; position: relative; display: flex; flex-direction: column; align-items: center; padding: 20px;";

    // Viewer Element (Where canvases go)
    const viewerEl = viewerContainer.createDiv("pdfViewer");
    viewerEl.style.cssText = "position: relative; width: fit-content; min-height: 100%; display: flex; flex-direction: column; gap: 10px;";

    // Event Bus
    const eventBus = new SimpleEventBus();

    // --- 2. Toolbar Implementation (Inline for now) ---
    // Toolbar is attached to loadingContainer (root) in Obsidian's code
    const toolbar = loadingContainer.createDiv({ cls: "pdf-toolbar", prepend: true }); // Prepend to be at top
    toolbar.style.cssText = "display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--background-modifier-border); padding: 4px; background-color: var(--background-secondary); flex-shrink: 0;";

    // Toolbar Left
    const toolbarLeft = toolbar.createDiv({ cls: "pdf-toolbar-left" });
    toolbarLeft.style.cssText = "display: flex; align-items: center; gap: 4px;";

    const sidebarToggle = toolbarLeft.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Toggle Sidebar" } });
    setIcon(sidebarToggle, "layout-list");
    sidebarToggle.onclick = () => {
      const isHidden = sidebarContainer.style.display === "none";
      sidebarContainer.style.display = isHidden ? "flex" : "none";
      sidebarToggle.toggleClass("is-active", !isHidden); // Optional visual feedback
      eventBus.dispatch("sidebarviewchanged", { view: "thumbnail" });
    };

    // Spacer
    const spacer1 = toolbarLeft.createDiv({ cls: "pdf-toolbar-spacer" });
    spacer1.style.flex = "1";

    // Zoom Controls
    const zoomOutBtn = toolbarLeft.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Zoom Out" } });
    setIcon(zoomOutBtn, "zoom-out");
    zoomOutBtn.onclick = () => eventBus.dispatch("zoomout");

    const zoomInBtn = toolbarLeft.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Zoom In" } });
    setIcon(zoomInBtn, "zoom-in");
    zoomInBtn.onclick = () => eventBus.dispatch("zoomin");

    // Page Input
    const pageInput = toolbarLeft.createEl("input", { type: "number", cls: "pdf-page-input" });
    pageInput.style.cssText = "width: 40px; text-align: right; border: none; background: transparent; color: var(--text-normal); margin-left: 8px;";
    pageInput.value = "1";
    pageInput.min = "1";

    const pageCountEl = toolbarLeft.createSpan({ cls: "pdf-page-numbers" });
    pageCountEl.setText(" / --");
    pageCountEl.style.color = "var(--text-muted)";

    pageInput.onchange = () => {
      const page = parseInt(pageInput.value);
      if (page > 0) eventBus.dispatch("pagechange", { pageNumber: page });
    };

    // Toolbar Right
    const toolbarRight = toolbar.createDiv({ cls: "pdf-toolbar-right" });
    const moreOptions = toolbarRight.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Open in Browser" } });
    setIcon(moreOptions, "external-link");
    moreOptions.onclick = () => window.open(cloudUrl, "_blank");


    // --- 3. Viewer Logic (PDF.js) ---
    // State
    let pdfDoc: any = null;
    let currentScale = 1.0;
    let isRendering = false;

    // Loading Indicator
    const loadingText = viewerContainer.createDiv({ cls: "pdf-loading" });
    loadingText.setText("Loading PDF...");
    loadingText.style.cssText = "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--text-muted);";

    const renderPages = async () => {
      if (!pdfDoc || isRendering) return;
      isRendering = true;
      viewerEl.empty(); // Clear existing

      try {
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: currentScale });

          const pageContainer = viewerEl.createDiv({ cls: "pdf-page-wrapper" });
          pageContainer.setAttribute("data-page-number", pageNum.toString());
          pageContainer.style.cssText = "position: relative; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 10px; background-color: var(--background-primary);";
          pageContainer.style.width = `${viewport.width}px`;
          pageContainer.style.height = `${viewport.height}px`;

          const canvas = pageContainer.createEl("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          canvas.style.width = "100%";
          canvas.style.height = "100%";

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      } catch (e) {
        console.error("PDF Render Error", e);
        new Notice("Error rendering PDF");
      } finally {
        isRendering = false;
      }
    };

    // Event Listeners for Logic
    eventBus.on("zoomin", () => {
      if (currentScale < 5.0) {
        currentScale += 0.25;
        renderPages();
      }
    });

    eventBus.on("zoomout", () => {
      if (currentScale > 0.5) {
        currentScale -= 0.25;
        renderPages();
      }
    });

    eventBus.on("pagechange", (data: any) => {
      const pageNum = data.pageNumber;
      if (pageNum >= 1 && pageNum <= (pdfDoc?.numPages || 1)) {
        const targetPage = viewerEl.querySelector(`.pdf-page-wrapper[data-page-number="${pageNum}"]`);
        if (targetPage) targetPage.scrollIntoView({ behavior: "smooth" });
      }
    });

    // Update Page Number on Scroll
    viewerContainer.onscroll = () => {
      if (!pdfDoc) return;
      const wrappers = viewerEl.querySelectorAll(".pdf-page-wrapper");
      const containerTop = viewerContainer.scrollTop;
      const containerHeight = viewerContainer.clientHeight;

      let currentPage = 1;
      // Find the page that is most visible
      for (let i = 0; i < wrappers.length; i++) {
        const el = wrappers[i] as HTMLElement;
        // Simple check: if element top is within the upper half of the viewport
        if (el.offsetTop <= containerTop + containerHeight / 2) {
          currentPage = i + 1;
        } else {
          break;
        }
      }
      pageInput.value = currentPage.toString();
    };


    // --- 4. Initialization ---
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const response = await requestUrl({ url: cloudUrl });
        const data = response.arrayBuffer;

        const loadingTask = pdfjs.getDocument(data);
        pdfDoc = await loadingTask.promise;

        loadingText.remove();
        pageCountEl.setText(` / ${pdfDoc.numPages}`);
        pageInput.max = pdfDoc.numPages;

        await renderPages();

        // Render Thumbnails (Lazy or simple)
        // For now, simple implementation if sidebar is opened
        eventBus.on("sidebarviewchanged", async () => {
          if (sidebarContainer.style.display !== "none" && thumbnailViewEl.children.length === 0) {
            // Render thumbnails
            for (let i = 1; i <= pdfDoc.numPages; i++) {
              const page = await pdfDoc.getPage(i);
              const viewport = page.getViewport({ scale: 0.2 });

              const thumbContainer = thumbnailViewEl.createDiv("pdf-thumbnail");
              thumbContainer.style.cssText = "margin-bottom: 10px; cursor: pointer; display: flex; justify-content: center;";
              thumbContainer.onclick = () => eventBus.dispatch("pagechange", { pageNumber: i });

              const canvas = thumbContainer.createEl("canvas");
              canvas.height = viewport.height;
              canvas.width = viewport.width;

              await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
            }
          }
        });

      } catch (e) {
        console.error("PDF Load Error", e);
        loadingText.setText("Failed to load PDF");
      }
    })();

    return loadingContainer;
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

