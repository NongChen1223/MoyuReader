import { useSettingsStore } from '@/stores/settingsStore'
import CamouflagePreview from '@/components/features/CamouflagePreview'
import Select from '@/components/common/Select'
import Toggle from '@/components/common/Toggle'
import styles from './PetSettings.module.scss'

const restoreTriggerOptions = [
  { value: 'click', label: '单击挂件恢复' },
  { value: 'doubleClick', label: '双击挂件恢复' },
  { value: 'hover', label: '鼠标移入恢复' },
  { value: 'shortcut', label: '按老板键恢复' },
]

export default function PetSettings() {
  const {
    bossCamouflagePetKind,
    bossCamouflageWanderEnabled,
    bossCamouflageRestoreTrigger,
    setBossCamouflagePetKind,
    setBossCamouflageWanderEnabled,
    setBossCamouflageRestoreTrigger,
  } = useSettingsStore()

  return (
    <div className={styles.container}>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>桌宠形象</h2>
          <p>设置摸鱼窗口收纳后的桌宠外观和基础动作。</p>
        </div>

        <div className={styles.petChoiceGrid}>
          <button
            type="button"
            className={`${styles.petChoice} ${
              bossCamouflagePetKind === 'dog' ? styles.petChoiceActive : ''
            }`}
            onClick={() => setBossCamouflagePetKind('dog')}
          >
            <span className={styles.petChoiceIcon}>犬</span>
            <span>像素小狗</span>
            <small>坐着摇尾巴</small>
          </button>
          <button
            type="button"
            className={`${styles.petChoice} ${
              bossCamouflagePetKind === 'cat' ? styles.petChoiceActive : ''
            }`}
            onClick={() => setBossCamouflagePetKind('cat')}
          >
            <span className={styles.petChoiceIcon}>猫</span>
            <span>像素小猫</span>
            <small>舔毛待机</small>
          </button>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.switchLabel}>
            <div className={styles.switchCopy}>
              <span>允许桌宠自己游荡</span>
              <p>
                开启后，收纳为挂件时优先播放走路游荡动作；真实桌面自动移动逻辑后续接入。
              </p>
            </div>
            <Toggle
              checked={bossCamouflageWanderEnabled}
              onChange={setBossCamouflageWanderEnabled}
            />
          </div>
        </div>

        <div className={styles.settingItem}>
          <div className={styles.fieldBlock}>
            <Select
              label="挂件恢复方式"
              options={restoreTriggerOptions}
              value={bossCamouflageRestoreTrigger}
              onChange={(value) =>
                setBossCamouflageRestoreTrigger(
                  value as typeof bossCamouflageRestoreTrigger
                )
              }
            />
            <p>
              收纳成桌宠后，用这里选择的方式恢复摸鱼窗口；“按老板键恢复”使用当前快捷键设置里的老板键。
            </p>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>伪装预览</h2>
          <p>预览收纳、恢复和当前宠物动作效果。</p>
        </div>
        <CamouflagePreview
          petKind={bossCamouflagePetKind}
          wandering={bossCamouflageWanderEnabled}
          restoreTrigger={bossCamouflageRestoreTrigger}
        />
      </section>
    </div>
  )
}
