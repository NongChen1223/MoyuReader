import { useSettingsStore } from '@/stores/settingsStore'
import ReadingAppearanceControls from '@/components/features/ReadingAppearanceControls'
import CamouflagePreview from '@/components/features/CamouflagePreview'
import Slider from '@/components/common/Slider'
import Toggle from '@/components/common/Toggle'
import styles from './ReadingSettings.module.scss'

const MIN_STEALTH_OPACITY = 0.02
const MAX_STEALTH_OPACITY = 1

function clampStealthOpacity(value: number) {
  return Math.max(MIN_STEALTH_OPACITY, Math.min(MAX_STEALTH_OPACITY, Number(value || 0)))
}

function opacityToTransparencySliderValue(opacity: number) {
  return Number((MIN_STEALTH_OPACITY + MAX_STEALTH_OPACITY - clampStealthOpacity(opacity)).toFixed(2))
}

function transparencySliderValueToOpacity(value: number) {
  return clampStealthOpacity(MIN_STEALTH_OPACITY + MAX_STEALTH_OPACITY - Number(value || 0))
}

/**
 * 阅读设置选项卡
 * 字体、行高、页宽等阅读相关设置
 */
export default function ReadingSettings() {
  const {
    fontSize,
    fontFamily,
    fontWeight,
    lineHeight,
    pageWidth,
    backgroundColor,
    textColor,
    bossRevealDelay,
    bossHideDelay,
    bossMode,
    bossOpacity,
    bossCamouflageEnabled,
    setFontSize,
    setFontFamily,
    setFontWeight,
    setLineHeight,
    setPageWidth,
    setBackgroundColor,
    setTextColor,
    setBossRevealDelay,
    setBossHideDelay,
    setBossMode,
    setBossOpacity,
    setBossCamouflageEnabled,
  } = useSettingsStore()

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>阅读外观</h2>
        <ReadingAppearanceControls
          fontSize={fontSize}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          lineHeight={lineHeight}
          pageWidth={pageWidth}
          backgroundColor={backgroundColor}
          textColor={textColor}
          onFontSizeChange={setFontSize}
          onFontFamilyChange={setFontFamily}
          onFontWeightChange={setFontWeight}
          onLineHeightChange={setLineHeight}
          onPageWidthChange={setPageWidth}
          onBackgroundColorChange={setBackgroundColor}
          onTextColorChange={setTextColor}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>预览</h2>
        <div
          className={styles.previewBox}
          style={{
            fontSize: `${fontSize}px`,
            fontFamily:
              fontFamily === 'system'
                ? 'var(--font-sans)'
                : fontFamily === 'serif'
                ? 'var(--font-serif)'
                : fontFamily === 'mono'
                ? 'var(--font-mono)'
                : 'var(--font-sans)',
            lineHeight: lineHeight,
            fontWeight,
            maxWidth: `${pageWidth}%`,
            backgroundColor: backgroundColor,
            color: textColor,
          }}
        >
          <p>这是一段示例文本，用于预览当前的阅读设置效果。</p>
          <p>字体大小、字体系列、行高和页面宽度百分比都会影响阅读体验。</p>
          <p>请根据您的喜好调整这些参数，找到最舒适的阅读设置。</p>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>老板模式</h2>

        <div className={styles.settingItem}>
          <div className={styles.switchLabel}>
            <div className={styles.switchCopy}>
              <span>启用老板模式</span>
              <p className={styles.switchDescription}>阅读页会即时读取这个开关状态。</p>
            </div>
            <Toggle checked={bossMode} onChange={setBossMode} />
          </div>
        </div>

        <div className={styles.settingItem}>
          <Slider
            label={`内容透明度：${opacityToTransparencySliderValue(bossOpacity).toFixed(2)}`}
            min={0.02}
            max={1}
            step={0.02}
            value={opacityToTransparencySliderValue(bossOpacity)}
            onChange={(value) => setBossOpacity(transparencySliderValueToOpacity(value))}
            showValue={false}
          />
        </div>

        <div className={styles.settingItem}>
          <div className={styles.switchLabel}>
            <div className={styles.switchCopy}>
              <span>收纳伪装</span>
              <p className={styles.switchDescription}>
                摸鱼模式下移出阅读方块后自动收纳为挂件，双击挂件时恢复；正式模式里还能拖动挂件位置。
              </p>
            </div>
            <Toggle checked={bossCamouflageEnabled} onChange={setBossCamouflageEnabled} />
          </div>
        </div>

        <div className={styles.settingItem}>
          <Slider
            label={`唤出延迟：${bossRevealDelay}ms`}
            min={0}
            max={400}
            step={20}
            value={bossRevealDelay}
            onChange={setBossRevealDelay}
            showValue={false}
          />
        </div>

        <div className={styles.settingItem}>
          <Slider
            label={`隐藏延迟：${bossHideDelay}ms`}
            min={80}
            max={1200}
            step={40}
            value={bossHideDelay}
            onChange={setBossHideDelay}
            showValue={false}
          />
        </div>

        <div className={styles.bossModePreview}>
          <p className={styles.previewLabel}>老板模式预览效果：</p>
          <div className={styles.bossPreviewBox}>
            <div className={styles.bossPreviewContent}>正常内容显示</div>
            <div
              className={styles.bossPreviewOverlay}
              style={{ opacity: bossMode ? bossOpacity : 0 }}
            >
              透明背景，仅保留文字
            </div>
          </div>
        </div>

        <div className={styles.bossModePreview}>
          <p className={styles.previewLabel}>收纳伪装演示：</p>
          <CamouflagePreview />
        </div>
      </section>
    </div>
  )
}
