'use client'

import { useCanvasStore } from '@/lib/store'

export default function PagePanel() {
  const { pages, currentPageId, addPage, removePage, setCurrentPage } = useCanvasStore()

  const handleAddPage = () => {
    const pageNumber = pages.length + 1
    addPage(`Page ${pageNumber}`)
  }

  const handleRemovePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (pages.length > 1) {
      removePage(id)
    }
  }

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 z-10 flex items-center gap-2">
      <div className="flex gap-1">
        {pages.map((page) => (
          <div key={page.id} className="relative group">
            <button
              onClick={() => setCurrentPage(page.id)}
              className={`px-3 py-1 text-sm rounded ${
                currentPageId === page.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {page.name}
            </button>
            {pages.length > 1 && (
              <button
                onClick={(e) => handleRemovePage(page.id, e)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                title="ページを削除"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleAddPage}
        className="px-3 py-1 text-sm bg-green-500 hover:bg-green-600 text-white rounded"
        title="新しいページを追加"
      >
        +
      </button>
    </div>
  )
}
