[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>高速・安定・効率的・自由にデプロイ可能なObsidianノート同期＆バックアッププラグイン</strong>
  <br>
  <em>プライベートデプロイメントに対応し、Obsidianユーザーに邪魔されない、シルクのように滑らかな、マルチデバイスリアルタイム同期のノート同期＆バックアッププラグインを提供することに専念しています。Mac、Windows、Android、iOSなどのプラットフォームをサポートし、多言語対応を提供します。</em>
</p>

<p align="center">
  独立したサーバーと併用する必要があります:<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ プラグイン機能

- **シンプルな設定**:複雑な設定は不要で、リモートサーバー設定を貼り付けるだけですぐに使用できます。
- **ノートのリアルタイム同期**:Vault(リポジトリ)内のすべてのノートの作成、更新、削除操作を自動的に監視して同期します。
- **添付ファイルの完全サポート**:画像、動画、音声などの各種非設定ファイルをリアルタイムで同期します。
    > ⚠️ **注意**:v1.0+、サーバーv0.9+が必要です。添付ファイルのサイズを管理してください。大きなファイルは同期の遅延を引き起こす可能性があります。
- **設定の同期**:設定同期機能を提供し、複数のデバイス間での設定同期をサポートします。複数のデバイスに手動で設定ファイルをコピーする苦痛から解放されます。
    > ⚠️ **注意**:v1.4+、サーバーv1.0+が必要です。現在テスト段階ですので、慎重にご使用ください。
- **サーバーバージョン表示**:サーバーのバージョン情報を表示し、サーバーのバージョン状態を簡単に把握できます。
- **マルチデバイス同期**:Mac、Windows、Android、iOSなどのプラットフォームをサポートします。
- **ノート履歴**:ノート履歴機能を提供します。プラグイン側、サーバー側WebGUIで、ノートのすべての履歴修正バージョンを表示でき、修正の詳細を確認したり、履歴バージョンの内容をコピーしたりできます。

## 🗺️ ロードマップ

私たちは継続的に改善を進めています。以下は今後の開発計画です:


- [ ] **クラウドストレージバックアップステータス**:クラウドストレージのバックアップステータスをいつでも確認できる機能で、最新のクラウドストレージバックアップ状態を把握できます。
- [ ] **ノート共有機能**:クラウド上のノートの共有リンクを生成し、自分の成果を他の人と簡単に共有できます。
- [ ] **AIノート**:AI+ノート関連の革新的な遊び方を探求します。貴重なご提案をお待ちしております。

> **改善提案や新しいアイデアがある場合は、issueを提出して私たちと共有してください。真剣に評価し、適切な提案を採用します。**

## 💰 価格

- このプラグインが役に立ち、継続的な開発をサポートしたい場合は、こちらでサポートできます:
[<img src="https://cdn.ko-fi.com/cdn/kofi3.png?v=3" alt="BuyMeACoffee" width="100">](https://ko-fi.com/haierkeys)


## 🚀 クイックスタート

1. プラグインをインストール(2つのうち1つを選択)
   - **公式ストア**: <s>Obsidianコミュニティプラグインマーケットプレイスを開き、**Fast Note Sync**を検索してインストール</s>
        > ⚠️ プラグインはまだ公式ストアに掲載されていないため、検索できません。手動でインストールしてください
   - **手動インストール**: https://github.com/haierkeys/obsidian-fast-note-sync/releases にアクセスしてインストールパッケージをダウンロードし、Obsidianプラグインディレクトリ **.obsidian/plugin** に解凍してください
2. プラグイン設定を開き、**リモート設定を貼り付け**ボタンをクリックして、リモートサーバー設定を入力ボックスに貼り付けます。


## 📦 サーバーのデプロイメント

バックエンドサービスの設定については、以下を参照してください:[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service)。
