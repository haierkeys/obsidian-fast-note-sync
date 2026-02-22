[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

有問題請新建 [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new) , 或加入電報交流群尋求幫助: [https://t.me/obsidian_users](https://t.me/obsidian_users)

中國大陸地區，推薦使用騰訊 `cnb.cool` 鏡像庫: [https://cnb.cool/haierkeys/obsidian-fast-note-sync](https://cnb.cool/haierkeys/obsidian-fast-note-sync)

<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>

<p align="center">
  <strong>快速、穩定、高效、任意部署的 Obsidian 筆記 同步&備份 插件</strong>
  <br>
  <em>可私有化部署，專注為 Obsidian 用戶提供無打擾、絲般顺滑、多端即時同步的筆記同步&備份插件， 支持 Mac、Windows、Android、iOS 等平台，並提供多語言支持。</em>
</p>

<p align="center">
  需配合獨立服務端使用：<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="/docs/images/demo.gif" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ 插件功能

- 🚀 **極簡配置**：
    - 無需繁瑣設置，只需粘貼遠端服務配置即可開箱即用。
    - 也可以在桌面端使用一鍵导入，自動完成授權。
- 📗 **筆記即時同步**：
    - 自動監聽並同步 Vault (倉庫) 內所有筆記的創建、更新與刪除操作。
- 🖼️ **附件全面支持**：
    - 即時同步圖片、視頻、音頻等各類非設置文件。
    > ⚠️ **注意**：需要 v1.0+，服務端 v0.9+。請控制附件文件大小，大文件可能會導致同步延遲。
- ⚙️ **配置同步**：
    - 提供配置同步功能，支持多台設備的配置同步, 告別手動給多端設備拷貝配置文件的痛苦。
    > ⚠️ **注意**：需要 v1.4+，服務端 v1.0+。目前還在測試階段，請謹慎使用。
- 🛂 **同步排除與白名單**：
    - 提供同步排除與白名單功能，您針同步指定屬於你的同步策略。
- 🔄 **多端同步**：
    - 支持 Mac、Windows、Android、iOS 等平台。
- 📝 **筆記歷史**：
    - 提供筆記歷史功能，您可以查看筆記的所有歷史修改詳情。
    - 您可以恢復筆記到歷史版本。
- 🛡️ **離線筆記編輯自動合併**：
    - 對離線設備的筆記修改，在重新連接服務端時自動合併，避免因只保留最新更新，導致的筆記內容丢失。
- 🚫 **離线刪除同步與補全**：
    - 離线期間 筆記、附件、配置 的刪除操作，下次連接時將自動同步到服務端或自動從服務端補全。
- 🔍 **版本檢測**：
    - 提供版本檢測功能，你可以快速的獲取 插件端/服務端 最新的版本信息，方便快速升級。
- ☁️ **附件雲預覽**：
    - 提供附件在線預覽功能，附件無需同步到本地設備，從而節省本地存儲空間。
    > 配合插件的排除設置，可对某類附件直接使用第三方資源庫(例如 WebDav)而不通過服務端上傳。
- 🗒️ **同步日誌**：
    - 提供同步日誌功能，便於查看每次同步的詳細信息。

## 🗺️ 路線圖 (Roadmap)

我們正在持續改進，以下是未來的開發計劃：
- [ ] **筆記分享功能**：為您的雲端筆記生成分享鏈結，方便您將自己成果分享給他人。
- [ ] **端到端加密**：提供端到端加密功能，保證您的筆记數據在任何地方保存都是安全的。
- [ ] **雲存儲備份**：提供雲存儲備份功能，保護您的筆記數據不丢失。

- [ ] **AI筆記**：探索 AI+ 筆記相關的創新玩法， 等待您提供寶貴的建議。

> **如果您有改進建議或新想法，歡迎通過提交 issue 與我們分享——我們會認真評估並採納合適的建議。**

## 💖 贊助與支持

- 如果覺得這個插件很有用，並且想要它繼續開發，請在以下方式支持我們，感謝您對開源軟件的支持:

  | Ko-fi *非中國地區*                                                                               |    | 微信掃码打賞 *中國地區*                        |
  |--------------------------------------------------------------------------------------------------|----|------------------------------------------------|
  | [<img src="/docs/images/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | 或 | <img src="/docs/images/wxds.png" height="150"> |

- 已支持名單：
  - <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md</a>
  - <a href="https://cnb.cool/haierkeys/fast-note-sync-service/-/blob/master/docs/Support.zh-CN.md">Support.zh-CN.md (cnb.cool 鏡像庫)</a>


## 🚀 快速開始

1. 安裝插件 (三選一)
   - **推薦** 使用 **BRAT** 安裝 ( 支持手機安裝 ): 在 Obsidian 插件社區市場, 搜索並安裝 [BRAT](https://github.com/TfTHacker/obsidian42-brat) 插件, 進入插件設置界面, 點擊 **Add plugin** 並粘貼 https://github.com/haierkeys/obsidian-fast-note-sync
   - **官方商店**: <s>打開 Obsidian 社區插件市場, 搜索 **Fast Note Sync** 安裝</s>
        > ⚠️ 插件尚未上架官方商店,無法搜索, 請手動安裝
   - **手動安裝**: 訪問 https://github.com/haierkeys/obsidian-fast-note-sync/releases 下載安裝包, 解压到 Obsidian 插件目錄下 **.obsidian/plugins**
2. 打開插件配置項，點擊 **粘貼遠端配置** 按鈕，將遠端服務配置粘貼到輸入框中。


## 📦 服務端部署

後端服務設置，請參考：
- <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
- <a href="https://cnb.cool/haierkeys/fast-note-sync-service">Fast Note Sync Service (cnb.cool 鏡像庫)</a>
