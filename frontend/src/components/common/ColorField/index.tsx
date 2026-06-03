import { useEffect, useState } from 'react'
import styles from './ColorField.module.scss'

export interface ColorFieldProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  helperText?: string
  className?: string
  commitOnBlurOnly?: boolean
}

function normalizeColorValue(value: string) {
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value.toUpperCase() : '#FFFFFF'
}

/**
 * ColorField 颜色选择组件
 * 统一项目内颜色选择的视觉和交互，只暴露标准十六进制值。
 */
export default function ColorField({
  id,
  label,
  value,
  onChange,
  disabled = false,
  helperText,
  className = '',
  commitOnBlurOnly = false,
}: ColorFieldProps) {
  const normalizedValue = normalizeColorValue(value)
  const [draftValue, setDraftValue] = useState(normalizedValue)

  useEffect(() => {
    setDraftValue(normalizedValue)
  }, [normalizedValue])

  const commitColor = (nextValue = draftValue) => {
    const normalizedNextValue = normalizeColorValue(nextValue)
    setDraftValue(normalizedNextValue)
    if (normalizedNextValue !== normalizedValue) {
      onChange(normalizedNextValue)
    }
  }

  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      {label && (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      )}

      <label
        className={[styles.picker, disabled ? styles.disabled : '']
          .filter(Boolean)
          .join(' ')}
        htmlFor={id}
      >
        <span
          className={styles.swatch}
          style={{ backgroundColor: draftValue }}
          aria-hidden="true"
        />
        <span className={styles.value}>{draftValue}</span>
        <span className={styles.caption}>点击换色</span>
        <input
          id={id}
          type="color"
          className={styles.input}
          value={draftValue}
          onInput={(event) => setDraftValue(event.currentTarget.value.toUpperCase())}
          onChange={(event) => {
            const nextValue = event.currentTarget.value.toUpperCase()
            setDraftValue(nextValue)
            if (!commitOnBlurOnly) {
              commitColor(nextValue)
            }
          }}
          onBlur={() => commitColor()}
          disabled={disabled}
        />
      </label>

      {helperText && <p className={styles.helperText}>{helperText}</p>}
    </div>
  )
}
