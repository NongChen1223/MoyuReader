package services

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type WindowEventEmitter func(eventName string, payload any)

// WindowService 窗口服务
// 负责窗口置顶、透明度、摸鱼模式等功能
type WindowService struct {
	ctx              context.Context
	isAlwaysOnTop    bool    // 是否置顶
	isStealthMode    bool    // 是否摸鱼模式
	isDesktopOverlay bool    // 是否桌面歌词浮窗
	opacity          float64 // 透明度 (0.0 - 1.0)
	isMouseInWindow  bool    // 鼠标是否在窗口内
	originalPosition struct {
		x, y int
	}
	originalSize struct {
		width, height int
	}
	eventEmitter WindowEventEmitter
}

// NewWindowService 创建窗口服务实例
func NewWindowService() *WindowService {
	return &WindowService{
		opacity: 1.0,
	}
}

// Init 初始化服务
func (s *WindowService) Init(ctx context.Context) {
	s.ctx = ctx
}

// SetEventEmitter 注入事件发射能力，避免服务层直接依赖具体桌面壳事件系统。
func (s *WindowService) SetEventEmitter(eventEmitter WindowEventEmitter) {
	s.eventEmitter = eventEmitter
}

func (s *WindowService) emitEvent(eventName string, payload any) {
	if s.eventEmitter != nil {
		s.eventEmitter(eventName, payload)
		return
	}

	if s.ctx != nil {
		runtime.EventsEmit(s.ctx, eventName, payload)
	}
}

// Cleanup 清理资源
func (s *WindowService) Cleanup() {
	// 恢复窗口状态
	if s.isAlwaysOnTop {
		s.SetAlwaysOnTop(false)
	}
	if s.isDesktopOverlay {
		s.HideDesktopReaderOverlay()
	}
	if s.isStealthMode {
		s.DisableStealthMode()
	}
}

// SetAlwaysOnTop 设置窗口置顶
func (s *WindowService) SetAlwaysOnTop(alwaysOnTop bool) error {
	s.isAlwaysOnTop = alwaysOnTop
	// 旧桌面壳仍通过运行时窗口 API 设置置顶。
	runtime.WindowSetAlwaysOnTop(s.ctx, alwaysOnTop)
	return nil
}

// IsAlwaysOnTop 获取窗口是否置顶
func (s *WindowService) IsAlwaysOnTop() bool {
	return s.isAlwaysOnTop
}

// SetOpacity 设置窗口透明度
// @param opacity 透明度值 (0.0 - 1.0)
func (s *WindowService) SetOpacity(opacity float64) error {
	if opacity < 0.0 {
		opacity = 0.0
	}
	if opacity > 1.0 {
		opacity = 1.0
	}
	s.opacity = opacity

	// 发送透明度变化事件到前端
	s.emitEvent("window:opacity", opacity)
	return nil
}

// GetOpacity 获取当前透明度
func (s *WindowService) GetOpacity() float64 {
	return s.opacity
}

// EnableStealthMode 启用摸鱼模式
// 摸鱼模式：背景透明、鼠标移出时隐藏内容、窗口置顶
func (s *WindowService) EnableStealthMode() error {
	s.isStealthMode = true
	s.SetAlwaysOnTop(true)
	s.SetOpacity(0.3) // 默认透明度

	s.emitEvent("window:stealthMode", true)
	return nil
}

// DisableStealthMode 禁用摸鱼模式
func (s *WindowService) DisableStealthMode() error {
	if s.isDesktopOverlay {
		return s.HideDesktopReaderOverlay()
	}

	s.isStealthMode = false
	s.SetAlwaysOnTop(false)
	s.SetOpacity(1.0)

	s.emitEvent("window:stealthMode", false)
	return nil
}

// SupportsDesktopReaderOverlay 是否支持桌面悬浮阅读浮窗
func (s *WindowService) SupportsDesktopReaderOverlay() bool {
	return desktopReaderOverlaySupported()
}

// ShowDesktopReaderOverlay 显示原生桌面歌词式阅读浮窗
func (s *WindowService) ShowDesktopReaderOverlay(
	text string,
	fontSize int,
	lineHeight float64,
	opacity float64,
	red int,
	green int,
	blue int,
) error {
	if !desktopReaderOverlaySupported() {
		return nil
	}

	s.isDesktopOverlay = true
	s.isStealthMode = true
	s.opacity = opacity
	showDesktopReaderOverlay(text, fontSize, lineHeight, opacity, red, green, blue)

	s.emitEvent("window:stealthMode", true)
	s.emitEvent("window:opacity", opacity)
	return nil
}

// UpdateDesktopReaderOverlay 更新桌面悬浮阅读浮窗内容
func (s *WindowService) UpdateDesktopReaderOverlay(
	text string,
	fontSize int,
	lineHeight float64,
	opacity float64,
	red int,
	green int,
	blue int,
) error {
	if !desktopReaderOverlaySupported() || !s.isDesktopOverlay {
		return nil
	}

	s.opacity = opacity
	updateDesktopReaderOverlay(text, fontSize, lineHeight, opacity, red, green, blue)
	s.emitEvent("window:opacity", opacity)
	return nil
}

