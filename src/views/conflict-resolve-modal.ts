import { App, Modal, setIcon, TFile, Platform, Notice } from "obsidian";
import type FastSync from "../main";
import { $ } from "../i18n/lang";
import { hashContent, hashContentAsync, getPluginDir } from "../lib/utils/helpers";

/**
 * ConflictResolveModal provides a 3-column diff view for manual note conflict resolution.
 * ConflictResolveModal 提供三栏差异对比视图，供用户手动解决笔记同步冲突。
 *
 * Layout:
 *   [Left]  Local Diff  (Base -> Local,  read-only, line-numbered, color-highlighted)
 *   [Mid]   Remote Diff (Base -> Remote, read-only, line-numbered, color-highlighted)
 *   [Right] Merged Editor (editable textarea with Use-Local / Use-Remote shortcuts)
 *
 * 布局：
 *   [左栏] 本地差异（Base -> Local，只读，带行号与颜色高亮，类似笔记历史详情）
 *   [中栏] 云端差异（Base -> Remote，只读，带行号与颜色高亮）
 *   [右栏] 最终合并内容编辑器（可编辑 textarea，支持一键填入本地/云端内容）
 */
export class ConflictResolveModal extends Modal {
  private plugin: FastSync;
  private file: TFile;
  private localContent: string;
  private serverContent: string;
  private baseContent: string;
  private serverHash: string;

  private editorEl: HTMLTextAreaElement;
  private editorContainerEl: HTMLElement;
  private resolved: boolean = false;

  public static activePaths: Set<string> = new Set();

  constructor(
    app: App,
    plugin: FastSync,
    file: TFile,
    localContent: string,
    serverContent: string,
    baseContent: string,
    serverHash: string
  ) {
    super(app);
    this.plugin = plugin;
    this.file = file;
    this.localContent = localContent;
    this.serverContent = serverContent;
    this.baseContent = baseContent;
    this.serverHash = serverHash;
  }

