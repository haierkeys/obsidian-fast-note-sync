import { App, MarkdownRenderer, Component, Platform } from "obsidian";
import { PathSuggest } from "./path-suggest";
import { SyncRule } from "../lib/helps";
import { $ } from "../i18n/lang";

export class RuleEditor {
  private containerEl: HTMLElement;
  private app: App;
  private title: string;
  private description: string;
  private rules: SyncRule[];
  private onSave: (rules: SyncRule[]) => void;
  private showCaseSensitive: boolean;
  private addButtonText: string;
  private inputPlaceholder: string;
  private component: Component;
  private usePathSuggest: boolean;
  private pathSuggestOptions: any;

  constructor(
    containerEl: HTMLElement,
    app: App,
    title: string,
    description: string,
    rules: SyncRule[],
    onSave: (rules: SyncRule[]) => void,
    showCaseSensitive: boolean = true,
    addButtonText?: string,
    inputPlaceholder?: string,
    usePathSuggest: boolean = false,
    pathSuggestOptions: any = {}
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
  }

  render() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("fns-rule-editor");

    if (this.description) {
      const descEl = containerEl.createDiv("fns-rule-editor-desc");
      MarkdownRenderer.render(this.app, this.description, descEl, "", this.component);
    }

    if (this.rules.length > 0) {
      const listEl = containerEl.createDiv("fns-rule-list");

      this.rules.forEach((rule: SyncRule, index: number) => {
        const rowEl = listEl.createDiv("fns-rule-row");

        // 输入框
        const inputEl = rowEl.createEl("textarea", {
          cls: "fns-rule-input fns-rule-textarea",
          placeholder: this.inputPlaceholder,
          attr: { rows: "1", wrap: "off" }
        });
        inputEl.value = rule.pattern;

        const updateHeight = (el: HTMLTextAreaElement, forceExpand: boolean) => {
          if (forceExpand && (el.scrollWidth > el.clientWidth || el.scrollHeight > 32)) {
            el.setAttr("wrap", "soft");
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
          } else {
            el.setAttr("wrap", "off");
            el.style.height = '32px';
          }
        };

        inputEl.addEventListener("input", (e) => {
          this.rules[index].pattern = (e.target as HTMLTextAreaElement).value;
          updateHeight(inputEl, true);
          this.save();
        });

        inputEl.addEventListener("focus", () => {
          updateHeight(inputEl, true);
          if (Platform.isMobile) {
            setTimeout(() => {
              inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }
        });

        inputEl.addEventListener("blur", () => {
          updateHeight(inputEl, false);
        });

        inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            // 如果建议菜单没打开，才执行失去焦点逻辑
            const suggestContainer = document.querySelector(".suggestion-container");
            const isSuggestVisible = suggestContainer && (suggestContainer as HTMLElement).style.display !== "none";
            
            if (!isSuggestVisible) {
              e.preventDefault();
              inputEl.blur();
            }
          }
        });

        // 初始高度调整
        setTimeout(() => updateHeight(inputEl, false), 50);

        if (this.usePathSuggest) {
          new PathSuggest(this.app, inputEl, (val) => {
            this.rules[index].pattern = val;
            updateHeight(inputEl, true);
            this.save();
          }, this.pathSuggestOptions);
        }

        // 大小写敏感开关 (Aa)
        if (this.showCaseSensitive) {
          const caseBtn = rowEl.createEl("button", {
            text: "Aa",
            cls: "fns-case-toggle" + (rule.caseSensitive ? " is-active" : ""),
            title: "Case Sensitive"
          });
          caseBtn.onclick = () => {
            this.rules[index].caseSensitive = !this.rules[index].caseSensitive;
            caseBtn.toggleClass("is-active", this.rules[index].caseSensitive);
            this.save();
          };
        }

        // 删除按钮
        const deleteBtn = rowEl.createEl("button", {
          text: $("ui.button.delete") || "Delete",
          cls: "fns-rule-delete",
          title: $("ui.button.delete")
        });
        deleteBtn.onclick = () => {
          this.rules.splice(index, 1);
          this.save();
          this.render();
        };
      });
    }

    // 添加规则按钮
    const addContainer = containerEl.createDiv("fns-rule-add-container");
    const addBtn = addContainer.createEl("button", {
      text: this.addButtonText,
      cls: "fns-rule-add"
    });
    addBtn.onclick = () => {
      this.rules.push({ pattern: "", caseSensitive: false });
      this.render();
    };

    // 确保打开时不自动聚焦输入框，防止移动端键盘弹出
    const preventAutoFocus = () => {
      const activeEl = document.activeElement;
      if ((activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) && containerEl.contains(activeEl)) {
        activeEl.blur();
      }
    };
    
    preventAutoFocus();
    // 延迟执行一次，捕获某些组件初始化后的自动聚焦行为
    setTimeout(preventAutoFocus, 50);
    setTimeout(preventAutoFocus, 150);
  }

  private save() {
    this.onSave(this.rules.filter((r: SyncRule) => r.pattern.trim() !== ""));
  }
  
  load() {
    this.component.load();
  }
  
  unload() {
    this.component.unload();
  }
}
