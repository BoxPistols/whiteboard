export type Tool = 'select' | 'rectangle' | 'circle' | 'line' | 'text' | 'pencil'

export interface CanvasObject {
  id: string
  type: 'rectangle' | 'circle' | 'line' | 'text' | 'path'
  x: number
  y: number
  width?: number
  height?: number
  fill?: string
  stroke?: string
  strokeWidth?: number
  text?: string
  fontSize?: number
  fontFamily?: string
  points?: number[]
  radius?: number
}

export interface Layer {
  id: string
  name: string
  visible: boolean
  locked: boolean
  objectId: string
}
