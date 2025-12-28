[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>快速、穩定、高效、任意部署的 Obsidian 筆記 同步&備份 外掛程式</strong>
  <br>
  <em>可私有化部署,專注為 Obsidian 使用者提供無打擾、絲般順滑、多端即時同步的筆記同步&備份外掛程式, 支援 Mac、Windows、Android、iOS 等平台,並提供多語言支援。</em>
</p>

<p align="center">
  需配合獨立伺服器端使用:<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ 外掛程式功能

- **極簡配置**:無需繁瑣設定,只需貼上遠端服務配置即可開箱即用。
- **筆記即時同步**:自動監聽並同步 Vault (倉庫) 內所有筆記的建立、更新與刪除操作。
- **附件全面支援**:即時同步圖片、影片、音訊等各類非設定檔案。
    > ⚠️ **注意**:需要 v1.0+,伺服器端 v0.9+。請控制附件檔案大小,大檔案可能會導致同步延遲。
- **配置同步**:提供配置同步功能,支援多台裝置的配置同步, 告別手動給多端裝置拷貝配置檔案的痛苦。
    > ⚠️ **注意**:需要 v1.4+,伺服器端 v1.0+。目前還在測試階段,請謹慎使用。
- **伺服器端版本檢視**: 顯示伺服器的版本資訊,方便瞭解伺服器的版本狀態。
- **多端同步**:支援 Mac、Windows、Android、iOS 等平台。
- **筆記歷史**:提供筆記歷史功能,您可以外掛程式端、伺服器端WebGui,檢視筆記的所有歷史修改版本, 您可以檢視修改詳情或者複製歷史版本內容。

## 🗺️ 路線圖 (Roadmap)

我們正在持續改進,以下是未來的開發計劃:


- [ ] **雲端儲存備份狀態**:隨時檢視雲端儲存備份狀態功能,方便你瞭解最新的雲端儲存備份狀態。
- [ ] **筆記分享功能**:為您的雲端筆記產生分享連結,方便您將自己成果分享給他人。
- [ ] **AI筆記**:探索 AI+ 筆記相關的創新玩法, 等待您提供寶貴的建議。

> **如果您有改進建議或新想法,歡迎透過提交 issue 與我們分享——我們會認真評估並採納合適的建議。**

## 💰 價格

- 如果覺得這個外掛程式很有用,並且想要支援它的繼續開發,你可以在這裡支援我:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 快速開始

1. 安裝外掛程式 (二選一)
   - **官方商店**: <s>開啟 OBSidian 社群外掛程式市場, 搜尋 **Fast Note Sync** 安裝</s>
        > ⚠️ 外掛程式尚未上架官方商店,無法搜尋, 請手動安裝
   - **手動安裝**: 造訪 https://github.com/haierkeys/obsidian-fast-note-sync/releases 下載安裝包, 解壓縮到 Obsidian 外掛程式目錄下 **.obsidian/plugin**
2. 開啟外掛程式配置項,點選 **貼上遠端配置** 按鈕,將遠端服務配置貼上到輸入框中。


## 📦 伺服器端部署

後端服務設定,請參考:[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service)。
