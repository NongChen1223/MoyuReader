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
    dragging ? styles.dragging : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type="button" className={pendantClassName} {...props}>
      <PetSprite petKind={petKind} action={action} scale={0.72} className={styles.pet} />
      <span className={styles.copy}>
        <span className={styles.title}>{title}</span>
        <span className={styles.subtitle}>{subtitle}</span>
      </span>
    </button>
  )
}
