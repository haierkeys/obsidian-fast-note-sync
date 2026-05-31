import { App, MarkdownRenderer, Component, Platform } from "obsidian";
import { PathSuggest, PathSuggestOptions } from "./path-suggest";
import { SyncRule } from "../lib/helps";
import { $ } from "../i18n/lang";

export class RuleEditor {
  private containerEl: HTMLElement;
  private app: App;
  private title: string;
  private description: string;
  private rules: SyncRule[];
  private onSave: (rules: SyncRule[]) => void | Promise<void>;
  private showCaseSensitive: boolean;
  private addButtonText: string;
  private inputPlaceholder: string;
  private component: Component;
  private usePathSuggest: boolean;
  private pathSuggestOptions: PathSuggestOptions;
  private saveTimer: number | null = null;
  private lastSavedJson: string = "";

  constructor(
    containerEl: HTMLElement,
    app: App,
    title: string,
    description: string,
    rules: SyncRule[],
    onSave: (rules: SyncRule[]) => void | Promise<void>,
    showCaseSensitive: boolean = true,
    addButtonText?: string,
    inputPlaceholder?: string,
    usePathSuggest: boolean = false,
    pathSuggestOptions: PathSuggestOptions = {}
  ) {
    this.containerEl = containerEl;
    this.app = app;
    this.title = title;
    this.description = description;
    this.rules = [...rules];
    this.onSave = onSave;
    this.showCaseSensitive = showCaseSensitive;
    this.addButtonText = addButtonText || $("ui.button.add_rule") || "Add Rule";
    this.inputPlaceholder = inputPlaceholder || $("setting.sync.exclude_placeholder");
    this.component = new Component();
    this.usePathSuggest = usePathSuggest;
    this.pathSuggestOptions = pathSuggestOptions;
    
    // 初始化最后一次保存的状态
    // Initialize the last saved state
    this.lastSavedJson = JSON.stringify(this.getFilteredRules());
  }

  private getFilteredRules(): SyncRule[] {
    return this.rules
      .filter((r: SyncRule) => r.pattern && r.pattern.trim() !== "")
      .map((r: SyncRule) => ({ ...r }));
  }

  render() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("fns-rule-editor");

    if (this.description) {
      const descEl = containerEl.createDiv("fns-rule-editor-desc");
      void MarkdownRenderer.render(this.app, this.description, descEl, "", this.component);
    }

