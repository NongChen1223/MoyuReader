import Select from '@/components/common/Select'
import type { ReadingMode } from '@/types'
import styles from './ReadingModeControls.module.scss'

export const readingModeOptions: Array<{
  value: ReadingMode
  label: string
  description: string
}> = [
  {
    value: 'chapter-scroll',
    label: '按章节阅读（适合小说）',
    description: '底部进度条表示当前章节进度，适合普通小说。',
  },
  {
    value: 'continuous-scroll',
    label: '一直往下看（小说/文档）',
    description: '提前加载更多后续章节，底部进度条表示整本进度。',
  },
  {
    value: 'paged',
    label: '像翻书一样一页页看',
    description: '保留分页阅读语义，底部进度条表示整本进度。',
  },
  {
    value: 'auto-scroll',
    label: '自动向下滚',
    description: '适合自动阅读，底部进度条暂按当前章节进度。',
  },
  {
    value: 'comic-strip',
    label: '漫画连续看（不用翻页）',
    description: 'PDF 漫画建议选这个，会提前加载更多页面，底部进度条表示整本进度。',
  },
  {
    value: 'comic-single',
    label: '漫画一页页看',
    description: '适合单页漫画阅读，底部进度条表示整本进度。',
  },
  {
    value: 'comic-double',
    label: '漫画双页看',
    description: '适合横屏或宽窗口漫画阅读，底部进度条表示整本进度。',
  },
  {
    value: 'pdf-continuous',
    label: 'PDF 连续看',
    description: '适合 PDF 文档或 PDF 漫画连续滚动，底部进度条表示整本进度。',
  },
  {
    value: 'pdf-single-fit',
    label: 'PDF 单页适高',
    description: '适合逐页查看 PDF，底部进度条表示整本进度。',
  },
]

export function usesWholeBookProgress(readingMode: ReadingMode) {
  return (
    readingMode === 'continuous-scroll' ||
    readingMode === 'paged' ||
    readingMode === 'comic-strip' ||
    readingMode === 'comic-single' ||
    readingMode === 'comic-double' ||
    readingMode === 'pdf-continuous' ||
    readingMode === 'pdf-single-fit'
  )
}

interface ReadingModeControlsProps {
  readingMode: ReadingMode
  onReadingModeChange: (readingMode: ReadingMode) => void
  compact?: boolean
}

export default function ReadingModeControls({
  readingMode,
  onReadingModeChange,
  compact = false,
}: ReadingModeControlsProps) {
  const activeOption =
    readingModeOptions.find((option) => option.value === readingMode) || readingModeOptions[0]

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      <Select
        label="阅读方式"
        options={readingModeOptions.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={readingMode}
        onChange={(value) => onReadingModeChange(value as ReadingMode)}
      />
      <p className={styles.description}>{activeOption.description}</p>
    </div>
  )
}
