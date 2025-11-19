# Figma Clone

Figmaライクな描画ツールです。Next.js、TypeScript、Fabric.jsを使用して構築されています。

## 機能

- ✏️ 描画ツール（矩形、円、線、鉛筆）
- 🎨 オブジェクトの色とサイズの調整
- 📐 プロパティパネルでのオブジェクト編集
- 📚 レイヤー管理（表示/非表示、ロック、削除）
- 🖱️ オブジェクトの選択と操作

## 使い方

1. 依存関係のインストール:
```bash
npm install
```

2. 開発サーバーの起動:
```bash
npm run dev
```

3. ブラウザで `http://localhost:3000` を開く

## 技術スタック

- **Next.js 15** - Reactフレームワーク
- **TypeScript** - 型安全性
- **Fabric.js** - キャンバス描画ライブラリ
- **Zustand** - 状態管理
- **Tailwind CSS** - スタイリング
- **Figma Plugin API互換** - Figma APIと互換性のある型定義

## 開発環境

### 利用可能なコマンド

```bash
npm run dev         # 開発サーバー起動
npm run build       # プロダクションビルド
npm run lint        # ESLintチェック
npm run format      # Prettierフォーマット
npm run type-check  # TypeScript型チェック
```

### Claude Code Skills

このプロジェクトにはClaude Code用のスラッシュコマンドが用意されています：

- `/lint` - ESLintチェックを実行
- `/format` - Prettierでコードをフォーマット
- `/test-build` - プロダクションビルドのテスト

## コード品質

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier設定済み
- ✅ ResizeObserverによるレスポンシブキャンバス
- ✅ useCallbackによるパフォーマンス最適化
- ✅ aria-label属性によるアクセシビリティ対応
- ✅ instanceof型ガードによる型安全性
- ✅ crypto.randomUUIDによる一意なID生成
