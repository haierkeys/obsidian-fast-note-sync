import { App, AbstractInputSuggest, TAbstractFile, TFile, TFolder, setIcon } from "obsidian";

export interface PathSuggestOptions {
  onlyFolders?: boolean;
  onlyHidden?: boolean;
  excludeConfigDir?: boolean;
}

export class PathSuggest extends AbstractInputSuggest<string> {
  private onSelectCb: (value: string) => void;
  private inputEl: HTMLInputElement | HTMLTextAreaElement;
  // @ts-ignore
  public suggestEl: HTMLElement;
  private options: PathSuggestOptions;

  constructor(app: App, inputEl: HTMLInputElement | HTMLTextAreaElement, onSelectCb: (value: string) => void, options: PathSuggestOptions = {}) {
    super(app, inputEl);
    this.inputEl = inputEl;
    this.onSelectCb = onSelectCb;
    this.options = options;
  }

  async getSuggestions(query: string): Promise<string[]> {
    // 注入关闭按钮 (主要针对移动端没有 Esc 键的情况)
    if (this.suggestEl && !this.suggestEl.querySelector(".fns-suggest-close")) {
      const closeBtn = this.suggestEl.createDiv("fns-suggest-close");
      setIcon(closeBtn, "x");
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      };
    }

    // 强制使用完整的输入值作为查询条件，解决 textarea 模式下 query 提取不准的问题
    const actualQuery = this.inputEl.value;
    const lowerQuery = actualQuery.toLowerCase();
    const suggestions: Set<string> = new Set();

    // 1. 获取常规已加载文件
    const loadedFiles = this.app.vault.getAllLoadedFiles();
    const configDir = this.app.vault.configDir;

    for (const file of loadedFiles) {
      if (file.path === "/" || file.path === "") continue;
      
      // 过滤逻辑
      if (this.options.onlyFolders && !(file instanceof TFolder)) continue;
      
      let displayPath = file.path;
      const folderName = file.name;
      const normalizedPath = displayPath.replace(/\/$/, "");
      const normalizedConfigDir = configDir.replace(/\/$/, "");

      if (this.options.onlyHidden && !folderName.startsWith(".")) continue;
      if (this.options.excludeConfigDir && (normalizedPath === normalizedConfigDir || normalizedPath.startsWith(normalizedConfigDir + "/"))) continue;

      if (file instanceof TFolder && !displayPath.endsWith("/")) {
        displayPath += "/";
      }

      if (displayPath.toLowerCase().startsWith(lowerQuery)) {
        suggestions.add(displayPath);
      }
    }

    // 2. 扫描隐藏文件 (以 . 开头的)
    try {
      await this.scanDirectory("", lowerQuery, suggestions);
    } catch (e) {
      console.error("FNS: PathSuggest scan error", e);
    }

    return Array.from(suggestions)
      .sort((a, b) => {
        const aStart = a.toLowerCase().startsWith(lowerQuery);
        const bStart = b.toLowerCase().startsWith(lowerQuery);
        if (aStart && !bStart) return -1;
        if (!aStart && bStart) return 1;
        return a.length - b.length;
      })
      .slice(0, 50);
  }

  private async scanDirectory(path: string, query: string, suggestions: Set<string>, depth: number = 0) {
    if (depth > 5) return;

    const result = await this.app.vault.adapter.list(path);
    const configDir = this.app.vault.configDir;
    
    // 处理文件
    if (!this.options.onlyFolders) {
      for (const filePath of result.files) {
        const fileName = filePath.split("/").pop() || "";
        if (this.options.onlyHidden && !fileName.startsWith(".")) continue;
        if (this.options.excludeConfigDir && filePath === configDir) continue;

        if (filePath.toLowerCase().startsWith(query)) {
          suggestions.add(filePath);
        }
        if (suggestions.size >= 100) return;
      }
    }

    // 处理并递归目录
    for (const dirPath of result.folders) {
      const folderName = dirPath.split("/").pop() || "";
      
      let displayPath = dirPath;
      if (!displayPath.endsWith("/")) {
        displayPath += "/";
      }

      let shouldAdd = true;
      const normalizedDirPath = dirPath.replace(/\/$/, "");
      const normalizedConfigDir = configDir.replace(/\/$/, "");

      if (this.options.onlyHidden && !folderName.startsWith(".")) shouldAdd = false;
      if (this.options.excludeConfigDir && (normalizedDirPath === normalizedConfigDir || normalizedDirPath.startsWith(normalizedConfigDir + "/"))) shouldAdd = false;

      if (shouldAdd && displayPath.toLowerCase().startsWith(query)) {
        suggestions.add(displayPath);
      }
      if (suggestions.size >= 100) return;
      
      if (folderName.startsWith(".") || dirPath.toLowerCase().includes(query) || depth < 2) {
          await this.scanDirectory(dirPath, query, suggestions, depth + 1);
      }
    }
  }

  renderSuggestion(value: string, el: HTMLElement): void {
    el.addClass("fns-suggest-item");
    const isFolder = value.endsWith("/");
    const icon = isFolder ? "folder" : "file-text";
    
    const iconEl = el.createDiv("fns-suggest-icon");
    setIcon(iconEl, icon);
    
    el.createSpan({ text: value, cls: "fns-suggest-text" });
  }

  selectSuggestion(value: string): void {
    this.inputEl.value = value;
    this.onSelectCb(value);
    this.inputEl.dispatchEvent(new Event("input", { bubbles: true }));
    this.inputEl.dispatchEvent(new Event("change", { bubbles: true }));
    this.inputEl.focus();
    setTimeout(() => {
      this.close();
    }, 50);
  }

  public onKeyDown(event: KeyboardEvent) {
    // 允许 Esc 键关闭菜单
    if (event.key === "Escape") {
      this.close();
      return;
    }

    // @ts-ignore
    super.onKeyDown(event);
    
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      setTimeout(() => {
        const activeItem = document.querySelector(".suggestion-item.mod-active");
        if (activeItem) {
          const val = activeItem.textContent;
          if (val) {
            this.inputEl.value = val;
            this.onSelectCb(val);
          }
        }
      }, 50);
    }
  }
}