  onOpen() {
    ConflictResolveModal.activePaths.add(this.file.path);
    this.containerEl.addClass("note-history-modal");
    this.modalEl.addClass("conflict-resolve-modal");
    if (Platform.isMobile) {
      this.modalEl.addClass("is-mobile");
    }

    const { contentEl, titleEl } = this;

    titleEl.createSpan({ text: $("ui.conflict.modal_title") || "冲突解决" });
    titleEl.createDiv({ cls: "title-path", text: ` - ${this.file.path}` });

    const container = contentEl.createDiv({ cls: "conflict-resolve-container" });

    // Render description bar // 渲染描述文案栏
    container.createDiv({
      cls: "conflict-resolve-desc",
      text: $("ui.conflict.modal_desc") || "本地版本和远端版本为只读对照，请在最右侧的「冲突解决版本」中编辑出最终内容，然后点击下方「解决冲突」进行保存和提交。"
    });

    const diffWrap = container.createDiv({ cls: "conflict-resolve-diff-wrap" });

    const localDiffLines = computeDiffLines(this.baseContent || "", this.localContent);
    const remoteDiffLines = computeDiffLines(this.baseContent || "", this.serverContent);

    const localScrollEl = this.createDiffColumn(
      diffWrap,
      ($("ui.conflict.local_title") || "本地版本"),
      localDiffLines,
      ($("ui.conflict.use_local") || "使用本地->"),
      () => {
        if (this.editorEl) {
          this.editorEl.value = this.localContent;
          this.editorEl.dispatchEvent(new Event("input"));
          this.triggerFlashEffect();
        }
      }
    );

    const remoteScrollEl = this.createDiffColumn(
      diffWrap,
      ($("ui.conflict.server_title") || "远端版本"),
      remoteDiffLines,
      ($("ui.conflict.use_remote") || "使用远端->"),
      () => {
        if (this.editorEl) {
          this.editorEl.value = this.serverContent;
          this.editorEl.dispatchEvent(new Event("input"));
          this.triggerFlashEffect();
        }
      }
    );

    const { textarea, lineNumbers } = this.createEditorColumn(diffWrap);
    this.editorEl = textarea;

    // Mobile tab switcher: insert a tab bar before the diff columns
    // 移动端 Tab 切换器：在差异列之前插入标签栏，窄屏每次只显示一列
    const tabBar = container.createDiv({ cls: "conflict-resolve-tab-bar" });
    container.insertBefore(tabBar, diffWrap);

    const colEls = Array.from(diffWrap.children) as HTMLElement[];
    const tabLabels = [
      $("ui.conflict.local_title") || "本地版本",
      $("ui.conflict.server_title") || "远端版本",
      $("ui.conflict.final_title") || "解决冲突内容",
    ];
    const tabBtns: HTMLElement[] = [];

    const setActiveTab = (idx: number) => {
      tabBtns.forEach((btn, i) => btn.toggleClass("is-active", i === idx));
      colEls.forEach((col, i) => col.toggleClass("tab-active", i === idx));
    };

    tabLabels.forEach((label, idx) => {
      const btn = tabBar.createEl("button", { text: label, cls: "conflict-tab-btn" });
      tabBtns.push(btn);
      btn.onClickEvent(() => setActiveTab(idx));
    });

    // Default: show the editor column (right, index 2) so user can immediately edit
    // 默认激活右侧编辑列，用户可直接开始编辑
    setActiveTab(2);

    const scrollContainers = [localScrollEl, remoteScrollEl, textarea];
    let activeSource: HTMLElement | null = null;

    // Helper to force sync all scroll containers to top or bottom edges
    // 边缘同步的快速处理辅助函数，用来解决首尾有大段差异行时，单纯依靠行映射查找无法滚到顶部/底部死角的问题
    const syncAllToEdge = (source: HTMLElement, position: "top" | "bottom") => {
      scrollContainers.forEach(targetEl => {
        if (targetEl !== source) {
          targetEl.scrollTop = position === "top" ? 0 : (targetEl.scrollHeight - targetEl.clientHeight);
        }
      });
    };

    // Use mouseenter and touchstart to lock activeScrollSource instantly on user interaction
    // 使用 mouseenter 和 touchstart 在用户交互时瞬间锁定当前栏为主滚动源，彻底避免高频滚动下的异步回弹与卡顿死锁
    scrollContainers.forEach(container => {
      const lockSource = () => {
        activeSource = container;
      };
      container.addEventListener("mouseenter", lockSource);
      container.addEventListener("touchstart", lockSource, { passive: true });
    });

    // Helper to find index of the first line inside the viewport of a scroll container
    // 获取当前处于滚动容器可视区顶部的行索引的辅助函数
    const getVisibleLineIndex = (container: HTMLDivElement): number => {
      const children = container.children;
      const scrollTop = container.scrollTop;
      for (let idx = 0; idx < children.length; idx++) {
        const child = children[idx] as HTMLElement;
        if (child.offsetTop + child.offsetHeight > scrollTop) {
          return idx;
        }
      }
      return 0;
    };

    // Helper to find the index of the first line inside the viewport of the editable textarea based on measured lineNumbers
    // 基于已测量行高列表计算当前编辑器可视区顶部的行索引的辅助函数，确保折行长文本能精确定位
    const getEditorVisibleLineIndex = (): number => {
      const children = lineNumbers.children;
      const scrollTop = textarea.scrollTop;
      for (let idx = 0; idx < children.length; idx++) {
        const child = children[idx] as HTMLElement;
        if (child.offsetTop + child.offsetHeight > scrollTop) {
          return idx;
        }
      }
      return 0;
    };

    // 1. Scroll Left Column // 滚动左栏
    localScrollEl.addEventListener("scroll", () => {
      if (activeSource && activeSource !== localScrollEl) return;
      if (!activeSource) activeSource = localScrollEl;

      // Top/Bottom Edge Alignment // 首尾边缘拦截对齐
      if (localScrollEl.scrollTop <= 5) {
        syncAllToEdge(localScrollEl, "top");
        return;
      }
      if (localScrollEl.scrollTop >= localScrollEl.scrollHeight - localScrollEl.clientHeight - 5) {
        syncAllToEdge(localScrollEl, "bottom");
        return;
      }

      const idx = getVisibleLineIndex(localScrollEl);
      const localLine = localDiffLines[idx];
      if (localLine) {
        // Sync Middle Column via Base Line Number // 通过 Base 行号同步中栏
        if (localLine.baseLineNumber !== undefined) {
          const remoteIdx = remoteDiffLines.findIndex(l => l.baseLineNumber === localLine.baseLineNumber);
          if (remoteIdx !== -1) {
            const targetChild = remoteScrollEl.children[remoteIdx] as HTMLElement;
            if (targetChild) remoteScrollEl.scrollTop = targetChild.offsetTop;
          }
        }

        // Sync Right Column via New Line Number (LineNumber) // 通过新行号同步右栏
        let targetLineNum = localLine.lineNumber;
        if (targetLineNum === undefined) {
          // If deleted line, find nearest preceding line with a line number // 若是删除行，往前找最近的有行号的行
          for (let k = idx - 1; k >= 0; k--) {
            if (localDiffLines[k].lineNumber !== undefined) {
              targetLineNum = localDiffLines[k].lineNumber;
              break;
            }
          }
        }
        if (targetLineNum !== undefined) {
          const targetChild = lineNumbers.children[targetLineNum - 1] as HTMLElement;
          if (targetChild) {
            textarea.scrollTop = targetChild.offsetTop;
          }
        }
      }
    });

    // 2. Scroll Middle Column // 滚动中栏
    remoteScrollEl.addEventListener("scroll", () => {
      if (activeSource && activeSource !== remoteScrollEl) return;
      if (!activeSource) activeSource = remoteScrollEl;

      // Top/Bottom Edge Alignment // 首尾边缘拦截对齐
      if (remoteScrollEl.scrollTop <= 5) {
        syncAllToEdge(remoteScrollEl, "top");
        return;
      }
      if (remoteScrollEl.scrollTop >= remoteScrollEl.scrollHeight - remoteScrollEl.clientHeight - 5) {
        syncAllToEdge(remoteScrollEl, "bottom");
        return;
      }

      const idx = getVisibleLineIndex(remoteScrollEl);
      const remoteLine = remoteDiffLines[idx];
      if (remoteLine) {
        // Sync Left Column via Base Line Number // 通过 Base 行号同步左栏
        let localIdx = -1;
        if (remoteLine.baseLineNumber !== undefined) {
          localIdx = localDiffLines.findIndex(l => l.baseLineNumber === remoteLine.baseLineNumber);
          if (localIdx !== -1) {
            const targetChild = localScrollEl.children[localIdx] as HTMLElement;
            if (targetChild) localScrollEl.scrollTop = targetChild.offsetTop;
          }
        }

        // Sync Right Column via Left Column's Line Number // 通过左栏桥接行号同步右栏
        if (localIdx !== -1) {
          let targetLineNum = localDiffLines[localIdx].lineNumber;
          if (targetLineNum === undefined) {
            for (let k = localIdx - 1; k >= 0; k--) {
              if (localDiffLines[k].lineNumber !== undefined) {
                targetLineNum = localDiffLines[k].lineNumber;
                break;
              }
            }
          }
          if (targetLineNum !== undefined) {
            const targetChild = lineNumbers.children[targetLineNum - 1] as HTMLElement;
            if (targetChild) {
              textarea.scrollTop = targetChild.offsetTop;
            }
          }
        }
      }
    });

    // 3. Scroll Right Column (Textarea) // 滚动右栏 (编辑器)
    textarea.addEventListener("scroll", () => {
      // Sync its own line numbers column // 同步滚动右栏自己左侧的行号条
      lineNumbers.scrollTop = textarea.scrollTop;

      if (activeSource && activeSource !== textarea) return;
      if (!activeSource) activeSource = textarea;

      // Top/Bottom Edge Alignment // 首尾边缘拦截对齐
      if (textarea.scrollTop <= 5) {
        syncAllToEdge(textarea, "top");
        return;
      }
      if (textarea.scrollTop >= textarea.scrollHeight - textarea.clientHeight - 5) {
        syncAllToEdge(textarea, "bottom");
        return;
      }

      const rightLineNum = getEditorVisibleLineIndex() + 1;

      // Sync Left Column via Line Number // 通过行号寻找左栏对应行并同步
      const localIdx = localDiffLines.findIndex(l => l.lineNumber === rightLineNum);
      if (localIdx !== -1) {
        const targetChild = localScrollEl.children[localIdx] as HTMLElement;
        if (targetChild) localScrollEl.scrollTop = targetChild.offsetTop;

        // Sync Middle Column via Left Column's Base Line Number // 通过左栏 Base 行号同步中栏
        const baseLineNum = localDiffLines[localIdx].baseLineNumber;
        if (baseLineNum !== undefined) {
          const remoteIdx = remoteDiffLines.findIndex(l => l.baseLineNumber === baseLineNum);
          if (remoteIdx !== -1) {
            const targetChildRemote = remoteScrollEl.children[remoteIdx] as HTMLElement;
            if (targetChildRemote) remoteScrollEl.scrollTop = targetChildRemote.offsetTop;
          }
        }
      }
    });

    // Bottom Actions // 底部功能按钮行
    const actionEl = container.createDiv({ cls: "conflict-resolve-actions" });

    // Confirm Resolve Button // 确认解决
    const resolveBtn = actionEl.createEl("button", {
      text: $("ui.conflict.menu_item") || "解决冲突",
      cls: "mod-cta"
    });
    resolveBtn.onClickEvent(async () => {
      this.resolved = true;
      resolveBtn.disabled = true;
      cancelBtn.disabled = true;

      // 动态在按钮最前面插入旋转的加载图标
      const loaderSpan = resolveBtn.createSpan({ cls: "fns-btn-loader" });
      setIcon(loaderSpan, "loader-2");
      resolveBtn.prepend(loaderSpan);

      try {
        // Use raw textarea content directly — no diff markup to clean // 直接使用编辑器纯文本，无需清洗差异标记
        const finalContent = this.editorEl.value;

        // 1. Overwrite local file // 覆写本地文件
        await this.app.vault.modify(this.file, finalContent);

        // 2. Repush NoteModify marked as resolved // 向服务器发起携带 resolved 标志的推送
        const contentHash = await hashContentAsync(finalContent);
        const data = {
          vault: this.plugin.settings.vault,
          path: this.file.path,
          pathHash: hashContent(this.file.path),
          baseHash: this.serverHash,
          content: finalContent,
          contentHash: contentHash,
          ctime: this.file.stat.ctime,
          mtime: this.file.stat.mtime,
          isConflictResolved: true,
        };

        // Remove path from suppressed collection // 解除路径抑制
        this.plugin.syncState.conflictedPaths.delete(this.file.path);
        this.plugin.localStorageManager.setConflictedPaths(this.plugin.syncState.conflictedPaths);
        this.plugin.statusBarManager.updateConflictBadge();

        // 清理本地 conflict-notes 中的备份文件 (位于插件目录下，文件名附加路径哈希以防碰撞)
        try {
          const adapter = this.app.vault.adapter;
          const safeName = this.file.path.replace(/\.md$/, "").replace(/[/\\]/g, "_");
          const pathHash = hashContent(this.file.path);
          const conflictDir = `${getPluginDir(this.plugin)}/conflict-notes`;
          const baseBackupPath = `${conflictDir}/${safeName}_${pathHash}.base.md`;
          const remoteBackupPath = `${conflictDir}/${safeName}_${pathHash}.remote.md`;

          const deletePromises: Promise<void>[] = [];
          if (await adapter.exists(baseBackupPath)) {
            deletePromises.push(adapter.remove(baseBackupPath));
          }
          if (await adapter.exists(remoteBackupPath)) {
            deletePromises.push(adapter.remove(remoteBackupPath));
          }
          await Promise.all(deletePromises);

          // 如果 conflict-notes 文件夹已空，则尝试一并清理（若被 Windows 锁定 busy 则静默忽略）
          if (await adapter.exists(conflictDir)) {
            const files = await adapter.list(conflictDir);
            if (files && files.files.length === 0 && files.folders.length === 0) {
              try {
                await adapter.rmdir(conflictDir, true);
              } catch {
                // Ignore EBUSY/locked folder error, keeping empty folder is harmless // 忽略文件夹繁忙/锁定错误，保留空文件夹无害
              }
            }
          }
        } catch (e) {
          console.error("Failed to clean up conflict-notes files on resolve:", e);
        }

        await this.plugin.concurrencyLimiter.waitForSlot(this.file.path);
        void this.plugin.websocket.SendMessage("NoteModify", data);

        this.close();
      } catch (err) {
        console.error("Failed to resolve conflict:", err);
        loaderSpan.remove();
        resolveBtn.disabled = false;
        cancelBtn.disabled = false;
      }
    });

    // Cancel Button // 稍后处理
    const cancelBtn = actionEl.createEl("button", {
      text: $("ui.button.cancel") || "稍后处理"
    });
    cancelBtn.onClickEvent(() => {
      this.close();
    });
  }

