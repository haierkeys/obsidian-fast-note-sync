import { MarkdownPostProcessorContext, parseLinktext, loadPdfJs, MarkdownView } from "obsidian";
import { ViewPlugin, ViewUpdate } from "@codemirror/view";

import { hashContent } from "./helps";
import type FastSync from "../main";


export class FileCloudPreview {
  private plugin: FastSync;
  private pdfjsLib: any = null;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    if (!this.plugin.settings.cloudPreviewEnabled) return;
    this.registerMarkdownPostProcessor();
    this.registerLivePreviewProcessor();
  }

  /**
   * 注册 Markdown 后处理器，用于处理本地不存在的文件预览
   */
  private registerMarkdownPostProcessor() {
    this.plugin.registerMarkdownPostProcessor(
      async (element: HTMLElement, context: MarkdownPostProcessorContext) => {

        // 查找所有内部链接嵌入元素
        const embeds = element.querySelectorAll(".internal-embed");

        for (const embed of Array.from(embeds)) {
          await this.processEmbed(embed as HTMLElement, context);
        }
      },
      0, // 低优先级，确保在其他处理器之后运行
    );
  }

  /**
   * 注册 Live Preview 处理器
   */
  private registerLivePreviewProcessor() {
    const self = this;
    this.plugin.registerEditorExtension([
      ViewPlugin.fromClass(class {
        constructor() { }
        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged) {
            // 在 Live Preview 中查找嵌入元素
            // 由于 CM6 的渲染机制，我们需要在 DOM 更新后进行处理
            setTimeout(() => {
              const embeds = update.view.dom.querySelectorAll(".internal-embed");
              for (const embed of Array.from(embeds)) {
                // Live Preview 的 context 处理逻辑稍有不同
                // 我们通过 activeView 获取当前文件路径
                const activeView = self.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                const sourcePath = activeView?.file?.path || "";

                self.processEmbed(embed as HTMLElement, {
                  sourcePath,
                  frontmatter: {}
                } as MarkdownPostProcessorContext);
              }
            }, 50);
          }
        }
      })
    ]);
  }

  /**
   * 处理单个嵌入元素
   */
  private async processEmbed(
    embed: HTMLElement,
    context: MarkdownPostProcessorContext,
  ) {
    // 获取链接的 src 属性
    const src = embed.getAttribute("src");
    if (!src) return;

    // 解析链接中的路径和子路径（如 #t=30）
    const { path: filePath, subpath } = parseLinktext(src);

    // 检查文件是否在本地存在
    const file = this.plugin.app.metadataCache.getFirstLinkpathDest(
      filePath,
      context.sourcePath,
    );

    // 如果文件已存在本地，不使用云端预览
    if (file) return;

    // 文件不存在本地，尝试获取其在库中的预期路径
    // 使用 getAvailablePathForAttachment 获取附件应该存放的路径
    const resolvedPath = await this.plugin.app.fileManager.getAvailablePathForAttachment(filePath, context.sourcePath);

    // 尝试使用云端预览
    const cloudUrl = this.getCloudUrl(resolvedPath);
    if (!cloudUrl) return;

    // 根据文件类型创建预览元素
    const previewElement = await this.createPreviewElement(
      resolvedPath,
      cloudUrl,
      this.getFileExtension(resolvedPath),
      subpath,
    );
    if (previewElement) {
      // 替换原有的嵌入元素内容
      embed.innerHTML = "";
      embed.appendChild(previewElement);
    }
  }

  /**
   * 根据文件路径获取云端URL
   */
  private getCloudUrl(filePath: string): string | null {
    if (!this.plugin.settings.cloudPreviewEnabled) return null;

    const { api, vault, apiToken } = this.plugin.settings;
    if (!api || !apiToken) return null;

    // 附件才进行处理
    const ext = this.getFileExtension(filePath);
    if (!ext) return null;

    // 支持的文件类型
    const supportedExts = [
      // 图片
      ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp",
      // 视频
      ".mp4", ".webm", ".ogg", ".mov", ".avi",
      // 音频
      ".mp3", ".wav", ".m4a", ".flac",
      // PDF
      ".pdf"
    ];

    if (!supportedExts.includes(ext)) return null;

    // 构建完整URL: api/file?vault=xxx&path=xxx&token=xxx&pathHash=xxx
    const params = new URLSearchParams({
      vault: vault,
      path: filePath,
      token: apiToken,
      pathHash: hashContent(filePath)
    });

    return `${api}/api/file?${params.toString()}`;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf(".");
    if (lastDot === -1) return "";
    return filePath.substring(lastDot).toLowerCase();
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
    // 图片类型
    const imageExts = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".svg",
      ".webp",
    ];
    if (imageExts.includes(ext)) {
      const img = document.createElement("img");
      img.src = cloudUrl;
      img.alt = filePath;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      return img;
    }

    // 视频类型
    const videoExts = [".mp4", ".webm", ".ogg", ".mov", ".avi"];
    if (videoExts.includes(ext)) {
      const video = document.createElement("video");
      video.src = cloudUrl;
      video.controls = true;
      video.style.maxWidth = "100%";
      video.style.height = "auto";

      // 处理时间戳（如 #t=30）
      if (subpath && subpath.startsWith("t=")) {
        const time = parseFloat(subpath.substring(2));
        if (!isNaN(time)) {
          video.currentTime = time;
        }
      }
      return video;
    }

    // 音频类型
    const audioExts = [".mp3", ".wav", ".ogg", ".m4a", ".flac"];
    if (audioExts.includes(ext)) {
      const audio = document.createElement("audio");
      audio.src = cloudUrl;
      audio.controls = true;
      audio.style.width = "100%";

      // 处理时间戳（如 #t=30）
      if (subpath && subpath.startsWith("t=")) {
        const time = parseFloat(subpath.substring(2));
        if (!isNaN(time)) {
          audio.currentTime = time;
        }
      }
      return audio;
    }

    // PDF类型
    if (ext === ".pdf") {
      return this.createPdfPreview(cloudUrl, filePath);
    }

    // 其他不支持的类型，不做处理，返回 null
    return null;
  }

  /**
   * 使用 PDF.js 创建 PDF 预览
   */
  private async createPdfPreview(
    cloudUrl: string,
    filePath?: string,
  ): Promise<HTMLElement> {
    // 使用官方的 loadPdfJs 加载 PDF.js 库
    loadPdfJs()
      .then((pdfjsLib) => {
        this.pdfjsLib = pdfjsLib;
      })
      .catch((error) => {
        console.error("Failed to load PDF.js:", error);
      });

    // 创建 PDF 查看器容器
    const container = document.createElement("div");
    container.addClass("cloud-preview-pdf");
    container.style.width = "100%";
    container.style.height = "600px";
    container.style.border = "1px solid var(--background-secondary)";
    container.style.borderRadius = "5px";
    container.style.overflow = "auto";

    // 使用 iframe 嵌入 PDF（通用方案）
    const iframe = document.createElement("iframe");
    iframe.src = cloudUrl;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.title = `PDF Preview: ${filePath || "Document"}`;
    container.appendChild(iframe);

    return container;
  }
}
