// カラー変換ユーティリティ
// Figma風のvariable collectionを実現するための色変換機能

/**
 * HEXをRGBに変換
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

/**
 * RGBをHSLに変換
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

/**
 * HSLをRGBに変換
 */
export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

/**
 * RGBをHEXに変換
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()
}

/**
 * HEXをHSLに変換
 */
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return rgbToHsl(rgb.r, rgb.g, rgb.b)
}

/**
 * HSLをHEXに変換
 */
export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l)
  return rgbToHex(rgb.r, rgb.g, rgb.b)
}

/**
 * lightモードのカラーからdarkモードのカラーを自動生成
 * 明度を反転させつつ、彩度を微調整することで自然なdark modeカラーを生成
 */
export function generateDarkModeColor(lightHex: string): string {
  const hsl = hexToHsl(lightHex)
  if (!hsl) return lightHex

  // 明度を反転（100 - l）して、ダークモードに適した明度に調整
  // 明るい色（l > 50）は暗く、暗い色（l < 50）は明るくする
  let newLightness: number

  if (hsl.l > 90) {
    // 非常に明るい色（50-90番台）→ 中程度の暗さ（600-800番台）
    newLightness = 20 + (100 - hsl.l) * 2
  } else if (hsl.l > 70) {
    // 明るい色（100-300番台）→ 暗い色（700-900番台）
    newLightness = 15 + (100 - hsl.l) * 1.5
  } else if (hsl.l > 50) {
    // やや明るい色（400番台）→ やや暗い色（600番台）
    newLightness = 25 + (100 - hsl.l) * 1.2
  } else if (hsl.l > 30) {
    // やや暗い色（500-600番台）→ やや明るい色（400-500番台）
    newLightness = 40 + (50 - hsl.l) * 1.5
  } else {
    // 暗い色（700-900番台）→ 明るい色（200-400番台）
    newLightness = 50 + (50 - hsl.l) * 2
  }

  // 明度を0-100の範囲に制限
  newLightness = Math.max(10, Math.min(90, newLightness))

  // 彩度を微調整（ダークモードでは彩度をやや抑える）
  const newSaturation = Math.max(0, Math.min(100, hsl.s * 0.9))

  return hslToHex(hsl.h, newSaturation, newLightness)
}

/**
 * darkモードのカラーからlightモードのカラーを自動生成
 */
export function generateLightModeColor(darkHex: string): string {
  const hsl = hexToHsl(darkHex)
  if (!hsl) return darkHex

  // darkモードの色から明度を反転
  // 基本的には 100 - lightness だが、極端な変換を避けるため調整
  let newLightness: number

  if (hsl.l < 20) {
    // 非常に暗い色（900番台） → 非常に明るい色（50-100番台）
    newLightness = 90 + (20 - hsl.l) * 0.5
  } else if (hsl.l < 35) {
    // 暗い色（700-800番台） → 明るい色（200-300番台）
    newLightness = 75 + (35 - hsl.l) * 1
  } else if (hsl.l < 50) {
    // やや暗い色（500-600番台） → やや明るい色（400-500番台）
    newLightness = 60 + (50 - hsl.l) * 1.2
  } else if (hsl.l < 70) {
    // やや明るい色（300-400番台） → やや暗い色（600-700番台）
    newLightness = 50 - (hsl.l - 50) * 1.2
  } else {
    // 明るい色（100-200番台） → 暗い色（800-900番台）
    newLightness = 35 - (hsl.l - 70) * 1
  }

  newLightness = Math.max(10, Math.min(95, newLightness))

  // 彩度をやや上げる
  const newSaturation = Math.max(0, Math.min(100, hsl.s * 1.1))

  return hslToHex(hsl.h, newSaturation, newLightness)
}

/**
 * 色がどのテーマに適しているかを判定
 * 明度が50以上ならlight、50未満ならdark
 */
export function detectColorTheme(hex: string): 'light' | 'dark' {
  const hsl = hexToHsl(hex)
  if (!hsl) return 'light'
  return hsl.l >= 50 ? 'light' : 'dark'
}

/**
 * 現在のテーマに適した色に変換
 */
export function convertColorForTheme(color: string, targetTheme: 'light' | 'dark'): string {
  // transparentや特殊な色はそのまま返す
  if (color === 'transparent' || color === '') return color

  const currentTheme = detectColorTheme(color)

  // すでに適切なテーマならそのまま返す
  if (currentTheme === targetTheme) return color

  // テーマに応じて変換
  return targetTheme === 'dark' ? generateDarkModeColor(color) : generateLightModeColor(color)
}
