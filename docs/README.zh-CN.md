[中文文档](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English Document](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>快速、稳定、高效、任意部署的 Obsidian 笔记 同步&备份 插件</strong>
  <br>
  <em>可私有化部署，专注为 Obsidian 用户提供无打扰、丝般顺滑、多端实时同步的笔记同步&备份插件， 支持 Mac、Windows、Android、iOS 等平台，并提供多语言支持。</em>
</p>

<p align="center">
  需配合独立服务端使用：<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ 插件功能

- **极简配置**：无需繁琐设置，只需粘贴远端服务配置即可开箱即用。
- **笔记实时同步**：自动监听并同步 Vault (仓库) 内所有笔记的创建、更新与删除操作。
- **附件全面支持**：实时同步图片、视频、音频等各类非设置文件。
    > ⚠️ **注意**：需要 v1.0+，服务端 v0.9+。请控制附件文件大小，大文件可能会导致同步延迟。
- **多端同步**：支持 Mac、Windows、Android、iOS 等平台。

## 🗺️ 路线图 (Roadmap)

我们正在持续改进，以下是未来的开发计划：

- [ ] **服务端版本查看**： 显示服务器的版本信息，方便了解服务器的版本状态。
- [ ] **配置同步**：提供配置同步功能，支持多台设备的配置同步, 告别手动给多端设备拷贝配置文件的痛苦。
- [ ] **笔记历史**：提供笔记历史快照功能，您可以插件端、服务端WebGui，查看笔记的版本历史，回退到之前的版本。
- [ ] **云存储备份状态**：随时查看云存储备份状态功能，方便你了解最新的云存储备份状态。
- [ ] **笔记分享功能**：为您的云端笔记生成分享链接，方便您将自己成果分享给他人。
- [ ] **AI笔记**：探索 AI+ 笔记相关的创新玩法， 等待您提供宝贵的建议。

> **如果您有改进建议或新想法，欢迎通过提交 issue 与我们分享——我们会认真评估并采纳合适的建议。**

## 💰 价格

- 如果觉得这个插件很有用，并且想要支持它的继续开发，你可以在这里支持我:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 快速开始

1. 安装插件 (二选一)
   - **官方商店**: <s>打开 OBSidian 社区插件市场, 搜索 **Fast Note Sync** 安装</s>
        > ⚠️ 插件尚未上架官方商店,无法搜索, 请手动安装
   - **手动安装**: 访问 https://github.com/haierkeys/obsidian-fast-note-sync/releases 下载安装包, 解压到 Obsidian 插件目录下 **.obsidian/plugin**
2. 打开插件配置项，点击 **粘贴远端配置** 按钮，将远端服务配置粘贴到输入框中。


## 📦 服务端部署

后端服务设置，请参考：[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service)。