    if (this.rules.length > 0) {
      const listEl = containerEl.createDiv("fns-rule-list");

      this.rules.forEach((rule: SyncRule, index: number) => {
        const rowEl = listEl.createDiv("fns-rule-row");

        // 输入框 / Input field
        const inputEl = rowEl.createEl("textarea", {
          cls: "fns-rule-input fns-rule-textarea",
          placeholder: this.inputPlaceholder,
          attr: { rows: "1", wrap: "off" }
        });
        inputEl.value = rule.pattern;

        const updateHeight = (el: HTMLTextAreaElement, forceExpand: boolean) => {
          if (forceExpand && (el.scrollWidth > el.clientWidth || el.scrollHeight > 32)) {
            el.setAttr("wrap", "soft");
            // Use setCssProps for dynamic height calculation (theme-compatible)
            // 使用 setCssProps 动态设置高度（主题兼容）
            el.setCssProps({ height: "auto" });
            el.setCssProps({ height: `${el.scrollHeight}px` });
          } else {
            el.setAttr("wrap", "off");
            el.setCssProps({ height: "" }); // 清除内联高度，允许类名生效 / Clear inline height to allow CSS class to take effect
            el.addClass("fns-rule-textarea-base");
          }
        };

        const handleInput = () => {
          const val = inputEl.value;
          this.rules[index].pattern = val;
          updateHeight(inputEl, true);
          this.save(false); // 延时保存 / Delayed save
        };

        inputEl.addEventListener("input", handleInput);
        inputEl.addEventListener("change", handleInput);

        inputEl.addEventListener("focus", () => {
          updateHeight(inputEl, true);
          if (Platform.isMobile) {
            window.setTimeout(() => {
              inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }
        });

        inputEl.addEventListener("blur", () => {
          updateHeight(inputEl, false);
          // 失去焦点时，如果有变更且计时器在跑，立即执行保存 / Save immediately on blur if there are changes and timer is running
          this.save(true);
        });

        inputEl.addEventListener("keydown", (e: KeyboardEvent) => {
          if (e.key === "Enter") {
            // 如果建议菜单没打开，才执行失去焦点逻辑 / Only execute blur logic if the suggestion menu is not open
            const suggestContainer = activeDocument.querySelector(".suggestion-container");
            const isSuggestVisible = suggestContainer && (suggestContainer as HTMLElement).style.display !== "none";
            
            if (!isSuggestVisible) {
              e.preventDefault();
              inputEl.blur();
            }
          }
        });

        // 初始高度调整 / Initial height adjustment
        window.setTimeout(() => updateHeight(inputEl, false), 50);

        if (this.usePathSuggest) {
          new PathSuggest(this.app, inputEl, (val) => {
            this.rules[index].pattern = val;
            updateHeight(inputEl, true);
            this.save(true); // 补全选择后立即保存比较好 / Better to save immediately after completion selection
          }, this.pathSuggestOptions);
        }

        // 大小写敏感开关 (Aa) / Case sensitive toggle (Aa)
        if (this.showCaseSensitive) {
          const caseBtn = rowEl.createEl("button", {
            text: "Aa",
            cls: "fns-case-toggle" + (rule.caseSensitive ? " is-active" : ""),
            title: "Case sensitive"
          });
          caseBtn.onclick = () => {
            this.rules[index].caseSensitive = !this.rules[index].caseSensitive;
            caseBtn.toggleClass("is-active", this.rules[index].caseSensitive);
            this.save(true); // 切换开关立即保存 / Save immediately after toggling
          };
        }

        // 删除按钮 / Delete button
        const deleteBtn = rowEl.createEl("button", {
          text: $("ui.button.delete") || "Delete",
          cls: "fns-rule-delete",
          title: $("ui.button.delete")
        });
        deleteBtn.onclick = () => {
          this.rules.splice(index, 1);
          this.save(true); // 删除后立即保存 / Save immediately after deletion
          this.render();
        };
      });
    }

    // 添加规则按钮 / Add rule button
    const addContainer = containerEl.createDiv("fns-rule-add-container");
    const addBtn = addContainer.createEl("button", {
      text: this.addButtonText,
      cls: "fns-rule-add"
    });
    addBtn.onclick = () => {
      this.rules.push({ pattern: "", caseSensitive: false });
      this.render();
    };

    // 确保打开时不自动聚焦输入框，防止移动端键盘弹出 / Ensure no auto-focus on opening to prevent mobile keyboard from popping up
    const preventAutoFocus = () => {
      const activeEl = activeDocument.activeElement;
      if ((activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) && containerEl.contains(activeEl)) {
        (activeEl as HTMLElement).blur();
      }
    };
    
    preventAutoFocus();
    // 延迟执行一次，捕获某些组件初始化后的自动聚焦行为 / Execute once with delay to catch auto-focus behavior after some components initialize
    window.setTimeout(preventAutoFocus, 50);
    window.setTimeout(preventAutoFocus, 150);
  }

  private save(immediate: boolean = false) {
    const rulesToSave = this.getFilteredRules();
    const currentJson = JSON.stringify(rulesToSave);
    
    // 如果没有实质性修改，不执行保存
    if (currentJson === this.lastSavedJson) {
      return;
    }

    if (this.saveTimer) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    const performSave = () => {
      this.lastSavedJson = currentJson;
      void this.onSave(rulesToSave);
      this.saveTimer = null;
    };

    if (immediate) {
      performSave();
    } else {
      this.saveTimer = window.setTimeout(performSave, 2000); // 延时 2s 保存
    }
  }
  
  load() {
    this.component.load();
  }
  
  unload() {
    this.component.unload();
  }
}
