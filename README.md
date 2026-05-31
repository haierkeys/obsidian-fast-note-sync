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
  <strong>Fast multi-device sync, automatic backup, trackable version history, and shareable collaboration note sync plugin for Obsidian</strong>
  <br>
  <em>Sync your notes in real-time across multiple devices (PC, mobile, web) anytime, anywhere. One-click generation of sharing links to share with friends, easily trace modification history or restore trash bin contents; also supports backup, mirroring, and Git synchronization. With the REST/MCP services of Fast Note Sync Service, you can quickly build your own personal knowledge base.</em>
</p>

<p align="center">
  Requires a standalone server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="/docs/images/demo.gif" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Features

- 🚀 **Minimalist Configuration**:
    - No tedious setup required, just paste the remote service configuration to start using it out of the box.
    - Can also use one-click import on the desktop app to automatically complete authorization.
- 📗 **Real-time Note Sync**:
    - Automatically monitors and syncs the creation, update, and deletion of all notes inside the Vault (repository).
- 🖼️ **Full Attachment Support**:
    - Syncs images, videos, audio, and all other non-configuration files in real-time.
    > ⚠️ **Note**: Requires v1.0+, Server v0.9+. Please manage attachment file sizes; large files may cause synchronization delays.
- ⚙️ **Configuration Sync**:
    - Provides configuration sync, supporting config synchronization across multiple devices. Say goodbye to the pain of manually copying configuration files to multiple devices.
    > ⚠️ **Note**: Requires v1.4+, Server v1.0+. Currently in the testing phase, please use with caution.
- 🛂 **Sync Exclusions & Whitelist**:
    - Provides sync exclusion and whitelist functions, allowing you to customize your own sync strategies.
- 🔄 **Multi-device Sync**:
    - Supports Mac, Windows, Android, iOS, and other platforms.
- 📝 **Note History**:
    - Provides note history functionality, letting you view detailed historical modification records of your notes.
    - You can restore notes to historical versions.
- 🛡️ **Offline Note Editing Auto-Merge**:
    - Automatically merges note modifications made on offline devices when reconnecting to the server, avoiding data loss caused by keeping only the latest update.
- 🚫 **Offline Deletion Sync & Completion**:
    - Deletions of notes, attachments, and configurations during offline periods will be automatically synced to the server or completed from the server upon the next connection.
- 🔍 **Version Detection**:
    - Provides version detection functionality, allowing you to quickly get the latest version info of the plugin and the server for easy upgrading.
- ☁️ **Cloud Preview of Attachments**:
    - Provides online attachment preview, meaning attachments do not need to be synced to the local device, thereby saving local storage space.
    > Combined with the plugin's exclusion settings, you can directly use a third-party repository (like WebDav) for certain types of attachments without uploading via the server.
- 🗒️ **Sync Logs**:
    - Provides sync log functionality, making it easy to view detailed information for each synchronization.
- **Cloud Backup**: Provides cloud backup functionality to protect your note data from being lost.

## 🗺️ Roadmap

We are continuously improving, and the following are future development plans:
- [ ] **End-to-End Encryption**: Provide end-to-end encryption to ensure your note data is safe wherever it is stored.
- [ ] **AI Notes**: Explore innovative ways to use AI with notes, awaiting your valuable suggestions.

> **If you have improvement suggestions or new ideas, feel free to share them with us by submitting an issue — we will carefully evaluate and adopt suitable suggestions.**

## 💖 Sponsorship & Support

- If you find this plugin very useful and would like it to continue development, please support us in the following ways. Thank you for supporting open-source software:

  | Ko-fi *Non-China Region*                                                                         |    | WeChat Pay *China Region*                      |
  |--------------------------------------------------------------------------------------------------|----|------------------------------------------------|
  | [<img src="/docs/images/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="/docs/images/wxds.png" height="150"> |

- Supported List:
  - <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.en.md">Support.en.md</a>
  - <a href="https://cnb.cool/haierkeys/fast-note-sync-service/-/blob/master/docs/Support.en.md">Support.en.md (cnb.cool Mirror)</a>


## 🚀 Quick Start

**Step 1: Get the Plugin**

* **Store Search:** Open Obsidian **Settings** > **Community Plugins** > **Browse**, search for `Fast Note Sync` to install. *(Note: If not listed in the store, please choose manual installation)*
* **Manual Download:** Download `main.js`, `styles.css`, `manifest.json` from the [GitHub Releases Page](https://github.com/haierkeys/obsidian-fast-note-sync/releases) and place them in the `.obsidian/plugins/fast-note-sync` folder.

**Step 2: Authorize Sync**

1. Access the Web interface of your deployed **[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service)**.
2. Select **"Note Vaults"** from the left navigation bar.
3. Click **"One-click Authorization for Obsidian"**. The system will automatically wake up Obsidian and complete the transfer of authorization information. Of course, you can also manually copy the authorization information into the plugin.

## 📦 Server Deployment

For backend service settings, please refer to:
- <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
- <a href="https://cnb.cool/haierkeys/fast-note-sync-service">Fast Note Sync Service (cnb.cool Mirror)</a>