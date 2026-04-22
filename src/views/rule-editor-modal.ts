import { App, Modal, Platform } from "obsidian";
import { SyncRule } from "../lib/helps";
import { RuleEditor } from "./rule-editor";

export class RuleEditorModal extends Modal {
  private editor: RuleEditor;

  constructor(
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
    super(app);
    this.titleEl.setText(title);
    this.editor = new RuleEditor(
      this.contentEl,
      app,
      title,
      description,
      rules,
      onSave,
      showCaseSensitive,
      addButtonText,
      inputPlaceholder,
      usePathSuggest
    );
  }

  onOpen() {
    this.modalEl.addClass("fns-rule-editor-modal-container");
    this.editor.load();
    this.editor.render();

    // 延迟处理以抵消 Obsidian Modal 默认的自动聚焦行为
    setTimeout(() => {
      if (document.activeElement instanceof HTMLInputElement && this.contentEl.contains(document.activeElement)) {
        document.activeElement.blur();
      }
    }, 50);
  }

  onClose() {
    this.contentEl.empty();
    this.editor.unload();
  }
}
