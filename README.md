[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>Fast, Stable, Efficient, Self-Deployable Obsidian Note Sync & Backup Plugin</strong>
  <br>
  <em>Supports private deployment, focusing on providing Obsidian users with a seamless, distraction-free, real-time multi-device note sync & backup plugin. Compatible with Mac, Windows, Android, iOS, and other platforms, with multi-language support.</em>
</p>

<p align="center">
  Requires standalone server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Features

- **Simple Configuration**: No complicated setup required—just paste your remote server configuration and you're ready to go.
- **Real-time Note Sync**: Automatically monitors and syncs all note creation, updates, and deletion operations within your Vault.
- **Full Attachment Support**: Real-time sync for images, videos, audio, and other non-settings files.
    > ⚠️ **Note**: Requires v1.0+, server v0.9+. Please control attachment file sizes, as large files may cause sync delays.
- **Configuration Sync**: Provides configuration sync functionality, supporting multi-device configuration sync, eliminating the pain of manually copying config files across devices.
    > ⚠️ **Note**: Requires v1.4+, server v1.0+. Currently in testing phase, use with caution.
- **Server Version Display**: Shows server version information for easy monitoring of server status.
- **Multi-Platform Sync**: Supports Mac, Windows, Android, iOS, and other platforms.
- **Note History**: Provides note history functionality. You can view all historical versions of notes in the plugin or server WebGUI, check modification details, or copy historical content.

## 🗺️ Roadmap

We are continuously improving. Here's our future development plan:


- [ ] **Cloud Storage Backup Status**: View cloud storage backup status at any time to stay informed about the latest backup state.
- [ ] **Note Sharing**: Generate sharing links for your cloud notes, making it easy to share your work with others.
- [ ] **AI Notes**: Explore innovative AI+ note-related features—we're waiting for your valuable suggestions.

> **If you have improvement suggestions or new ideas, feel free to share them with us by submitting an issue—we will carefully evaluate and adopt suitable suggestions.**

## 💰 Pricing

- If you find this plugin useful and want to support its continued development, you can support me here:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 Quick Start

1. Install the plugin (choose one)
   - **Official Store**: <s>Open Obsidian community plugin marketplace, search for **Fast Note Sync** and install</s>
        > ⚠️ Plugin not yet available in the official store, please install manually
   - **Manual Installation**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the installation package, extract it to the Obsidian plugin directory **.obsidian/plugin**
2. Open plugin settings, click the **Paste Remote Configuration** button, and paste your remote server configuration into the input box.


## 📦 Server Deployment

For backend service setup, please refer to: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).