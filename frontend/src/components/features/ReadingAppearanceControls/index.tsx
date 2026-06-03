import ColorField from '@/components/common/ColorField'
import Select from '@/components/common/Select'
import Slider from '@/components/common/Slider'
import styles from './ReadingAppearanceControls.module.scss'

type AppearanceVariant = 'page' | 'panel'

export interface ReadingAppearanceControlsProps {
  fontSize: number
  fontFamily: string
  fontWeight: number
  lineHeight: number
  pageWidth: number
  backgroundColor: string
  textColor: string
  onFontSizeChange: (value: number) => void
  onFontFamilyChange: (value: string) => void
  onFontWeightChange: (value: number) => void
  onLineHeightChange: (value: number) => void
  onPageWidthChange: (value: number) => void
  pageWidthCommitOnRelease?: boolean
  onBackgroundColorChange: (value: string) => void
  onTextColorChange: (value: string) => void
  colorCommitOnBlurOnly?: boolean
  variant?: AppearanceVariant
  className?: string
}

const fontOptions = [
  { value: 'system', label: '系统默认' },
  { value: 'serif', label: '衬线字体（宋体）' },
  { value: 'sans', label: '无衬线字体（黑体）' },
  { value: 'mono', label: '等宽字体' },
]

export default function ReadingAppearanceControls({
  fontSize,
  fontFamily,
  fontWeight,
  lineHeight,
  pageWidth,
  backgroundColor,
  textColor,
  onFontSizeChange,
  onFontFamilyChange,
  onFontWeightChange,
  onLineHeightChange,
  onPageWidthChange,
  pageWidthCommitOnRelease = false,
  onBackgroundColorChange,
  onTextColorChange,
  colorCommitOnBlurOnly = false,
  variant = 'page',
  className = '',
}: ReadingAppearanceControlsProps) {
  const isPanel = variant === 'panel'

  return (
    <div
      className={[styles.container, isPanel ? styles.panel : '', className]
        .filter(Boolean)
        .join(' ')}
    >
      <section className={styles.group}>
        <h3 className={styles.groupTitle}>字体</h3>
        <Select
          label="字体系列"
          options={fontOptions}
          value={fontFamily}
          onChange={onFontFamilyChange}
        />
        <Slider
          label={`字体大小：${fontSize}px`}
          min={12}
          max={32}
          step={1}
          value={fontSize}
          onChange={onFontSizeChange}
          showValue={false}
        />
        <Slider
          label={`字重：${fontWeight}`}
          min={300}
          max={900}
          step={100}
          value={fontWeight}
          onChange={onFontWeightChange}
          showValue={false}
        />
      </section>

      <section className={styles.group}>
        <h3 className={styles.groupTitle}>排版</h3>
        <Slider
          label={`行高：${lineHeight.toFixed(1)} 倍`}
          min={1.0}
          max={3.0}
          step={0.1}
          value={lineHeight}
          onChange={onLineHeightChange}
          showValue={false}
        />
        <Slider
          label={`页面宽度：${pageWidth}%`}
          min={55}
          max={100}
          step={1}
          value={pageWidth}
          onChange={onPageWidthChange}
          commitOnRelease={pageWidthCommitOnRelease}
          showValue={false}
        />
      </section>

      <section className={styles.group}>
        <h3 className={styles.groupTitle}>颜色</h3>
        <div className={styles.colorRow}>
          <ColorField
            id={isPanel ? 'reader-quick-background-color' : 'reader-background-color'}
            className={styles.colorItem}
            label="背景颜色"
            value={backgroundColor}
            onChange={onBackgroundColorChange}
            commitOnBlurOnly={colorCommitOnBlurOnly}
            helperText={isPanel ? undefined : '会直接影响阅读页正文底色。'}
          />
          <ColorField
            id={isPanel ? 'reader-quick-text-color' : 'reader-text-color'}
            className={styles.colorItem}
            label="文字颜色"
            value={textColor}
            onChange={onTextColorChange}
            commitOnBlurOnly={colorCommitOnBlurOnly}
            helperText={isPanel ? undefined : '建议和背景保持足够对比度。'}
          />
        </div>
      </section>
    </div>
  )
}
