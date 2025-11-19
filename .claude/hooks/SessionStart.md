# SessionStart Hook for Figma Clone Project

このプロジェクトはNext.js、TypeScript、Fabric.jsを使用したFigmaクローンアプリです。

## プロジェクト構造

- `/app` - Next.jsアプリケーション
- `/components` - Reactコンポーネント
- `/lib` - ユーティリティと状態管理(Zustand)
- `/types` - TypeScript型定義(Figma Plugin API互換)

## 開発ガイドライン

1. **絵文字使用の厳禁** - いかなる場合も絵文字の使用は禁止。アイコンは必ずSVGアイコンコンポーネントを使用すること
2. 型安全性を重視し、`any`の使用を避ける
3. コンポーネントは`useCallback`でメモ化し、パフォーマンスを最適化
4. アクセシビリティ(aria-label)を考慮
5. Figma Plugin APIとの互換性を維持

## アイコン使用規則

- すべてのアイコンは `/components/icons/index.tsx` のSVGコンポーネントを使用
- 絵文字は一切使用しないこと
- 新しいアイコンが必要な場合は、SVGアイコンコンポーネントとして追加

## 利用可能なコマンド

- `/lint` - ESLintチェック
- `/format` - Prettierフォーマット
- `/test-build` - ビルドテスト

## 環境変数

- Node.js 18+ 推奨
- パッケージマネージャー: npm

セッション開始時に依存関係がインストールされているか確認してください。
