import type { fabric } from 'fabric'
import type { TokensData, ModeId, TokenValue } from './tokenTypes'
import { BINDABLE_PROPS, type BindableProp } from './tokenConstants'

// トークンIDから指定モードの値を解決する。
// モードに値が無ければ、トークンが属するコレクションの先頭モード → values の最初、の順でフォールバック。
// 見つからなければ undefined（削除済み/欠番トークン = orphan）。
export function resolveToken(
  data: TokensData,
  tokenId: string,
  mode: ModeId
): TokenValue | undefined {
  const token = data.tokens.find((t) => t.id === tokenId)
  if (!token) return undefined
  if (mode in token.values) return token.values[mode]
  const collection = data.collections.find((c) => c.id === token.collectionId)
  const fallbackMode = collection?.modeIds.find((m) => m in token.values)
  if (fallbackMode) return token.values[fallbackMode]
  const firstKey = Object.keys(token.values)[0]
  return firstKey !== undefined ? token.values[firstKey] : undefined
}

// プロパティ別に fabric が受け取れる primitive へ整形する。
// color(fill/stroke)は文字列、dimension/number(strokeWidth/fontSize)は数値（'4px' は parseFloat）。
export function coerceForProp(raw: TokenValue, prop: string): string | number {
  if (prop === 'fill' || prop === 'stroke') return String(raw)
  if (typeof raw === 'number') return raw
  const n = parseFloat(String(raw))
  return Number.isFinite(n) ? n : 0
}

const TEXT_TYPES = new Set(['i-text', 'text', 'textbox'])

// fabric の set 型は fontSize を keyof Object に持たないため、動的キー設定はゆるい型でラップする
const setFabricProp = (obj: fabric.Object, key: BindableProp, value: string | number) => {
  ;(obj as unknown as { set: (k: string, v: unknown) => void }).set(key, value)
}

// 解決済みの値をオブジェクトへ適用する（バインド時 / 再解決時で共通）。
// - group は fill/stroke/strokeWidth を子要素へカスケード（updateObjectProperty と同じ手法）。
// - color は base 色（baseFill/baseStroke）と baseTheme を同期（アンバインド後のテーマ追従用）。
// - fontSize はテキスト系にのみ適用する。
export function applyResolvedValue(
  obj: fabric.Object,
  prop: BindableProp,
  value: string | number,
  theme: 'light' | 'dark'
): void {
  if (prop === 'fontSize' && !TEXT_TYPES.has(obj.type ?? '')) return

  if (obj.type === 'group' && (prop === 'fill' || prop === 'stroke' || prop === 'strokeWidth')) {
    const items = (obj as fabric.Group).getObjects()
    items.forEach((item) => {
      setFabricProp(item, prop, value)
      item.dirty = true
    })
  } else {
    setFabricProp(obj, prop, value)
  }

  if (prop === 'fill' && obj.data) {
    obj.data.baseFill = String(value)
    obj.data.baseTheme = theme
  } else if (prop === 'stroke' && obj.data) {
    obj.data.baseStroke = String(value)
    obj.data.baseTheme = theme
  }
  obj.dirty = true
}

// canvas 上の tokenRefs を持つオブジェクトを走査し、各バインドプロパティを解決して反映する。
// 解決できないトークン（削除/欠番）は既存値を維持し、参照はそのまま残す（orphan）。
// 戻り値: 1つでも変更があれば true。
export function resolveTokensOnCanvas(
  canvas: fabric.Canvas,
  data: TokensData,
  mode: ModeId,
  theme: 'light' | 'dark'
): boolean {
  let changed = false
  for (const obj of canvas.getObjects()) {
    const refs = obj.data?.tokenRefs
    if (!refs) continue
    for (const prop of BINDABLE_PROPS) {
      const tokenId = refs[prop]
      if (!tokenId) continue
      const raw = resolveToken(data, tokenId, mode)
      if (raw === undefined) continue // orphan: 既存値を維持
      applyResolvedValue(obj, prop, coerceForProp(raw, prop), theme)
      changed = true
    }
  }
  if (changed) canvas.requestRenderAll()
  return changed
}
