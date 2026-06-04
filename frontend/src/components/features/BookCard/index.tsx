import type { MouseEvent } from 'react'
import type { Book, ViewMode } from '@/types'
import { BookOpen, Eye, EyeOff, Edit2, Trash2, FolderOpen, Plus, FolderSearch } from 'lucide-react'
import Badge from '@/components/common/Badge'
import { formatContentTypeLabel } from '@/utils/novel'
import styles from './BookCard.module.scss'

export interface BookCardProps {
  book: Book
  viewMode?: ViewMode
  selectionMode?: boolean
  selected?: boolean
  onOpen?: (book: Book) => void
  onOpenInBossMode?: (book: Book) => void
  onEdit?: (book: Book) => void
  onDelete?: (book: Book) => void
  onQuickRead?: (book: Book) => void
  onImportToDirectory?: (book: Book) => void
  onRevealInFolder?: (book: Book) => void
  onToggleSelect?: (book: Book) => void
}

/**
 * BookCard 书籍卡片组件
 * 支持网格和列表两种展示模式
 * 支持单文件和目录两种类型
 */
export default function BookCard({
  book,
  viewMode = 'grid',
  selectionMode = false,
  selected = false,
  onOpen,
  onOpenInBossMode,
  onEdit,
  onDelete,
  onQuickRead,
  onImportToDirectory,
  onRevealInFolder,
  onToggleSelect,
}: BookCardProps) {
  const handlePrimaryOpen = () => {
    if (selectionMode) {
      onToggleSelect?.(book)
      return
    }

    onOpen?.(book)
  }
  const handlePrimaryOpenClick = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (selectionMode) {
      onToggleSelect?.(book)
      return
    }

    onOpen?.(book)
  }
  const handleBossMode = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onOpenInBossMode?.(book)
  }
  const handleQuickRead = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onQuickRead?.(book)
  }
  const handleImportToDirectory = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onImportToDirectory?.(book)
  }
  const handleRevealInFolder = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onRevealInFolder?.(book)
  }
  const handleEdit = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onEdit?.(book)
  }
  const handleDelete = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onDelete?.(book)
  }

  const clampProgress = (progress: number) =>
    Math.max(0, Math.min(100, Number(progress || 0)))
  const formatProgress = (progress: number) => {
    const normalized = clampProgress(progress)
    return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1)
  }
  const directoryProgress =
    book.isDirectory && book.files && book.files.length > 0
      ? Math.round(
          book.files.reduce((total, file) => total + clampProgress(file.progress || 0), 0) /
            book.files.length
        )
      : 0
  const progressValue = clampProgress(book.isDirectory ? directoryProgress : book.progress || 0)
  const progressLabel = formatProgress(progressValue)
  const categoryLabel = book.isDirectory
    ? `${book.totalFiles || 0} 个文件`
    : `${book.category} · ${formatContentTypeLabel(book.contentType)}`
  const cardClasses = [
    styles.card,
    styles[viewMode],
    selectionMode && styles.selectionMode,
    selected && styles.selected,
  ]
    .filter(Boolean)
    .join(' ')

  if (viewMode === 'list') {
    return (
      <div className={cardClasses} onClick={handlePrimaryOpen}>
        <div className={styles.coverWrapper}>
          <div className={styles.cover}>
            {book.cover ? (
              <img src={book.cover} alt={book.title} className={styles.coverImage} />
            ) : (
              <div className={styles.coverPlaceholder}>
                {book.isDirectory ? <FolderOpen size={48} /> : <BookOpen size={48} />}
              </div>
            )}

            {selectionMode && (
              <div
                className={`${styles.selectionMarker} ${selected ? styles.selectionMarkerActive : ''}`}
              >
                {selected ? '已选' : '选择'}
              </div>
            )}
          </div>
        </div>

        <div className={styles.listContent}>
          <div className={styles.listInfo}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <div className={styles.tagWrapper}>
                <Badge variant="primary" size="sm">
                  {categoryLabel}
                </Badge>
              </div>
            </div>
            <div className={styles.titleOverlay}>
              <h3 className={styles.title}>{book.title}</h3>
              <p className={styles.author}>作者: {book.author}</p>
            </div>
            <div className={styles.listProgressBar}>
              <div className={styles.listProgressTrack}>
                <div
                  className={styles.listProgressFill}
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <span className={styles.listProgressText}>{progressLabel}%</span>
            </div>
          </div>

          <div className={styles.footer}>
            {book.lastReadTime && (
              <p className={styles.lastRead}>
                最后阅读: {new Date(book.lastReadTime).toLocaleDateString()}
              </p>
            )}
            {!selectionMode && (
              <div className={styles.actions}>
                {book.isDirectory ? (
                  <>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={handlePrimaryOpenClick}
                      aria-label="进入目录"
                      title="进入目录"
                    >
                      <FolderOpen size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={handleQuickRead}
                      aria-label="立即阅读"
                      title="立即阅读"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={handleImportToDirectory}
                      aria-label="导入文件"
                      title="导入文件"
                    >
                      <Plus size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={handlePrimaryOpenClick}
                      aria-label="阅读"
                      title="阅读"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={handleBossMode}
                      aria-label="老板模式阅读"
                      title="老板模式阅读"
                    >
                      <EyeOff size={16} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={handleRevealInFolder}
                      aria-label="打开所在目录"
                      title="打开所在目录"
                    >
                      <FolderSearch size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={handleEdit}
                  aria-label="编辑"
                  title="编辑"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={handleDelete}
                  aria-label="删除"
                  title="删除"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cardClasses} onClick={handlePrimaryOpen}>
      <div className={styles.coverWrapper}>
        <div className={styles.cover}>
          {book.cover ? (
            <img src={book.cover} alt={book.title} className={styles.coverImage} />
          ) : (
            <div className={styles.coverPlaceholder}>
              {book.isDirectory ? <FolderOpen size={48} /> : <BookOpen size={48} />}
            </div>
          )}

          {!selectionMode && !book.isDirectory && book.progress !== undefined && (
            <div className={styles.progressCircle}>
              <svg className={styles.progressSvg} viewBox="0 0 36 36">
                <circle className={styles.progressBg} cx="18" cy="18" r="16" />
                <circle
                  className={styles.progressBar}
                  cx="18"
                  cy="18"
                  r="16"
                  strokeDasharray={`${progressValue}, 100`}
                />
              </svg>
              <span className={styles.progressText}>{progressLabel}%</span>
            </div>
          )}

          <div className={styles.tagWrapper}>
            <Badge variant="primary" size="sm">
              {categoryLabel}
            </Badge>
          </div>

          {selectionMode && (
            <div
              className={`${styles.selectionMarker} ${selected ? styles.selectionMarkerActive : ''}`}
            >
              {selected ? '已选' : '选择'}
            </div>
          )}

          <div className={styles.titleOverlay}>
            <h3 className={styles.title}>{book.title}</h3>
            <p className={styles.author}>作者: {book.author}</p>
          </div>

          {!selectionMode && (
            <div className={styles.hoverActions}>
              {book.isDirectory ? (
                <>
                  <button type="button" className={styles.actionButton} onClick={handlePrimaryOpenClick}>
                    <FolderOpen size={20} />
                    <span>进入目录</span>
                  </button>
                  <button type="button" className={styles.actionButton} onClick={handleQuickRead}>
                    <Eye size={20} />
                    <span>立即阅读</span>
                  </button>
                  <button type="button" className={styles.actionButton} onClick={handleImportToDirectory}>
                    <Plus size={20} />
                    <span>导入文件</span>
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={styles.actionButton} onClick={handlePrimaryOpenClick}>
                    <Eye size={20} />
                    <span>立刻阅读</span>
                  </button>
                  <button type="button" className={styles.actionButton} onClick={handleBossMode}>
                    <EyeOff size={20} />
                    <span>老板模式</span>
                  </button>
                  <button type="button" className={styles.actionButton} onClick={handleRevealInFolder}>
                    <FolderSearch size={20} />
                    <span>所在目录</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        {book.lastReadTime && (
          <p className={styles.lastRead}>
            最后阅读: {new Date(book.lastReadTime).toLocaleDateString()}
          </p>
        )}
        {!selectionMode && (
          <div className={styles.actions}>
            {!book.isDirectory && (
              <button
                type="button"
                className={styles.iconButton}
                onClick={handleRevealInFolder}
                aria-label="打开所在目录"
                title="打开所在目录"
              >
                <FolderSearch size={16} />
              </button>
            )}
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleEdit}
              aria-label="编辑"
              title="编辑"
            >
              <Edit2 size={16} />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={handleDelete}
              aria-label="删除"
              title="删除"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
