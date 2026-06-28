# OneDrive クラウド同期（issue #14）

ボードデータ（IndexedDB の pages）を OneDrive の **アプリ専用フォルダ（AppFolder）** に
`whiteboard/<boardId>.json` として読み書きし、端末間共有・自動バックアップを実現する。

> ステータス: **基盤実装済み / OAuth 疎通は未配線**。
> MSAL + MS Graph の実ネットワーク層は、下記の Azure 設定（ユーザー作業）が済むまで有効化できない。

## アーキテクチャ（provider 非依存）

| ファイル                   | 役割                                                                | テスト    |
| -------------------------- | ------------------------------------------------------------------- | --------- |
| `lib/sync/types.ts`        | `CloudProvider` 抽象 / `BoardSnapshot` / `RemoteMeta` / `SyncState` | —         |
| `lib/sync/conflict.ts`     | 楽観ロック（rev ベース）の同期判定（純粋関数）                      | ✅ 全分岐 |
| `lib/sync/offlineQueue.ts` | オフライン中の push 待ちボードを保持し復帰時に再送                  | ✅        |
| `docs/onedrive-sync.md`    | 本書（Azure 設定手順）                                              | —         |

`CloudProvider` の背後に MSAL/Graph を閉じ込める設計のため、OneDrive 実装を差し替えても
同期エンジン・競合解決・UI は不変。Google Drive 等も同じインターフェースで後から追加できる。

### 競合解決（楽観ロック）

クライアントは「最後にリモートと一致させた版数」を `baseRev` として保持する。

- リモート無し → 初回 `upload`
- リモートが `baseRev` のまま → ローカル変更ありで `upload` / なしで `noop`
- リモートが `baseRev` より進行 → ローカル変更ありで **`conflict`**（diff プレビューしてユーザー選択）/ なしで `download`

`rev` が権威。`lastModified` は表示・タイブレーク用途のみ。

## ⚠️ ユーザー作業: Azure アプリ登録（これが無いと OAuth 疎通できない）

1. [Azure Portal](https://portal.azure.com) → **Microsoft Entra ID** → **アプリの登録** → **新規登録**
   - 名前: `whiteboard`（任意）
   - サポートされるアカウントの種類: **個人 + 職場/学校アカウント**（OneDrive 個人を使うなら個人を含める）
   - リダイレクト URI: **SPA** を選び、`http://localhost:3000`（開発）と本番 URL（例: `https://<your-app>.vercel.app`）を登録
2. 作成後の **アプリケーション (クライアント) ID** を控える
3. **API のアクセス許可** → Microsoft Graph → **委任** → `Files.ReadWrite.AppFolder` と `User.Read` を追加
   - AppFolder スコープなら他のユーザーファイルにはアクセスせず、`Apps/whiteboard/` 配下のみに限定される（最小権限）
4. SPA なのでクライアントシークレットは**不要**（Authorization Code Flow + PKCE）

### 環境変数

`.env.local`（および Vercel/Netlify の環境変数）に設定:

```
NEXT_PUBLIC_MS_CLIENT_ID=<手順2のクライアントID>
NEXT_PUBLIC_MS_REDIRECT_URI=http://localhost:3000   # 本番はデプロイ URL
```

> `NEXT_PUBLIC_` 接頭辞: SPA の MSAL はブラウザで client id を使うため公開変数で良い（client id は秘匿情報ではない）。**クライアントシークレットは作らない・置かない**。

## セキュリティ方針

- トークンは **メモリ保持**（MSAL の sessionStorage キャッシュ）を基本とし、refresh は MSAL のサイレント更新に委ねる
- スコープは `Files.ReadWrite.AppFolder` に限定（アプリ専用フォルダ外は触らない）
- 既存の JSON エクスポート/インポート、IndexedDB ローカル保存は維持（クラウドは追加層）

## 残作業（Azure 設定後に配線する PR）

1. `@azure/msal-browser` 追加 + `lib/sync/onedriveProvider.ts`（`CloudProvider` 実装、Graph `/me/drive/special/approot` へ read/write、ETag を `rev` にマップ）
2. 同期エンジン（手動/自動トグル、`decideSync` 駆動、`offlineQueue` 連携、`online`/`offline` イベント購読）
3. UI: サインイン/アウト + 同期ステータス表示（`SaveIndicator` 拡張）、競合時の diff プレビュー
4. 初回移行フロー（既存 IndexedDB データのクラウド初回アップロード）
