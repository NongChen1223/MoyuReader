import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CamouflagePetKind } from '@/types'
import dogSpriteUrl from '@/assets/pets/dog/sprite.svg'
import catSpriteUrl from '@/assets/pets/cat/sprite.svg'
import dogSpriteMeta from '@/assets/pets/dog/sprite.json'
import catSpriteMeta from '@/assets/pets/cat/sprite.json'
import styles from './PetSprite.module.scss'

export type PetAction = 'walk' | 'sit_tail' | 'lick_paw' | 'mouth_open' | 'question'

interface PetSpriteProps {
  petKind: CamouflagePetKind
  action?: PetAction
  scale?: number
  className?: string
}

interface SpriteFrame {
  action: string
  x: number
  y: number
  width: number
  height: number
  durationMs: number
}

interface SpriteMeta {
  frameSize: { width: number; height: number }
  frames: SpriteFrame[]
}

const spriteSources = {
  dog: dogSpriteUrl,
  cat: catSpriteUrl,
} satisfies Record<CamouflagePetKind, string>

const spriteMeta = {
  dog: dogSpriteMeta as SpriteMeta,
  cat: catSpriteMeta as SpriteMeta,
} satisfies Record<CamouflagePetKind, SpriteMeta>

function resolveAction(petKind: CamouflagePetKind, action: PetAction) {
  if (action === 'lick_paw' && petKind === 'dog') {
    return 'sit_tail'
  }

  if (action === 'sit_tail' && petKind === 'cat') {
    return 'lick_paw'
  }

  return action
}

export default function PetSprite({
  petKind,
  action = 'walk',
  scale = 1,
  className = '',
}: PetSpriteProps) {
  const [frameIndex, setFrameIndex] = useState(0)
  const meta = spriteMeta[petKind]
  const resolvedAction = resolveAction(petKind, action)
  const actionFrames = meta.frames.filter((frame) => frame.action === resolvedAction)
  const frame = actionFrames[frameIndex % Math.max(actionFrames.length, 1)] ?? meta.frames[0]

  useEffect(() => {
    setFrameIndex(0)
  }, [petKind, resolvedAction])

  useEffect(() => {
    if (actionFrames.length <= 1) {
      return
    }

    const timer = window.setTimeout(() => {
      setFrameIndex((current) => (current + 1) % actionFrames.length)
    }, frame?.durationMs ?? 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [actionFrames.length, frame?.durationMs, frameIndex])

  const style = {
    '--pet-frame-size': `${meta.frameSize.width}px`,
    '--pet-scale': scale,
    '--pet-sheet-x': `${frame?.x ?? 0}px`,
    '--pet-sheet-y': `${frame?.y ?? 0}px`,
    '--pet-sheet': `url("${spriteSources[petKind]}")`,
  } as CSSProperties

  return (
    <span
      className={[styles.sprite, className].filter(Boolean).join(' ')}
      style={style}
      aria-hidden="true"
    />
  )
}
