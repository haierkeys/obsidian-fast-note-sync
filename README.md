[中文文档](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/readme-zh.md) / [English Document](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md)


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
  <em>Supports private deployment, dedicated to providing Obsidian users with an uninterrupted, silky smooth, multi-device real-time note sync & backup plugin. Supports platforms such as Mac, Windows, Android, iOS, and provides multi-language support.</em>
</p>

<p align="center">
  Requires use with a separate server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Plugin Features

- **Minimal Configuration**: No complicated settings needed. Just paste the remote service configuration to use out of the box.
- **Real-time Note Sync**: Automatically monitors and syncs all note creation, update, and deletion operations in the Vault.
- **Full Attachment Support**: Real-time syncs images, videos, audio, and other non-setting files.
    > ⚠️ **Note**: Requires v1.0+ and server v0.9+. Please control attachment file sizes; large files may cause sync delays.
- **Multi-device Sync**: Supports platforms such as Mac, Windows, Android, iOS.

## 🗺️ Roadmap

We are continuously improving. Here are our future development plans:

- No next-step development plans at the moment

> **If you have suggestions for improvements or new ideas, feel free to share them by submitting an issue—we will carefully evaluate and adopt suitable suggestions.**

## 💰 Pricing

- If you find this plugin useful and want to support its continued development, you can support me here:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 Quick Start

1. Install the plugin (choose one of the two options)
   - **Official Store**: <s>Open the OBSidian Community Plugin Store, search for **Fast Note Sync** and install</s>
        > ⚠️ The plugin is not yet listed on the official store and cannot be searched for. Please install manually.
   - **Manual Installation**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the installation package, unzip it to the Obsidian plugins directory **.obsidian/plugin**
2. Open the plugin configuration, click the **Paste Remote Configuration** button, and paste the remote service configuration into the input box.


## 📦 Server Deployment

For backend service setup, please refer to: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).