[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>Fast, Stable, Efficient, Anywhere-Deployable Obsidian Note Sync & Backup Plugin</strong>
  <br>
  <em>Private deployment supported, focused on providing Obsidian users with a non-intrusive, seamless, real-time multi-device note sync & backup solution. Supports Mac, Windows, Android, iOS, and multi-language support.</em>
</p>

<p align="center">
  Requires independent server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Features

- **Minimalist Configuration**: No tedious setup required, just paste the remote service configuration to get started.
- **Real-time Note Sync**: Automatically monitors and syncs all note creation, updates, and deletions within the Vault.
- **Full Attachment Support**: Real-time sync for images, videos, audio, and other non-setting files.
    > ⚠️ **Note**: Requires v1.0+, Service v0.9+. Please manage attachment sizes; large files may cause sync delays.
- **Config Sync**: Provides config sync functionality, supporting configuration synchronization across multiple devices, ending the pain of manually copying config files.
    > ⚠️ **Note**: Requires v1.4+, Service v1.0+. Currently in testing phase, please use with caution.
- **Server Version Status**: Displays server version information, making it easy to understand the server's status.
- **Multi-platform Sync**: Supports Mac, Windows, Android, iOS, and other platforms.
- **Note History**: Provides note history features. You can view all historical modification versions from the plugin or Server WebGui, allowing you to check diffs or copy content from history.

## 🗺️ Roadmap

We are continuously improving, here are our future development plans:

- [ ] **Offline Conflict Optimization**: Add conflict resolution strategies for offline note modifications to avoid data loss caused by keeping only the latest update.
- [ ] **Cloud Storage Backup Status**: Functionality to check cloud storage backup status at any time, keeping you informed of the latest backup state.
- [ ] **Note Sharing**: Generate shareable links for your cloud notes, making it easy to share your work with others.
- [ ] **AI Notes**: Explore innovative AI+ note-related features, awaiting your valuable suggestions.

> **If you have improvement suggestions or new ideas, feel free to share via issues — we will carefully evaluate and adopt suitable suggestions.**

## 💰 Pricing

- If you find this plugin useful and want to support its continued development, please consider supporting me through:

  | Ko-fi *Non-Mainland China*  |  | WeChat Pay *Mainland China* |
  | --- | ---| --- |
  | [<img src="https://ik.imagekit.io/haierkeys/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="https://ik.imagekit.io/haierkeys/wxds.png" height="150"> |

## 🚀 Quick Start

1. Install Plugin (Select one)
   - **Official Store**: <s>Open Obsidian Community Plugins, search for **Fast Note Sync** to install</s>
        > ⚠️ Plugin not yet listed in the official store, searching is unavailable. Please install manually.
   - **Manual Install**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the package, unzip it into the Obsidian plugins directory **.obsidian/plugins**
2. Open plugin settings, click **Paste Remote Config** button, and paste the remote service configuration into the input box.


## 📦 Server Deployment

For backend service setup, please refer to: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).