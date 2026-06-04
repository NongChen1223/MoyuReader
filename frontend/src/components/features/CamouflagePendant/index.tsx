import type { ButtonHTMLAttributes } from 'react'
import type { CamouflagePetKind } from '@/types'
import PetSprite from '@/components/features/PetSprite'
import type { PetAction } from '@/components/features/PetSprite'
import styles from './CamouflagePendant.module.scss'

interface CamouflagePendantProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'default' | 'preview'
  petKind?: CamouflagePetKind
  action?: PetAction
  wandering?: boolean
  mood?: 'idle' | 'walk' | 'mouth_open' | 'chew' | 'question'
  bubble?: string
  title?: string
  subtitle?: string
  dragging?: boolean
}

/**
 * 收纳伪装挂件。
 * 视觉上模拟一个小型动态贴纸，在阅读页和设置演示中复用。
 */
export default function CamouflagePendant({
  variant = 'default',
  petKind = 'dog',
  action = 'walk',
  wandering = false,
  mood = 'idle',
  bubble = '',
  title = '伪装中',
  subtitle = '双击展开阅读框',
  dragging = false,
  className = '',
  ...props
}: CamouflagePendantProps) {
  const pendantClassName = [
    styles.pendant,
    variant === 'preview' ? styles.preview : '',
    wandering ? styles.wandering : '',
    mood === 'mouth_open' ? styles.mouthOpen : '',
    mood === 'chew' ? styles.chewing : '',
    mood === 'question' ? styles.questioning : '',
    dragging ? styles.dragging : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={pendantClassName} {...props}>
      {bubble && <span className={styles.bubble}>{bubble}</span>}
      <PetSprite petKind={petKind} action={action} scale={0.72} className={styles.pet} />
      <span className={styles.copy}>
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>{subtitle}</span>
      </span>
    </button>
  )
}
