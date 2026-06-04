import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tooltip } from 'antd'
import {
  Palette,
  BookOpen,
  HardDrive,
  BarChart3,
  Keyboard,
  ArrowLeft,
  PawPrint,
} from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import AppearanceSettings from './tabs/AppearanceSettings'
import ReadingSettings from './tabs/ReadingSettings'
import StorageSettings from './tabs/StorageSettings'
import StatisticsSettings from './tabs/StatisticsSettings'
import KeyboardSettings from './tabs/KeyboardSettings'
import PetSettings from './tabs/PetSettings'
import styles from './Settings.module.scss'

interface SettingSection {
  id: string
  label: string
  icon: React.ReactNode
  component: React.ReactNode
}

/**
 * Settings 设置页面
 * 包含外观、阅读、存储、统计、快捷键等设置选项
 */
export default function Settings() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('appearance')
  const contentRef = useRef<HTMLDivElement>(null)
  // 检测是否处于收缩状态（窗口宽度 ≤ 1200px）
  const isCollapsed = useMediaQuery('(max-width: 1200px)')

  const sections: SettingSection[] = [
    {
      id: 'appearance',
      label: '外观设置',
      icon: <Palette size={20} />,
      component: <AppearanceSettings />,
    },
    {
      id: 'reading',
      label: '阅读设置',
      icon: <BookOpen size={20} />,
      component: <ReadingSettings />,
    },
    {
      id: 'pet',
      label: '挂件设置',
      icon: <PawPrint size={20} />,
      component: <PetSettings />,
    },
    {
      id: 'storage',
      label: '存储管理',
      icon: <HardDrive size={20} />,
      component: <StorageSettings />,
    },
    {
      id: 'statistics',
      label: '阅读统计',
      icon: <BarChart3 size={20} />,
      component: <StatisticsSettings />,
    },
    {
      id: 'keyboard',
      label: '快捷键',
      icon: <Keyboard size={20} />,
      component: <KeyboardSettings />,
    },
  ]

  const currentSection = sections.find((s) => s.id === activeSection)

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeSection])

  return (
    <div className={styles.container}>
      {/* 左侧导航栏 */}
      <aside className={styles.sidebar}>
        <nav className={styles.nav}>
          {isCollapsed ? (
            <Tooltip title="返回书架" placement="right" mouseEnterDelay={0.3}>
              <button className={styles.backButton} onClick={() => navigate('/home')}>
                <ArrowLeft size={20} />
                <span>返回书架</span>
              </button>
            </Tooltip>
          ) : (
            <button className={styles.backButton} onClick={() => navigate('/home')}>
              <ArrowLeft size={20} />
              <span>返回书架</span>
            </button>
          )}

          {sections.map((section) => {
            const button = (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className={styles.navIcon}>{section.icon}</span>
                <span className={styles.navLabel}>{section.label}</span>
              </button>
            )

            // 只在收缩状态下显示 Tooltip
            return isCollapsed ? (
              <Tooltip key={section.id} title={section.label} placement="right" mouseEnterDelay={0.3}>
                {button}
              </Tooltip>
            ) : (
              button
            )
          })}
        </nav>
      </aside>

      {/* 右侧内容区域 */}
      <main className={styles.main}>
        <header className={styles.header} style={{ '--wails-draggable': 'drag' } as React.CSSProperties}>
          <h1 className={styles.title}>{currentSection?.label}</h1>
        </header>
        <div ref={contentRef} className={styles.content}>
          {currentSection?.component}
        </div>
      </main>
    </div>
  )
}
