import { requestUrl } from "obsidian";
import { unzipSync } from "fflate";

import { dump, getPluginDir, isVersionNew, showSyncNotice } from "./helps";
import { AppWithInternal } from "./types";
import type FastSync from "../main";
import { $ } from "../i18n/lang";


/**
 * 版本提示与自动升级管理器
 */
export class VersionManager {
    constructor(private plugin: FastSync) {
        // 在实例化时立即对版本进行校验与清洗，确保插件升级重载后红点能第一时间消除
        this.validateAndRefreshTags();
    }

    /**
     * 判断插件是否有新版本 (直接与本地当前运行的版本做实时比对)
     */
    public isPluginNew(): boolean {
        const current = this.plugin.manifest.version;
        const latest = this.plugin.localStorageManager.getMetadata("pluginVersionNewName") as string;
        return !!(latest && isVersionNew(current, latest));
    }

    /**
     * 判断服务端是否有新版本 (直接与当前记录的服务端运行版本做实时比对)
     */
    public isServerNew(): boolean {
        const current = this.plugin.localStorageManager.getMetadata("serverVersion") as string;
        const latest = this.plugin.localStorageManager.getMetadata("serverVersionNewName") as string;
        return !!(current && latest && isVersionNew(current, latest));
    }

    /**
     * 判断插件或服务端是否有任意一个新版本 (用于控制全局红点/气泡)
     */
    public hasNewVersion(): boolean {
        return this.isPluginNew() || this.isServerNew();
    }

    /**
     * 校验当前版本与最新版本并自动修正（清除）不必要的新版本标记
     */
    public validateAndRefreshTags(): void {
        const plugin = this.plugin;
        const pluginCurrent = plugin.manifest.version;
        const pluginLatest = plugin.localStorageManager.getMetadata("pluginVersionNewName") as string;
        if (pluginLatest && !isVersionNew(pluginCurrent, pluginLatest)) {
            plugin.localStorageManager.setMetadata("pluginVersionIsNew", false);
        }

        const serverCurrent = plugin.localStorageManager.getMetadata("serverVersion") as string;
        const serverLatest = plugin.localStorageManager.getMetadata("serverVersionNewName") as string;
        if (serverCurrent && serverLatest && !isVersionNew(serverCurrent, serverLatest)) {
            plugin.localStorageManager.setMetadata("serverVersionIsNew", false);
        }

        dump(pluginCurrent, pluginLatest, serverCurrent, serverLatest);
    }

    /**
     * 获取当前及最新版本的所有元数据信息
     */
    public getVersionData() {
        const plugin = this.plugin;
        // 获取中间版本历史记录 (Get intermediate version histories)
        const parseHistory = (key: 'pluginVersionHistory' | 'serverVersionHistory') => {
            const raw = plugin.localStorageManager.getMetadata(key) as string;
            if (!raw) return [];
            try {
                return JSON.parse(raw) as unknown[];
            } catch {
                return [];
            }
        };
        return {
            plugin: {
                current: plugin.manifest.version,
                latest: plugin.localStorageManager.getMetadata("pluginVersionNewName") as string,
                isNew: this.isPluginNew(),
                newChangelog: plugin.localStorageManager.getMetadata("pluginVersionNewChangelogContent") as string,
                currentChangelog: plugin.localStorageManager.getMetadata("pluginVersionChangelogContent") as string,
                link: plugin.localStorageManager.getMetadata("pluginVersionNewLink") as string,
                history: parseHistory("pluginVersionHistory") as { version: string; changelogContent: string }[],
            },
            server: {
                current: plugin.localStorageManager.getMetadata("serverVersion") as string,
                latest: plugin.localStorageManager.getMetadata("serverVersionNewName") as string,
                isNew: this.isServerNew(),
                newChangelog: plugin.localStorageManager.getMetadata("serverVersionNewChangelogContent") as string,
                currentChangelog: plugin.localStorageManager.getMetadata("serverVersionChangelogContent") as string,
                baseChangelog: plugin.localStorageManager.getMetadata("serverChangelog") as string,
                link: plugin.localStorageManager.getMetadata("serverVersionNewLink") as string,
                history: parseHistory("serverVersionHistory") as { version: string; changelogContent: string }[],
            }
        };
    }

