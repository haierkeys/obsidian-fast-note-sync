import { TFile, TAbstractFile, TFolder, Notice, Setting, normalizePath, debounce } from "obsidian";

import { $ } from "../lang/lang";
import FastSync from "../main";


/**
 * Obsidian 配置目录结构说明 (.obsidian/)
 * 此文件仅作为开发参考，描述了插件需要关注或同步的核心配置文件。
 *
 * .obsidian/
 * ├── themes/                      # 【主题目录】存放下载的第三方主题
 * │   └── Minimal/                 # 具体主题文件夹（以主题名命名）
 * │       ├── manifest.json        # 主题元数据（版本、作者、更新日志）
 * │       └── theme.css            # 主题的核心样式代码
 * │
 * ├── plugins/                     # 【插件目录】存放第三方插件
 * │   └── dataview/                # 具体插件文件夹
 * │       ├── main.js              # 插件逻辑代码
 * │       ├── manifest.json        # 插件配置与依赖信息
 * │       └── styles.css           # 插件自带的样式
 * │
 * ├── snippets/                    # 【代码片段】存放自定义的 .css 片段文件
 * │   ├── custom-font.css
 * │   └── dashboard-tweak.css
 * │
 * ├── appearance.json              # 【外观配置】记录当前选中的主题、字体、CSS片段开关状态
 * ├── app.json                     # 【核心配置】内部核心设置（附件位置、Wiki链接格式、编辑器偏好等）
 * ├── community-plugins.json       # 【社区插件】已启用的第三方插件列表
 * ├── core-plugins.json            # 【核心插件】系统内置插件的开关状态
 * ├── hotkeys.json                 # 【快捷键】用户自定义的快捷键配置
 * ├── workspace.json               # 【工作区-桌面端】记录打开的页签、窗体布局及侧边栏状态
 * ├── workspace-mobile.json        # 【工作区-移动端】记录移动端特有的页签与布局状态
 * ├── types.json                   # 【属性类型】记录文档属性（Properties）的全局元数据与类型定义
 * ├── command-palette.json         # 【命令面板】记录命令面板中置顶（PIN）的命令
 * └── graph.json                   # 【关系图谱】记录关系图谱视图的显示设置、筛选条件等配置
 */




/**
 * ConfigWatcher 类
 * 用于监听 Obsidian 配置目录（.obsidian/）下的文件变化。
 * 通过轮询（Polling）机制检测文件的修改时间（mtime），并在检测到变化时触发同步。
 */
export class ConfigWatcher {
    private plugin: FastSync;
    private intervalId: number | null = null;

    /**
     * 记录文件路径及其上一次已知的修改时间戳
     * 用于对比判断文件是否发生了内容更新
     */
    private fileStates: Map<string, number> = new Map();

    /**
     * [根目录] 需要监听的核心配置文件列表
     * 这些文件直接位于 .obsidian/ 目录下
     */
    private rootFilesToWatch = [
        'app.json',                // 核心设置（如附件位置、编辑器偏好）
        'appearance.json',         // 外观设置（主题选择、CSS 片段开关）
        'community-plugins.json',  // 已启用的社区插件列表
        'core-plugins.json',       // 核心插件的开关状态
        'hotkeys.json',            // 自定义快捷键
        'types.json',              // 文档属性（Properties）类型定义
        'command-palette.json',    // 命令面板设置
        'graph.json'               // 关系图谱显示设置
    ];

    /**
     * [插件目录] 需要监听的插件内部核心文件
     * 位于 .obsidian/plugins/{plugin-id}/ 目录下
     */
    private pluginFilesToWatch = [
        'data.json',      // 插件的持久化设置（最重要）
        'manifest.json',  // 插件元数据（版本信息）
        'main.js',        // 插件逻辑代码
        'styles.css'      // 插件自定义样式
    ];

    /**
     * [主题目录] 需要监听的主题内部核心文件
     * 位于 .obsidian/themes/{theme-name}/ 目录下
     */
    private themeFilesToWatch = [
        'theme.css',      // 主题样式表
        'manifest.json'   // 主题信息
    ];

    constructor(plugin: FastSync) {
        this.plugin = plugin;
    }

    /**
     * 启动配置监听器
     * 首先执行一次全量初始化扫描，标记当前文件状态，然后开启 3 秒一次的轮询
     */
    start() {
        console.log("ConfigWatcher: 开始全量监听 (设置 + 插件 + 主题 + 片段)...");

        // 初始化扫描：仅记录状态，不触发上传
        this.scanAll(true);

        // 设置轮询定时器
        this.intervalId = window.setInterval(() => {
            this.scanAll(false);
        }, 3000);
    }

    /**
     * 停止配置监听器
     * 清除轮询定时器，停止检测
     */
    stop() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * 执行一次全量扫描
     * 依次扫描根配置、插件目录、主题目录以及 CSS 代码片段
     * @param isInit - 是否为初始化扫描。初次扫描仅记录 mtime，不做同步触发。
     */
    private async scanAll(isInit: boolean) {
        const configDir = this.plugin.app.vault.configDir;

        // --- 1. 扫描根配置文件 ---
        for (const fileName of this.rootFilesToWatch) {
            const filePath = normalizePath(`${configDir}/${fileName}`);
            await this.checkFileChange(filePath, isInit);
        }

        // --- 2. 扫描插件 (Plugins) ---
        // 遍历 .obsidian/plugins/ 下的所有子目录
        await this.scanSubFolders(
            normalizePath(`${configDir}/plugins`),
            this.pluginFilesToWatch,
            isInit
        );

        // --- 3. 扫描主题 (Themes) ---
        // 遍历 .obsidian/themes/ 下的所有子目录
        await this.scanSubFolders(
            normalizePath(`${configDir}/themes`),
            this.themeFilesToWatch,
            isInit
        );

        // --- 4. 扫描 CSS 片段 (Snippets) ---
        // 扫描 .obsidian/snippets/ 目录下的所有 .css 文件
        await this.scanSnippets(
            normalizePath(`${configDir}/snippets`),
            isInit
        );
    }

