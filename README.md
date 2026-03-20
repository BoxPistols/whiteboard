# The White Board

Figmaの複雑さを排除し、本質的な描画・ホワイトボード機能に集中した高速・軽量ツール。
Claude Code Agentとの連携に最適化されたAIフレンドリーなアーキテクチャ。

## 主要機能

- 描画ツール（矩形、円、線、鉛筆、矢印）
- オブジェクトの色・サイズ・プロパティ編集
- レイヤー管理（表示/非表示、ロック、並び替え、グループ化）
- 複数ページ対応とページノート
- Undo/Redo履歴管理
- グリッド表示とスナップ
- ダークモード対応
- キーボードショートカットのカスタマイズ
- JSON/SVG/PNGエクスポート・インポート
- localStorageによる自動保存

## セットアップ

```bash
pnpm install
pnpm dev
```

ブラウザで `http://localhost:3290` を開く。

## 利用可能なコマンド

```bash
pnpm dev            # 開発サーバー起動（ポート3290）
pnpm build          # プロダクションビルド
pnpm lint           # ESLintチェック
pnpm lint:fix       # ESLint自動修正
pnpm format         # Prettierフォーマット
pnpm format:check   # フォーマットチェック
pnpm type-check     # TypeScript型チェック
pnpm fix            # フォーマット + lint修正
pnpm test           # テスト実行
pnpm test:ui        # テストUI
pnpm test:coverage  # カバレッジ計測
pnpm storybook      # Storybook起動
```

## 技術スタック

- **Next.js 15** - Reactフレームワーク
- **TypeScript** - 型安全性
- **fabric.js** - キャンバス描画ライブラリ
- **Zustand** - 軽量状態管理
- **Tailwind CSS** - ユーティリティファーストCSS

## コード品質

- TypeScript strict mode
- ESLint + Prettier設定済み
- Vitest + Testing Libraryによるテスト
- Husky + lint-stagedによるコミット前チェック
- Storybookによるコンポーネントカタログ
