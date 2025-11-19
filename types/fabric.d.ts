import 'fabric'

declare module 'fabric' {
  namespace fabric {
    interface Object {
      data?: {
        id: string
      }
    }
  }
}
