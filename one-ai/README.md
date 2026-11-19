# ONE AI

ChatGPT風のシンプルなAIチャットWebアプリです。AIエンジンはローカルOllamaを使用します。

## 公開先
GitHub Pages: https://tk-sakusya.github.io/one-ai/

## Ollama接続
- ローカルOllamaサーバーの標準接続先: `http://localhost:11434`
- チャット: `POST /api/chat`
- モデル一覧: `GET /api/tags`
- APIキーは不要です。ローカルでダウンロード済みのモデルを選択できます。
- 初期モデル候補: `qwen2.5-coder:3b`

## GitHub Pagesから接続するための注意
Ollamaは初期状態でローカル向けのWebオリジンのみを許可します。GitHub Pagesからブラウザ接続する場合は、Ollamaの環境変数 `OLLAMA_ORIGINS` に次のオリジンを追加し、Ollamaを再起動してください。

```
https://tk-sakusya.github.io
```

Windowsでは、Ollamaの起動環境に `OLLAMA_ORIGINS=https://tk-sakusya.github.io` を設定します。設定変更後にOllamaを再起動してください。ローカルAPIは認証なしで利用できるため、信頼できる自分の端末でのみ使用し、Ollamaのポートを不用意にインターネットへ公開しないでください。

## 機能
- チャット作成・履歴・削除
- 会話のブラウザ内保存
- Ollamaのモデル一覧取得・選択
- 接続テスト
- モバイル対応レイアウト
- エラー表示

## 保存
会話履歴、接続先、選択モデルはブラウザのlocalStorageに保存されます。GitHubリポジトリに会話内容やAPIキーは保存しません。

## 制限
GitHub Pagesは静的ホスティングです。ONE AIは、サイトを開いた端末自身でOllamaが起動している場合に、その端末のOllamaへ接続します。別の利用者のPC上のOllamaへ自動接続するものではありません。
