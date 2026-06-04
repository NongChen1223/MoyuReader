import { useEffect, useMemo, useRef, useState } from 'react'
import { FolderPen, PencilLine } from 'lucide-react'
import type { BookContentType } from '@/types'
import Button from '@/components/common/Button'
import Dialog from '@/components/common/Dialog'
import Input from '@/components/common/Input'
import styles from './RenameModal.module.scss'

const contentTypeOptions: Array<{ value: BookContentType; label: string; description: string }> = [
  { value: 'auto', label: '自动', description: '导入时自动判断' },
  { value: 'novel', label: '小说', description: '按章节文本阅读' },
  { value: 'comic', label: '漫画', description: '按图片页连续阅读' },
  { value: 'document', label: '文档', description: '按 PDF/扫描件阅读' },
]

export interface RenameModalProps {
  open: boolean
  title: string
  description: string
  currentName: string
  placeholder?: string
  contentType?: BookContentType
  showContentType?: boolean
  onClose: () => void
  onConfirm: (value: string, contentType?: BookContentType) => void
}

/**
 * RenameModal 命名编辑弹窗
 * 统一目录和书籍的重命名输入、校验和预览反馈。
 */
export default function RenameModal({
  open,
  title,
  description,
  currentName,
  placeholder = '请输入新名称',
  contentType = 'auto',
  showContentType = false,
  onClose,
  onConfirm,
}: RenameModalProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(currentName)
  const [nextContentType, setNextContentType] = useState<BookContentType>(contentType)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    setValue(currentName)
    setNextContentType(contentType)
    setError('')
  }, [contentType, currentName, open])

  useEffect(() => {
    if (!open) {
      return
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 20)

    return () => window.clearTimeout(timer)
  }, [open])

  const trimmedValue = value.trim()
  const canSubmit =
    trimmedValue.length > 0 &&
    (trimmedValue !== currentName.trim() ||
      (showContentType && nextContentType !== contentType))
  const currentIcon = useMemo(
    () => (title.includes('目录') ? <FolderPen size={22} /> : <PencilLine size={22} />),
    [title]
  )

  const handleConfirm = () => {
    if (!trimmedValue) {
      setError('名称不能为空')
      return
    }

    if (trimmedValue === currentName.trim() && (!showContentType || nextContentType === contentType)) {
      setError('内容还没有变化')
      return
    }

    onConfirm(trimmedValue, showContentType ? nextContentType : undefined)
    setError('')
  }

  const handleClose = () => {
    setValue(currentName)
    setNextContentType(contentType)
    setError('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      width={460}
      variant="brutal"
      showCloseButton={false}
    >
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.iconBadge}>{currentIcon}</div>
          <div className={styles.copy}>
            <span className={styles.eyebrow}>重命名</span>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.description}>{description}</p>
          </div>
        </div>

        <div className={styles.form}>
          <label className={styles.label} htmlFor="rename-input">
            新名称
          </label>
          <Input
            ref={inputRef}
            fullWidth
            id="rename-input"
            value={value}
            placeholder={placeholder}
            error={error}
            maxLength={80}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) {
                setError('')
              }
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleConfirm()
              }
            }}
          />
        </div>

        {showContentType && (
          <div className={styles.form}>
            <span className={styles.label}>内容类型</span>
            <div className={styles.typeGrid}>
              {contentTypeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`${styles.typeButton} ${
                    nextContentType === option.value ? styles.typeButtonActive : ''
                  }`}
                  onClick={() => setNextContentType(option.value)}
                >
                  <span>{option.label}</span>
                  <small>{option.description}</small>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.actions}>
          <Button variant="secondary" onClick={handleClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!canSubmit}>
            确认保存
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
