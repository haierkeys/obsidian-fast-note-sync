import { MarkdownPostProcessorContext, parseLinktext, loadPdfJs, MarkdownView } from "obsidian";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";

import { hashContent } from "./helps";
import type FastSync from "../main";


/**
 * 嵌入元素预览处理器
 * 处理本地不存在但云端存在的附件预览
 */
export class FileCloudPreview {
  private static IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp"];
  private static VIDEO_EXTS = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
  private static AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];

  private plugin: FastSync;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    if (!this.plugin.settings.cloudPreviewEnabled) return;

    this.registerMarkdownPostProcessor();
    this.registerLivePreviewProcessor();
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
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            // 在 Live Preview 中查找嵌入元素
            // 由于 CM6 的渲染机制，我们需要在更新后处理
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

      embed.appendChild(previewElement);

      // if (previewElement.hasClass("file-embed-title")) {
      //   embed.addClass("mod-generic");
      // }
    }
  }

  /**
   * 根据扩展名获取嵌入容器的类名
   */
  private getEmbedClass(ext: string): string {
    if (FileCloudPreview.IMAGE_EXTS.includes(ext)) return "media-embed image-embed";
    if (FileCloudPreview.VIDEO_EXTS.includes(ext)) return "media-embed video-embed";
    if (FileCloudPreview.AUDIO_EXTS.includes(ext)) return "media-embed audio-embed";
    if (ext === ".pdf") return "pdf-embed";
    return "file-embed mod-generic";
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

    if (ext === ".pdf") {
      return this.createPdfPreview(filePath, cloudUrl);
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

  private async createPdfPreview(filePath: string, cloudUrl: string): Promise<HTMLElement> {
    // 异步加载 PDF.js 库，但不阻塞主 UI
    loadPdfJs().catch(err => console.error("FastSync: Failed to load PDF.js", err));

    const container = document.createElement("div");
    container.addClass("cloud-preview-pdf");
    container.style.cssText = "width: 100%; height: 600px; border: 1px solid var(--background-secondary); border-radius: 5px; overflow: auto;";

    const iframe = document.createElement("iframe");
    iframe.src = cloudUrl;
    iframe.style.cssText = "width: 100%; height: 100%; border: none;";
    iframe.title = `PDF Preview: ${filePath}`;
    container.appendChild(iframe);

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

  /**
   * 根据文件路径获取云端 URL
   */
  private getCloudUrl(filePath: string): string | null {
    const { api, vault, apiToken, cloudPreviewEnabled } = this.plugin.settings;
    if (!cloudPreviewEnabled || !api || !apiToken) return null;

    const ext = this.getFileExtension(filePath);
    if (!ext) return null;

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