  /**
   * Creates a read-only diff column (left or middle) with line numbers and color highlighting.
   * 创建只读差异列（左栏或中栏），带行号和颜色高亮，样式类似笔记历史详情。
   */
  private createDiffColumn(
    parent: HTMLElement,
    title: string,
    diffLines: DiffLine[],
    actionText?: string,
    actionCallback?: () => void
  ): HTMLDivElement {
    const col = parent.createDiv({ cls: "conflict-diff-col" });

    // Header // 标题栏
    const header = col.createDiv({ cls: "conflict-col-header" });
    const titleEl = header.createDiv({ cls: "col-title" });
    titleEl.createSpan({ text: title });
    // Legend badges // 图例标签
    titleEl.createSpan({ cls: "tag-add", text: $("ui.history.added") || "+新增" });
    titleEl.createSpan({ cls: "tag-delete", text: $("ui.history.deleted") || "-删除" });

    // Button group // 按钮组
    const btnGroup = header.createDiv({ cls: "col-btn-group" });

    const fullContent = diffLines
      .filter(l => l.type !== "delete")
      .map(l => l.text)
      .join("\n");
    const copyBtn = btnGroup.createEl("button", { text: $("ui.history.copy") || "复制" });
    copyBtn.onClickEvent(() => {
      void navigator.clipboard.writeText(fullContent).then(() => {
        copyBtn.setText($("ui.history.copied") || "已复制");
        window.setTimeout(() => copyBtn.setText($("ui.history.copy") || "复制"), 2000);
      });
    });

    // Action button if provided // 如果提供了自定义动作按钮（如“使用本地”/“使用云端”）则渲染它
    if (actionText && actionCallback) {
      const actionBtn = btnGroup.createEl("button", { text: actionText });
      actionBtn.onClickEvent(() => {
        actionCallback();
      });
    }

    // Diff content area // 差异内容展示区
    const content = col.createDiv({ cls: "conflict-diff-content" });

    // Render each diff line // 渲染每一行差异
    diffLines.forEach(line => {
      const lineEl = content.createDiv({
        cls: `history-detail-line type-${line.type}`
      });

      // Line number cell // 行号单元格
      lineEl.createDiv({
        cls: "line-number",
        text: line.lineNumber !== undefined ? String(line.lineNumber) : ""
      });

      // Line content cell // 行内容单元格
      lineEl.createDiv({
        cls: "line-content",
        text: line.text
      });

      // Single line apply button for added lines only (hover on desktop, persistent tap icon on mobile)
      // 仅对新增（add）行渲染单行应用按钮（桌面端 hover 浮现，移动端常驻触控图标）
      if (line.type === "add") {
        const applyBtn = lineEl.createDiv({
          cls: "line-apply-btn",
          attr: {
            title: $("ui.conflict.apply_line_title") || "追加此行到冲突解决",
            "aria-label": $("ui.conflict.apply_line_title") || "追加此行到冲突解决"
          }
        });
        setIcon(applyBtn, "arrow-right");
        applyBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.applyLineToEditor(line);
        });
      }
    });

    return content;
  }

  /**
   * Appends a single line from diff columns to the end of the corresponding line in the merged content editor.
   * 将对比栏中的新增行内容追加到最终冲突解决编辑器对应行文字的末尾。
   */
  private applyLineToEditor(line: DiffLine): void {
    if (!this.editorEl) return;

    const lines = this.editorEl.value.split(/\r?\n/);
    const targetIdx = line.lineNumber !== undefined ? line.lineNumber - 1 : lines.length;

    if (targetIdx >= 0 && targetIdx < lines.length) {
      lines[targetIdx] = lines[targetIdx] + line.text;
    } else {
      lines.push(line.text);
    }

    this.editorEl.value = lines.join("\n");
    this.editorEl.dispatchEvent(new Event("input"));
    this.triggerFlashEffect();

    if (Platform.isMobile) {
      new Notice($("ui.conflict.applied_line_notice") || "已追加此行到冲突解决版本");
    }
  }

  /**
   * Creates the editable merged-content column (right column) with Use-Local/Use-Remote shortcuts.
   * 创建最终合并内容编辑列（右栏），支持一键填入本地/云端内容。
   */
  private createEditorColumn(parent: HTMLElement): { textarea: HTMLTextAreaElement, lineNumbers: HTMLDivElement } {
    const col = parent.createDiv({ cls: "conflict-diff-col" });

    // Header // 标题栏
    const header = col.createDiv({ cls: "conflict-col-header" });
    header.createDiv({
      cls: "col-title",
      text: $("ui.conflict.final_title") || "解决冲突内容"
    });

    const btnGroup = header.createDiv({ cls: "col-btn-group" });

    // Copy button // 复制按钮
    const copyBtn = btnGroup.createEl("button", { text: $("ui.history.copy") || "复制" });
    copyBtn.onClickEvent(() => {
      void navigator.clipboard.writeText(textarea.value).then(() => {
        copyBtn.setText($("ui.history.copied") || "已复制");
        window.setTimeout(() => copyBtn.setText($("ui.history.copy") || "复制"), 2000);
      });
    });

    // Editor container wrapping line numbers and textarea // 编辑器容器，包裹行号和 textarea
    const editorContainer = col.createDiv({ cls: "conflict-editor-container" });
    this.editorContainerEl = editorContainer;

    // Line number container column // 行号条容器
    const lineNumbers = editorContainer.createDiv({ cls: "conflict-editor-line-numbers" });

    // Invisible shadow container for line wrap height calculations
    // 隐藏的影子容器，用于折行高度精确计算，确保行号条与换行内容行号绝对同步对齐
    const shadowDiv = editorContainer.createDiv({ cls: "conflict-editor-shadow" });

    // Editable textarea initialized with local content // 可编辑文本框，初始内容为本地最新内容
    const textarea = editorContainer.createEl("textarea", { cls: "conflict-editor-textarea" });
    textarea.value = this.localContent;

    // Helper to dynamically update the line numbers column with shadow element height measurements
    // 基于影子节点高度动态精确更新行号列表的辅助函数，解决 textarea 长文本自动折行导致的行号错位问题
    const updateLineNumbers = () => {
      const lines = textarea.value.split(/\r?\n/);
      
      // 1. Fill shadow div to measure real folded heights
      shadowDiv.empty();
      lines.forEach(lineText => {
        // Empty lines need a space to occupy vertical height
        shadowDiv.createDiv({ text: lineText || " " });
      });

      // 2. Clear lineNumbers and reconstruct matching measured heights
      lineNumbers.empty();
      const shadowChildren = shadowDiv.children;
      for (let i = 0; i < shadowChildren.length; i++) {
        const height = (shadowChildren[i] as HTMLElement).offsetHeight;
        const numDiv = lineNumbers.createDiv({ text: String(i + 1) });
        numDiv.style.height = `${height}px`;
      }
    };

    // Update numbers on input change // 当输入改变时更新行号
    textarea.addEventListener("input", updateLineNumbers);
    updateLineNumbers();

    // Trigger update on resize to recalculate line wraps if window size changes
    // 监听模态框大小改变，重算换行高度，防止放大拉伸后行号高低不对称
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        updateLineNumbers();
        // Keep scroll synced after resize
        lineNumbers.scrollTop = textarea.scrollTop;
      });
      observer.observe(textarea);

      // Clean up observer on close
      const originalOnClose = () => this.onClose();
      this.onClose = () => {
        observer.disconnect();
        originalOnClose();
      };
    }

    return { textarea, lineNumbers };
  }

  /**
   * Triggers a smooth active highlight flash animation on the merged editor.
   * 触发合并框的亮高光闪烁动效，给用户清晰的填充反馈。
   */
  private triggerFlashEffect(): void {
    if (!this.editorContainerEl) return;
    
    this.editorContainerEl.removeClass("fns-editor-flash");
    void this.editorContainerEl.offsetWidth; // Force DOM reflow to make class toggling responsive on rapid clicks
    
    this.editorContainerEl.addClass("fns-editor-flash");
    
    window.setTimeout(() => {
      if (this.editorContainerEl) {
        this.editorContainerEl.removeClass("fns-editor-flash");
      }
    }, 50);
  }

  onClose() {
    ConflictResolveModal.activePaths.delete(this.file.path);
    this.contentEl.empty();
  }
}

