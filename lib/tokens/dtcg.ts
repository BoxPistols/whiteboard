import type { TokensData, DesignToken, TokenType, TokenValue, ModeId } from './tokenTypes'
import { TOKENS_DATA_VERSION, createEmptyTokensData } from './tokenConstants'

// W3C DTCG（Design Tokens Community Group）形式の import/export。
// 標準の DTCG は単一値（$value + $type）でモード/コレクションの概念を持たないため、
// 当アプリ固有のメタ（モード一覧・コレクション・モード別値）は $extensions に格納してロスレス往復する。
// 構造:
//   {
//     "$extensions": { "com.whiteboard.tokens": { version, modes, collections } },
//     "<CollectionName>": { "<group>": { "<token>": { $type, $value, $extensions:{...modeValues} } } }
//   }

const EXT_META = 'com.whiteboard.tokens'
const EXT_MODE_VALUES = 'com.whiteboard.modeValues'

interface DTCGLeaf {
  $type: TokenType
  $value: TokenValue
  $extensions?: { [EXT_MODE_VALUES]?: Record<ModeId, TokenValue> }
}

type DTCGNode = { [key: string]: DTCGNode | DTCGLeaf | unknown }

const isLeaf = (node: unknown): node is DTCGLeaf =>
  !!node && typeof node === 'object' && '$value' in (node as object)

export function exportToDTCG(data: TokensData): DTCGNode {
  const root: DTCGNode = {
    $extensions: {
      [EXT_META]: {
        version: TOKENS_DATA_VERSION,
        modes: data.modes,
        collections: data.collections,
      },
    },
  }
  const collName = (id: string) => data.collections.find((c) => c.id === id)?.name ?? id
  const firstModeId = data.modes[0]?.id

  for (const token of data.tokens) {
    const group = (root[collName(token.collectionId)] ??= {}) as DTCGNode
    // トークン名をパス（'/' 区切り）でネスト
    const parts = token.name.split('/').filter(Boolean)
    let cursor = group
    for (let i = 0; i < parts.length - 1; i++) {
      cursor = (cursor[parts[i]] ??= {}) as DTCGNode
    }
    const leafKey = parts[parts.length - 1] ?? token.name
    cursor[leafKey] = {
      $type: token.type,
      // DTCG が要求する $value は先頭モードの値（モード別は $extensions に保持）
      $value:
        firstModeId !== undefined ? token.values[firstModeId] : Object.values(token.values)[0],
      $extensions: { [EXT_MODE_VALUES]: { ...token.values } },
    } satisfies DTCGLeaf
  }
  return root
}

export function importFromDTCG(dtcg: DTCGNode): TokensData {
  const meta = (dtcg.$extensions as Record<string, unknown> | undefined)?.[EXT_META] as
    | { modes?: TokensData['modes']; collections?: TokensData['collections'] }
    | undefined

  const base = createEmptyTokensData()
  const result: TokensData = {
    version: TOKENS_DATA_VERSION,
    modes: meta?.modes && meta.modes.length > 0 ? meta.modes : base.modes,
    collections: [],
    tokens: [],
  }

  const collectionIdByName = new Map<string, string>()
  if (meta?.collections) {
    for (const c of meta.collections) {
      result.collections.push(c)
      collectionIdByName.set(c.name, c.id)
    }
  }
  const ensureCollection = (name: string): string => {
    const existing = collectionIdByName.get(name)
    if (existing) return existing
    const id = crypto.randomUUID()
    result.collections.push({ id, name, modeIds: result.modes.map((m) => m.id) })
    collectionIdByName.set(name, id)
    return id
  }

  const allModeIds = result.modes.map((m) => m.id)

  // 各トップレベルグループ（= コレクション名）配下のリーフを再帰収集
  for (const [key, group] of Object.entries(dtcg)) {
    if (key.startsWith('$')) continue // $extensions 等の予約キーは飛ばす
    const collectionId = ensureCollection(key)

    const walk = (node: DTCGNode, path: string[]) => {
      for (const [k, child] of Object.entries(node)) {
        if (k.startsWith('$')) continue
        if (isLeaf(child)) {
          const modeValues = child.$extensions?.[EXT_MODE_VALUES] ?? {}
          // モード別値: $extensions を優先。無ければ $value を先頭モードへ。
          const values: Record<ModeId, TokenValue> = {}
          for (const mid of allModeIds) {
            if (mid in modeValues) values[mid] = modeValues[mid]
          }
          // 欠損モードは「最初に得られた値」で埋める（light のみ → dark へ複製、ロスレス維持）
          const seed = Object.values(values)[0] ?? child.$value
          for (const mid of allModeIds) {
            if (!(mid in values)) values[mid] = seed
          }
          const token: DesignToken = {
            id: crypto.randomUUID(),
            name: [...path, k].join('/'),
            collectionId,
            type: child.$type,
            values,
          }
          result.tokens.push(token)
        } else if (child && typeof child === 'object') {
          walk(child as DTCGNode, [...path, k])
        }
      }
    }
    if (group && typeof group === 'object') walk(group as DTCGNode, [])
  }

  return result
}
