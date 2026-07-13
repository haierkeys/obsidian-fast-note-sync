import { MarkdownPostProcessorContext, parseLinktext, loadPdfJs, MarkdownView, requestUrl, setIcon, Platform } from "obsidian";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

import { hashContent, showSyncNotice, dumpError } from "../utils/helpers";
import { CLIENT_TYPE } from "../utils/types";
import type FastSync from "../../main";


/**
 * Simple Event Bus to mimic pdfjsViewer.EventBus
 */
class SimpleEventBus {
  private listeners: Record<string, ((data?: unknown) => void)[]> = {};

  on(eventName: string, listener: (data?: unknown) => void) {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName].push(listener);
  }

  off(eventName: string, listener: (data?: unknown) => void) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach((l, i) => {
      if (l === listener) {
        this.listeners[eventName].splice(i, 1);
      }
    });
  }

  dispatch(eventName: string, data?: unknown) {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName].forEach(listener => listener(data));
  }

  // Internal method for compatibility if needed
  _on(eventName: string, listener: (data?: unknown) => void) {
    this.on(eventName, listener);
  }
}

/**
 * 嵌入元素预览处理器
 * 处理本地不存在但云端存在的附件预览
 */
interface PDFPageProxy {
  getViewport(options: { scale: number }): { width: number, height: number };
  render(options: { canvasContext: CanvasRenderingContext2D | null, viewport: unknown }): { promise: Promise<void> };
}

