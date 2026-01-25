import type FastSync from "../main";
import {
  MarkdownPostProcessorContext,
  parseLinktext,
  loadPdfJs,
} from "obsidian";

export class FileCloudPreview {
  private plugin: FastSync;
  private pdfjsLib: any = null;

  constructor(plugin: FastSync) {
    this.plugin = plugin;
    this.registerMarkdownPostProcessor();
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

    // 文件已存在本地，不使用云端预览
    const isFileExists = !!this.plugin.app.metadataCache.getFirstLinkpathDest(
      filePath,
      context.sourcePath,
    );
    if (isFileExists) return;

    // 尝试使用云端预览
    const cloudUrl = this.getCloudUrl(filePath);
    if (!cloudUrl) return;

    // 根据文件类型创建预览元素
    const previewElement = await this.createPreviewElement(
      filePath,
      cloudUrl,
      this.getFileExtension(filePath),
      subpath,
    );
    if (previewElement) {
      // 替换原有的嵌入元素内容
      embed.innerHTML = "";
      embed.appendChild(previewElement);
    }
  }

  /**
   * 根据文件路径和扩展名配置获取云端URL
   */
  private getCloudUrl(filePath: string): string | null {
    const assetsUrls = this.plugin.settings.assetsUrls;
    if (!assetsUrls || !assetsUrls.trim()) return null;

    // 解析 assetsUrls 配置
    // 格式：.jpg,.jpeg,.png: https://example.com/images/
    //      prefix,suffix: https://example.com/docs/?token=xxx
    const lines = assetsUrls.split("\n");
    // 附件才进行处理
    const fileExt = this.getFileExtension(filePath);
    const fileName = filePath.replace(fileExt, "").split("/").pop();
    if (!fileExt || !fileName) return null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const parts = trimmedLine.split(":");
      if (parts.length < 2) continue;

      const extensions = parts[0]
        .split(",")
        .map((ext) => ext.trim().toLowerCase());
      const baseUrl = parts.slice(1).join(":").trim();

      // 检查文件扩展名是否匹配
      if (extensions.includes(fileExt)) {
        // 构建完整URL
        return this.buildUrl(baseUrl, filePath);
      }
      // 检查文件名前缀和后缀匹配
      else if (
        extensions.some(
          (ext) => fileName.startsWith(ext) || fileName.endsWith(ext),
        )
      ) {
        return this.buildUrl(baseUrl, filePath);
      }
    }

    return null;
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
   * 构建完整的云端URL，保留原路径中的查询参数
   * 使用 URL 对象修改 pathname，确保保留查询参数
   */
  private buildUrl(baseUrl: string, filePath: string): string {
    try {
      const url = new URL(baseUrl);
      const fileName = filePath.split("/").pop() || filePath;

      // 直接修改 pathname，添加文件名
      // 这样可以保留原有的查询参数（如 token）
      url.pathname = url.pathname + encodeURIComponent(fileName);

      return url.toString();
    } catch (error) {
      // URL 解析失败，返回简单拼接
      let result = baseUrl.replace(/\/+$/, "");
      const fileName = filePath.split("/").pop() || filePath;
      return `${result}/${encodeURIComponent(fileName)}`;
    }
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
