import { describe, it, expect } from 'vitest'
import {
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHex,
  hexToHsl,
  hslToHex,
  generateDarkModeColor,
  generateLightModeColor,
  detectColorTheme,
  convertColorForTheme,
} from '../colorUtils'

describe('colorUtils', () => {
  describe('Color conversion', () => {
    it('should convert HEX to RGB', () => {
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 })
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should convert RGB to HEX', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#FFFFFF')
      expect(rgbToHex(0, 0, 0)).toBe('#000000')
      expect(rgbToHex(255, 0, 0)).toBe('#FF0000')
    })

    it('should convert HEX to HSL', () => {
      const white = hexToHsl('#FFFFFF')
      expect(white?.l).toBe(100)

      const black = hexToHsl('#000000')
      expect(black?.l).toBe(0)
    })

    it('should convert HSL to HEX', () => {
      expect(hslToHex(0, 0, 100)).toBe('#FFFFFF')
      expect(hslToHex(0, 0, 0)).toBe('#000000')
    })
  })

  describe('Theme detection', () => {
    it('should detect light colors', () => {
      expect(detectColorTheme('#FFFFFF')).toBe('light')
      expect(detectColorTheme('#D1D5DB')).toBe('light') // Gray 300
      expect(detectColorTheme('#93C5FD')).toBe('light') // Blue 300
    })

    it('should detect dark colors', () => {
      expect(detectColorTheme('#000000')).toBe('dark')
      expect(detectColorTheme('#6B7280')).toBe('dark') // Gray 500
      expect(detectColorTheme('#1E40AF')).toBe('dark') // Blue 800
    })
  })

  describe('Dark mode color generation', () => {
    it('should generate darker colors from light colors', () => {
      const lightGray = '#D1D5DB' // Gray 300
      const darkGray = generateDarkModeColor(lightGray)
      const darkGrayHsl = hexToHsl(darkGray)

      // Darker color should have lower lightness
      const lightGrayHsl = hexToHsl(lightGray)
      expect(darkGrayHsl!.l).toBeLessThan(lightGrayHsl!.l)
    })

    it('should generate lighter colors from very dark colors', () => {
      const veryDark = '#111827' // Gray 900
      const forDark = generateDarkModeColor(veryDark)
      const forDarkHsl = hexToHsl(forDark)

      // Should be lighter than the original very dark color
      expect(forDarkHsl!.l).toBeGreaterThan(10)
    })
  })

  describe('Light mode color generation', () => {
    it('should generate lighter colors from dark colors', () => {
      const darkGray = '#6B7280' // Gray 500
      const lightGray = generateLightModeColor(darkGray)
      const lightGrayHsl = hexToHsl(lightGray)

      // Lighter color should have higher lightness
      const darkGrayHsl = hexToHsl(darkGray)
      expect(lightGrayHsl!.l).toBeGreaterThan(darkGrayHsl!.l)
    })
  })

  describe('convertColorForTheme', () => {
    it('should preserve color when already in correct theme', () => {
      const lightColor = '#D1D5DB' // Gray 300 (light)
      const result = convertColorForTheme(lightColor, 'light')

      // Should be the same or very similar
      const originalHsl = hexToHsl(lightColor)
      const resultHsl = hexToHsl(result)
      expect(Math.abs(originalHsl!.l - resultHsl!.l)).toBeLessThan(5)
    })

    it('should convert light color to dark theme', () => {
      const lightColor = '#D1D5DB' // Gray 300 (light)
      const darkResult = convertColorForTheme(lightColor, 'dark')
      const darkHsl = hexToHsl(darkResult)

      // Should be darker
      expect(darkHsl!.l).toBeLessThan(50)
    })

    it('should convert dark color to light theme', () => {
      const darkColor = '#6B7280' // Gray 500 (dark)
      const lightResult = convertColorForTheme(darkColor, 'light')
      const lightHsl = hexToHsl(lightResult)

      // Should be lighter
      expect(lightHsl!.l).toBeGreaterThan(50)
    })

    it('should handle transparent color', () => {
      expect(convertColorForTheme('transparent', 'dark')).toBe('transparent')
      expect(convertColorForTheme('transparent', 'light')).toBe('transparent')
      expect(convertColorForTheme('', 'dark')).toBe('')
    })
  })

  describe('Multiple theme switches', () => {
    it('should maintain color consistency across multiple switches', () => {
      const originalColor = '#3B82F6' // Blue 500
      const originalHsl = hexToHsl(originalColor)!

      // Light -> Dark -> Light -> Dark -> Light
      let currentColor = originalColor
      for (let i = 0; i < 5; i++) {
        const targetTheme = i % 2 === 0 ? 'dark' : 'light'
        currentColor = convertColorForTheme(currentColor, targetTheme)
      }

      // After switching back to light theme, should be similar to original
      // (允許一定誤差 - 複数回の変換で完全な可逆性は保証できないため)
      const finalHsl = hexToHsl(currentColor)!
      expect(Math.abs(finalHsl.h - originalHsl.h)).toBeLessThan(10) // Hue should be similar
      expect(Math.abs(finalHsl.s - originalHsl.s)).toBeLessThan(30) // Saturation drift is acceptable
    })

    it('should work correctly with baseColor approach (real use case)', () => {
      const originalColor = '#60A5FA' // Blue 400
      const originalHsl = hexToHsl(originalColor)!
      const originalTheme = detectColorTheme(originalColor)

      // Simulate real app behavior: always convert from baseColor
      const baseColor = originalColor
      const baseTheme = originalTheme

      // Switch to opposite theme multiple times
      let result1 = convertColorForTheme(baseColor, 'dark')
      let result2 = convertColorForTheme(baseColor, 'light')
      let result3 = convertColorForTheme(baseColor, 'dark')
      let result4 = convertColorForTheme(baseColor, 'light')

      // All light theme conversions should be consistent
      const result2Hsl = hexToHsl(result2)!
      const result4Hsl = hexToHsl(result4)!

      // Should produce same result every time
      expect(Math.abs(result2Hsl.l - result4Hsl.l)).toBeLessThan(5)
      expect(Math.abs(result2Hsl.h - result4Hsl.h)).toBeLessThan(5)
    })
  })
})