// UpdateDesktopReaderOverlayOpacity 仅更新桌面浮窗正文透明度，避免重建全文导致闪回
func (s *WindowService) UpdateDesktopReaderOverlayOpacity(opacity float64) error {
	if !desktopReaderOverlaySupported() || !s.isDesktopOverlay {
		return nil
	}

	s.opacity = opacity
	updateDesktopReaderOverlayOpacity(opacity)
	s.emitEvent("window:opacity", opacity)
	return nil
}

// UpdateDesktopReaderOverlayControls 更新桌面浮窗内的原生控件状态
func (s *WindowService) UpdateDesktopReaderOverlayControls(
	chaptersJSON string,
	currentChapter int,
	progress float64,
	opacity float64,
	camouflageEnabled bool,
) error {
	if !desktopReaderOverlaySupported() || !s.isDesktopOverlay {
		return nil
	}

	updateDesktopReaderOverlayControls(
		chaptersJSON,
		currentChapter,
		progress,
		opacity,
		camouflageEnabled,
	)
	return nil
}

// ConsumeDesktopReaderOverlayActions 读取原生浮窗控件发出的动作队列
func (s *WindowService) ConsumeDesktopReaderOverlayActions() string {
	if !desktopReaderOverlaySupported() || !s.isDesktopOverlay {
		return ""
	}

	return consumeDesktopReaderOverlayActions()
}

// GetDesktopReaderOverlayReadingLocation 直接读取桌面浮窗当前阅读位置
func (s *WindowService) GetDesktopReaderOverlayReadingLocation() string {
	if !desktopReaderOverlaySupported() || !s.isDesktopOverlay {
		return ""
	}

	return getDesktopReaderOverlayReadingLocation()
}

// MoveDesktopReaderOverlayToReadingLocation 让桌面浮窗滚动到指定阅读位置
func (s *WindowService) MoveDesktopReaderOverlayToReadingLocation(
	chapterIndex int,
	progress float64,
) error {
	if !desktopReaderOverlaySupported() || !s.isDesktopOverlay {
		return nil
	}

	moveDesktopReaderOverlayToReadingLocation(chapterIndex, progress)
	return nil
}

// HideDesktopReaderOverlay 隐藏桌面悬浮阅读浮窗
func (s *WindowService) HideDesktopReaderOverlay() error {
	if !desktopReaderOverlaySupported() {
		return nil
	}

	hideDesktopReaderOverlay()
	s.isDesktopOverlay = false
	s.isStealthMode = false
	s.opacity = 1.0

	s.emitEvent("window:stealthMode", false)
	s.emitEvent("window:opacity", 1.0)
	return nil
}

// IsDesktopReaderOverlayVisible 获取桌面悬浮阅读浮窗当前是否可见
func (s *WindowService) IsDesktopReaderOverlayVisible() bool {
	return isDesktopReaderOverlayVisible()
}

// IsStealthMode 获取是否处于摸鱼模式
func (s *WindowService) IsStealthMode() bool {
	return s.isStealthMode
}

// ToggleStealthMode 切换摸鱼模式
func (s *WindowService) ToggleStealthMode() error {
	if s.isStealthMode {
		return s.DisableStealthMode()
	}
	return s.EnableStealthMode()
}

// OnMouseEnter 鼠标进入窗口
func (s *WindowService) OnMouseEnter() {
	s.isMouseInWindow = true
	if s.isStealthMode {
		// 摸鱼模式下，鼠标进入时显示内容
		s.emitEvent("window:mouseEnter", true)
	}
}

// OnMouseLeave 鼠标离开窗口
func (s *WindowService) OnMouseLeave() {
	s.isMouseInWindow = false
	if s.isStealthMode {
		// 摸鱼模式下，鼠标离开时隐藏内容
		s.emitEvent("window:mouseLeave", true)
	}
}

// IsMouseInWindow 获取鼠标是否在窗口内
func (s *WindowService) IsMouseInWindow() bool {
	return s.isMouseInWindow
}

// MinimizeWindow 最小化窗口
func (s *WindowService) MinimizeWindow() {
	runtime.WindowMinimise(s.ctx)
}

// MaximizeWindow 最大化窗口
func (s *WindowService) MaximizeWindow() {
	runtime.WindowMaximise(s.ctx)
}

// UnmaximizeWindow 取消最大化
func (s *WindowService) UnmaximizeWindow() {
	runtime.WindowUnmaximise(s.ctx)
}

// FullscreenWindow 全屏窗口
func (s *WindowService) FullscreenWindow() {
	runtime.WindowFullscreen(s.ctx)
}

// GetWindowSize 获取窗口大小
func (s *WindowService) GetWindowSize() (int, int) {
	return s.originalSize.width, s.originalSize.height
}

// SetWindowSize 设置窗口大小
func (s *WindowService) SetWindowSize(width, height int) {
	s.originalSize.width = width
	s.originalSize.height = height
	runtime.WindowSetSize(s.ctx, width, height)
}

// GetWindowPosition 获取窗口位置
func (s *WindowService) GetWindowPosition() (int, int) {
	return s.originalPosition.x, s.originalPosition.y
}

// SetWindowPosition 设置窗口位置
func (s *WindowService) SetWindowPosition(x, y int) {
	s.originalPosition.x = x
	s.originalPosition.y = y
	runtime.WindowSetPosition(s.ctx, x, y)
}
