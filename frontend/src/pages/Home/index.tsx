import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Search,
  Grid,
  List,
  Plus,
  Check,
  ArrowUpDown,
  Clock,
  Maximize2,
  SortAsc,
  FolderPlus,
  FileText,
  FolderInput,
  FilePlus,
  ChevronLeft,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { Popover, message } from 'antd'
import type { Book, SortMode, ViewMode } from '@/types'
import Sidebar from '@/components/features/Sidebar'
import BookCard from '@/components/features/BookCard'
import ConfirmModal from '@/components/features/ConfirmModal'
import RenameModal from '@/components/features/RenameModal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import ImportModal, { type ModalOption } from '@/components/features/ImportModal'
import SelectFilesModal from '@/components/features/SelectFilesModal'
import { desktopBridge } from '@/bridge'
import { openNovel } from '@/services/novelBridge'
import { useLibraryStore } from '@/stores/libraryStore'
import { formatBookCategory, mapNovelToBook, normalizeNovel } from '@/utils/novel'
import styles from './Home.module.scss'

function isPickerCancelled(error: unknown) {
  return error instanceof Error && error.message.includes('未选择文件')
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }

    try {
      const serialized = JSON.stringify(error)
      if (serialized && serialized !== '{}') {
        return serialized
      }
    } catch {
      return fallback
    }
  }

  return fallback
}

function normalizeBookExtension(format?: string) {
  const trimmedFormat = (format || '').trim()
  if (!trimmedFormat) {
    return ''
  }

  return trimmedFormat.startsWith('.') ? trimmedFormat : `.${trimmedFormat}`
}

function getBookDisplayNameWithExtension(book: Book) {
  const extension = normalizeBookExtension(book.format)
  if (!extension) {
    return book.title
  }

  return book.title.toLowerCase().endsWith(extension.toLowerCase())
    ? book.title
    : `${book.title}${extension}`
}

function getDeleteConfirmMessage(book: Book) {
  if (book.isDirectory) {
    return `确定删除此目录吗？`
  }

  return `确定删除「${getBookDisplayNameWithExtension(book)}」吗？`
}

function getDeleteSuccessMessage(book: Book) {
  if (book.isDirectory) {
    return `已删除目录「${book.title}」`
  }

  return `已删除「${getBookDisplayNameWithExtension(book)}」`
}

function getDeleteDescription(book: Book) {
  if (book.isDirectory) {
    return '会从书架移除该目录和目录内记录，并清理关联阅读进度。原始文件不会被删除。'
  }

  return '会从书架移除这本书，并清理当前阅读进度。原始文件不会被删除。'
}

function getDeleteDetail(book: Book) {
  return book.isDirectory ? book.title : getBookDisplayNameWithExtension(book)
}

function getBatchDeleteTitle(count: number) {
  return `确定删除已选中的 ${count} 个条目吗？`
}

function getBatchDeleteDescription() {
  return '会从书架移除所选条目，并清理关联阅读进度。原始文件不会被删除。'
}

function getBatchDeleteDetail(books: Book[]) {
  if (books.length === 0) {
    return ''
  }

  const preview = books.slice(0, 3).map((book) => getDeleteDetail(book))
  return books.length <= 3
    ? preview.join('、')
    : `${preview.join('、')} 等 ${books.length} 个条目`
}

function getRenameDescription(book: Book) {
  if (book.isDirectory) {
    return '只会修改书架里的目录名称，不会改动你本地的原始文件夹或文件。'
  }

  return '只会修改书架里的显示名称，不会改动本地原始文件。'
}

function getRenamePreview(book: Book, nextTitle?: string) {
  const safeTitle = nextTitle?.trim() || book.title

  if (book.isDirectory) {
    return safeTitle
  }

  const extension = normalizeBookExtension(book.format)
  return extension && !safeTitle.toLowerCase().endsWith(extension.toLowerCase())
    ? `${safeTitle}${extension}`
    : safeTitle
}

function resolveDirectoryReadTarget(book: Book) {
  return book.files?.find((file) => file.id === book.lastReadFileId) || book.files?.[0] || null
}

