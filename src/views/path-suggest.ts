import { App, AbstractInputSuggest, TAbstractFile, TFile, TFolder, setIcon } from "obsidian";

export class PathSuggest extends AbstractInputSuggest<string> {
  private onSelectCb: (value: string) => void;

  constructor(app: App, inputEl: HTMLInputElement, onSelectCb: (value: string) => void) {
    super(app, inputEl);
    this.onSelectCb = onSelectCb;
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

    const lowerQuery = query.toLowerCase();
    const suggestions: Set<string> = new Set();

    // 1. 获取常规已加载文件
    const loadedFiles = this.app.vault.getAllLoadedFiles();
    for (const file of loadedFiles) {
      if (file.path === "/" || file.path === "") continue;
      
      let displayPath = file.path;
      if (file instanceof TFolder && !displayPath.endsWith("/")) {
        displayPath += "/";
      }

      if (displayPath.toLowerCase().contains(lowerQuery)) {
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
    
    // 处理文件
    for (const filePath of result.files) {
      if (filePath.toLowerCase().contains(query)) {
        suggestions.add(filePath);
      }
      if (suggestions.size >= 100) return;
    }

    // 处理并递归目录
    for (const dirPath of result.folders) {
      let displayPath = dirPath;
      if (!displayPath.endsWith("/")) {
        displayPath += "/";
      }

      if (displayPath.toLowerCase().contains(query)) {
        suggestions.add(displayPath);
      }
      if (suggestions.size >= 100) return;
      
      const folderName = dirPath.split("/").pop() || "";
      if (folderName.startsWith(".") || dirPath.toLowerCase().contains(query)) {
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

  public async onKeyDown(event: KeyboardEvent) {
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
