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
    usePathSuggest: boolean = false
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
        const inputEl = rowEl.createEl("input", {
          type: "text",
          value: rule.pattern,
          cls: "fns-rule-input",
          placeholder: this.inputPlaceholder
        });
        inputEl.oninput = (e) => {
          this.rules[index].pattern = (e.target as HTMLInputElement).value;
          this.save();
        };

        if (this.usePathSuggest) {
          new PathSuggest(this.app, inputEl, (val) => {
            this.rules[index].pattern = val;
            this.save();
          });
        }
        
        // 在行内模式下，可能不需要复杂的 scrollIntoView，但保留它也无妨
        inputEl.onfocus = () => {
          if (Platform.isMobile) {
            setTimeout(() => {
              inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 300);
          }
        };

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

    // 确保打开时不自动聚焦输入框
    if (document.activeElement instanceof HTMLInputElement && containerEl.contains(document.activeElement)) {
      document.activeElement.blur();
    }
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
