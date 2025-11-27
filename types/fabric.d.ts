import 'fabric'

declare module 'fabric' {
  namespace fabric {
    interface Object {
      data?: {
        id: string
        baseFill?: string // テーマ切り替え用の基本色（fill）
        baseStroke?: string // テーマ切り替え用の基本色（stroke）
        baseTheme?: 'light' | 'dark' // 基本色のテーマ
      }
    }
  }
}
