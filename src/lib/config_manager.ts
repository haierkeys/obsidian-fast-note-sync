import { normalizePath } from "obsidian";

import { CONFIG_PLUGIN_FILES_TO_WATCH, CONFIG_ROOT_FILES_TO_WATCH, CONFIG_THEME_FILES_TO_WATCH, configModify, configDelete, configAddPathExcluded, configIsPathExcluded } from "./config_operator";
import type FastSync from "../main";
import { dump } from "./helps";


export class ConfigManager {
    private plugin: FastSync;
    private fileStates: Map<string, number> = new Map();
    private rootFilesToWatch: string[] = [];
    private pluginFilesToWatch: string[] = [];
    private themeFilesToWatch: string[] = [];
    public enabledPlugins: Set<string> = new Set();

    constructor(plugin: FastSync) {
        this.plugin = plugin;
        this.rootFilesToWatch = CONFIG_ROOT_FILES_TO_WATCH;
        this.pluginFilesToWatch = CONFIG_PLUGIN_FILES_TO_WATCH;
        this.themeFilesToWatch = CONFIG_THEME_FILES_TO_WATCH;
        const manifest = this.plugin.manifest.dir ?? "";


        const relativePath = manifest.replace(this.plugin.app.vault.configDir + "/", "") + "/data.json";
        configAddPathExcluded(relativePath, this.plugin);
        this.loadEnabledPlugins();
    }

    public handleRawEvent(path: string, eventEnter: boolean = false) {
        if (!this.plugin.settings.configSyncEnabled || !this.plugin.getWatchEnabled()) return;
        const configDir = this.plugin.app.vault.configDir;
        if (!path.startsWith(configDir + "/")) return;

        const relativePath = path.replace(configDir + "/", "");
        const parts = relativePath.split("/");
        const fileName = parts.pop() || "";
        const subDir = parts[0];

        let shouldCheck = false;
        if (parts.length === 0) {
            if (this.rootFilesToWatch.includes(fileName)) shouldCheck = true;
        } else if (subDir === "plugins" && parts.length === 2) {
            if (this.pluginFilesToWatch.includes(fileName)) shouldCheck = true;
        } else if (subDir === "themes" && parts.length === 2) {
            if (this.themeFilesToWatch.includes(fileName)) shouldCheck = true;
        } else if (subDir === "snippets" && fileName.endsWith(".css")) {
            shouldCheck = true;
        }

        if (configIsPathExcluded(relativePath, this.plugin)) return;
        if (shouldCheck) this.checkFileChange(normalizePath(path), eventEnter);
    }

    async loadEnabledPlugins() {
        try {
            const filePath = normalizePath(`${this.plugin.app.vault.configDir}/community-plugins.json`);
            if (await this.plugin.app.vault.adapter.exists(filePath)) {
                const plugins = JSON.parse(await this.plugin.app.vault.adapter.read(filePath));
                if (Array.isArray(plugins)) this.enabledPlugins = new Set(plugins);
            }
        } catch (e) { }
    }

    private async checkFileChange(filePath: string, eventEnter: boolean = false) {
        const relativePath = filePath.replace(this.plugin.app.vault.configDir + "/", "");
        if (this.plugin.ignoredConfigFiles.has(relativePath)) return;

        try {
            const stat = await this.plugin.app.vault.adapter.stat(filePath);
            if (!stat) {
                if (this.fileStates.has(filePath)) {
                    this.fileStates.delete(filePath);
                    configDelete(relativePath, this.plugin, eventEnter);
                }
                return;
            }
            const lastMtime = this.fileStates.get(filePath);
            if (lastMtime === undefined) {
                this.fileStates.set(filePath, stat.mtime);
                return;
            }
            if (stat.mtime !== lastMtime) {
                this.fileStates.set(filePath, stat.mtime);
                if (configIsPathExcluded(relativePath, this.plugin)) return;
                configModify(relativePath, this.plugin, eventEnter);
            }
        } catch (e) { }
    }
}