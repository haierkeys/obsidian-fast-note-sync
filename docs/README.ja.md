[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

ご質問がある場合は、新しい [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new) を作成するか、Telegram グループに参加して助けを求めてください: [https://t.me/obsidian_users](https://t.me/obsidian_users)

中国大陸地域では、Tencent `cnb.cool` ミラーリポジトリの使用をお勧めします: [https://cnb.cool/haierkeys/obsidian-fast-note-sync](https://cnb.cool/haierkeys/obsidian-fast-note-sync)



<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>高速なマルチデバイス同期、自動バックアップ、追跡可能なバージョン履歴、および共有・共同編集が可能な Obsidian 用ノート同期プラグイン</strong>
  <br>
  <em>PC、モバイル、ウェブなど、複数のデバイス間でノートをいつでもどこでもリアルタイムに同期します。ワンクリックで共有リンクを生成して友人と共有でき、編集履歴の追跡やゴミ箱の中身の復元も簡単に行えます。さらに、バックアップ、ミラーリング、Git同期にも対応しています。Fast Note Sync Service が提供する REST/MCP サービスを利用することで、自分だけの個人知識ベースを迅速に構築できます。</em>
</p>

<p align="center">
  独立したサーバーが必要です：<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="/docs/images/demo.gif" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ プラグイン機能

- 🚀 **極限までシンプルな設定**:
    - 面倒な設定は不要です。リモートサービスの構成を貼り付けるだけで、すぐに使い始めることができます。
    - また、デスクトップ版ではワンクリックインポートを使用して自動的に認証を完了することもできます。
- 📗 **ノートのリアルタイム同期**:
    - Vault（保管庫）内のすべてのノートの作成、更新、削除操作を自動的に監視して同期します。
- 🖼️ **添付ファイルの完全サポート**:
    - 画像、動画、音声などのあらゆる非設定ファイルをリアルタイムで同期します。
    > ⚠️ **注意**: v1.0以上、サーバー v0.9以上が必要です。添付ファイルのサイズを適切に管理してください。ファイルが大きいと同期の遅延が発生する可能性があります。
- ⚙️ **構成の同期**:
    - 構成同期機能を提供し、複数のデバイス間での構成同期をサポートします。複数のデバイスに手動で構成ファイルをコピーする手間から解放されます。
    > ⚠️ **注意**: v1.4以上、サーバー v1.0以上が必要です。現在はテスト段階ですので、注意して使用してください。
- 🛂 **同期の除外とホワイトリスト**:
    - 同期の除外とホワイトリスト機能を提供し、独自の同期戦略を指定できます。
- 🔄 **マルチデバイス同期**:
    - Mac、Windows、Android、iOS などのプラットフォームをサポートします。
- 📝 **ノートの履歴**:
    - ノートの履歴機能を提供し、ノートのすべての履歴変更の詳細を確認できます。
    - ノートを過去のバージョンに復元できます。
- 🛡️ **オフラインノート編集の自動マージ**:
    - オフラインデバイスでのノート変更は、サーバーに再接続したときに自動的にマージされ、最新の更新のみを保持することによるノート内容の消失を回避します。
- 🚫 **オフライン削除の同期と補完**:
    - オフライン中のノート、添付ファイル、構成の削除操作は、次回の接続時に自動的にサーバーに同期されるか、サーバーから自動的に補完されます。
- 🔍 **バージョン検出**:
    - バージョン検出機能を提供し、プラグイン側とサーバー側の最新バージョン情報を素早く取得して、迅速なアップグレードを可能にします。
- ☁️ **添付ファイルのクラウドプレビュー**:
    - 添付ファイルのオンラインプレビュー機能を提供します。添付ファイルをローカルデバイスに同期する必要がないため、ローカルストレージ容量を節約できます。
    > プラグインの除外設定と組み合わせることで、特定の添付ファイルに対してサーバーを経由せずにサードパーティのリポジトリ（WebDAVなど）を直接使用することができます。
- 🗒️ **同期ログ**:
    - 同期ログ機能を提供し、各同期の詳細情報を確認できます。
- **クラウドストレージバックアップ**: クラウドストレージバックアップ機能を提供し、ノートデータが失われないように保護します。

## 🗺️ ロードマップ (Roadmap)

継続的に改善を行っており、今後の開発計画は以下の通りです：
- [ ] **エンドツーエンド暗号化**: エンドツーエンド暗号化機能を提供し、ノートデータがどこに保存されていても安全であることを保証します。
- [ ] **AIノート**: AI+ノートに関連する革新的な活用方法を模索しています。皆様からの貴重な提案をお待ちしております。

> **改善の提案や新しいアイデアがある場合は、issue を提出して共有してください。適切な提案を慎重に評価し、採用させていただきます。**

## 💖 スポンサーとサポート

- このプラグインが非常に便利だと感じ、開発を継続してほしいと思われる場合は、以下の方法でサポートをお願いします。オープンソースソフトウェアへのご支援をお願いいたします。

  | Ko-fi *中国以外*                                                                                 |    | WeChat *中国*                                  |
  |--------------------------------------------------------------------------------------------------|----|------------------------------------------------|
  | [<img src="/docs/images/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="/docs/images/wxds.png" height="150"> |

- 支援者リスト：
  - <a href="https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.ja.md">Support.ja.md</a>
  - <a href="https://cnb.cool/haierkeys/fast-note-sync-service/-/blob/master/docs/Support.ja.md">Support.ja.md (cnb.cool ミラー)</a>


## 🚀 クイックスタート

**ステップ 1：プラグインの取得**

* **ストア検索：** Obsidian **設定** > **コミュニティプラグイン** > **閲覧** を開き、`Fast Note Sync` を検索してインストールします。 *(注：ストアに掲載されていない場合は、手動インストールを選択してください)*
* **手動ダウンロード：** [GitHub リリースページ](https://github.com/haierkeys/obsidian-fast-note-sync/releases) から `main.js`, `styles.css`, `manifest.json` などのファイルを取得し、`.obsidian/plugins/fast-note-sync` フォルダに配置します。

**ステップ 2：同期の承認**

1. 構築した **[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service)** の Web インターフェースにアクセスします。
2. 左側のナビゲーションバーで **「ノート保管庫」** を選択します。
3. **「Obsidian を一クリックで承認」** をクリックすると、システムが自動的に Obsidian を呼び出し、承認情報の転送を自动的に完了します。もちろん、手動で承認情報をプラグインにコピーすることも可能です。

## 📦 サーバー側のデプロイ

バックエンドサービスの設定については、以下を参照してください：
- <a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
- <a href="https://cnb.cool/haierkeys/fast-note-sync-service">Fast Note Sync Service (cnb.cool ミラー)</a>
