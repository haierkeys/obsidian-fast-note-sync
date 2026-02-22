[简体中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-CN.md) / [English](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/README.md) / [日本語](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ja.md) / [한국어](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.ko.md) / [繁體中文](https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/docs/README.zh-TW.md)

ご不明な点がございましたら、新しい [issue](https://github.com/haierkeys/obsidian-fast-note-sync/issues/new) を作成するか、Telegram グループに参加して助けを求めてください: [https://t.me/obsidian_users](https://t.me/obsidian_users)


<h1 align="center">Fast Note Sync For Obsidian</h1>

<p align="center">
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/release/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/releases"><img src="https://img.shields.io/github/v/tag/haierkeys/obsidian-fast-note-sync?label=release-alpha&style=flat-square" alt="alpha-release"></a>
    <a href="https://github.com/haierkeys/obsidian-fast-note-sync/blob/master/LICENSE"><img src="https://img.shields.io/github/license/haierkeys/obsidian-fast-note-sync?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/badge/Language-TypeScript-00ADD8?style=flat-square" alt="TypeScript">
</p>



<p align="center">
  <strong>高速、安定、効率的、自由にデプロイ可能な Obsidian ノート 同期＆バックアップ プラグイン</strong>
  <br>
  <em>プライベートデプロイが可能で、Obsidian ユーザーに邪魔のない、シームレスな、複数端末でのリアルタイム同期を提供するノート 同期＆バックアップ プラグインです。Mac、Windows、Android、iOS などのプラットフォームをサポートし、多言語にも対応しています。</em>
</p>

<p align="center">
  個別のサーバーが必要です：<a href="https://github.com/haierkeys/fast-note-sync-service">Fast Note Sync Service</a>
</p>

<div align="center">
    <img src="https://github.com/user-attachments/assets/8e61d99e-6f76-49b1-a03e-c952ad9e21b0" alt="fast-note-sync-service-preview" width="800" />
</div>


## ✨ プラグイン機能

- 🚀 **極限までシンプルな設定**:
    - 煩わしい設定は不要です。リモートサービスの設定を貼り付けるだけで、すぐにご利用いただけます。
    - デスクトップ版ではワンクリックインポートを使用して、自動的に認証を完了することもできます。
- 📗 **ノートのリアルタイム同期**:
    - Vault (倉庫) 内のすべてのノートの作成、更新、削除を自動的に監視し同期します。
- 🖼️ **添付ファイルの完全サポート**:
    - 画像、動画、音声などの設定以外のファイルもリアルタイムで同期します。
    > ⚠️ **注意**: v1.0+、サーバー v0.9+ が必要です。添付ファイルのサイズにご注意ください。大きなファイルは同期の遅延を引き起こす可能性があります。
- ⚙️ **設定の同期**:
    - 設定同期機能を提供し、複数のデバイス間での設定同期をサポートします。複数端末への設定ファイルの手動コピーから解放されます。
    > ⚠️ **注意**: v1.4+、サーバー v1.0+ が必要です。現在はテスト段階ですので、ご注意してご使用ください。
- 🛂 **同期除外とホワイトリスト**:
    - 同期除外とホワイトリスト機能を提供し、独自の同期戦略を指定できます。
- 🔄 **マルチデバイス同期**:
    - Mac、Windows、Android、iOS などのプラットフォームをサポートしています。
- 📝 **ノート履歴**:
    - ノート履歴機能を提供し、ノートのすべての変更詳細を確認できます。
    - ノートを過去のバージョンに復元できます。
- 🛡️ **オフライン編集の自動マージ**:
    - オフライン中のデバイスでのノート編集は、サーバーに再接続した際に自動的にマージされ、最新の更新のみを保持することによる内容の損失を防ぎます。
- 🚫 **オフライン削除の同期と補完**:
    - オフライン中のノート、添付ファイル、設定の削除操作は、次回接続時に自動的にサーバーに同期されるか、サーバーから自動的に補完されます。
- 🔍 **バージョン検出**:
    - バージョン検出機能を提供し、プラグイン/サーバーの最新バージョン情報を素早く取得して、アップグレードを容易にします。
- ☁️ **添付ファイルのクラウドプレビュー**:
    - 添付ファイルのオンラインプレビュー機能を提供し、ローカルデバイスに同期することなく閲覧できるため、ストレージ容量を節約できます。
    > プラグインの除外設定と組み合わせることで、特定の添付ファイルに対してサーバーを経由せずにサードパーティのリソースライブラリ (WebDav など) を直接使用することも可能です。
- 🗒️ **同期ログ**:
    - 同期ログ機能を提供し、各同期の詳細情報を確認できます。

## 🗺️ ロードマップ (Roadmap)

継続的に改善を行っており、今後の開発計画は以下の通りです：
- [ ] **ノート共有機能**: クラウドノートの共有リンクを生成し、成果を簡単に他者と共有できるようにします。
- [ ] **エンドツーエンド暗号化**: エンドツーエンド暗号化機能を提供し、ノートデータがどこに保存されていても安全であることを保証します。
- [ ] **クラウドストレージバックアップ**: クラウドストレージバックアップ機能を提供し、ノートデータの紛失を防ぎます。

- [ ] **AIノート**: AI+ ノートに関連する革新的な遊び方を模索しています。皆様からの貴重な提案をお待ちしております。

> **改善の提案や新しいアイデアがありましたら、issue を通じて教えてください。適切な提案は真剣に検討し、採用させていただきます。**

## 💖 スポンサーとサポート

- このプラグインが有用であると感じ、開発の継続を希望される場合は、以下の方法でサポートをお願いします。オープンソースソフトウェアへのご支援に感謝いたします：

  | Ko-fi *中国以外*                                                                                                     |    | Wechat *中国*                                                      |
  |----------------------------------------------------------------------------------------------------------------------|----|--------------------------------------------------------------------|
  | [<img src="https://ik.imagekit.io/haierkeys/kofi.png" alt="BuyMeACoffee" height="150">](https://ko-fi.com/haierkeys) | or | <img src="https://ik.imagekit.io/haierkeys/wxds.png" height="150"> |

- サポートリスト：
  - https://github.com/haierkeys/fast-note-sync-service/blob/master/docs/Support.zh-CN.md


## 🚀 クイックスタート

1. プラグインのインストール (どちらか一方)
   - **公式ストア**: <s>Obsidian コミュニティプラグインマーケットを開き、**Fast Note Sync** を検索してインストールします</s>
        > ⚠️ プラグインはまだ公式ストアに掲載されていないため、検索できません。手動でインストールしてください。
   - **手動インストール**: https://github.com/haierkeys/obsidian-fast-note-sync/releases にアクセスしてインストールパッケージをダウンロードし、Obsidian のプラグインディレクトリ **.obsidian/plugins** に解凍します。
   - **BRAT を使用してインストール** (携帯電話でのインストールをサポート): Obsidian コミュニティプラグインマーケットで [BRAT](https://github.com/TfTHacker/obsidian42-brat) プラグインを検索してインストールし、設定画面で **Add beta plugin** をクリックして https://github.com/haierkeys/obsidian-fast-note-sync を貼り付けます。
2. プラグインの設定を開き、**リモート設定を貼り付け** ボタンをクリックして、入力ボックスにリモートサービスの設定を貼り付けます。


## 📦 サーバーのデプロイ

バックエンドサービスの設定については、[Fast Note Sync Service](https://github.com/haierkeys/fast-note-sync-service) を参照してください。