    /**
     * 辅助方法：扫描包含子文件夹的目录
     * 适用于插件和主题目录的深度扫描
     * @param rootPath - 扫描的根路径（如 plugins 目录）
     * @param filesToWatch - 每个子文件夹中需要关注的文件名列表
     * @param isInit - 是否为初始化扫描
     */
    private async scanSubFolders(rootPath: string, filesToWatch: string[], isInit: boolean) {
        try {
            const result = await this.plugin.app.vault.adapter.list(rootPath);
            for (const folderPath of result.folders) {
                for (const fileName of filesToWatch) {
                    const filePath = normalizePath(`${folderPath}/${fileName}`);
                    await this.checkFileChange(filePath, isInit);
                }
            }
        } catch (e) {
            // 忽略目录不存在或无访问权限的情况
        }
    }

    /**
     * 辅助方法：扫描 Snippets 目录
     * 该目录下的 .css 文件直接作为片段存在，不需要进一步进入子目录
     * @param rootPath - snippets 目录路径
     * @param isInit - 是否为初始化扫描
     */
    private async scanSnippets(rootPath: string, isInit: boolean) {
        try {
            const result = await this.plugin.app.vault.adapter.list(rootPath);
            for (const filePath of result.files) {
                // 仅监听以 .css 结尾的文件
                if (filePath.endsWith('.css')) {
                    await this.checkFileChange(filePath, isInit);
                }
            }
        } catch (e) {
            // 忽略 snippets 目录不存在的情况
        }
    }

    /**
     * 核心检测逻辑：基于文件修改时间 (mtime) 的变化检测
     * @param filePath - 待检测的文件路径
     * @param isInit - 是否为初始化扫描
     */
    private async checkFileChange(filePath: string, isInit: boolean) {
        try {
            const stat = await this.plugin.app.vault.adapter.stat(filePath);

            // 如果文件不存在
            if (!stat) {
                if (this.fileStates.has(filePath)) {
                    this.fileStates.delete(filePath);
                    if (!isInit) {
                        console.log(`[ConfigWatcher] 文件被删除: ${filePath}`);
                        // 预留：此处可扩展删除同步逻辑
                    }
                }
                return;
            }

            // 对比修改时间戳
            const lastMtime = this.fileStates.get(filePath);
            if (stat.mtime !== lastMtime) {
                this.fileStates.set(filePath, stat.mtime);
                // 非初始化阶段检测到变化，触发同步
                if (!isInit) {
                    this.triggerSync(filePath);
                }
            }
        } catch (e) {
            // 忽略读取状态错误
        }
    }

    /**
     * 触发同步动作（防抖处理，防止频繁写入导致重复上传）
     * 设置为 2 秒防抖，并且在首个调用时立即触发
     */
    private triggerSync = debounce((filePath: string) => {
        console.log(`[ConfigWatcher] 准备上传同步: ${filePath}`);

        // TODO: 这里应调用 FastSync 插件的上传管理器进行配置同步
        // 例如：this.plugin.syncConfig(filePath);
    }, 2000, true);
}


/**
 * 调试辅助：列出当前所有插件
 * @param plugin - 插件实例
 */
export async function listPlugins(plugin: FastSync) {
    const pluginsPath = normalizePath(`${plugin.app.vault.configDir}/plugins`);

    try {
        const result = await plugin.app.vault.adapter.list(pluginsPath);
        console.log("配置目录下的插件列表:", result.folders);
    } catch (e) {
        console.error("无法列出插件目录", e);
    }
}

/**
 * 调试辅助：读取特定配置文件内容
 * @param plugin - 插件实例
 */
export async function readConfigFile(plugin: FastSync) {
    const filePath = normalizePath(`${plugin.app.vault.configDir}/data.json`);

    try {
        const exists = await plugin.app.vault.adapter.exists(filePath);
        if (exists) {
            const content = await plugin.app.vault.adapter.read(filePath);
            console.log("文件内容读取成功:", content);
        } else {
            console.log("文件不存在:", filePath);
        }
    } catch (error) {
        console.error("读取配置文件出错:", error);
    }
}

/**
 * 调试辅助：将数据写入配置文件（覆盖写）
 * @param plugin - 插件实例
 * @param data - 要写入的 JSON 数据
 */
export async function writeConfigFile(plugin: FastSync, data: any) {
    const filePath = normalizePath(`${plugin.app.vault.configDir}/my-plugin-config.json`);
    const content = JSON.stringify(data, null, 2);

    try {
        await plugin.app.vault.adapter.write(filePath, content);
        console.log("配置文件写入成功:", filePath);
    } catch (e) {
        console.error("写入配置文件失败", e);
    }
}



