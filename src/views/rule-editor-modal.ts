import { App, Modal, Setting, setIcon, MarkdownRenderer, Component, Platform } from "obsidian";
import { SyncRule } from "../lib/helps";
import { $ } from "../i18n/lang";

export class RuleEditorModal extends Modal {
  private showCaseSensitive: boolean;
  private addButtonText: string;
  private inputPlaceholder: string;
  private description: string;
  private rules: SyncRule[];
  private onSave: (rules: SyncRule[]) => void;
  private component: Component;

  constructor(
    app: App,
    title: string,
    description: string,
    rules: SyncRule[],
    onSave: (rules: SyncRule[]) => void,
    showCaseSensitive: boolean = true,
    addButtonText?: string,
    inputPlaceholder?: string
  ) {
    super(app);
    this.titleEl.setText(title);
    this.description = description;
    this.rules = [...rules];
    this.onSave = onSave;
    this.showCaseSensitive = showCaseSensitive;
    this.addButtonText = addButtonText || $("ui.button.add_rule") || "Add Rule";
    this.inputPlaceholder = inputPlaceholder || $("setting.sync.exclude_placeholder");
    this.component = new Component();
  }

  onOpen() {
    this.modalEl.addClass("fns-rule-editor-modal-container");
    this.component.load();
    this.render();
  }

  private render() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass("fns-rule-editor-modal");

    if (this.description) {
      const descEl = contentEl.createDiv("fns-rule-editor-desc");
      MarkdownRenderer.render(this.app, this.description, descEl, "", this.component);
    }

    const listEl = contentEl.createDiv("fns-rule-list");

    this.rules.forEach((rule: SyncRule, index: number) => {
      const rowEl = listEl.createDiv("fns-rule-row");

      // 输入框
      const inputEl = rowEl.createEl("input", {
        type: "text",
        value: rule.pattern,
        cls: "fns-rule-input",
        placeholder: this.inputPlaceholder
      });
      inputEl.onchange = (e) => {
        this.rules[index].pattern = (e.target as HTMLInputElement).value;
        this.save();
      };
      inputEl.onfocus = () => {
        if (Platform.isMobile) {
          // 延迟等待键盘弹出
          setTimeout(() => {
            inputEl.scrollIntoView({ behavior: "smooth", block: "center" });
          }, 400);
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

    // 添加规则按钮
    const addContainer = contentEl.createDiv("fns-rule-add-container");
    const addBtn = addContainer.createEl("button", {
      text: this.addButtonText,
      cls: "fns-rule-add"
    });
    addBtn.onclick = () => {
      this.rules.push({ pattern: "", caseSensitive: false });
      this.render();
    };
  }

  private save() {
    this.onSave(this.rules.filter((r: SyncRule) => r.pattern.trim() !== ""));
  }

  onClose() {
    this.contentEl.empty();
  }
}
