import type { Preview } from '@storybook/nextjs'
import '../app/globals.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1f2937',
        },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: { width: '375px', height: '667px' },
        },
        tablet: {
          name: 'Tablet',
          styles: { width: '768px', height: '1024px' },
        },
        desktop: {
          name: 'Desktop',
          styles: { width: '1280px', height: '800px' },
        },
        widesceen: {
          name: 'Widescreen',
          styles: { width: '1920px', height: '1080px' },
        },
      },
    },
  },
  // グローバルツールバーにダークモード切り替えを追加
  globalTypes: {
    darkMode: {
      description: 'ダークモード切り替え',
      toolbar: {
        title: 'Dark Mode',
        icon: 'moon',
        items: [
          { value: 'light', title: 'ライトモード', icon: 'sun' },
          { value: 'dark', title: 'ダークモード', icon: 'moon' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    // Tailwindのdarkクラスを切り替えるデコレータ
    (Story, context) => {
      const isDark = context.globals.darkMode === 'dark'
      return (
        <div className={isDark ? 'dark' : ''}>
          <div className={isDark ? 'bg-gray-900 min-h-screen' : 'bg-white min-h-screen'}>
            <Story />
          </div>
        </div>
      )
    },
  ],
}

export default preview
