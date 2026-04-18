import 'fabric'

declare module 'fabric' {
  namespace fabric {
    interface Object {
      data?: {
        id: string
        type?: 'arrow' | 'sticky' // オブジェクトの種別識別子
        baseFill?: string // テーマ切り替え用の基本色（fill）
        baseStroke?: string // テーマ切り替え用の基本色（stroke）
        baseTheme?: 'light' | 'dark' // 基本色のテーマ
        stickyColor?: string // 付箋の背景色（自動反転判定等に利用）
        stickyId?: string // 付箋ペアを紐付ける識別子（bg と text で共有）
        stickyRole?: 'bg' | 'text' // 付箋パーツの役割
      }
    }
    // fabric 5.2+ で Group に追加された `interactive` プロパティを型に含める
    interface IGroupOptions {
      interactive?: boolean
    }
  }
}
