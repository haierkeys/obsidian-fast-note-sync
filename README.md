[中文文档](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English Document](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>Fast, stable, efficient, and deployable Obsidian note sync & backup plugin</strong>
  <br>
  <em>Supports private deployment, dedicated to providing Obsidian users with an uninterrupted, silky-smooth, multi-device real-time note sync & backup plugin. Supports Mac, Windows, Android, iOS, and other platforms, with multi-language support.</em>
</p>

<p align="center">
  Requires use with a separate server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Plugin Features

- **Minimal Configuration**: No complicated settings needed. Just paste the remote service configuration to get started out of the box.
- **Real-time Note Sync**: Automatically monitors and synchronizes all note creation, update, and deletion operations within the Vault.
- **Comprehensive Attachment Support**: Real-time sync of images, videos, audio, and other non-setting files.
    > ⚠️ **Note**: Requires v1.0+ and server v0.9+. Please control attachment file sizes; large files may cause sync delays.
- **Multi-device Sync**: Supports Mac, Windows, Android, iOS, and other platforms.

## 🗺️ Roadmap

We are continuously improving. Here are the future development plans:

- [ ] **Server Version Check**: Display server version information for easy understanding of the server's version status.
- [ ] **Configuration Sync**: Provide configuration sync functionality, supporting configuration sync across multiple devices, eliminating the hassle of manually copying configuration files to multiple devices.
- [ ] **Note History**: Provide note history snapshot functionality. You can view note version history and revert to previous versions via the plugin or server WebGui.
- [ ] **Cloud Storage Backup Status**: View cloud storage backup status at any time, keeping you informed of the latest backup status.
- [ ] **Note Sharing Feature**: Generate share links for your cloud notes, making it easy to share your work with others.
- [ ] **AI Notes**: Explore innovative AI + note features. We welcome your valuable suggestions.

> **If you have improvement suggestions or new ideas, feel free to share them by submitting an issue—we will carefully evaluate and adopt suitable suggestions.**

## 💰 Pricing

- If you find this plugin useful and want to support its continued development, you can support me here:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 Quick Start

1. Install the plugin (choose one)
   - **Official Store**: <s>Open the Obsidian Community Plugin Market, search for **Fast Note Sync** and install</s>
        > ⚠️ The plugin is not yet listed in the official store and cannot be searched. Please install manually.
   - **Manual Installation**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the installation package, unzip it to the Obsidian plugin directory **.obsidian/plugin**
2. Open the plugin configuration, click the **Paste Remote Configuration** button, and paste the remote service configuration into the input box.


## 📦 Server Deployment

For backend service setup, please refer to: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).