function mapDirectoryFileToBook(
  directory: Book,
  file: NonNullable<Book['files']>[number]
): Book {
  return {
    id: file.id,
    title: file.title,
    author: file.author || '未知作者',
    cover: file.cover,
    type: 'novel',
    category: formatBookCategory(file.format),
    isDirectory: false,
    filePath: file.filePath,
    format: file.format,
    fileSize: file.fileSize,
    progress: file.progress,
    lastReadTime: file.lastReadTime,
    createdAt: directory.createdAt,
    parentDirectoryId: directory.id,
  }
}

interface ReaderNavigationTarget {
  filePath: string
  sourceDirectoryId?: string
}

function resolveBookReadTarget(book: Book): ReaderNavigationTarget | null {
  if (book.isDirectory) {
    const targetFile = resolveDirectoryReadTarget(book)
    if (!targetFile?.filePath) {
      return null
    }

    return {
      filePath: targetFile.filePath,
      sourceDirectoryId: book.id,
    }
  }

  if (!book.filePath) {
    return null
  }

  return {
    filePath: book.filePath,
    sourceDirectoryId: book.parentDirectoryId,
  }
}

/**
 * Home 页面 - 书架/图书馆视图
 */
export default function Home() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [messageApi, messageContextHolder] = message.useMessage()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('time')
  const [sortPopoverOpen, setSortPopoverOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importModalConfig, setImportModalConfig] = useState<{
    title: string
    options: ModalOption[]
  }>({ title: '', options: [] })
  const [selectFilesModalOpen, setSelectFilesModalOpen] = useState(false)
  const [targetDirectory, setTargetDirectory] = useState<Book | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([])
  const [batchDeleteTargets, setBatchDeleteTargets] = useState<Book[]>([])
  const [renameTarget, setRenameTarget] = useState<Book | null>(null)
  const {
    books,
    upsertBook,
    createDirectory,
    renameBook,
    renameFileInDirectory,
    removeBook,
    removeFileFromDirectory,
    moveBooksToDirectory,
    addImportedFileToDirectory,
  } = useLibraryStore()

  const currentDirectoryId = searchParams.get('directory')
  const currentDirectory =
    books.find((book) => book.id === currentDirectoryId && book.isDirectory) || null
  const visibleBooks = currentDirectory
    ? (currentDirectory.files || []).map((file) => mapDirectoryFileToBook(currentDirectory, file))
    : books

  useEffect(() => {
    if (!currentDirectoryId || currentDirectory) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('directory')
    setSearchParams(nextSearchParams)
  }, [currentDirectory, currentDirectoryId, searchParams, setSearchParams])

  const filteredBooks = visibleBooks.filter((book) => {
    if (selectedCategory === 'recent') {
      const sevenDaysAgo = Date.now() - 7 * 86400000
      if (!book.lastReadTime || book.lastReadTime < sevenDaysAgo) {
        return false
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
    }

    return true
  })

  const sortedBooks = [...filteredBooks].sort((a, b) => {
    switch (sortMode) {
      case 'time':
        return (b.lastReadTime || 0) - (a.lastReadTime || 0)
      case 'size': {
        const aSize = a.isDirectory ? a.totalFiles || 0 : a.fileSize || 0
        const bSize = b.isDirectory ? b.totalFiles || 0 : b.fileSize || 0
        return bSize - aSize
      }
      case 'name':
        return a.title.localeCompare(b.title, 'zh-CN')
      default:
        return 0
    }
  })

  const selectedBookIdSet = new Set(selectedBookIds)
  const selectedVisibleBooks = sortedBooks.filter((book) => selectedBookIdSet.has(book.id))
  const hasSelectedBooks = selectedVisibleBooks.length > 0
  const allVisibleSelected =
    sortedBooks.length > 0 && selectedVisibleBooks.length === sortedBooks.length

  useEffect(() => {
    if (!multiSelectMode) {
      return
    }

    const visibleIds = new Set(sortedBooks.map((book) => book.id))
    setSelectedBookIds((prev) => {
      const next = prev.filter((id) => visibleIds.has(id))
      return next.length === prev.length ? prev : next
    })
  }, [multiSelectMode, sortedBooks])

  const availableSingleFiles = books.filter((book) => !book.isDirectory)

  const sortOptions = [
    { value: 'time' as SortMode, label: '按时间排序', icon: <Clock size={16} /> },
    { value: 'size' as SortMode, label: '按大小排序', icon: <Maximize2 size={16} /> },
    { value: 'name' as SortMode, label: '按名称排序', icon: <SortAsc size={16} /> },
  ]

  const sortContent = (
    <div className={styles.sortMenu}>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          className={`${styles.sortMenuItem} ${sortMode === option.value ? styles.active : ''}`}
          onClick={() => {
            setSortMode(option.value)
            setSortPopoverOpen(false)
          }}
        >
          <span className={styles.sortMenuIcon}>{option.icon}</span>
          <span className={styles.sortMenuLabel}>{option.label}</span>
        </button>
      ))}
    </div>
  )

  const enterDirectory = (directoryId: string) => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('directory', directoryId)
    setSearchParams(nextSearchParams)
  }

  const exitDirectory = () => {
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('directory')
    setSearchParams(nextSearchParams)
  }

  const closeDeleteModal = () => {
    setDeleteTarget(null)
    setBatchDeleteTargets([])
  }

  const exitMultiSelectMode = () => {
    setMultiSelectMode(false)
    setSelectedBookIds([])
    setBatchDeleteTargets([])
  }

  const enterMultiSelectMode = () => {
    setRenameTarget(null)
    closeDeleteModal()
    setSortPopoverOpen(false)
    setMultiSelectMode(true)
    setSelectedBookIds([])
  }

  const loadNovelForShelf = async (filePath = '', options?: { sourceDirectoryId?: string }) => {
    const directorySource =
      books.find(
        (book) => book.id === options?.sourceDirectoryId && book.isDirectory
      ) || null
    const existingDirectoryFile = directorySource?.files?.find(
      (file) => file.filePath === filePath
    )
    const existingBook =
      books.find((book) => book.filePath === filePath) ||
      (directorySource && existingDirectoryFile
        ? mapDirectoryFileToBook(directorySource, existingDirectoryFile)
        : undefined)
    const openedNovel = await openNovel(filePath)
    const normalizedNovel = normalizeNovel(openedNovel)
    const shelfBook = mapNovelToBook(normalizedNovel, existingBook)
    return { normalizedNovel, shelfBook }
  }

  const navigateToReader = (
    filePath: string,
    options?: { activateBossMode?: boolean; sourceDirectoryId?: string }
  ) => {
    const readerState = {
      filePath,
      ...(options?.activateBossMode ? { activateBossMode: true } : {}),
      ...(options?.activateBossMode ? { bossModeEntry: 'home' } : {}),
      ...(options?.sourceDirectoryId ? { returnDirectoryId: options.sourceDirectoryId } : {}),
    }

    navigate('/reader', {
      state: readerState,
    })
  }

  const openImportModalForDirectory = (book: Book) => {
    setTargetDirectory(book)
    setImportModalConfig({
      title: `添加文件到「${book.title}」`,
      options: [
        {
          key: 'add-existing',
          icon: <FolderInput size={48} />,
          title: '添加已有文件',
          description: '从书架中选择已有的文件',
          onClick: () => setSelectFilesModalOpen(true),
        },
        {
          key: 'import-new',
          icon: <FilePlus size={48} />,
          title: '导入新文件',
          description: '从本地直接导入到目录',
          onClick: () => {
            void handleImportNewFiles(book)
          },
        },
      ],
    })
    setImportModalOpen(true)
  }

  const handleImport = () => {
    if (currentDirectory) {
      openImportModalForDirectory(currentDirectory)
      return
    }

    setImportModalConfig({
      title: '导入文件',
      options: [
        {
          key: 'create-directory',
          icon: <FolderPlus size={48} />,
          title: '创建目录',
          description: '创建新目录管理系列作品',
          needsInput: true,
          inputLabel: '请输入目录名称：',
          inputPlaceholder: '例如：三体系列、海贼王等',
          onClick: (name) => handleCreateDirectory(name || ''),
        },
        {
          key: 'import-file',
          icon: <FileText size={48} />,
          title: '导入单文件',
          description: '支持 TXT、EPUB、PDF 阅读；MOBI / AZW3 暂不支持解析',
          onClick: handleImportFile,
        },
      ],
    })
    setImportModalOpen(true)
  }

  const handleCreateDirectory = (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    createDirectory(trimmedName)
  }

  const handleImportFile = async () => {
    try {
      const { shelfBook } = await loadNovelForShelf()
      upsertBook(shelfBook)
      messageApi.success(`已导入「${getBookDisplayNameWithExtension(shelfBook)}」`)
    } catch (error) {
      if (!isPickerCancelled(error)) {
        console.error('导入文件失败:', error)
        messageApi.error(getErrorMessage(error, '导入文件失败'))
      }
    }
  }

  const handleQuickRead = async (book: Book) => {
    const target = resolveBookReadTarget(book)
    if (!target?.filePath) {
      messageApi.warning('当前目录还没有可阅读的文件')
      return
    }

    try {
      navigateToReader(target.filePath, { sourceDirectoryId: target.sourceDirectoryId })
    } catch (error) {
      console.error('打开目录失败:', error)
      messageApi.error(getErrorMessage(error, '打开目录失败'))
    }
  }

  const handleImportToDirectory = (book: Book) => {
    openImportModalForDirectory(book)
  }

  const handleImportNewFiles = async (directory = targetDirectory) => {
    if (!directory) {
      return
    }

    try {
      const { shelfBook } = await loadNovelForShelf('', {
        sourceDirectoryId: directory.id,
      })
      addImportedFileToDirectory(directory.id, shelfBook)
      messageApi.success(
        `已导入「${getBookDisplayNameWithExtension(shelfBook)}」到「${directory.title}」`
      )
    } catch (error) {
      if (!isPickerCancelled(error)) {
        console.error('导入目录文件失败:', error)
        messageApi.error(getErrorMessage(error, '导入目录文件失败'))
      }
    }
  }

  const handleSelectFiles = (selectedFileIds: string[]) => {
    if (!targetDirectory || selectedFileIds.length === 0) {
      return
    }

    moveBooksToDirectory(targetDirectory.id, selectedFileIds)
    messageApi.success(`已添加到「${targetDirectory.title}」`)
  }

  const handleOpenBook = async (book: Book) => {
    if (book.isDirectory) {
      enterDirectory(book.id)
      return
    }

    const target = resolveBookReadTarget(book)
    if (!target?.filePath) {
      return
    }

    try {
      navigateToReader(target.filePath, {
        sourceDirectoryId: target.sourceDirectoryId,
      })
    } catch (error) {
      console.error('打开书籍失败:', error)
      messageApi.error(getErrorMessage(error, '打开书籍失败'))
    }
  }

  const handleOpenBookInBossMode = async (book: Book) => {
    const target = resolveBookReadTarget(book)
    if (!target?.filePath) {
      messageApi.warning('当前条目还没有可阅读的文件')
      return
    }

    try {
      navigateToReader(target.filePath, {
        activateBossMode: true,
        sourceDirectoryId: target.sourceDirectoryId,
      })
    } catch (error) {
      console.error('老板模式打开失败:', error)
      messageApi.error(getErrorMessage(error, '老板模式打开失败'))
    }
  }

  const handleEditBook = (book: Book) => {
    setRenameTarget(book)
  }

  const handleRenameConfirm = (nextTitle: string) => {
    if (!renameTarget) {
      return
    }

    if (renameTarget.parentDirectoryId) {
      renameFileInDirectory(renameTarget.parentDirectoryId, renameTarget.id, nextTitle)
    } else {
      renameBook(renameTarget.id, nextTitle)
    }

    messageApi.success(
      renameTarget.isDirectory
        ? `已重命名为「${nextTitle}」`
        : `已更新书名为「${getRenamePreview(renameTarget, nextTitle)}」`
    )
    setRenameTarget(null)
  }

  const handleDeleteBook = (book: Book) => {
    setRenameTarget(null)
    setBatchDeleteTargets([])
    setDeleteTarget({
      ...book,
      files: book.files?.map((file) => ({ ...file })),
    })
  }

  const handleToggleBookSelection = (book: Book) => {
    setSelectedBookIds((prev) =>
      prev.includes(book.id) ? prev.filter((id) => id !== book.id) : [...prev, book.id]
    )
  }

  const handleToggleSelectAllVisible = () => {
    if (sortedBooks.length === 0) {
      return
    }

    setSelectedBookIds(allVisibleSelected ? [] : sortedBooks.map((book) => book.id))
  }

  const handleRequestBatchDelete = () => {
    if (!hasSelectedBooks) {
      return
    }

    setRenameTarget(null)
    setDeleteTarget(null)
    setBatchDeleteTargets(
      selectedVisibleBooks.map((book) => ({
        ...book,
        files: book.files?.map((file) => ({ ...file })),
      }))
    )
  }

  const deleteBookRecord = async (targetBook: Book) => {
    const progressFilePaths = targetBook.isDirectory
      ? (targetBook.files || [])
          .map((file) => file.filePath)
          .filter((filePath): filePath is string => Boolean(filePath))
      : targetBook.filePath
        ? [targetBook.filePath]
        : []
    const uniqueProgressFilePaths = [...new Set(progressFilePaths)]

    await Promise.allSettled(
      uniqueProgressFilePaths.map((filePath) => desktopBridge.progress.deleteProgress(filePath))
    )

    if (targetBook.parentDirectoryId) {
      removeFileFromDirectory(targetBook.parentDirectoryId, targetBook.id)
    } else {
      removeBook(targetBook.id)
    }
  }

  const handleConfirmDelete = async () => {
    const targets = deleteTarget ? [deleteTarget] : batchDeleteTargets
    if (targets.length === 0) {
      return
    }

    try {
      for (const targetBook of targets) {
        await deleteBookRecord(targetBook)
      }

      if (deleteTarget) {
        messageApi.success(getDeleteSuccessMessage(deleteTarget))
      } else {
        const deletedIds = new Set(targets.map((book) => book.id))
        setSelectedBookIds((prev) => prev.filter((id) => !deletedIds.has(id)))
        messageApi.success(`已删除 ${targets.length} 个条目`)
      }
    } catch (error) {
      console.error('删除书籍失败:', error)
      messageApi.error(getErrorMessage(error, '删除失败，请稍后重试'))
      throw error
    }
  }

  const emptyText = searchQuery
    ? '没有找到匹配的书籍'
    : currentDirectory
      ? '这个目录还是空的，先给它加一本书'
      : '书架还是空的，先导入一本小说试试'

  return (
    <div className={styles.container}>
      {messageContextHolder}
      <Sidebar
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className={styles.main}>
        <header className={styles.header}>
          <Input
            icon={<Search size={20} />}
            placeholder={currentDirectory ? '搜索当前目录中的书籍...' : '搜索书名或作者...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery('')}
            className={`${styles.searchInput} ${multiSelectMode ? styles.searchInputCompact : ''}`}
            wrapperClassName={styles.searchInputFrame}
          />

          <div className={styles.toolbar}>
            <div className={styles.viewModeToggle}>
              <button
                className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                onClick={() => setViewMode('grid')}
                aria-label="网格视图"
                title="网格视图"
              >
                <Grid size={20} />
              </button>
              <button
                className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                onClick={() => setViewMode('list')}
                aria-label="列表视图"
                title="列表视图"
              >
                <List size={20} />
              </button>
            </div>

            <Popover
              content={sortContent}
              trigger="click"
              open={sortPopoverOpen}
              onOpenChange={setSortPopoverOpen}
              placement="bottomRight"
            >
              <button
                className={`${styles.viewButton} ${sortPopoverOpen ? styles.active : ''}`}
                aria-label="排序"
                title="排序"
              >
                <ArrowUpDown size={20} />
              </button>
            </Popover>

            {multiSelectMode ? (
              <div className={styles.selectionToolbar}>
                <span className={styles.selectionSummary}>
                  已选 {selectedVisibleBooks.length} / {sortedBooks.length}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={allVisibleSelected ? <Square size={18} /> : <Check size={18} />}
                  onClick={handleToggleSelectAllVisible}
                  disabled={sortedBooks.length === 0}
                >
                  {allVisibleSelected ? '取消全选' : '全选当前'}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<X size={18} />}
                  onClick={exitMultiSelectMode}
                >
                  取消多选
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  icon={<Trash2 size={18} />}
                  onClick={handleRequestBatchDelete}
                  disabled={!hasSelectedBooks}
                >
                  删除已选 ({selectedVisibleBooks.length})
                </Button>
              </div>
            ) : (
              <>
                <Button icon={<Plus size={20} />} onClick={handleImport}>
                  {currentDirectory ? '添加到目录' : '导入文件'}
                </Button>
                <Button
                  variant="secondary"
                  icon={<Trash2 size={18} />}
                  onClick={enterMultiSelectMode}
                  disabled={sortedBooks.length === 0}
                >
                  多选删除
                </Button>
              </>
            )}
          </div>
        </header>
        {currentDirectory && (
          <div className={styles.directoryBar}>
            <button className={styles.directoryBackButton} onClick={exitDirectory}>
              <ChevronLeft size={16} />
            </button>
            <div className={styles.directoryMeta}>
              <span className={styles.directoryPath}>书架 / {currentDirectory.title}</span>
            </div>
          </div>
        )}
        <div
          className={`${styles.content} ${currentDirectory ? styles.contentWithDirectory : ''}`}
        >
          {sortedBooks.length > 0 ? (
            <div className={`${styles.booksList} ${styles[viewMode]}`}>
              {sortedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  viewMode={viewMode}
                  onOpen={handleOpenBook}
                  onOpenInBossMode={handleOpenBookInBossMode}
                  onEdit={handleEditBook}
                  onDelete={handleDeleteBook}
                  onQuickRead={handleQuickRead}
                  onImportToDirectory={handleImportToDirectory}
                  selectionMode={multiSelectMode}
                  selected={selectedBookIdSet.has(book.id)}
                  onToggleSelect={handleToggleBookSelection}
                />
              ))}
            </div>
          ) : (
            <div className={styles.empty}>
              <p className={styles.emptyText}>{emptyText}</p>
            </div>
          )}
        </div>
      </main>

      <ImportModal
        open={importModalOpen}
        title={importModalConfig.title}
        options={importModalConfig.options}
        onClose={() => setImportModalOpen(false)}
      />
      <ConfirmModal
        open={deleteTarget !== null || batchDeleteTargets.length > 0}
        title={
          deleteTarget
            ? getDeleteConfirmMessage(deleteTarget)
            : getBatchDeleteTitle(batchDeleteTargets.length)
        }
        detail={
          deleteTarget ? getDeleteDetail(deleteTarget) : getBatchDeleteDetail(batchDeleteTargets)
        }
        description={
          deleteTarget ? getDeleteDescription(deleteTarget) : getBatchDeleteDescription()
        }
        confirmText={deleteTarget ? '确认删除' : `删除已选 (${batchDeleteTargets.length})`}
        cancelText="先不删"
        tone="danger"
        onClose={closeDeleteModal}
        onConfirm={handleConfirmDelete}
      />
      <RenameModal
        open={renameTarget !== null}
        title={renameTarget ? `重命名${renameTarget.isDirectory ? '目录' : '书籍'}` : ''}
        description={renameTarget ? getRenameDescription(renameTarget) : ''}
        currentName={renameTarget?.title || ''}
        placeholder={renameTarget?.isDirectory ? '例如：三体系列' : '例如：三体'}
        onClose={() => setRenameTarget(null)}
        onConfirm={handleRenameConfirm}
      />

      <SelectFilesModal
        open={selectFilesModalOpen}
        onClose={() => {
          setSelectFilesModalOpen(false)
          setTargetDirectory(null)
        }}
        onConfirm={handleSelectFiles}
        availableFiles={availableSingleFiles}
        targetDirectoryName={targetDirectory?.title || ''}
      />
    </div>
  )
}