    /**
     * 更新并保存从 WebSocket ClientInfo 消息中接收到的版本信息
     * @param data 服务端下发的推送对象
     */
    public updateFromClientInfo(data: Record<string, unknown>) {
        if (!data) return;
        const plugin = this.plugin;

        // 针对服务端版本 (For server version)
        const serverCurrent = (plugin.localStorageManager.getMetadata("serverVersion") as string) || "";
        const serverLatest = (data.versionNewName || data.version) as string;
        const serverIsNew = (data.versionIsNew ?? plugin.localStorageManager.getMetadata("serverVersionIsNew")) && isVersionNew(serverCurrent, serverLatest);
        plugin.localStorageManager.setMetadata("serverVersionIsNew", serverIsNew);
        plugin.localStorageManager.setMetadata("serverVersionNewName", data.versionNewName ?? plugin.localStorageManager.getMetadata("serverVersionNewName"));
        plugin.localStorageManager.setMetadata("serverVersionNewLink", data.versionNewLink ?? plugin.localStorageManager.getMetadata("serverVersionNewLink"));
        plugin.localStorageManager.setMetadata("serverVersionNewChangelogContent", data.versionNewChangelogContent ?? plugin.localStorageManager.getMetadata("serverVersionNewChangelogContent"));
        plugin.localStorageManager.setMetadata("serverVersionChangelogContent", data.versionChangelogContent ?? plugin.localStorageManager.getMetadata("serverVersionChangelogContent"));
        // 保存服务端中间版本历史 (Save server intermediate version history)
        if (data.versionHistory !== undefined) {
            plugin.localStorageManager.setMetadata("serverVersionHistory", JSON.stringify(data.versionHistory || []));
        }

        // 针对插件版本 (For plugin version)
        const pluginCurrent = plugin.manifest.version;
        const pluginLatest = data.pluginVersionNewName as string;
        const pluginIsNew = (data.pluginVersionIsNew ?? plugin.localStorageManager.getMetadata("pluginVersionIsNew")) && isVersionNew(pluginCurrent, pluginLatest);
        plugin.localStorageManager.setMetadata("pluginVersionIsNew", pluginIsNew);
        plugin.localStorageManager.setMetadata("pluginVersionNewName", data.pluginVersionNewName ?? plugin.localStorageManager.getMetadata("pluginVersionNewName"));
        plugin.localStorageManager.setMetadata("pluginVersionNewLink", data.pluginVersionNewLink ?? plugin.localStorageManager.getMetadata("pluginVersionNewLink"));
        plugin.localStorageManager.setMetadata("pluginVersionNewChangelogContent", data.pluginVersionNewChangelogContent ?? plugin.localStorageManager.getMetadata("pluginVersionNewChangelogContent"));
        plugin.localStorageManager.setMetadata("pluginVersionChangelogContent", data.pluginVersionChangelogContent ?? plugin.localStorageManager.getMetadata("pluginVersionChangelogContent"));
        // 保存插件中间版本历史 (Save plugin intermediate version history)
        if (data.pluginVersionHistory !== undefined) {
            plugin.localStorageManager.setMetadata("pluginVersionHistory", JSON.stringify(data.pluginVersionHistory || []));
        }

        plugin.menuManager?.refreshUpgradeBadge();
    }

