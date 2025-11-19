# SessionStart Hook for Figma Clone Project

このプロジェクトはNext.js、TypeScript、Fabric.jsを使用したFigmaクローンアプリです。

## プロジェクト構造
- `/app` - Next.jsアプリケーション
- `/components` - Reactコンポーネント
- `/lib` - ユーティリティと状態管理(Zustand)
- `/types` - TypeScript型定義(Figma Plugin API互換)

## 開発ガイドライン
1. 型安全性を重視し、`any`の使用を避ける
2. コンポーネントは`useCallback`でメモ化し、パフォーマンスを最適化
3. アクセシビリティ(aria-label)を考慮
4. Figma Plugin APIとの互換性を維持

## 利用可能なコマンド
- `/lint` - ESLintチェック
- `/format` - Prettierフォーマット
- `/test-build` - ビルドテスト

## 環境変数
- Node.js 18+ 推奨
- パッケージマネージャー: npm

セッション開始時に依存関係がインストールされているか確認してください。
