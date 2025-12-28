import { TAbstractFile, Platform, TFile, Menu, MenuItem } from "obsidian";

import { NoteHistoryModal } from "../views/note-history/history-modal";
import { noteModify, noteDelete, noteRename } from "./note_operator";
import { fileModify, fileDelete, fileRename } from "./file_operator";
import type FastSync from "../main";
import { $ } from "../lang/lang";
import { dump } from "./helps";


export class EventManager {
    private plugin: FastSync;

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        console.log("EventManager: constructor", this.plugin);
    }

    public registerEvents() {
        const { app } = this.plugin;

        // --- Vault Events ---
        this.plugin.registerEvent(app.vault.on("create", this.watchModify));
        this.plugin.registerEvent(app.vault.on("modify", this.watchModify));
        this.plugin.registerEvent(app.vault.on("delete", this.watchDelete));
        this.plugin.registerEvent(app.vault.on("rename", this.watchRename));
        //@ts-ignore Internal RAW API
        this.plugin.registerEvent(app.vault.on("raw", this.watchRaw));

        // --- Workspace Events ---
        this.plugin.registerEvent(app.workspace.on("file-menu", this.watchFileMenu));

        // --- Window Events ---
        window.addEventListener('focus', this.onWindowFocus);
        window.addEventListener('blur', this.onWindowBlur);
        window.addEventListener('visibilitychange', this.onVisibilityChange);

        // 注册插件卸载时的清理逻辑
        this.plugin.register(() => {
            console.log("EventManager: removing window event listeners");
            window.removeEventListener('focus', this.onWindowFocus);
            window.removeEventListener('blur', this.onWindowBlur);
            window.removeEventListener('visibilitychange', this.onVisibilityChange);
        });
    }

    private onWindowFocus = () => {
        if (Platform.isMobile) {
            dump("Obsidian Mobile Focus");
            this.plugin.enableWatch();
        }
    };

    private onWindowBlur = () => {
        if (Platform.isMobile) {
            dump("Obsidian Mobile Blur");
            this.plugin.disableWatch();
        }
    };

    private onVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
            dump("Obsidian 已最小化");
            this.plugin.disableWatch();
        } else {
            dump("Obsidian 已从最小化恢复");
            this.plugin.enableWatch();
        }
    };


    private watchModify = (file: TAbstractFile, ctx?: any) => {
        if (file.path.endsWith(".md")) {
            noteModify(file, this.plugin, true);
        } else {
            fileModify(file, this.plugin, true);
        }
    }

    private watchDelete = (file: TAbstractFile, ctx?: any) => {
        if (file.path.endsWith(".md")) {
            noteDelete(file, this.plugin, true);
        } else {
            fileDelete(file, this.plugin, true);
        }
    }

    private watchRename = (file: TAbstractFile, oldFile: string, ctx?: any) => {
        if (file.path.endsWith(".md")) {
            noteRename(file, oldFile, this.plugin, true);
        } else {
            fileRename(file, oldFile, this.plugin, true);
        }
    }

    // Watch raw events (Internal API)
    private watchRaw = (path: string, ctx?: any) => {
        if (!path) return

        // 仅处理配置目录下的原始事件
        if (path.startsWith(this.plugin.app.vault.configDir + "/")) {
            this.plugin.configManager.handleRawEvent(path, true);
        }
    }

    private watchFileMenu = (menu: Menu, file: TAbstractFile) => {
        if (!(file instanceof TFile) || !file.path.endsWith(".md")) return;

        menu.addItem((item: MenuItem) => {
            item
                .setTitle($("笔记历史"))
                .setIcon("history")
                .onClick(() => {
                    new NoteHistoryModal(this.plugin.app, this.plugin, file.path).open();
                });
        });
    }

}