/**
 * Represents a single line in a Myers diff output.
 * 表示 Myers 差异算法输出的单行数据。
 */
interface DiffLine {
  type: "normal" | "add" | "delete"; // Type of change // 变更类型
  text: string;                       // Line text content // 行文本内容
  lineNumber?: number;                // Visible line number in the new version // 在新版本中的显示行号
  baseLineNumber?: number;            // Mapped line number in the base/previous version // 对应在基础版本中的行号
}

/**
 * Computes a line-by-line Myers Diff and returns structured DiffLine array.
 * 计算旧文本和新文本之间的行级 Myers 差异，返回结构化的差异行数组。
 *
 * @param oldText - Base/previous version text // 基础（旧）版本文本
 * @param newText - New version text // 新版本文本
 */
function computeDiffLines(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const M = oldLines.length;
  const N = newLines.length;

  // Build LCS dynamic-programming table // 构建 LCS 动态规划表
  const dp: number[][] = Array.from({ length: M + 1 }, () => new Array<number>(N + 1).fill(0));
  for (let i = 1; i <= M; i++) {
    for (let j = 1; j <= N; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Traceback to build diff result // 回溯构建差异结果
  const result: DiffLine[] = [];
  let i = M, j = N;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({ 
        type: "normal", 
        text: oldLines[i - 1],
        baseLineNumber: i 
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ 
        type: "add", 
        text: newLines[j - 1] 
      });
      j--;
    } else {
      result.push({ 
        type: "delete", 
        text: oldLines[i - 1],
        baseLineNumber: i 
      });
      i--;
    }
  }
  result.reverse();

  // Assign visible line numbers and propagate baseLineNumbers for added lines
  // 分配显示行号，并为新增行推导出最近的 Base 行号以便进行同步定位
  let lineNumberCounter = 1;
  let lastBaseLineNumber = 0;
  for (const line of result) {
    if (line.type !== "delete") {
      line.lineNumber = lineNumberCounter++;
    }

    if (line.baseLineNumber !== undefined) {
      lastBaseLineNumber = line.baseLineNumber;
    } else {
      // For added lines, bind to the last known baseLineNumber
      // 新增行绑定至上一有效 Base 行号以对齐滚动
      line.baseLineNumber = lastBaseLineNumber;
    }
  }

  return result;
}
