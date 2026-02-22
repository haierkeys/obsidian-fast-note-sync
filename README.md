[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

If you have any questions, please create a new [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new), or join the Telegram group for help: [https://t.me/obsidian_users](https://t.me/obsidian_users)

For users in Mainland China, it is recommended to use the Tencent `cnb.cool` mirror: [https://cnb.cool/haierkeys/obsidian-fast-note-sync](https://cnb.cool/haierkeys/obsidian-fast-note-sync)

<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>

<p align="center">
  <strong>Fast, Stable, Efficient, and Arbitrarily Deployable Obsidian Note Sync & Backup Plugin</strong>
  <br>
  <em>Deployable privately, focuses on providing a non-intrusive, buttery-smooth, multi-device real-time sync & backup plugin for Obsidian users, supporting platforms such as Mac, Windows, Android, iOS, and offering multi-language support.</em>
</p>

<p align="center">
  Requires a standalone server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="/docs/images/demo.gif" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Features

- 🚀 **Minimalist Configuration**:
    - No complicated settings required, just paste the remote service configuration to start using it out of the box.
    - Also supports one-click import on the desktop client for automatic authorization.
- 📗 **Real-time Note Sync**:
    - Automatically monitors and syncs all creations, updates, and deletions of notes within the Vault.
- 🖼️ **Full Attachment Support**:
    - Real-time sync of various non-setting files such as images, videos, and audio.
    > ⚠️ **Note**: Requires v1.0+, Server v0.9+. Please control the size of attachment files; large files may cause sync latency.
- ⚙️ **Configuration Sync**:
    - Provides configuration sync functionality, supporting config synchronization across multiple devices, saying goodbye to the pain of manually copying configuration files to multiple devices.
    > ⚠️ **Note**: Requires v1.4+, Server v1.0+. Currently in the testing phase, please use with caution.
- 🛂 **Sync Exclusions & Whitelist**:
    - Provides sync exclusion and whitelist features, allowing you to specify your own sync strategy.
- 🔄 **Multi-platform Sync**:
    - Supports Mac, Windows, Android, iOS, and other platforms.
- 📝 **Note History**:
    - Provides note history functionality, allowing you to view detailed historical modification records of notes.
    - You can restore notes to historical versions.
- 🛡️ **Offline Note Editing Auto-Merge**:
    - Automatically merges note modifications made on offline devices when reconnecting to the server, avoiding data loss caused by keeping only the latest update.
- 🚫 **Offline Deletion Sync & Completion**:
    - Deletions of notes, attachments, and configurations during offline periods will be automatically synced to the server or completed from the server upon the next connection.
- 🔍 **Version Detection**:
    - Provides version detection functionality, allowing you to quickly get the latest version information of both the plugin and the server for fast upgrading.
- ☁️ **Cloud Preview of Attachments**:
    - Provides online preview functionality for attachments, which do not need to be synced to the local device, thus saving local storage space.
    > Used in conjunction with the plugin's exclusion settings, you can directly use third-party repositories (such as WebDAV) for certain types of attachments without uploading via the server.
- 🗒️ **Sync Logs**:
    - Provides sync log functionality for viewing detailed information for each synchronization.

## 🗺️ Roadmap

We are continuously improving, and the following are future development plans:
- [ ] **Note Sharing**: Generate sharing links for your cloud notes, making it easy to share your achievements with others.
- [ ] **End-to-End Encryption**: Provide end-to-end encryption to ensure your note data is safe wherever it is stored.
- [ ] **Cloud Backup**: Provide cloud backup functionality to protect your note data from loss.

- [ ] **AI Notes**: Explore innovative ways to use AI with notes, awaiting your valuable suggestions.

> **If you have improvement suggestions or new ideas, feel free to share them with us by submitting an issue — we will carefully evaluate and adopt suitable suggestions.**

## 💖 Sponsorship & Support

- If you find this plugin very useful and would like it to continue development, please support us in the following ways. Thank you for supporting open-source software:

  | Ko-fi *Non-China Region*                                                                         |    | WeChat Pay *China Region*                      |
  |--------------------------------------------------------------------------------------------------|----|------------------------------------------------|
  | [<img src="/docs/images/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="/docs/images/wxds.png" height="150"> |

- Supported List:
  - <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md</a>
  - <a href="https://cnb.cool/haierkeys/fast-note-sync-service/-/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md (cnb.cool Mirror)</a>


## 🚀 Quick Start

1. Install the plugin (choose one of three)
   - **Recommended**: Install using **BRAT** (supports mobile installation): In the Obsidian community plugin market, search for and install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin. Go to the plugin settings, click **Add plugin**, and paste https://github.com/haierkeys/obsidian-fast-note-sync
   - **Official Store**: <s>Open the Obsidian community plugin market, search for **Fast Note Sync** to install</s>
        > ⚠️ The plugin is not yet listed on the official store and cannot be searched. Please install manually.
   - **Manual Installation**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the installation package, and extract it into the Obsidian plugin directory **.obsidian/plugins**
2. Open the plugin settings, click the **Paste Remote Config** button, and paste the remote service configuration into the input box.


## 📦 Server Deployment

For backend service settings, please refer to:
- <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
- <a href="https://cnb.cool/haierkeys/fast-note-sync-service">Fast Note Sync Service (cnb.cool Mirror)</a>