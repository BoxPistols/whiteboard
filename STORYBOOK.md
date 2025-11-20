# Storybook Guide

Storybookを使用して、UIコンポーネントを独立した環境で開発・テストできます。

## Storybookの起動

```bash
pnpm storybook
```

ブラウザで `http://localhost:6006` を開きます。

## Storybookのビルド

静的Storybookサイトをビルド：

```bash
pnpm build-storybook
```

ビルドされたファイルは `storybook-static` ディレクトリに出力されます。

## 実装されているストーリー

### Components

#### Toolbar

- **Default**: ライトモードのツールバー
- **DarkMode**: ダークモードのツールバー

すべてのツール（Select, Rectangle, Circle, Line, Arrow, Text, Pencil）のアイコンと機能を確認できます。

#### PropertiesPanel

- **Default**: ライトモードのプロパティパネル
- **DarkMode**: ダークモードのプロパティパネル

選択されたオブジェクトのプロパティ（色、サイズ、位置、透明度など）を表示・編集できます。

#### ContextMenu

- **WithSelection**: オブジェクトが選択されている状態
- **WithClipboard**: クリップボードにコピーされたオブジェクトがある状態
- **LockedObject**: ロックされたオブジェクトの状態
- **CanGroup**: グループ化可能な状態
- **CanUngroup**: グループ解除可能な状態
- **DarkMode**: ダークモードのコンテキストメニュー

右クリックメニューの全機能を確認できます。

#### AlignmentPanel

- **Default**: ライトモードの整列パネル
- **DarkMode**: ダークモードの整列パネル

複数オブジェクト選択時の整列機能（左/中央/右揃え、上/中央/下揃え、水平/垂直分散）を確認できます。

#### PagePanel

- **Default**: ライトモードのページパネル
- **DarkMode**: ダークモードのページパネル

複数ページの管理機能（ページ追加、削除、切り替え）を確認できます。

#### Icons

- **AllIcons**: すべてのアイコンの一覧
- **DifferentSizes**: アイコンの異なるサイズ
- **DarkMode**: ダークモードでのアイコン表示

SVGアイコンライブラリの全アイコンを確認できます。

### LayersPanel

- **Default**: ライトモードのレイヤーパネル
- **DarkMode**: ダークモードのレイヤーパネル

レイヤーの表示、並び替え、表示/非表示、ロックなどの機能を確認できます。

## Storybookの構成

### ディレクトリ構造

```
.storybook/
  ├── main.ts        # Storybookのメイン設定
  └── preview.ts     # グローバルデコレーターとパラメータ

components/
  ├── Toolbar.stories.tsx
  ├── PropertiesPanel.stories.tsx
  ├── ContextMenu.stories.tsx
  ├── AlignmentPanel.stories.tsx
  ├── PagePanel.stories.tsx
  ├── LayersPanel.stories.tsx
  └── icons/
      └── index.stories.tsx
```

### ストーリーの作成

新しいストーリーを作成する場合：

```typescript
import type { Meta, StoryObj } from '@storybook/react'
import MyComponent from './MyComponent'

const meta: Meta<typeof MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MyComponent>

export const Default: Story = {
  args: {
    // props
  },
}
```

## Storybookの機能

### Controls

各ストーリーのパラメータをインタラクティブに変更できます。

### Actions

イベントハンドラーの呼び出しをログに記録できます。

### Docs

自動生成されるドキュメントでコンポーネントの使用方法を確認できます。

### Backgrounds

ライトモードとダークモードを切り替えて表示を確認できます。

## ダークモードのサポート

すべてのコンポーネントはダークモードに対応しています。Storybookのツールバーから背景色を切り替えて確認できます。

## アクセシビリティ

Storybookのアドオンを使用して、コンポーネントのアクセシビリティをチェックできます（将来的に追加予定）。
