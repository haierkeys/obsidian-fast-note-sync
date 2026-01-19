[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

If you have any questions, please create an [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new), or join the Telegram community group for help: [https://t.me/obsidian_users](https://t.me/obsidian_users)


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
  <em>Supports private deployment, focused on providing Obsidian users with a non-intrusive, seamless, multi-device real-time note sync & backup plugin. Supports Mac, Windows, Android, iOS, and provides multi-language support.</em>
</p>

<p align="center">
  Requires an independent server: <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ Plugin Features

- **Minimalist Configuration**: No tedious settings, just paste the remote service configuration to start using it right out of the box.
- **Real-time Note Sync**: Automatically listens for and syncs the creation, update, and deletion of all notes within the Vault.
- **Full Attachment Support**: Real-time sync of images, videos, audio, and other non-setting files.
    > ⚠️ **Note**: Requires v1.0+, server v0.9+. Please control the size of attachment files; large files may cause synchronization delays.
- **Config Sync**: Provides a configuration sync feature, supporting configuration synchronization across multiple devices, saying goodbye to the pain of manually copying configuration files to multiple devices.
    > ⚠️ **Note**: Requires v1.4+, server v1.0+. Currently in the testing phase, please use with caution.
- **Server Version Viewing**: Displays server version information, making it convenient to understand the server's version status.
- **Multi-device Sync**: Supports Mac, Windows, Android, iOS, and other platforms.
- **Note History**: Provides a note history feature, where you can view all historical modification versions of notes from the plugin side or the server WebGui. You can view modification details or copy historical version content.

## 🗺️ Roadmap

We are continuously improving; here is the future development plan:

- [ ] **Offline Device Note Conflict Optimization**: Add conflict resolution strategies for note modifications on offline devices to avoid loss of note content caused by only keeping the latest updates.
- [ ] **Cloud Storage Backup Status**: A feature to check cloud storage backup status at any time, making it convenient for you to understand the latest cloud storage backup status.
- [ ] **Note Sharing Function**: Generate sharing links for your cloud notes, making it convenient for you to share your results with others.
- [ ] **AI Notes**: Explore innovative AI+ note-related gameplay, waiting for you to provide valuable suggestions.

> **If you have improvement suggestions or new ideas, feel free to share with us by submitting an issue — we will carefully evaluate and adopt suitable suggestions.**

## 💰 Pricing

- If you find this plugin useful and want it to continue development, please support me in the following ways:

  | Ko-fi *Non-Mainland China*                                                                                           |    | WeChat Scan to Donate *Mainland China*                             |
  |----------------------------------------------------------------------------------------------------------------------|----|--------------------------------------------------------------------|
  | [<img src="https://ik.imagekit.io/haierkeys/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="https://ik.imagekit.io/haierkeys/wxds.png" height="150"> |

## 🚀 Quick Start

1. Install the plugin (choose one of two)
   - **Official Store**: <s>Open the Obsidian community plugin market, search for **Fast Note Sync** to install</s>
        > ⚠️ The plugin has not yet been listed on the official store and cannot be searched. Please install manually.
   - **Manual Installation**: Visit https://github.com/haierkeys/obsidian-fast-note-sync/releases to download the installation package, and unzip it into the Obsidian plugin directory **.obsidian/plugins**
   - Install using **BRAT** (supports mobile installation): In the Obsidian plugin community market, search for and install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin. Enter the plugin settings interface, click **Add beta plugin**, and paste https://github.com/haierkeys/obsidian-fast-note-sync
2. Open the plugin configuration, click the **Paste Remote Configuration** button, and paste the remote service configuration into the input box.


## 📦 Server Deployment

For backend service settings, please refer to: [Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service).