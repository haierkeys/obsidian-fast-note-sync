[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

有问题请新建 [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new) , 或加入电报交流群寻求帮助: [https://t.me/obsidian_users](https://t.me/obsidian_users)

中国大陆地区，推荐使用腾讯 `cnb.cool` 镜像库: [https://cnb.cool/haierkeys/obsidian-fast-note-sync](https://cnb.cool/haierkeys/obsidian-fast-note-sync)



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
    <img src="/docs/images/demo.gif" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ 插件功能

- 🚀 **极简配置**：
    - 无需繁琐设置，只需粘贴远端服务配置即可开箱即用。
    - 也可以在桌面端使用一键导入，自动完成授权。
- 📗 **笔记实时同步**：
    - 自动监听并同步 Vault (仓库) 内所有笔记的创建、更新与删除操作。
- 🖼️ **附件全面支持**：
    - 实时同步图片、视频、音频等各类非设置文件。
    > ⚠️ **注意**：需要 v1.0+，服务端 v0.9+。请控制附件文件大小，大文件可能会导致同步延迟。
- ⚙️ **配置同步**：
    - 提供配置同步功能，支持多台设备的配置同步, 告别手动给多端设备拷贝配置文件的痛苦。
    > ⚠️ **注意**：需要 v1.4+，服务端 v1.0+。目前还在测试阶段，请谨慎使用。
- 🛂 **同步排除与白名单**：
    - 提供同步排除与白名单功能，您针同步指定属于你的同步策略。
- 🔄 **多端同步**：
    - 支持 Mac、Windows、Android、iOS 等平台。
- 📝 **笔记历史**：
    - 提供笔记历史功能，您可以查看笔记的所有历史修改详情。
    - 您可以恢复笔记到历史版本。
- 🛡️ **离线笔记编辑自动合并**：
    - 对离线设备的笔记修改，在重新连接服务端时自动合并，避免因只保留最新更新，导致的笔记内容丢失。
- 🚫 **离线删除同步与补全**：
    - 离线期间 笔记、附件、配置 的删除操作，下次连接时将自动同步到服务端或自动从服务端补全。
- 🔍 **版本检测**：
    - 提供版本检测功能，你可以快速的获取 插件端/服务端 最新的版本信息，方便快速升级。
- ☁️ **附件云预览**：
    - 提供附件在线预览功能，附件无需同步到本地设备，从而节省本地存储空间。
    > 配合插件的排除设置，可对某类附件直接使用第三方资源库(例如 WebDav)而不通过服务端上传。
- 🗒️ **同步日志**：
    - 提供同步日志功能，便于查看每次同步的详细信息。

## 🗺️ 路线图 (Roadmap)

我们正在持续改进，以下是未来的开发计划：
- [ ] **笔记分享功能**：为您的云端笔记生成分享链接，方便您将自己成果分享给他人。
- [ ] **端到端加密**：提供端到端加密功能，保证您的笔记数据在任何地方保存都是安全的。
- [ ] **云存储备份**：提供云存储备份功能，保护您的笔记数据不丢失。

- [ ] **AI笔记**：探索 AI+ 笔记相关的创新玩法， 等待您提供宝贵的建议。

> **如果您有改进建议或新想法，欢迎通过提交 issue 与我们分享——我们会认真评估并采纳合适的建议。**

## 💖 赞助与支持

- 如果觉得这个插件很有用，并且想要它继续开发，请在以下方式支持我们，感谢您对开源软件的支持:

  | Ko-fi *非中国地区*                                                                               |    | 微信扫码打赏 *中国地区*                        |
  |--------------------------------------------------------------------------------------------------|----|------------------------------------------------|
  | [<img src="/docs/images/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | 或 | <img src="/docs/images/wxds.png" height="150"> |

- 已支持名单：
  - <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md</a>
  - <a href="https://cnb.cool/haierkeys/fast-note-sync-service/-/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md (cnb.cool 镜像库)</a>


## 🚀 快速开始

1. 安装插件 (三选一)
   - **推荐** 使用 **BRAT** 安装 ( 支持手机安装 ): 在 Obsidian 插件社区市场, 搜索并安装 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件, 进入插件设置界面, 点击 **Add plugin** 并粘贴 https://github.com/haierkeys/obsidian-fast-note-sync
   - **官方商店**: <s>打开 Obsidian 社区插件市场, 搜索 **Fast Note Sync** 安装</s>
        > ⚠️ 插件尚未上架官方商店,无法搜索, 请手动安装
   - **手动安装**: 访问 https://github.com/haierkeys/obsidian-fast-note-sync/releases 下载安装包, 解压到 Obsidian 插件目录下 **.obsidian/plugin**
2. 打开插件配置项，点击 **粘贴远端配置** 按钮，将远端服务配置粘贴到输入框中。


## 📦 服务端部署

后端服务设置，请参考：
- <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
- <a href="https://cnb.cool/haierkeys/fast-note-sync-service">Fast Note Sync Service (cnb.cool 镜像库)</a>
