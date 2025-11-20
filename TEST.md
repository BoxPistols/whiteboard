# Testing Guide

このプロジェクトでは、Vitestと@testing-library/reactを使用してテストを実施しています。

## テストの実行

### すべてのテストを実行

```bash
pnpm test
```

### ウォッチモードでテストを実行

```bash
pnpm test -- --watch
```

### UIモードでテストを実行

```bash
pnpm test:ui
```

### カバレッジレポートを生成

```bash
pnpm test:coverage
```

## テスト構成

### ユニットテスト

#### Zustand Store (`lib/__tests__/store.test.ts`)

- ツール選択
- レイヤー管理（追加、削除、表示/非表示、ロック）
- ページ管理
- オブジェクト選択
- クリップボード
- ズーム

#### コンポーネントテスト

##### Toolbar (`components/__tests__/Toolbar.test.tsx`)

- すべてのツールボタンのレンダリング
- 選択されたツールのハイライト
- ツールのクリックによる変更

##### LayersPanel (`components/__tests__/LayersPanel.test.tsx`)

- レイヤーパネルのレンダリング
- 空の状態の表示
- レイヤーの表示/非表示切り替え
- レイヤーのロック/ロック解除
- 選択されたレイヤーのハイライト

## テスト環境

- **テストフレームワーク**: Vitest
- **テストユーティリティ**: @testing-library/react
- **DOM環境**: jsdom
- **モック**:
  - ResizeObserver
  - MutationObserver
  - window.matchMedia

## テストのベストプラクティス

1. **各テストの前にストアをリセット**

   ```typescript
   beforeEach(() => {
     useCanvasStore.setState({
       selectedTool: 'select',
       // ... other state
     })
   })
   ```

2. **ユーザーインタラクションをシミュレート**

   ```typescript
   const user = userEvent.setup()
   await user.click(button)
   ```

3. **アクセシビリティを考慮したクエリを使用**
   ```typescript
   screen.getByRole('button')
   screen.getByTitle('Select')
   ```

## カバレッジ目標

- **関数**: 80%以上
- **行**: 80%以上
- **ブランチ**: 70%以上

## 継続的インテグレーション

テストは将来的にCI/CDパイプラインに統合される予定です。
