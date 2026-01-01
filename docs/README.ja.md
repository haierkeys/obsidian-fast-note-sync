[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>高速、安定、効率的、自由にデプロイ可能な Obsidian ノート同期＆バックアッププラグイン</strong>
  <br>
  <em>プライベートデプロイに対応。Obsidian ユーザーに、邪魔にならず、スムーズで、マルチデバイス間でのリアルタイムなノート同期＆バックアップを提供。Mac、Windows、Android、iOS などのプラットフォームをサポートし、多言語にも対応。</em>
</p>

<p align="center">
  独立したサーバーが必要です：<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ プラグイン機能

- **極限までシンプルな設定**：煩雑な設定は不要。リモートサービスの設定を貼り付けるだけで、すぐにご利用いただけます。
- **ノートのリアルタイム同期**：Vault（保管庫）内のすべてのノートの作成、更新、削除を自動的に監視し、同期します。
- **添付ファイルの完全サポート**：画像、動画、音声などの設定ファイル以外のファイルもリアルタイムで同期。
    > ⚠️ **注意**：v1.0+、サーバー v0.9+ が必要です。添付ファイルのサイズにご注意ください。大きなファイルは同期遅延の原因となる場合があります。
- **設定の同期**：設定同期機能を提供し、複数デバイス間での設定同期をサポート。手動で各デバイスに設定ファイルをコピーする手間から解放されます。
    > ⚠️ **注意**：v1.4+、サーバー v1.0+ が必要です。現在テスト段階のため、注意してご使用ください。
- **サーバーバージョンの確認**：サーバーのバージョン情報を表示し、サーバーの状態を簡単に把握できます。
- **マルチデバイス同期**：Mac、Windows、Android、iOS などのプラットフォームに対応。
- **ノート履歴**：ノート履歴機能を提供。プラグインまたはサーバーの WebGui から、ノートのすべての編集履歴を確認できます。変更詳細の確認や履歴バージョンのコピーが可能です。

## 🗺️ ロードマップ (Roadmap)

継続的に改善を行っています。以下は今後の開発計画です：

- [ ] **オフラインデバイスのノート競合の最適化**：オフライン状態での編集に対し、競合解決戦略を追加。最新の更新のみを保持することによる内容の消失を防ぎます。
- [ ] **クラウドストレージのバックアップ状態**：クラウドストレージの最新のバックアップ状態をいつでも確認できる機能。
- [ ] **ノート共有機能**：クラウド上のノートの共有リンクを生成。成果を簡単に他の人と共有できます。
- [ ] **AI ノート**：AI+ ノートに関連する革新的な機能を模索中。皆様からの貴重な提案をお待ちしております。

> **改善の提案や新しいアイデアがございましたら、issue を通じてお気軽にお知らせください。適切な提案は慎重に評価し、採用させていただきます。**

## 💰 価格

- このプラグインが有用だと感じ、開発の継続を支援したい場合は、以下の方法でサポートをお願いいたします。：

  | Ko-fi *中国国外*  |  | 微信 (WeChat) 募金 *中国国内* |
  | --- | ---| --- |
  | [<img src="https://ik.imagekit.io/haierkeys/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | または | <img src="https://ik.imagekit.io/haierkeys/wxds.png" height="150"> |

## 🚀 クイックスタート

1. プラグインのインストール (いずれかを選択)
   - **公式ストア**: <s>Obsidian コミュニティプラグイン市場で **Fast Note Sync** を検索してインストール</s>
        > ⚠️ 公式ストアにはまだ掲載されていないため、検索できません。手動でインストールしてください。
   - **手動インストール**: https://github.com/haierkeys/obsidian-fast-note-sync/releases からインストールパッケージをダウンロードし、Obsidian のプラグインディレクトリ **.obsidian/plugins** に解凍します。
2. プラグイン設定を開き、**リモート設定を貼り付け** ボタンをクリックして、リモートサービスの設定をテキストボックスに貼り付けます。


## 📦 サーバーのデプロイ

バックエンドサーバーの設定については、以下を参照してください：[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service)。
