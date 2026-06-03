import { useEffect, useState } from 'react'
import { message } from 'antd'
import { Folder, HardDrive, LaptopMinimal, MapPinned } from 'lucide-react'
import Button from '@/components/common/Button'
import { desktopBridge } from '@/bridge'
import styles from './StorageSettings.module.scss'

/**
 * 存储管理选项卡
 */
export default function StorageSettings() {
  const [messageApi, messageContextHolder] = message.useMessage()
  const [dataDir, setDataDir] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let disposed = false

    const loadConfig = async () => {
      try {
        const config = await desktopBridge.app.getConfig()
        if (!disposed) {
          setDataDir(config.dataDir || '')
        }
      } catch (error) {
        if (!disposed) {
          messageApi.error(error instanceof Error ? error.message : '读取存储路径失败')
        }
      } finally {
        if (!disposed) {
          setIsLoading(false)
        }
      }
    }

    void loadConfig()

    return () => {
      disposed = true
    }
  }, [messageApi])

  const handleSelectDirectory = async () => {
    try {
      setIsSubmitting(true)
      const selectedDir = await desktopBridge.app.selectDataDir()
      if (!selectedDir) {
        return
      }

      const updatedConfig = await desktopBridge.app.setDataDir(selectedDir)
      setDataDir(updatedConfig.dataDir || selectedDir)
      messageApi.success('本地存储路径已更新')
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : '更新存储路径失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.container}>
      {messageContextHolder}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>本地存储路径</h2>
        <p className={styles.sectionDescription}>
          当前显示的是这台电脑上的真实目录，应用会把配置和阅读进度保存在这里。
        </p>

        <div className={styles.pathItem}>
          <div className={styles.pathInfo}>
            <Folder size={24} />
            <div className={styles.pathText}>
              <span className={styles.pathLabel}>当前应用数据路径</span>
              <span className={styles.pathValue}>
                {isLoading ? '正在读取本地路径...' : dataDir || '未设置'}
              </span>
              <span className={styles.pathHint}>
                导入的书籍仍然使用你电脑里的原始文件路径，不会被复制到应用目录里。
              </span>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSelectDirectory}
            disabled={isLoading || isSubmitting}
          >
            {isSubmitting ? '更新中...' : '更改路径'}
          </Button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>存储说明</h2>
        <div className={styles.storageGrid}>
          <div className={styles.storageCard}>
            <HardDrive size={32} />
            <div className={styles.storageInfo}>
              <span className={styles.storageLabel}>应用数据</span>
              <span className={styles.storageValue}>配置与阅读进度</span>
            </div>
          </div>
          <div className={styles.storageCard}>
            <LaptopMinimal size={32} />
            <div className={styles.storageInfo}>
              <span className={styles.storageLabel}>原始书籍</span>
              <span className={styles.storageValue}>保留电脑本地路径</span>
            </div>
          </div>
          <div className={styles.storageCard}>
            <MapPinned size={32} />
            <div className={styles.storageInfo}>
              <span className={styles.storageLabel}>当前目录</span>
              <span className={styles.storageValue}>{isLoading ? '读取中' : '本机真实路径'}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