interface PDFDocumentProxy {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
}

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
    const handleUpdate = (view: EditorView) => this.handleLivePreviewUpdate(view);
    this.plugin.registerEditorExtension([
      ViewPlugin.fromClass(class {
        constructor(view: EditorView) {
          // 初始加载时也尝试处理一次，解决单行笔记或初次打开不触发 update 的问题
          handleUpdate(view);
        }
        update(update: ViewUpdate) {
          // 只要文档变化、视口变化或插件状态变化，都尝试更新
          if (update.docChanged || update.viewportChanged || update.geometryChanged) {
            handleUpdate(update.view);
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
        void this.processEmbed(embed as HTMLElement, {
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
      embed.empty();

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
      embed.addClass("fns-overflow-hidden", "fns-v-align-middle");

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
    const img = createEl("img");
    img.src = cloudUrl;
    img.alt = filePath;
    return img;
  }

  private createVideoPreview(cloudUrl: string, subpath?: string): HTMLElement {
    const video = createEl("video");
    video.src = cloudUrl;
    video.controls = true;
    video.preload = "metadata";

    const time = this.parseTimeSubpath(subpath);
    if (time !== null) video.currentTime = time;

    return video;
  }

  private createAudioPreview(cloudUrl: string, subpath?: string): HTMLElement {
    const audio = createEl("audio");
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

    // use electron's native pdf viewer for desktop app
    if (Platform.isDesktopApp) {
      const iframe = createEl("iframe");
      iframe.src = cloudUrl;
      iframe.addClass("fns-iframe-full");
      return iframe;
    }

    // --- 1. DOM Structure (Matching Obsidian's Internal Structure) ---
    const loadingContainer = createDiv(); // The root wrapper we return
    loadingContainer.addClass("pdf-preview-wrapper", "fns-pdf-preview-wrapper");
    // Use setCssProps for dynamic height (PDF viewer container)
    // 使用 setCssProps 设置 PDF 预览容器动态高度
    loadingContainer.setCssProps({ height: `${height}px` });

    // Create PDF Main Container
    const pdfContainer = loadingContainer.createDiv("pdf-container fns-pdf-container");

    // Check Theme (Simulated)
    const isThemed = (this.plugin.app as unknown as { loadLocalStorage(key: string): unknown }).loadLocalStorage("pdfjs-is-themed");
    if (isThemed) {
      pdfContainer.addClass("mod-themed");
    }

    // Create Content Container1
    const contentEl = pdfContainer.createDiv("pdf-content-container fns-pdf-content-container");

    // Create Sidebar Container
    const sidebarContainer = contentEl.createDiv("pdf-sidebar-container fns-pdf-sidebar-container fns-hidden");
    sidebarContainer.setAttribute("data-view", "thumbnail"); // Default view

    const sidebarContentWrapper = sidebarContainer.createDiv("pdf-sidebar-content-wrapper fns-pdf-sidebar-content-wrapper");
    const sidebarContent = sidebarContentWrapper.createDiv("pdf-sidebar-content");

    const thumbnailViewEl = sidebarContent.createDiv("pdf-thumbnail-view");
    sidebarContent.createDiv("pdf-outline-view hidden"); // hidden class usually means display: none

    // Create Viewer Container
    const viewerContainer = contentEl.createDiv("pdf-viewer-container fns-pdf-viewer-container");

    // Viewer Element (Where canvases go)
    const viewerEl = viewerContainer.createDiv("pdfViewer fns-pdf-viewer");

    // Event Bus
    const eventBus = new SimpleEventBus();

    // --- 2. Toolbar Implementation (Inline for now) ---
    // Toolbar is attached to loadingContainer (root) in Obsidian's code
    const toolbar = loadingContainer.createDiv({ cls: "pdf-toolbar fns-pdf-toolbar", prepend: true }); // Prepend to be at top

    // Toolbar Left
    const toolbarLeft = toolbar.createDiv({ cls: "pdf-toolbar-left fns-pdf-toolbar-left" });

    const sidebarToggle = toolbarLeft.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Toggle Sidebar" } });
    setIcon(sidebarToggle, "layout-list");
    sidebarToggle.onclick = () => {
      const isHidden = sidebarContainer.hasClass("fns-hidden");
      sidebarContainer.toggleClass("fns-hidden", !isHidden);
      sidebarToggle.toggleClass("is-active", !isHidden); // Optional visual feedback
      eventBus.dispatch("sidebarviewchanged", { view: "thumbnail" });
    };

    // Spacer
    toolbarLeft.createDiv({ cls: "pdf-toolbar-spacer fns-flex-1" });

    // Zoom Controls
    const zoomOutBtn = toolbarLeft.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Zoom Out" } });
    setIcon(zoomOutBtn, "zoom-out");
    zoomOutBtn.onclick = () => eventBus.dispatch("zoomout");

    const zoomInBtn = toolbarLeft.createDiv({ cls: "clickable-icon", attr: { "aria-label": "Zoom In" } });
    setIcon(zoomInBtn, "zoom-in");
    zoomInBtn.onclick = () => eventBus.dispatch("zoomin");

    // Page Input
    const pageInput = toolbarLeft.createEl("input", { type: "number", cls: "pdf-page-input fns-pdf-page-input" });
    pageInput.value = "1";
    pageInput.min = "1";

    const pageCountEl = toolbarLeft.createSpan({ cls: "pdf-page-numbers fns-muted-text" });
    pageCountEl.setText(" / --");

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
    let pdfDoc: PDFDocumentProxy | null = null;
    let currentScale = 1.0;
    let isRendering = false;

    // Loading Indicator
    const loadingText = viewerContainer.createDiv({ cls: "pdf-loading fns-pdf-loading" });
    loadingText.setText("Loading PDF...");

    const renderPages = async () => {
      if (!pdfDoc || isRendering) return;
      isRendering = true;
      viewerEl.empty(); // Clear existing

      try {
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: currentScale });

          const pageContainer = viewerEl.createDiv({ cls: "pdf-page-wrapper fns-pdf-page-wrapper" });
          pageContainer.setAttribute("data-page-number", pageNum.toString());
          // Use setCssProps for dynamic page dimensions
          // 使用 setCssProps 设置 PDF 页面动态尺寸
          pageContainer.setCssProps({ width: `${viewport.width}px`, height: `${viewport.height}px` });

          const canvas = pageContainer.createEl("canvas");
          const context = canvas.getContext("2d");
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          // Use setCssProps instead of direct style assignment for theme compatibility
          // 使用 setCssProps 替代直接内联样式赋值，以提升主题兼容性
          canvas.setCssProps({ width: "100%", height: "100%" });

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      } catch (e) {
        dumpError("PDF Render Error", e);
        const errorMsg = e instanceof Error ? e.message : String(e);
        showSyncNotice(`Error rendering PDF: ${errorMsg}`);
      } finally {
        isRendering = false;
      }
    };

    // Event Listeners for Logic
    eventBus.on("zoomin", () => {
      if (currentScale < 5.0) {
        currentScale += 0.25;
        void renderPages();
      }
    });

    eventBus.on("zoomout", () => {
      if (currentScale > 0.5) {
        currentScale -= 0.25;
        void renderPages();
      }
    });

    eventBus.on("pagechange", (data: { pageNumber: number }) => {
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
    void (async () => {
      try {
        const pdfjs = (await loadPdfJs()) as { getDocument(data: ArrayBuffer): { promise: Promise<PDFDocumentProxy> } };
        const response = await requestUrl({
          url: cloudUrl,
          headers: {
            "x-client": "obsidian",
            "x-client-name": encodeURIComponent(this.plugin.getClientName()),
            "x-client-version": this.plugin.manifest.version || ""
          }
        });
        const data = response.arrayBuffer;

        const loadingTask = pdfjs.getDocument(data);
        pdfDoc = await loadingTask.promise;

        loadingText.remove();
        pageCountEl.setText(` / ${pdfDoc.numPages}`);
        pageInput.max = pdfDoc.numPages.toString();

        const firstPage = await pdfDoc.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1 });

        const containerWidth = viewerContainer.clientWidth - 40; // padding
        currentScale = containerWidth / viewport.width;

        await renderPages();

        // Render Thumbnails (Lazy or simple)
        // For now, simple implementation if sidebar is opened
        eventBus.on("sidebarviewchanged", () => {
          void (async () => {
            if (!sidebarContainer.hasClass("fns-hidden") && thumbnailViewEl.children.length === 0) {
              // Render thumbnails
              for (let i = 1; i <= pdfDoc!.numPages; i++) {
                const page = await pdfDoc!.getPage(i);
                const thumbViewport = page.getViewport({ scale: 0.2 });

                const thumbContainer = thumbnailViewEl.createDiv("pdf-thumbnail fns-pdf-thumbnail");
                thumbContainer.onclick = () => eventBus.dispatch("pagechange", { pageNumber: i });

                const canvas = thumbContainer.createEl("canvas");
                canvas.height = thumbViewport.height;
                canvas.width = thumbViewport.width;

                await page.render({ canvasContext: canvas.getContext("2d"), viewport: thumbViewport }).promise;
              }
            }
          })();
        });

      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        dumpError("PDF Load Error", errorMsg);
        loadingText.setText(`Failed to load PDF: ${errorMsg}`);
      }
    })();

    return loadingContainer;
  }

  private createGenericPreview(filePath: string, cloudUrl: string): HTMLElement {
    const container = createDiv();
    container.addClass("file-embed-title");

    const fileName = filePath.split("/").pop() || filePath;
    const iconEl = container.createSpan({ cls: "file-embed-icon" });
    setIcon(iconEl, "file");
    container.appendText(` ${fileName}`);

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

    // Use the link path as written in the markdown. processEmbed() has already
    // verified that getFirstLinkpathDest(filePath, sourcePath) returns null
    // (i.e. the file is not present locally — typically because
    // cloudPreviewAutoDeleteLocal removed it after upload), so the only
    // authoritative location of the file is the path the user wrote in the
    // link. getAvailablePathForAttachment() must NOT be used here: it returns
    // the *destination path for a NEW attachment* based on the user's
    // attachment-folder configuration, not the actual storage path of an
    // existing file. For embeds like ![[attachment/yuque/X.mp3]] it would
    // typically discard the directory and return just "X.mp3" (or worse,
    // produce a path under the note's folder), causing the resulting cloud
    // URL to 404 on the server.
    const vaultPath = filePath;
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
      pathHash: hashContent(vaultPath),
      client: CLIENT_TYPE
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
