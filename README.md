[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

If you have any questions, please create an [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new) or join the Telegram group for help: [https://t.me/obsidian_users](https://t.me/obsidian_users)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>Fast, stable, efficient, and deployable Obsidian Note Sync & Backup Plugin</strong>
  <br>
  <em>Supports private deployment, dedicated to providing Obsidian users with non-intrusive, seamless, multi-device real-time note synchronization and backup. Supports Mac, Windows, Android, iOS, and provides multi-language support.</em>
</p>

<p align="center">
  Requires a separate server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Features

- 🚀 **Minimal Configuration**:
    - No complicated setup required; simply paste the remote service configuration to start using.
    - One-click import is also available on desktop for automatic authorization.
- 📗 **Real-time Note Sync**:
    - Automatically monitors and syncs all note creation, updates, and deletions within the Vault.
- 🖼️ **Full Attachment Support**:
    - Real-time sync for images, videos, audio, and other non-setting files.
    > ⚠️ **Note**: Requires plugin v1.0+, server v0.9+. Please manage attachment sizes; large files may cause sync delays.
- ⚙️ **Config Sync**:
    - Provides configuration synchronization across multiple devices, ending the pain of manually copying config files.
    > ⚠️ **Note**: Requires plugin v1.4+, server v1.0+. Currently in beta; use with caution.
- 🛂 **Sync Exclusion & Whitelist**:
    - Features exclusion and whitelist functionality to customize your synchronization strategy.
- 🔄 **Multi-platform Sync**:
    - Supports Mac, Windows, Android, iOS, and more.
- 📝 **Note History**:
    - Provides note history feature to view detailed modification history.
    - Supports restoring notes to previous versions.
- 🛡️ **Offline Edit Auto-merge**:
    - Note edits made on offline devices are automatically merged when reconnected, preventing data loss from overwriting with latest versions.
- 🚫 **Offline Deletion Sync & Completion**:
    - Deletions of notes, attachments, and configs made while offline are automatically synced or restored upon the next connection.
- 🔍 **Version Detection**:
    - Provides version detection to quickly get the latest plugin and server version information for easier upgrades.
- ☁️ **Cloud Attachment Preview**:
    - Online preview for attachments without local synchronization, saving local storage space.
    > Combined with exclusion settings, specific attachments can be used via third-party libraries (e.g., WebDAV) instead of uploading to the server.
- 🗒️ **Sync Logs**:
    - Provides sync logs for viewing detailed information about each synchronization.

## 🗺️ Roadmap

We are continuously improving; here is our future development plan:
- [ ] **Note Sharing**: Generate sharing links for your cloud notes to easily share your work with others.
- [ ] **End-to-End Encryption**: Secure your note data everywhere with end-to-end encryption.
- [ ] **Cloud Storage Backup**: Cloud storage backup feature to protect your note data from loss.

- [ ] **AI Notes**: Exploring AI+ note-related innovations; your valuable suggestions are welcome.

> **If you have suggestions or new ideas, feel free to share them via an issue—we will carefully evaluate and adopt suitable ideas.**

## 💖 Sponsorship & Support

- If you find this plugin useful and want to support its continued development, please consider donating through the following channels. Thank you for supporting open-source software:

  | Ko-fi *International*                                                                                                |    | WeChat Pay *China*                                                 |
  |----------------------------------------------------------------------------------------------------------------------|----|--------------------------------------------------------------------|
  | [<img src="https://ik.imagekit.io/haierkeys/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="https://ik.imagekit.io/haierkeys/wxds.png" height="150"> |

- List of supporters:
  - https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md


## 🚀 Quick Start

1. Install the plugin (choose one):
   - **Official Store**: <s>Search for **Fast Note Sync** in the Obsidian Community Plugins market</s>
        > ⚠️ Plugin is not yet listed on the official store and cannot be searched. Please install manually.
   - **Manual Installation**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the package, then extract it to the Obsidian plugin directory **.obsidian/plugins**.
   - **Install via BRAT** (Supports mobile): Search and install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin in the Obsidian Community Plugins market, go to the plugin settings, click **Add beta plugin**, and paste https://github.com/haierkeys/obsidian-fast-note-sync.
2. Open plugin settings and click the **Paste Remote Config** button to paste your remote service configuration into the input box.


## 📦 Server Deployment

For backend service setup, please refer to: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).