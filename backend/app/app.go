package app

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/nongchen1223/moyureader/backend/config"
	"github.com/nongchen1223/moyureader/backend/services"
)

type DirectoryPicker func(defaultPath string) (string, error)

// App 应用主结构
type App struct {
	ctx             context.Context
	config          *config.Config
	novelService    *services.NovelService
	windowService   *services.WindowService
	searchService   *services.SearchService
	progressService *services.ProgressService
	directoryPicker DirectoryPicker
}

// NewApp 创建应用实例
func NewApp(
	cfg *config.Config,
	novelService *services.NovelService,
	windowService *services.WindowService,
	searchService *services.SearchService,
	progressService *services.ProgressService,
) *App {
	return &App{
		config:          cfg,
		novelService:    novelService,
		windowService:   windowService,
		searchService:   searchService,
		progressService: progressService,
	}
}

// SetDirectoryPicker 注入目录选择能力，避免核心应用状态直接依赖具体桌面壳。
func (a *App) SetDirectoryPicker(directoryPicker DirectoryPicker) {
	a.directoryPicker = directoryPicker
}

// Startup 应用启动时调用
func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx

	// 初始化各个服务
	a.novelService.Init(ctx)
	a.windowService.Init(ctx)
	a.searchService.Init(ctx)
	a.progressService.Init(ctx)

}

// Shutdown 应用关闭时调用
func (a *App) Shutdown(ctx context.Context) {
	// 清理资源
	a.novelService.Cleanup()
	a.windowService.Cleanup()
	a.searchService.Cleanup()
	a.progressService.Cleanup()
}

// GetAppInfo 获取应用信息
func (a *App) GetAppInfo() map[string]interface{} {
	return map[string]interface{}{
		"name":        a.config.AppName,
		"version":     a.config.Version,
		"environment": a.config.Environment,
		"dataDir":     a.config.DataDir,
	}
}

// GetConfig 获取配置信息
func (a *App) GetConfig() *config.Config {
	return a.config
}

// resolveDirectoryDialogDefaultPath 为目录选择器提供一个稳定且存在的默认路径。
func (a *App) resolveDirectoryDialogDefaultPath() string {
	if currentDir := strings.TrimSpace(a.config.DataDir); currentDir != "" {
		if info, err := os.Stat(currentDir); err == nil && info.IsDir() {
			return currentDir
		}
	}

	homeDir, err := os.UserHomeDir()
	if err == nil {
		return homeDir
	}

	return "."
}

// SelectDataDir 打开目录选择器，选择新的应用数据目录
func (a *App) SelectDataDir() (string, error) {
	if a.directoryPicker == nil {
		return "", fmt.Errorf("当前桌面入口未注入目录选择器")
	}

	selectedDir, err := a.directoryPicker(a.resolveDirectoryDialogDefaultPath())
	if err != nil {
		return "", fmt.Errorf("打开目录选择器失败: %w", err)
	}

	return strings.TrimSpace(selectedDir), nil
}

// SetDataDir 更新应用数据目录，并同步刷新依赖该目录的进度存储配置。
func (a *App) SetDataDir(dataDir string) (*config.Config, error) {
	trimmedDir := strings.TrimSpace(dataDir)
	if trimmedDir == "" {
		return nil, fmt.Errorf("路径不能为空")
	}

	absoluteDir, err := filepath.Abs(trimmedDir)
	if err != nil {
		return nil, fmt.Errorf("解析路径失败: %w", err)
	}

	if err := os.MkdirAll(absoluteDir, 0755); err != nil {
		return nil, fmt.Errorf("创建目录失败: %w", err)
	}

	previousDir := a.config.DataDir
	if err := a.progressService.SetDataDir(absoluteDir); err != nil {
		return nil, fmt.Errorf("更新阅读进度目录失败: %w", err)
	}

	a.config.DataDir = absoluteDir
	if err := a.config.Save(); err != nil {
		a.config.DataDir = previousDir
		_ = a.progressService.SetDataDir(previousDir)
		return nil, fmt.Errorf("保存配置失败: %w", err)
	}

	return a.config, nil
}
