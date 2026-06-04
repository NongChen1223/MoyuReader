import { useEffect, useState } from 'react'
import type { CamouflagePetKind, CamouflageRestoreTrigger } from '@/types'
import CamouflagePendant from '@/components/features/CamouflagePendant'
import PetSprite from '@/components/features/PetSprite'
import styles from './CamouflagePreview.module.scss'

type PreviewStage = 'expanded' | 'collapsing' | 'collapsed' | 'expanding'

const PREVIEW_ANIMATION_MS = 220

interface CamouflagePreviewProps {
  petKind: CamouflagePetKind
  wandering: boolean
  restoreTrigger: CamouflageRestoreTrigger
}

/**
 * 设置页里的收纳伪装演示。
 * 用简化版阅读框模拟“移出后收纳、双击挂件恢复”的交互。
 */
export default function CamouflagePreview({
  petKind,
  wandering,
  restoreTrigger,
}: CamouflagePreviewProps) {
  const [stage, setStage] = useState<PreviewStage>('expanded')
  const idleAction = petKind === 'cat' ? 'lick_paw' : 'sit_tail'
  const restoreText =
    restoreTrigger === 'click'
      ? '单击恢复'
      : restoreTrigger === 'hover'
      ? '移入恢复'
      : restoreTrigger === 'shortcut'
      ? '按老板键恢复'
      : '双击恢复'

  useEffect(() => {
    if (stage !== 'collapsing' && stage !== 'expanding') {
      return
    }

    const timer = window.setTimeout(() => {
      setStage(stage === 'collapsing' ? 'collapsed' : 'expanded')
    }, PREVIEW_ANIMATION_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [stage])

  const startCollapse = () => {
    if (stage !== 'expanded') {
      return
    }

    setStage('collapsing')
  }

  const restore = () => {
    if (stage !== 'collapsed') {
      return
    }

    setStage('expanding')
  }

  const handlePendantClick = () => {
    if (restoreTrigger === 'click') {
      restore()
    }
  }

  const handlePendantDoubleClick = () => {
    if (restoreTrigger === 'doubleClick') {
      restore()
    }
  }

  const handlePendantMouseEnter = () => {
    if (restoreTrigger === 'hover') {
      restore()
    }
  }

  const handleShortcutPreview = () => {
    if (restoreTrigger === 'shortcut') {
      restore()
    }
  }

  return (
    <div className={styles.preview}>
      <div className={styles.stage}>
        {stage !== 'collapsed' && (
          <div
            className={`${styles.demoShell} ${
              stage === 'collapsing' ? styles.demoShellCollapsing : ''
            } ${stage === 'expanding' ? styles.demoShellExpanding : ''}`}
            onMouseLeave={startCollapse}
          >
            <div className={styles.demoToolbar}>
              <div className={styles.demoNav}>
                <button type="button">上一章</button>
                <button type="button">目录</button>
                <button type="button">下一章</button>
              </div>
              <div className={styles.demoActions}>
                <button type="button">外观</button>
                <button type="button">挂件开</button>
                <button type="button">关闭</button>
              </div>
            </div>
            <div className={styles.demoContent}>
              <p>第一章　桌面边缘的阅读框</p>
              <p>
                鼠标离开后，正文窗口会收纳成像素桌宠。再次恢复时，会回到原来的阅读窗口大小和位置。
              </p>
              <p>
                这里模拟当前老板模式的上下控制栏、透明正文区域和底部本章进度。
              </p>
            </div>
            <div className={styles.demoFooter}>
              <span>透明度 64%</span>
              <div className={styles.demoProgress} aria-hidden="true">
                <span />
              </div>
              <span>本章 46%</span>
            </div>
          </div>
        )}

        <div
          className={`${styles.pendantDock} ${
            stage === 'collapsed' ? styles.pendantVisible : ''
          } ${stage === 'expanding' ? styles.pendantLeaving : ''}`}
          onClick={handlePendantClick}
          onDoubleClick={handlePendantDoubleClick}
          onMouseEnter={handlePendantMouseEnter}
        >
          <CamouflagePendant
            variant="preview"
            petKind={petKind}
            action={wandering ? 'walk' : idleAction}
            wandering={wandering}
            title="伪装中"
            subtitle={wandering ? `游荡预览 · ${restoreText}` : `${restoreText} · 可拖动`}
          />
        </div>
        {stage === 'collapsed' && restoreTrigger === 'shortcut' && (
          <button type="button" className={styles.shortcutHint} onClick={handleShortcutPreview}>
            模拟老板键恢复
          </button>
        )}
      </div>
      <div className={styles.actionGrid} aria-label="桌宠动作预览">
        <div className={styles.actionCard}>
          <PetSprite petKind={petKind} action="walk" scale={0.58} />
          <span>走路游荡</span>
        </div>
        <div className={styles.actionCard}>
          <PetSprite petKind={petKind} action={idleAction} scale={0.58} />
          <span>{petKind === 'cat' ? '舔毛' : '坐着摇尾巴'}</span>
        </div>
        <div className={styles.actionCard}>
          <PetSprite petKind={petKind} action="mouth_open" scale={0.58} />
          <span>张嘴吃文件</span>
        </div>
        <div className={styles.actionCard}>
          <PetSprite petKind={petKind} action="question" scale={0.58} />
          <span>疑问反馈</span>
        </div>
      </div>
      <p className={styles.caption}>移出演示卡片时收纳，当前恢复方式：{restoreText}。</p>
    </div>
  )
}
