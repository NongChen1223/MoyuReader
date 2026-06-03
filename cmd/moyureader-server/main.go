package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"log"
	"net/http"
	"strings"

	"github.com/nongchen1223/moyureader/backend/config"
	"github.com/nongchen1223/moyureader/backend/services"
)

type appServer struct {
	config          *config.Config
	novelService    *services.NovelService
	progressService *services.ProgressService
	searchService   *services.SearchService
}

type responseEnvelope struct {
	Data  any    `json:"data,omitempty"`
	Error string `json:"error,omitempty"`
}

type openNovelRequest struct {
	FilePath string `json:"filePath"`
}

type saveReadingProgressRequest struct {
	FilePath     string  `json:"filePath"`
	ChapterIndex int     `json:"chapterIndex"`
	Position     int     `json:"position"`
	Progress     float64 `json:"progress"`
}

type setCurrentChapterRequest struct {
	FilePath     string `json:"filePath"`
	ChapterIndex int    `json:"chapterIndex"`
}

type searchNovelRequest struct {
	FilePath      string `json:"filePath"`
	Keyword       string `json:"keyword"`
	CaseSensitive bool   `json:"caseSensitive"`
}

type chapterContentRequest struct {
	FilePath     string `json:"filePath"`
	ChapterIndex int    `json:"chapterIndex"`
}

type setDataDirRequest struct {
	DataDir string `json:"dataDir"`
}

type appConfigPayload struct {
	Environment string `json:"environment"`
	AppName     string `json:"appName"`
	Version     string `json:"version"`
	DataDir     string `json:"dataDir"`
}

func main() {
	port := flag.String("port", "18767", "HTTP listen port")
	flag.Parse()

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("加载配置失败: %v", err)
	}

	progressService := services.NewProgressService(cfg.DataDir)
	novelService := services.NewNovelService(progressService)
	searchService := services.NewSearchService()

	ctx := context.Background()
	progressService.Init(ctx)
	novelService.Init(ctx)
	searchService.Init(ctx)

	server := &appServer{
		config:          cfg,
		novelService:    novelService,
		progressService: progressService,
		searchService:   searchService,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", server.handleHealth)
	mux.HandleFunc("/api/config", server.handleConfig)
	mux.HandleFunc("/api/config/data-dir", server.handleSetDataDir)
	mux.HandleFunc("/api/novels/open", server.handleOpenNovel)
	mux.HandleFunc("/api/novels/progress", server.handleSaveProgress)
	mux.HandleFunc("/api/novels/current-chapter", server.handleSetCurrentChapter)
	mux.HandleFunc("/api/novels/search", server.handleSearchNovel)
	mux.HandleFunc("/api/novels/chapter-content", server.handleChapterContent)
	mux.HandleFunc("/api/progress", server.handleDeleteProgress)

	log.Printf("MoyuReader server listening on :%s", *port)
	if err := http.ListenAndServe("127.0.0.1:"+*port, withJSON(mux)); err != nil {
		log.Fatalf("服务启动失败: %v", err)
	}
}

func withJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("content-type", "application/json; charset=utf-8")
		next.ServeHTTP(w, r)
	})
}

func (s *appServer) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, responseEnvelope{Data: map[string]bool{"ok": true}})
}

func (s *appServer) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: toAppConfigPayload(s.config)})
}

func (s *appServer) handleSetDataDir(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	var request setDataDirRequest
	if err := decodeJSONBody(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	dataDir := strings.TrimSpace(request.DataDir)
	if dataDir == "" {
		writeError(w, http.StatusBadRequest, "路径不能为空")
		return
	}

	if err := s.progressService.SetDataDir(dataDir); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.config.DataDir = dataDir
	if err := s.config.Save(); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: toAppConfigPayload(s.config)})
}

func (s *appServer) handleOpenNovel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	var request openNovelRequest
	if err := decodeJSONBody(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	novel, err := s.novelService.OpenNovel(strings.TrimSpace(request.FilePath))
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: novel})
}

func (s *appServer) handleSaveProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	var request saveReadingProgressRequest
	if err := decodeJSONBody(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := s.novelService.SaveReadingProgress(
		request.FilePath,
		request.ChapterIndex,
		request.Position,
		request.Progress,
	); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: map[string]bool{"ok": true}})
}

func (s *appServer) handleSetCurrentChapter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	var request setCurrentChapterRequest
	if err := decodeJSONBody(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := s.novelService.SetCurrentChapter(request.FilePath, request.ChapterIndex); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: map[string]bool{"ok": true}})
}

func (s *appServer) handleSearchNovel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	var request searchNovelRequest
	if err := decodeJSONBody(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	results := s.novelService.SearchNovel(request.FilePath, request.Keyword, request.CaseSensitive)
	writeJSON(w, http.StatusOK, responseEnvelope{Data: results})
}

func (s *appServer) handleChapterContent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	var request chapterContentRequest
	if err := decodeJSONBody(r, &request); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	payload, err := s.novelService.GetChapterContentPayload(request.FilePath, request.ChapterIndex)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: payload})
}

func (s *appServer) handleDeleteProgress(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		writeError(w, http.StatusMethodNotAllowed, "不支持的请求方法")
		return
	}

	filePath := strings.TrimSpace(r.URL.Query().Get("filePath"))
	if filePath == "" {
		writeError(w, http.StatusBadRequest, "文件路径不能为空")
		return
	}

	if err := s.progressService.DeleteProgress(filePath); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, responseEnvelope{Data: map[string]bool{"ok": true}})
}

func toAppConfigPayload(cfg *config.Config) appConfigPayload {
	return appConfigPayload{
		Environment: string(cfg.Environment),
		AppName:     cfg.AppName,
		Version:     cfg.Version,
		DataDir:     cfg.DataDir,
	}
}

func decodeJSONBody(r *http.Request, target any) error {
	if r.Body == nil {
		return errors.New("请求体不能为空")
	}

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}

	return nil
}

func writeJSON(w http.ResponseWriter, status int, payload responseEnvelope) {
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, responseEnvelope{Error: message})
}
