import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom 27 + vitest 4 では localStorage のメソッドが関数として配線されず
// "localStorage.setItem is not a function" で落ちる。各テストへ spy 付き・Map バックの
// モックを注入し、テスト間の状態リークも防ぐ（個別テストでの prototype 差し替えは不要になる）
function createLocalStorageMock(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: vi.fn((key: string) => (store.has(key) ? store.get(key)! : null)),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size
    },
  } as Storage
}

function installLocalStorage() {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: createLocalStorageMock(),
  })
}

// matchMedia の既定モック（テストごとに上書き可能なよう beforeEach で再設定）
function installMatchMedia(matches = false) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })
}

// モジュール評価時（テストファイルの import 時）に走るトップレベルコード
// （例: lib/store.ts の migrateLocalStorageKeys()）も実モックで動くよう即時インストール
installLocalStorage()
installMatchMedia(false)

// 各テストの前に作り直してテスト間の状態リークを断つ
beforeEach(() => {
  installLocalStorage()
  installMatchMedia(false)
})

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(public callback: MutationCallback) {}
  observe() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
