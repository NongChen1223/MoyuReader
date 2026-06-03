package main

import (
	"context"
	"embed"
	"log"

	"github.com/nongchen1223/moyureader/backend/app"
	"github.com/nongchen1223/moyureader/backend/config"
	"github.com/nongchen1223/moyureader/backend/services"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/mac"
	"github.com/wailsapp/wails/v2/pkg/runtime"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// 加载配置
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 初始化服务
	progressService := services.NewProgressService(cfg.DataDir)
	novelService := services.NewNovelService(progressService)
	windowService := services.NewWindowService()
	searchService := services.NewSearchService()

	// 创建应用实例
	appInstance := app.NewApp(cfg, novelService, windowService, searchService, progressService)

	// 创建 Wails 应用配置
	err = wails.Run(&options.App{
		Title:     "墨鱼阅读器",
		Width:     1000,
		Height:    700,
		MinWidth:  600,
		MinHeight: 500,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 255, G: 255, B: 255, A: 0},
		OnStartup: func(ctx context.Context) {
			windowService.SetEventEmitter(func(eventName string, payload any) {
				runtime.EventsEmit(ctx, eventName, payload)
			})
			appInstance.SetDirectoryPicker(func(defaultPath string) (string, error) {
				return runtime.OpenDirectoryDialog(ctx, runtime.OpenDialogOptions{
					Title:                "选择应用数据目录",
					DefaultDirectory:     defaultPath,
					CanCreateDirectories: true,
					ShowHiddenFiles:      true,
				})
			})
			novelService.SetFilePicker(func() (string, error) {
				return runtime.OpenFileDialog(ctx, runtime.OpenDialogOptions{
					Title: "选择小说文件",
					Filters: []runtime.FileFilter{
						{
							DisplayName: "支持的文件",
							Pattern:     "*.txt;*.epub;*.pdf;*.mobi;*.azw3",
						},
					},
				})
			})
			appInstance.Startup(ctx)
			runtime.EventsEmit(ctx, "app:ready", map[string]interface{}{
				"version":     cfg.Version,
				"environment": cfg.Environment,
			})
		},
		OnShutdown:       appInstance.Shutdown,
		Bind: []interface{}{
			appInstance,
			novelService,
			windowService,
			searchService,
			progressService,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			DisableWindowIcon:    false,
		},
		Mac: &mac.Options{
			TitleBar: &mac.TitleBar{
				TitlebarAppearsTransparent: true,
				HideTitle:                  false,
				HideTitleBar:               false,
				FullSizeContent:            true,
				UseToolbar:                 false,
				HideToolbarSeparator:       true,
			},
			Appearance:           mac.NSAppearanceNameDarkAqua,
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			About: &mac.AboutInfo{
				Title:   "墨鱼阅读器",
				Message: "墨鱼阅读器（MoyuReader），一款支持多格式、跨平台的阅读器",
			},
		},
	})

	if err != nil {
		log.Fatalf("Error running application: %v", err)
	}
}
