// Figma風カラートークン定義

export interface ColorToken {
  name: string
  value: string
  category: 'gray' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'custom'
}

// 初期カラーセット（Tailwind CSS互換）
export const defaultColorTokens: ColorToken[] = [
  // Gray
  { name: 'Gray 50', value: '#F9FAFB', category: 'gray' },
  { name: 'Gray 100', value: '#F3F4F6', category: 'gray' },
  { name: 'Gray 200', value: '#E5E7EB', category: 'gray' },
  { name: 'Gray 300', value: '#D1D5DB', category: 'gray' },
  { name: 'Gray 400', value: '#9CA3AF', category: 'gray' },
  { name: 'Gray 500', value: '#6B7280', category: 'gray' },
  { name: 'Gray 600', value: '#4B5563', category: 'gray' },
  { name: 'Gray 700', value: '#374151', category: 'gray' },
  { name: 'Gray 800', value: '#1F2937', category: 'gray' },
  { name: 'Gray 900', value: '#111827', category: 'gray' },

  // Red
  { name: 'Red 50', value: '#FEF2F2', category: 'red' },
  { name: 'Red 100', value: '#FEE2E2', category: 'red' },
  { name: 'Red 200', value: '#FECACA', category: 'red' },
  { name: 'Red 300', value: '#FCA5A5', category: 'red' },
  { name: 'Red 400', value: '#F87171', category: 'red' },
  { name: 'Red 500', value: '#EF4444', category: 'red' },
  { name: 'Red 600', value: '#DC2626', category: 'red' },
  { name: 'Red 700', value: '#B91C1C', category: 'red' },
  { name: 'Red 800', value: '#991B1B', category: 'red' },
  { name: 'Red 900', value: '#7F1D1D', category: 'red' },

  // Orange
  { name: 'Orange 50', value: '#FFF7ED', category: 'orange' },
  { name: 'Orange 100', value: '#FFEDD5', category: 'orange' },
  { name: 'Orange 200', value: '#FED7AA', category: 'orange' },
  { name: 'Orange 300', value: '#FDBA74', category: 'orange' },
  { name: 'Orange 400', value: '#FB923C', category: 'orange' },
  { name: 'Orange 500', value: '#F97316', category: 'orange' },
  { name: 'Orange 600', value: '#EA580C', category: 'orange' },
  { name: 'Orange 700', value: '#C2410C', category: 'orange' },
  { name: 'Orange 800', value: '#9A3412', category: 'orange' },
  { name: 'Orange 900', value: '#7C2D12', category: 'orange' },

  // Yellow
  { name: 'Yellow 50', value: '#FEFCE8', category: 'yellow' },
  { name: 'Yellow 100', value: '#FEF9C3', category: 'yellow' },
  { name: 'Yellow 200', value: '#FEF08A', category: 'yellow' },
  { name: 'Yellow 300', value: '#FDE047', category: 'yellow' },
  { name: 'Yellow 400', value: '#FACC15', category: 'yellow' },
  { name: 'Yellow 500', value: '#EAB308', category: 'yellow' },
  { name: 'Yellow 600', value: '#CA8A04', category: 'yellow' },
  { name: 'Yellow 700', value: '#A16207', category: 'yellow' },
  { name: 'Yellow 800', value: '#854D0E', category: 'yellow' },
  { name: 'Yellow 900', value: '#713F12', category: 'yellow' },

  // Green
  { name: 'Green 50', value: '#F0FDF4', category: 'green' },
  { name: 'Green 100', value: '#DCFCE7', category: 'green' },
  { name: 'Green 200', value: '#BBF7D0', category: 'green' },
  { name: 'Green 300', value: '#86EFAC', category: 'green' },
  { name: 'Green 400', value: '#4ADE80', category: 'green' },
  { name: 'Green 500', value: '#22C55E', category: 'green' },
  { name: 'Green 600', value: '#16A34A', category: 'green' },
  { name: 'Green 700', value: '#15803D', category: 'green' },
  { name: 'Green 800', value: '#166534', category: 'green' },
  { name: 'Green 900', value: '#14532D', category: 'green' },

  // Blue
  { name: 'Blue 50', value: '#EFF6FF', category: 'blue' },
  { name: 'Blue 100', value: '#DBEAFE', category: 'blue' },
  { name: 'Blue 200', value: '#BFDBFE', category: 'blue' },
  { name: 'Blue 300', value: '#93C5FD', category: 'blue' },
  { name: 'Blue 400', value: '#60A5FA', category: 'blue' },
  { name: 'Blue 500', value: '#3B82F6', category: 'blue' },
  { name: 'Blue 600', value: '#2563EB', category: 'blue' },
  { name: 'Blue 700', value: '#1D4ED8', category: 'blue' },
  { name: 'Blue 800', value: '#1E40AF', category: 'blue' },
  { name: 'Blue 900', value: '#1E3A8A', category: 'blue' },

  // Purple
  { name: 'Purple 50', value: '#FAF5FF', category: 'purple' },
  { name: 'Purple 100', value: '#F3E8FF', category: 'purple' },
  { name: 'Purple 200', value: '#E9D5FF', category: 'purple' },
  { name: 'Purple 300', value: '#D8B4FE', category: 'purple' },
  { name: 'Purple 400', value: '#C084FC', category: 'purple' },
  { name: 'Purple 500', value: '#A855F7', category: 'purple' },
  { name: 'Purple 600', value: '#9333EA', category: 'purple' },
  { name: 'Purple 700', value: '#7E22CE', category: 'purple' },
  { name: 'Purple 800', value: '#6B21A8', category: 'purple' },
  { name: 'Purple 900', value: '#581C87', category: 'purple' },

  // Pink
  { name: 'Pink 50', value: '#FDF2F8', category: 'pink' },
  { name: 'Pink 100', value: '#FCE7F3', category: 'pink' },
  { name: 'Pink 200', value: '#FBCFE8', category: 'pink' },
  { name: 'Pink 300', value: '#F9A8D4', category: 'pink' },
  { name: 'Pink 400', value: '#F472B6', category: 'pink' },
  { name: 'Pink 500', value: '#EC4899', category: 'pink' },
  { name: 'Pink 600', value: '#DB2777', category: 'pink' },
  { name: 'Pink 700', value: '#BE185D', category: 'pink' },
  { name: 'Pink 800', value: '#9D174D', category: 'pink' },
  { name: 'Pink 900', value: '#831843', category: 'pink' },

  // Special colors
  { name: 'White', value: '#FFFFFF', category: 'gray' },
  { name: 'Black', value: '#000000', category: 'gray' },
  { name: 'Transparent', value: 'transparent', category: 'gray' },
]

// カラーカテゴリーの表示順
export const colorCategories = [
  'gray',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
  'custom',
] as const

// カテゴリー名の日本語表示
export const categoryLabels: Record<ColorToken['category'], string> = {
  gray: 'グレー',
  red: '赤',
  orange: 'オレンジ',
  yellow: '黄',
  green: '緑',
  blue: '青',
  purple: '紫',
  pink: 'ピンク',
  custom: 'カスタム',
}