    /**
     * 执行插件升级核心逻辑 (下载、解压、文件写入、无缝热重载)
     */
    public async upgradePlugin(onProgress: (status: string) => void, signal?: AbortSignal): Promise<void> {
        const plugin = this.plugin;
        onProgress($("ui.version.upgrading_plugin"));
        dump("Starting plugin upgrade process in VersionManager...");

        const latest = plugin.localStorageManager.getMetadata("pluginVersionNewName") as string;
        if (!latest) {
            throw new Error("Latest version information not found.");
        }

        const source = plugin.settings.updateSource || 'github';
        const tag = latest;

        // 提取版本号部分：1.20.12-alpha -> 1.20.12
        const versionPart = latest.split('-')[0];
        const zipFileName = `fast-note-sync-v${versionPart}.zip`;

        const baseUrl = source === 'github'
            ? `https://github.com/haierkeys/obsidian-fast-note-sync/releases/download/${tag}`
            : `https://cnb.cool/haierkeys/obsidian-fast-note-sync/-/releases/download/${tag}`;

        const pluginDir = getPluginDir(plugin);
        dump(`Upgrade info: source=${source}, tag=${tag}, zipName=${zipFileName}, dir=${pluginDir}`);

        onProgress($("ui.version.downloading_file", { file: zipFileName }));
        const url = `${baseUrl}/${zipFileName}`;
        dump(`Downloading from: ${url}`);

        if (signal?.aborted) throw new Error("Upgrade aborted.");

        // 插件升级涉及跨域下载，必须使用 requestUrl 以规避 CORS 限制
        const response = await requestUrl({
            url: url,
            method: 'GET',
        });

        if (signal?.aborted) throw new Error("Upgrade aborted.");

        if (response.status !== 200) {
            dump(`Download failed with status: ${response.status}`);
            throw new Error(`Failed to download ${zipFileName}: ${response.status}`);
        }

        const arrayBuffer = response.arrayBuffer;
        dump(`Download successful, size: ${arrayBuffer.byteLength} bytes`);

        // Extract Zip
        dump("Loading zip archive...");
        const unzipped = unzipSync(new Uint8Array(arrayBuffer));
        if (signal?.aborted) throw new Error("Upgrade aborted.");

        // 自动检测根目录前缀（寻找 manifest.json 所在位置）
        let rootPrefix = "";
        const fileNames = Object.keys(unzipped);
        const manifestFile = fileNames.find(f => f.endsWith("manifest.json"));
        if (manifestFile) {
            rootPrefix = manifestFile.replace("manifest.json", "");
            if (rootPrefix) dump(`Detected root prefix in zip: "${rootPrefix}"`);
        }

        const files = Object.entries(unzipped).filter(([name]) => !name.endsWith('/') && name.startsWith(rootPrefix));
        dump(`Zip file contains ${files.length} valid items`);

        for (const [realFilename, content] of files) {
            if (signal?.aborted) throw new Error("Upgrade aborted.");

            // 剔除前缀获取相对路径
            const relativeFilename = realFilename.substring(rootPrefix.length);
            if (!relativeFilename) continue;

            const path = `${pluginDir}/${relativeFilename}`;
            dump(`Extracting file: ${realFilename} -> ${path}`);

            // 递归确保父目录存在
            const pathParts = relativeFilename.split('/');
            if (pathParts.length > 1) {
                let currentPath = pluginDir;
                for (let i = 0; i < pathParts.length - 1; i++) {
                    currentPath += `/${pathParts[i]}`;
                    if (!(await plugin.app.vault.adapter.exists(currentPath))) {
                        dump(`Creating directory: ${currentPath}`);
                        await plugin.app.vault.adapter.mkdir(currentPath);
                    }
                }
            }

            await plugin.app.vault.adapter.writeBinary(path, content.buffer as ArrayBuffer);
        }

        dump("Plugin upgrade completed successfully, starting hot reload...");
        onProgress($("ui.version.reloading_plugin"));

        const app = plugin.app as AppWithInternal;
        const plugins = app.plugins;
        if (!plugins) {
            throw new Error($("ui.version.upgrade_plugin_fail"));
        }

        const id = plugin.manifest.id;

        // 稍微延迟一下，确保 Notice 和状态更新能被识别
        await new Promise(resolve => window.setTimeout(resolve, 500));

        if (signal?.aborted) throw new Error("Upgrade aborted.");

        // 执行热重载：禁用 -> 重新扫描 -> 启用
        await plugins.disablePlugin(id);
        await plugins.loadManifests();
        await plugins.enablePlugin(id);

        showSyncNotice($("ui.version.upgrade_plugin_success"), 10000);
    }

    /**
     * 执行服务端升级核心逻辑 (请求升级、断连 WS、轮询 health 以重连)
     */
    public async upgradeServer(onProgress: (status: string) => void, signal?: AbortSignal): Promise<void> {
        const plugin = this.plugin;
        onProgress($("ui.version.upgrading"));

        // 1. 断开 WebSocket
        plugin.websocket.unRegister();

        // 2. 发起升级请求
        const success = await plugin.api.adminUpgrade("latest");
        if (signal?.aborted) {
            void plugin.websocket.register(); // 尝试恢复连接
            throw new Error("Upgrade aborted.");
        }

        if (!success) {
            void plugin.websocket.register(); // 尝试恢复连接
            throw new Error($("ui.version.upgrade_fail"));
        }

        onProgress($("ui.version.waiting_server"));

        // 3. 递归轮询健康检查接口直到服务重启上线
        return new Promise<void>((resolve, reject) => {
            let pollTimeoutId: number | null = null;
            let pollStopped = false;

            const stopPolling = () => {
                pollStopped = true;
                if (pollTimeoutId !== null) {
                    window.clearTimeout(pollTimeoutId);
                    pollTimeoutId = null;
                }
            };

            // 超时保护 (2分钟)
            const timeoutId = window.setTimeout(() => {
                if (pollStopped) return;
                stopPolling();
                void plugin.websocket.register();
                reject(new Error("Upgrade timeout or failed to detect server restart."));
            }, 120000);

            // 在 AbortSignal 触发时取消
            if (signal) {
                signal.addEventListener("abort", () => {
                    if (pollStopped) return;
                    stopPolling();
                    window.clearTimeout(timeoutId);
                    void plugin.websocket.register();
                    reject(new Error("Upgrade aborted."));
                });
            }

            const scheduleNextPoll = () => {
                if (pollStopped || signal?.aborted) return;
                pollTimeoutId = window.setTimeout(() => {
                    void (async () => {
                        if (pollStopped || signal?.aborted) return;
                        try {
                            const isAlive = await plugin.api.checkHealth(signal);
                            if (signal?.aborted) return;
                            if (isAlive) {
                                stopPolling();
                                window.clearTimeout(timeoutId);
                                // 4. 重连并完成
                                void plugin.websocket.register();
                                showSyncNotice($("ui.version.upgrade_success"));
                                resolve();
                            } else {
                                scheduleNextPoll();
                            }
                        } catch {
                            scheduleNextPoll();
                        }
                    })();
                }, 3000);
            };

            scheduleNextPoll();
        });
    }
}
