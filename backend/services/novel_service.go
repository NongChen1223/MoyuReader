package services

import (
	"archive/zip"
	"bytes"
	"context"
	"encoding/base64"
	"encoding/xml"
	"errors"
	"fmt"
	stdhtml "html"
	"io"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"

	pdf "github.com/ledongthuc/pdf"
	"github.com/nongchen1223/moyureader/backend/models"
	xhtml "golang.org/x/net/html"
)

type NovelFilePicker func() (string, error)

// NovelService 小说服务
type NovelService struct {
	ctx             context.Context
	novels          map[string]*models.Novel // 小说缓存，key 为文件路径
	epubChapterHTML map[string][]string      // EPUB 章节富文本缓存
	pdfChapterHTML  map[string][]string      // 图片型 PDF 页面富文本缓存
	currentNovel    *models.Novel            // 当前打开的小说
	progressService *ProgressService
	filePicker      NovelFilePicker
}

const (
	plainTextBlockParagraphSize = 18
	richContentBlockNodeSize    = 16
)

func cloneNovelForClient(novel *models.Novel) *models.Novel {
	if novel == nil {
		return nil
	}

	cloned := *novel
	cloned.Content = ""
	if novel.Chapters != nil {
		cloned.Chapters = append([]models.Chapter(nil), novel.Chapters...)
	}

	return &cloned
}

// NewNovelService 创建小说服务实例
func NewNovelService(progressService *ProgressService) *NovelService {
	return &NovelService{
		novels:          make(map[string]*models.Novel),
		epubChapterHTML: make(map[string][]string),
		pdfChapterHTML:  make(map[string][]string),
		progressService: progressService,
	}
}

// SetFilePicker 注入桌面端文件选择能力，避免业务服务直接依赖具体桌面壳。
func (s *NovelService) SetFilePicker(filePicker NovelFilePicker) {
	s.filePicker = filePicker
}

// Init 初始化服务
func (s *NovelService) Init(ctx context.Context) {
	s.ctx = ctx
}

// Cleanup 清理资源
func (s *NovelService) Cleanup() {
	// 清理缓存
	s.novels = make(map[string]*models.Novel)
	s.epubChapterHTML = make(map[string][]string)
	s.pdfChapterHTML = make(map[string][]string)
	s.currentNovel = nil
}

// OpenNovel 打开小说文件
// @param filePath 文件路径
// @return 小说信息和错误
func (s *NovelService) OpenNovel(filePath string) (*models.Novel, error) {
	if filePath == "" {
		if s.filePicker == nil {
			return nil, fmt.Errorf("未提供文件路径，且当前桌面入口未注入文件选择器")
		}

		selectedFile, err := s.filePicker()
		if err != nil {
			return nil, fmt.Errorf("打开文件选择器失败: %w", err)
		}
		if selectedFile == "" {
			return nil, fmt.Errorf("未选择文件")
		}
		filePath = selectedFile
	}

	// 检查文件是否存在
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		return nil, fmt.Errorf("文件不存在，可能是你移动了原文件或修改了目录名称，请重新导入该书籍: %s", filePath)
	}

	// 检查是否已在缓存中
	if novel, exists := s.novels[filePath]; exists {
		s.applySavedProgress(novel)
		s.currentNovel = novel
		return cloneNovelForClient(novel), nil
	}

	// 读取文件内容
	content, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("读取文件失败: %w", err)
	}

	// 获取文件信息
	fileInfo, _ := os.Stat(filePath)
	ext := strings.ToLower(filepath.Ext(filePath))

	// 创建小说对象
	novel := &models.Novel{
		Title:         strings.TrimSuffix(filepath.Base(filePath), filepath.Ext(filePath)),
		FilePath:      filePath,
		Format:        ext,
		Size:          fileInfo.Size(),
		Content:       string(content),
		ContentLength: runeLen(string(content)),
	}

	// 根据格式解析内容
	if err := s.parseNovelContent(novel); err != nil {
		return nil, fmt.Errorf("解析小说内容失败: %w", err)
	}

	s.applySavedProgress(novel)

	// 缓存小说
	s.novels[filePath] = novel
	s.currentNovel = novel

	return cloneNovelForClient(novel), nil
}

// GetCurrentNovel 获取当前打开的小说
func (s *NovelService) GetCurrentNovel() *models.Novel {
	return cloneNovelForClient(s.currentNovel)
}

// CloseNovel 关闭小说
func (s *NovelService) CloseNovel(filePath string) {
	delete(s.novels, filePath)
	delete(s.epubChapterHTML, filePath)
	delete(s.pdfChapterHTML, filePath)
	if s.currentNovel != nil && s.currentNovel.FilePath == filePath {
		s.currentNovel = nil
	}
}

// GetNovelChapters 获取小说章节列表
func (s *NovelService) GetNovelChapters(filePath string) ([]models.Chapter, error) {
	novel, exists := s.novels[filePath]
	if !exists {
		return nil, fmt.Errorf("小说未打开")
	}
	return novel.Chapters, nil
}

// SearchNovel 在指定小说中搜索关键字
func (s *NovelService) SearchNovel(filePath, keyword string, caseSensitive bool) []models.SearchResult {
	novel, exists := s.novels[filePath]
	if !exists || novel == nil {
		return []models.SearchResult{}
	}

	return searchInText(novel.Content, keyword, caseSensitive)
}

// GetChapterContent 获取指定章节内容
func (s *NovelService) GetChapterContent(filePath string, chapterIndex int) (string, error) {
	novel, exists := s.novels[filePath]
	if !exists {
		return "", fmt.Errorf("小说未打开")
	}

	if chapterIndex < 0 || chapterIndex >= len(novel.Chapters) {
		return "", fmt.Errorf("章节索引越界")
	}

	if novel.Format == ".epub" {
		if chapterHTML := s.getEpubChapterHTML(filePath, chapterIndex); chapterHTML != "" {
			return chapterHTML, nil
		}
	}

	if novel.Format == ".pdf" {
		if chapterHTML, err := s.getPDFChapterHTML(filePath, chapterIndex); err != nil {
			return "", err
		} else if chapterHTML != "" {
			return chapterHTML, nil
		}
	}

	chapter := novel.Chapters[chapterIndex]
	return sliceByRuneRange(novel.Content, chapter.StartPos, chapter.EndPos), nil
}

// GetChapterContentPayload 获取指定章节的完整内容和分块内容
func (s *NovelService) GetChapterContentPayload(
	filePath string,
	chapterIndex int,
) (*models.ChapterContentPayload, error) {
	chapterContent, err := s.GetChapterContent(filePath, chapterIndex)
	if err != nil {
		return nil, err
	}

	novel, exists := s.novels[filePath]
	if !exists {
		return nil, fmt.Errorf("小说未打开")
	}

	isRichContent := novel.Format == ".epub" || novel.Format == ".pdf"

	return &models.ChapterContentPayload{
		Content:       chapterContent,
		IsRichContent: isRichContent,
		Blocks:        buildReaderContentBlocks(chapterContent, isRichContent),
	}, nil
}

// SetCurrentChapter 设置当前章节
func (s *NovelService) SetCurrentChapter(filePath string, chapterIndex int) error {
	novel, exists := s.novels[filePath]
	if !exists {
		return fmt.Errorf("小说未打开")
	}

	if chapterIndex < 0 || chapterIndex >= len(novel.Chapters) {
		return fmt.Errorf("章节索引越界")
	}

	novel.CurrentChapter = chapterIndex
	if s.progressService != nil {
		return s.progressService.SaveProgress(filePath, chapterIndex, 0, novel.ReadProgress)
	}
	return nil
}

// SaveReadingProgress 保存阅读进度
func (s *NovelService) SaveReadingProgress(filePath string, chapterIndex int, position int, progress float64) error {
	novel, exists := s.novels[filePath]
	if !exists {
		return fmt.Errorf("小说未打开")
	}

	novel.CurrentChapter = chapterIndex
	novel.ReadProgress = progress
	novel.LastReadTime = getCurrentTimestamp()

	if s.progressService != nil {
		return s.progressService.SaveProgress(filePath, chapterIndex, position, progress)
	}

	return nil
}

// GetReadingProgress 获取阅读进度
func (s *NovelService) GetReadingProgress(filePath string) (int, int, float64, error) {
	novel, exists := s.novels[filePath]
	if !exists {
		return 0, 0, 0, fmt.Errorf("小说未打开")
	}

	position := 0
	if s.progressService != nil {
		if entry := s.progressService.GetProgress(filePath); entry != nil {
			position = entry.Position
		}
	}

	return novel.CurrentChapter, position, novel.ReadProgress, nil
}

// parseNovelContent 解析小说内容
// 根据不同格式进行解析，提取章节信息
func (s *NovelService) parseNovelContent(novel *models.Novel) error {
	switch novel.Format {
	case ".txt":
		return s.parseTxtNovel(novel)
	case ".epub":
		return s.parseEpubNovel(novel)
	case ".pdf":
		return s.parsePdfNovel(novel)
	default:
		// 默认按 txt 格式处理
		return s.parseTxtNovel(novel)
	}
}

// parseTxtNovel 解析 TXT 格式小说
// 使用常见的章节标题模式进行识别
func (s *NovelService) parseTxtNovel(novel *models.Novel) error {
	// 多种章节标题匹配模式
	patterns := []string{
		`^第[0-9零一二三四五六七八九十百千]+[章节回]`,
		`^Chapter\s+\d+`,
		`^\d+\.\s+`,
		`^【第.+?】`,
		`^（第.+?）`,
		`^\[第.+?\]`,
	}

	// 预编译正则表达式
	regexps := make([]*regexp.Regexp, len(patterns))
	for i, pattern := range patterns {
		regexps[i] = regexp.MustCompile(pattern)
	}

	chapters := []models.Chapter{}
	currentOffset := 0
	chapterIndex := 0

	for _, rawLine := range strings.SplitAfter(novel.Content, "\n") {
		lineWithoutBreak := strings.TrimRight(rawLine, "\r\n")
		trimmedLine := strings.TrimSpace(lineWithoutBreak)
		lineLength := runeLen(rawLine)

		if trimmedLine == "" {
			currentOffset += lineLength
			continue
		}

		// 检查是否是章节标题
		isChapter := false
		for _, re := range regexps {
			if re.MatchString(trimmedLine) {
				isChapter = true
				break
			}
		}

		if isChapter {
			startPos := currentOffset + leadingWhitespaceCount(lineWithoutBreak)
			if len(chapters) > 0 {
				chapters[len(chapters)-1].EndPos = startPos
				chapters[len(chapters)-1].WordCount = chapters[len(chapters)-1].EndPos - chapters[len(chapters)-1].StartPos
			}

			chapters = append(chapters, models.Chapter{
				Title:    trimmedLine,
				StartPos: startPos,
				EndPos:   runeLen(novel.Content), // 临时设置为全文末尾
				Index:    chapterIndex,
			})
			chapterIndex++
		}

		currentOffset += lineLength
	}

	// 如果没有找到章节，则将整个文件作为一个章节
	if len(chapters) == 0 {
		chapters = append(chapters, models.Chapter{
			Title:     "正文",
			StartPos:  0,
			EndPos:    runeLen(novel.Content),
			Index:     0,
			WordCount: runeLen(novel.Content),
		})
	} else {
		// 修正最后一章的结束位置
		lastChapter := &chapters[len(chapters)-1]
		lastChapter.EndPos = runeLen(novel.Content)
		lastChapter.WordCount = lastChapter.EndPos - lastChapter.StartPos
	}

	novel.Chapters = chapters
	novel.ContentLength = runeLen(novel.Content)
	return nil
}

// parseEpubNovel 解析 EPUB 格式小说
func (s *NovelService) parseEpubNovel(novel *models.Novel) error {
	reader, err := zip.OpenReader(novel.FilePath)
	if err != nil {
		return fmt.Errorf("打开 EPUB 文件失败: %w", err)
	}
	defer reader.Close()

	fileMap := make(map[string]*zip.File, len(reader.File))
	for _, file := range reader.File {
		fileMap[normalizeZipPath(file.Name)] = file
	}

	containerPath, err := readEpubContainerPath(fileMap)
	if err != nil {
		return err
	}

	opfData, err := readZipFileText(fileMap, containerPath)
	if err != nil {
		return fmt.Errorf("读取 EPUB 元数据失败: %w", err)
	}

	var pkg epubPackage
	if err := xml.Unmarshal([]byte(opfData), &pkg); err != nil {
		return fmt.Errorf("解析 EPUB 元数据失败: %w", err)
	}

	if strings.TrimSpace(pkg.Metadata.Title) != "" {
		novel.Title = strings.TrimSpace(pkg.Metadata.Title)
	}
	if strings.TrimSpace(pkg.Metadata.Creator) != "" {
		novel.Author = strings.TrimSpace(pkg.Metadata.Creator)
	}

	manifest := make(map[string]epubManifestItem, len(pkg.Manifest.Items))
	for _, item := range pkg.Manifest.Items {
		manifest[item.ID] = item
	}

	opfDir := path.Dir(containerPath)
	if opfDir == "." {
		opfDir = ""
	}

	coverDataURL, err := resolveEpubCoverDataURL(fileMap, pkg, manifest, opfDir)
	if err == nil && strings.TrimSpace(coverDataURL) != "" {
		novel.Cover = coverDataURL
	}

	var contentBuilder strings.Builder
	chapters := make([]models.Chapter, 0, len(pkg.Spine.ItemRefs))
	chapterHTMLs := make([]string, 0, len(pkg.Spine.ItemRefs))
	currentOffset := 0

	appendChapter := func(rawTitle, rawText, rawHTML string, fallbackIndex int) {
		chapterText := normalizeEpubText(rawText)
		chapterHTML := strings.TrimSpace(rawHTML)
		if chapterText == "" && chapterHTML == "" {
			return
		}

		chapterTitle := strings.TrimSpace(rawTitle)
		if chapterTitle == "" {
			chapterTitle = fmt.Sprintf("第%d章", fallbackIndex)
		}
		chapterText = trimLeadingEpubTitle(chapterText, chapterTitle)
		if chapterHTML == "" {
			chapterHTML = buildBasicHTMLFromText(chapterText)
		}
		if chapterText == "" && strings.Contains(chapterHTML, "<img") {
			chapterText = "[图片]"
		}

		if contentBuilder.Len() > 0 {
			contentBuilder.WriteString("\n\n")
			currentOffset += runeLen("\n\n")
		}

		chapterBody := chapterText
		if chapterBody == "" || !strings.HasPrefix(strings.TrimSpace(chapterBody), chapterTitle) {
			if chapterBody == "" {
				chapterBody = chapterTitle
			} else {
				chapterBody = chapterTitle + "\n\n" + chapterBody
			}
		}
		startPos := currentOffset
		contentBuilder.WriteString(chapterBody)
		currentOffset += runeLen(chapterBody)

		chapters = append(chapters, models.Chapter{
			Index:     len(chapters),
			Title:     chapterTitle,
			StartPos:  startPos,
			EndPos:    currentOffset,
			WordCount: runeLen(chapterBody),
		})
		chapterHTMLs = append(chapterHTMLs, chapterHTML)
	}

	for index, itemRef := range pkg.Spine.ItemRefs {
		item, exists := manifest[itemRef.IDRef]
		if !exists || !isSupportedEpubItem(item.MediaType) {
			continue
		}

		chapterPath := normalizeZipPath(path.Join(opfDir, item.Href))
		chapterMarkup, err := readZipFileText(fileMap, chapterPath)
		if err != nil {
			continue
		}

		chapterTitle, chapterText, chapterHTML := extractEpubChapterContent(fileMap, chapterMarkup, chapterPath)
		appendChapter(chapterTitle, chapterText, chapterHTML, index+1)
	}

	// 有些 EPUB 的 spine 不规范，这里退回到 manifest 级别兜底提取正文。
	if len(chapters) == 0 {
		for _, item := range pkg.Manifest.Items {
			if !isSupportedEpubItem(item.MediaType) {
				continue
			}

			chapterPath := normalizeZipPath(path.Join(opfDir, item.Href))
			chapterMarkup, err := readZipFileText(fileMap, chapterPath)
			if err != nil {
				continue
			}

			chapterTitle, chapterText, chapterHTML := extractEpubChapterContent(fileMap, chapterMarkup, chapterPath)
			appendChapter(chapterTitle, chapterText, chapterHTML, len(chapters)+1)
		}
	}

	if len(chapters) == 0 {
		return fmt.Errorf("未从 EPUB 中提取到可阅读正文")
	}

	novel.Content = contentBuilder.String()
	novel.ContentLength = runeLen(novel.Content)
	novel.Chapters = chapters
	s.epubChapterHTML[novel.FilePath] = chapterHTMLs
	return nil
}

func (s *NovelService) getEpubChapterHTML(filePath string, chapterIndex int) string {
	chapterHTMLs, exists := s.epubChapterHTML[filePath]
	if !exists || chapterIndex < 0 || chapterIndex >= len(chapterHTMLs) {
		return ""
	}

	return chapterHTMLs[chapterIndex]
}

// parsePdfNovel 解析 PDF 格式小说
func (s *NovelService) parsePdfNovel(novel *models.Novel) error {
	file, reader, err := pdf.Open(novel.FilePath)
	if err != nil {
		if errors.Is(err, pdf.ErrInvalidPassword) {
			return fmt.Errorf("暂不支持受密码保护的 PDF")
		}
		return fmt.Errorf("打开 PDF 文件失败: %w", err)
	}
	defer file.Close()

	if title := strings.TrimSpace(reader.Trailer().Key("Info").Key("Title").Text()); title != "" {
		novel.Title = title
	}
	if author := strings.TrimSpace(reader.Trailer().Key("Info").Key("Author").Text()); author != "" {
		novel.Author = author
	}

	content, err := extractPDFPlainText(reader)
	if err != nil {
		return fmt.Errorf("解析 PDF 文本失败: %w", err)
	}
	if content == "" {
		return s.parseImageBasedPDFNovel(novel)
	}

	novel.Content = content
	novel.ContentLength = runeLen(content)
	return s.parseTxtNovel(novel)
}

func (s *NovelService) parseImageBasedPDFNovel(novel *models.Novel) error {
	pageCount, err := getPDFPageCount(novel.FilePath)
	if err != nil {
		return fmt.Errorf("未从 PDF 中提取到可阅读文本，且无法按页渲染 PDF: %w", err)
	}
	if pageCount <= 0 {
		return fmt.Errorf("PDF 中没有可渲染页面")
	}

	chapterHTMLs := make([]string, pageCount)
	firstPageHTML, err := renderPDFChapterHTML(novel.FilePath, 0)
	if err != nil {
		return fmt.Errorf("未从 PDF 中提取到可阅读文本，且无法渲染 PDF 页面: %w", err)
	}
	chapterHTMLs[0] = firstPageHTML

	content, chapters := buildImagePDFStructure(pageCount)
	novel.Content = content
	novel.ContentLength = runeLen(content)
	novel.Chapters = chapters
	s.pdfChapterHTML[novel.FilePath] = chapterHTMLs
	return nil
}

// ConvertFormat 格式转换
// @param sourcePath 源文件路径
// @param targetFormat 目标格式
// @return 转换后的文件路径和错误
func (s *NovelService) ConvertFormat(sourcePath, targetFormat string) (string, error) {
	// TODO: 实现格式转换逻辑
	return "", fmt.Errorf("格式转换功能即将支持")
}

// getCurrentTimestamp 获取当前时间戳
func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}

func extractPDFPlainText(reader *pdf.Reader) (string, error) {
	totalPages := reader.NumPage()
	if totalPages <= 0 {
		return "", nil
	}

	pages := make([]string, 0, totalPages)

	for pageIndex := 1; pageIndex <= totalPages; pageIndex++ {
		page := reader.Page(pageIndex)
		if page.V.IsNull() || page.V.Key("Contents").Kind() == pdf.Null {
			continue
		}

		rows, err := page.GetTextByRow()
		if err != nil {
			return "", err
		}

		pageLines := make([]string, 0, len(rows))
		for _, row := range rows {
			fragments := make([]string, 0, len(row.Content))
			flushLine := func() {
				line := joinPDFFragments(fragments)
				line = normalizePDFText(line)
				if line != "" {
					pageLines = append(pageLines, line)
				}
				fragments = fragments[:0]
			}

			for _, text := range row.Content {
				fragment := normalizePDFText(text.S)
				if fragment == "" {
					if len(fragments) > 0 {
						flushLine()
					}
					continue
				}

				fragments = append(fragments, fragment)
			}

			if len(fragments) > 0 {
				flushLine()
			}
		}

		if len(pageLines) == 0 {
			continue
		}

		pages = append(pages, strings.Join(pageLines, "\n"))
	}

	return strings.TrimSpace(strings.Join(pages, "\n\n")), nil
}

func normalizePDFText(content string) string {
	content = strings.ReplaceAll(content, "\x00", "")
	content = strings.ReplaceAll(content, "\r\n", "\n")
	content = strings.ReplaceAll(content, "\r", "\n")
	content = strings.ReplaceAll(content, "\u00a0", " ")

	lines := strings.Split(content, "\n")
	normalizedLines := make([]string, 0, len(lines))
	lastLineBlank := false

	for _, line := range lines {
		cleaned := strings.Join(strings.Fields(strings.TrimSpace(line)), " ")
		if cleaned == "" {
			if !lastLineBlank && len(normalizedLines) > 0 {
				normalizedLines = append(normalizedLines, "")
			}
			lastLineBlank = true
			continue
		}

		normalizedLines = append(normalizedLines, cleaned)
		lastLineBlank = false
	}

	return strings.TrimSpace(strings.Join(normalizedLines, "\n"))
}

func buildImagePDFStructure(pageCount int) (string, []models.Chapter) {
	var contentBuilder strings.Builder
	chapters := make([]models.Chapter, 0, pageCount)
	currentOffset := 0

	for pageIndex := 0; pageIndex < pageCount; pageIndex++ {
		title := fmt.Sprintf("第%d页", pageIndex+1)
		if contentBuilder.Len() > 0 {
			contentBuilder.WriteString("\n\n")
			currentOffset += runeLen("\n\n")
		}

		startPos := currentOffset
		contentBuilder.WriteString(title)
		currentOffset += runeLen(title)

		chapters = append(chapters, models.Chapter{
			Index:     pageIndex,
			Title:     title,
			StartPos:  startPos,
			EndPos:    currentOffset,
			WordCount: runeLen(title),
		})
	}

	return contentBuilder.String(), chapters
}

func joinPDFFragments(fragments []string) string {
	if len(fragments) == 0 {
		return ""
	}

	var builder strings.Builder
	for index, fragment := range fragments {
		if index > 0 && shouldInsertSpaceBetweenPDFFragments(fragments[index-1], fragment) {
			builder.WriteByte(' ')
		}
		builder.WriteString(fragment)
	}

	return builder.String()
}

func shouldInsertSpaceBetweenPDFFragments(left, right string) bool {
	if left == "" || right == "" {
		return false
	}

	leftRunes := []rune(left)
	rightRunes := []rune(right)
	if len(leftRunes) == 0 || len(rightRunes) == 0 {
		return false
	}

	return isASCIIAlphaNumeric(leftRunes[len(leftRunes)-1]) &&
		isASCIIAlphaNumeric(rightRunes[0])
}

func isASCIIAlphaNumeric(value rune) bool {
	return value >= '0' && value <= '9' ||
		value >= 'a' && value <= 'z' ||
		value >= 'A' && value <= 'Z'
}

func (s *NovelService) getPDFChapterHTML(filePath string, chapterIndex int) (string, error) {
	chapterHTMLs, exists := s.pdfChapterHTML[filePath]
	if !exists || chapterIndex < 0 || chapterIndex >= len(chapterHTMLs) {
		return "", nil
	}

	if chapterHTMLs[chapterIndex] != "" {
		return chapterHTMLs[chapterIndex], nil
	}

	chapterHTML, err := renderPDFChapterHTML(filePath, chapterIndex)
	if err != nil {
		return "", err
	}

	chapterHTMLs[chapterIndex] = chapterHTML
	s.pdfChapterHTML[filePath] = chapterHTMLs
	return chapterHTML, nil
}

func renderPDFChapterHTML(filePath string, chapterIndex int) (string, error) {
	dataURL, err := renderPDFPageDataURL(filePath, chapterIndex)
	if err != nil {
		return "", fmt.Errorf("渲染第 %d 页失败: %w", chapterIndex+1, err)
	}

	pageLabel := fmt.Sprintf("第%d页", chapterIndex+1)
	return fmt.Sprintf(
		`<section class="pdf-image-page" data-chapter-rich="true"><figure class="epub-image pdf-image-page"><img src="%s" alt="%s" loading="lazy" /><figcaption>%s</figcaption></figure></section>`,
		dataURL,
		escapeHTMLAttribute(pageLabel),
		pageLabel,
	), nil
}

func (s *NovelService) applySavedProgress(novel *models.Novel) {
	if s.progressService == nil {
		return
	}

	entry := s.progressService.GetProgress(novel.FilePath)
	if entry == nil {
		return
	}

	novel.CurrentChapter = clampInt(entry.CurrentChapter, 0, maxInt(len(novel.Chapters)-1, 0))
	novel.ReadProgress = entry.Progress
	novel.LastReadTime = entry.LastReadTime
}

func sliceByRuneRange(content string, start, end int) string {
	runes := []rune(content)
	if start < 0 {
		start = 0
	}
	if end > len(runes) {
		end = len(runes)
	}
	if start > end {
		start = end
	}
	return string(runes[start:end])
}

func buildReaderContentBlocks(content string, isRichContent bool) []models.ReaderContentBlock {
	if strings.TrimSpace(content) == "" {
		return []models.ReaderContentBlock{}
	}

	if isRichContent {
		return buildRichReaderContentBlocks(content)
	}

	return buildPlainReaderContentBlocks(content)
}

func buildPlainReaderContentBlocks(content string) []models.ReaderContentBlock {
	paragraphs := strings.Split(strings.TrimSpace(content), "\n\n")
	blocks := make([]models.ReaderContentBlock, 0, (len(paragraphs)/plainTextBlockParagraphSize)+1)

	for index := 0; index < len(paragraphs); index += plainTextBlockParagraphSize {
		end := minInt(index+plainTextBlockParagraphSize, len(paragraphs))
		blockContent := strings.Join(paragraphs[index:end], "\n\n")
		blockContent = strings.TrimSpace(blockContent)
		if blockContent == "" {
			continue
		}

		blocks = append(blocks, models.ReaderContentBlock{
			Type:            "text",
			Content:         blockContent,
			EstimatedHeight: 420,
		})
	}

	return blocks
}

func buildRichReaderContentBlocks(content string) []models.ReaderContentBlock {
	doc, err := xhtml.Parse(strings.NewReader("<body>" + content + "</body>"))
	if err != nil {
		return []models.ReaderContentBlock{{
			Type:            "html",
			Content:         content,
			EstimatedHeight: 720,
		}}
	}

	body := findEpubBodyNode(doc)
	if body == nil {
		return []models.ReaderContentBlock{{
			Type:            "html",
			Content:         content,
			EstimatedHeight: 720,
		}}
	}

	nodes := make([]string, 0, richContentBlockNodeSize)
	blocks := make([]models.ReaderContentBlock, 0, 8)
	for child := body.FirstChild; child != nil; child = child.NextSibling {
		rendered := renderHTMLNodeString(child)
		if strings.TrimSpace(rendered) == "" {
			continue
		}

		nodes = append(nodes, rendered)
		if len(nodes) >= richContentBlockNodeSize {
			blocks = append(blocks, models.ReaderContentBlock{
				Type:            "html",
				Content:         strings.Join(nodes, ""),
				EstimatedHeight: 720,
			})
			nodes = nodes[:0]
		}
	}

	if len(nodes) > 0 {
		blocks = append(blocks, models.ReaderContentBlock{
			Type:            "html",
			Content:         strings.Join(nodes, ""),
			EstimatedHeight: 720,
		})
	}

	if len(blocks) == 0 {
		return []models.ReaderContentBlock{{
			Type:            "html",
			Content:         content,
			EstimatedHeight: 720,
		}}
	}

	return blocks
}

func renderHTMLNodeString(node *xhtml.Node) string {
	var buffer bytes.Buffer
	if err := xhtml.Render(&buffer, node); err != nil {
		return ""
	}

	return buffer.String()
}

func runeLen(content string) int {
	return len([]rune(content))
}

func leadingWhitespaceCount(content string) int {
	count := 0
	for _, char := range content {
		if !unicode.IsSpace(char) {
			break
		}
		count++
	}
	return count
}

func clampInt(value, min, max int) int {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

type epubContainer struct {
	RootFiles []struct {
		FullPath string `xml:"full-path,attr"`
	} `xml:"rootfiles>rootfile"`
}

type epubPackage struct {
	Metadata struct {
		Title   string             `xml:"title"`
		Creator string             `xml:"creator"`
		Meta    []epubMetadataMeta `xml:"meta"`
	} `xml:"metadata"`
	Manifest struct {
		Items []epubManifestItem `xml:"item"`
	} `xml:"manifest"`
	Spine struct {
		ItemRefs []struct {
			IDRef string `xml:"idref,attr"`
		} `xml:"itemref"`
	} `xml:"spine"`
	Guide struct {
		References []epubGuideReference `xml:"reference"`
	} `xml:"guide"`
}

type epubMetadataMeta struct {
	Name     string `xml:"name,attr"`
	Content  string `xml:"content,attr"`
	Property string `xml:"property,attr"`
	Value    string `xml:",chardata"`
}

type epubManifestItem struct {
	ID         string `xml:"id,attr"`
	Href       string `xml:"href,attr"`
	MediaType  string `xml:"media-type,attr"`
	Properties string `xml:"properties,attr"`
}

type epubGuideReference struct {
	Type  string `xml:"type,attr"`
	Title string `xml:"title,attr"`
	Href  string `xml:"href,attr"`
}

type epubCoverCandidate struct {
	Path      string
	MediaType string
}

func readEpubContainerPath(fileMap map[string]*zip.File) (string, error) {
	containerXML, err := readZipFileText(fileMap, "META-INF/container.xml")
	if err != nil {
		return "", fmt.Errorf("读取 EPUB 容器信息失败: %w", err)
	}

	var container epubContainer
	if err := xml.Unmarshal([]byte(containerXML), &container); err != nil {
		return "", fmt.Errorf("解析 EPUB 容器信息失败: %w", err)
	}

	if len(container.RootFiles) == 0 || strings.TrimSpace(container.RootFiles[0].FullPath) == "" {
		return "", fmt.Errorf("EPUB 缺少 OPF 路径信息")
	}

	return normalizeZipPath(container.RootFiles[0].FullPath), nil
}

func readZipFileText(fileMap map[string]*zip.File, filePath string) (string, error) {
	content, err := readZipFileBytes(fileMap, filePath)
	if err != nil {
		return "", err
	}

	return string(content), nil
}

func readZipFileBytes(fileMap map[string]*zip.File, filePath string) ([]byte, error) {
	file, exists := fileMap[normalizeZipPath(filePath)]
	if !exists {
		return nil, fmt.Errorf("文件不存在: %s", filePath)
	}

	reader, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return nil, err
	}

	return content, nil
}

func normalizeZipPath(filePath string) string {
	normalizedPath := path.Clean(strings.ReplaceAll(filePath, "\\", "/"))
	normalizedPath = strings.TrimPrefix(normalizedPath, "./")
	return strings.TrimPrefix(normalizedPath, "/")
}

func extractEpubChapterText(markup string) (string, string) {
	doc, err := xhtml.Parse(strings.NewReader(markup))
	if err != nil {
		return "", normalizeEpubText(stripHTMLTags(markup))
	}

	title := ""
	var builder strings.Builder
	var walk func(*xhtml.Node, bool)
	lastCharWasNewline := false

	walk = func(node *xhtml.Node, skip bool) {
		if node == nil {
			return
		}

		nextSkip := skip
		if node.Type == xhtml.ElementNode {
			tag := strings.ToLower(node.Data)
			if tag == "script" || tag == "style" || tag == "head" {
				nextSkip = true
			}
			if isEpubBlockTag(tag) && builder.Len() > 0 && !lastCharWasNewline {
				builder.WriteString("\n")
				lastCharWasNewline = true
			}
		}

		if !nextSkip && node.Type == xhtml.TextNode {
			text := strings.TrimSpace(stdhtml.UnescapeString(node.Data))
			if text != "" {
				if builder.Len() > 0 && !lastCharWasNewline {
					builder.WriteString(" ")
				}
				builder.WriteString(text)
				lastCharWasNewline = false
			}
		}

		if title == "" && node.Type == xhtml.ElementNode {
			tag := strings.ToLower(node.Data)
			if tag == "title" || tag == "h1" || tag == "h2" {
				text := strings.TrimSpace(extractNodeText(node))
				if text != "" {
					title = text
				}
			}
		}

		for child := node.FirstChild; child != nil; child = child.NextSibling {
			walk(child, nextSkip)
		}
	}

	walk(doc, false)
	return title, normalizeEpubText(builder.String())
}

func extractEpubChapterContent(
	fileMap map[string]*zip.File,
	markup string,
	markupPath string,
) (string, string, string) {
	title, text := extractEpubChapterText(markup)
	text = trimLeadingEpubTitle(text, title)

	doc, err := xhtml.Parse(strings.NewReader(markup))
	if err != nil {
		return title, text, buildBasicHTMLFromText(text)
	}

	body := findEpubBodyNode(doc)
	if body == nil {
		body = doc
	}

	renderer := &epubHTMLRenderer{
		fileMap:      fileMap,
		baseDir:      normalizeZipPath(path.Dir(markupPath)),
		chapterTitle: title,
	}
	htmlContent := strings.TrimSpace(renderer.renderChildren(body))
	if htmlContent == "" {
		htmlContent = buildBasicHTMLFromText(text)
	}

	return title, text, htmlContent
}

func extractNodeText(node *xhtml.Node) string {
	var builder strings.Builder
	var walk func(*xhtml.Node)
	walk = func(current *xhtml.Node) {
		if current == nil {
			return
		}
		if current.Type == xhtml.TextNode {
			builder.WriteString(current.Data)
		}
		for child := current.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(node)
	return stdhtml.UnescapeString(strings.TrimSpace(builder.String()))
}

func findEpubBodyNode(node *xhtml.Node) *xhtml.Node {
	if node == nil {
		return nil
	}
	if node.Type == xhtml.ElementNode && strings.EqualFold(node.Data, "body") {
		return node
	}
	for child := node.FirstChild; child != nil; child = child.NextSibling {
		if found := findEpubBodyNode(child); found != nil {
			return found
		}
	}
	return nil
}

type epubHTMLRenderer struct {
	fileMap             map[string]*zip.File
	baseDir             string
	chapterTitle        string
	skippedTitleHeading bool
}

func (r *epubHTMLRenderer) renderChildren(parent *xhtml.Node) string {
	if parent == nil {
		return ""
	}

	var builder strings.Builder
	for child := parent.FirstChild; child != nil; child = child.NextSibling {
		builder.WriteString(r.renderNode(child))
	}
	return builder.String()
}

func (r *epubHTMLRenderer) renderNode(node *xhtml.Node) string {
	if node == nil {
		return ""
	}

	switch node.Type {
	case xhtml.TextNode:
		return normalizeEpubHTMLText(node.Data)
	case xhtml.ElementNode:
		tag := strings.ToLower(node.Data)
		if isSkippedEpubHTMLTag(tag) {
			return ""
		}

		if isEpubHeadingTag(tag) {
			headingText := strings.TrimSpace(extractNodeText(node))
			if !r.skippedTitleHeading && compareEpubTitle(headingText, r.chapterTitle) {
				r.skippedTitleHeading = true
				return ""
			}
		}

		switch tag {
		case "img", "image":
			return r.renderImageNode(node)
		case "br":
			return "<br />"
		case "hr":
			return "<hr />"
		case "svg":
			return ""
		case "a":
			return wrapEpubHTMLTag("span", r.renderChildren(node))
		}

		childrenHTML := r.renderChildren(node)
		if strings.TrimSpace(stripHTMLTags(childrenHTML)) == "" && !strings.Contains(childrenHTML, "<img") {
			return ""
		}

		switch tag {
		case "body", "section", "article", "main":
			return wrapEpubHTMLTag("section", childrenHTML)
		case "div":
			return wrapEpubHTMLTag("div", childrenHTML)
		case "p":
			return wrapEpubHTMLTag("p", childrenHTML)
		case "blockquote":
			return wrapEpubHTMLTag("blockquote", childrenHTML)
		case "pre":
			return wrapEpubHTMLTag("pre", childrenHTML)
		case "code":
			return wrapEpubHTMLTag("code", childrenHTML)
		case "ul", "ol", "li", "table", "thead", "tbody", "tr", "td", "th":
			return wrapEpubHTMLTag(tag, childrenHTML)
		case "h1", "h2", "h3", "h4", "h5", "h6":
			return wrapEpubHTMLTag(tag, childrenHTML)
		case "strong", "b":
			return wrapEpubHTMLTag("strong", childrenHTML)
		case "em", "i":
			return wrapEpubHTMLTag("em", childrenHTML)
		case "u":
			return wrapEpubHTMLTag("u", childrenHTML)
		case "sup":
			return wrapEpubHTMLTag("sup", childrenHTML)
		case "sub":
			return wrapEpubHTMLTag("sub", childrenHTML)
		case "span", "small":
			return wrapEpubHTMLTag("span", childrenHTML)
		default:
			return childrenHTML
		}
	default:
		return ""
	}
}

func (r *epubHTMLRenderer) renderImageNode(node *xhtml.Node) string {
	src := ""
	alt := ""
	for _, attr := range node.Attr {
		key := strings.ToLower(attr.Key)
		if key == "src" || key == "href" {
			src = attr.Val
		}
		if key == "alt" {
			alt = strings.TrimSpace(stdhtml.UnescapeString(attr.Val))
		}
	}

	dataURL, err := resolveEpubAssetDataURL(r.fileMap, r.baseDir, src)
	if err != nil || dataURL == "" {
		return ""
	}

	escapedAlt := escapeHTMLAttribute(alt)
	if escapedAlt != "" {
		return fmt.Sprintf(
			`<figure class="epub-image"><img src="%s" alt="%s" loading="lazy" /><figcaption>%s</figcaption></figure>`,
			dataURL,
			escapedAlt,
			stdhtml.EscapeString(alt),
		)
	}

	return fmt.Sprintf(`<figure class="epub-image"><img src="%s" alt="" loading="lazy" /></figure>`, dataURL)
}

func resolveEpubAssetDataURL(fileMap map[string]*zip.File, baseDir, reference string) (string, error) {
	assetPath := resolveEpubReference(baseDir, reference)
	if assetPath == "" {
		return "", nil
	}

	mediaType := inferEpubMediaType(assetPath)
	if !isSupportedEpubCoverMediaType(mediaType) {
		return "", nil
	}

	assetBytes, err := readZipFileBytes(fileMap, assetPath)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("data:%s;base64,%s", mediaType, base64.StdEncoding.EncodeToString(assetBytes)), nil
}

func isSkippedEpubHTMLTag(tag string) bool {
	switch tag {
	case "script", "style", "head", "meta", "link", "title":
		return true
	default:
		return false
	}
}

func isEpubHeadingTag(tag string) bool {
	switch tag {
	case "h1", "h2", "h3", "h4", "h5", "h6":
		return true
	default:
		return false
	}
}

func wrapEpubHTMLTag(tag, content string) string {
	if strings.TrimSpace(content) == "" {
		return ""
	}
	return "<" + tag + ">" + content + "</" + tag + ">"
}

func normalizeEpubHTMLText(content string) string {
	normalized := regexp.MustCompile(`\s+`).ReplaceAllString(stdhtml.UnescapeString(content), " ")
	return stdhtml.EscapeString(normalized)
}

func trimLeadingEpubTitle(content, title string) string {
	trimmedContent := strings.TrimSpace(content)
	trimmedTitle := strings.TrimSpace(title)
	if trimmedContent == "" || trimmedTitle == "" {
		return trimmedContent
	}

	if !compareEpubTitle(trimmedContent, trimmedTitle) && !strings.HasPrefix(trimmedContent, trimmedTitle+"\n") {
		return trimmedContent
	}

	trimmedContent = strings.TrimSpace(strings.TrimPrefix(trimmedContent, trimmedTitle))
	return strings.TrimLeft(trimmedContent, "\n\r\t ")
}

func compareEpubTitle(left, right string) bool {
	return normalizeComparableEpubText(left) == normalizeComparableEpubText(right)
}

func normalizeComparableEpubText(content string) string {
	return strings.Join(strings.Fields(strings.ToLower(strings.TrimSpace(content))), "")
}

func buildBasicHTMLFromText(content string) string {
	trimmed := strings.TrimSpace(content)
	if trimmed == "" {
		return ""
	}

	paragraphs := strings.Split(trimmed, "\n\n")
	var builder strings.Builder
	for _, paragraph := range paragraphs {
		normalizedParagraph := strings.TrimSpace(paragraph)
		if normalizedParagraph == "" {
			continue
		}

		lines := strings.Split(normalizedParagraph, "\n")
		escapedLines := make([]string, 0, len(lines))
		for _, line := range lines {
			escapedLine := stdhtml.EscapeString(strings.TrimSpace(line))
			if escapedLine != "" {
				escapedLines = append(escapedLines, escapedLine)
			}
		}
		if len(escapedLines) == 0 {
			continue
		}

		builder.WriteString("<p>")
		builder.WriteString(strings.Join(escapedLines, "<br />"))
		builder.WriteString("</p>")
	}

	return builder.String()
}

func escapeHTMLAttribute(content string) string {
	replacer := strings.NewReplacer(
		"&", "&amp;",
		`"`, "&quot;",
		"<", "&lt;",
		">", "&gt;",
	)
	return replacer.Replace(content)
}

func isEpubBlockTag(tag string) bool {
	switch tag {
	case "p", "div", "section", "article", "br", "li", "h1", "h2", "h3", "h4", "h5", "h6", "tr":
		return true
	default:
		return false
	}
}

func isSupportedEpubItem(mediaType string) bool {
	switch mediaType {
	case "application/xhtml+xml", "text/html":
		return true
	default:
		return false
	}
}

func isSupportedEpubCoverMediaType(mediaType string) bool {
	switch mediaType {
	case "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/bmp":
		return true
	default:
		return false
	}
}

func resolveEpubCoverDataURL(
	fileMap map[string]*zip.File,
	pkg epubPackage,
	manifest map[string]epubManifestItem,
	opfDir string,
) (string, error) {
	candidates := collectEpubCoverCandidates(pkg, manifest, opfDir)
	for _, candidate := range candidates {
		coverDataURL, err := resolveEpubCoverCandidateDataURL(fileMap, candidate)
		if err != nil {
			continue
		}
		if strings.TrimSpace(coverDataURL) != "" {
			return coverDataURL, nil
		}
	}

	return resolveEpubFrontMatterCoverDataURL(fileMap, pkg, manifest, opfDir)
}

func collectEpubCoverCandidates(
	pkg epubPackage,
	manifest map[string]epubManifestItem,
	opfDir string,
) []epubCoverCandidate {
	candidates := make([]epubCoverCandidate, 0, 16)
	seen := make(map[string]struct{})

	addCandidate := func(candidate epubCoverCandidate) {
		candidate.Path = normalizeZipPath(candidate.Path)
		if candidate.Path == "" {
			return
		}

		key := candidate.Path + "::" + strings.ToLower(candidate.MediaType)
		if _, exists := seen[key]; exists {
			return
		}

		seen[key] = struct{}{}
		candidates = append(candidates, candidate)
	}

	addManifestItem := func(item epubManifestItem) {
		addCandidate(epubCoverCandidate{
			Path:      path.Join(opfDir, item.Href),
			MediaType: item.MediaType,
		})
	}

	addHrefCandidate := func(href string) {
		resolvedHref := resolveEpubReference(opfDir, href)
		if resolvedHref == "" {
			return
		}

		if item, exists := findManifestItemByPath(manifest, resolvedHref, opfDir); exists {
			addManifestItem(item)
			return
		}

		addCandidate(epubCoverCandidate{
			Path:      resolvedHref,
			MediaType: inferEpubMediaType(resolvedHref),
		})
	}

	for _, meta := range pkg.Metadata.Meta {
		coverRef := ""
		if strings.EqualFold(strings.TrimSpace(meta.Name), "cover") {
			coverRef = firstNonEmpty(meta.Content, meta.Value)
		}
		if strings.EqualFold(strings.TrimSpace(meta.Property), "cover") {
			coverRef = firstNonEmpty(coverRef, meta.Content, meta.Value)
		}
		if coverRef == "" {
			continue
		}

		if item, exists := manifest[strings.TrimSpace(coverRef)]; exists {
			addManifestItem(item)
			continue
		}

		addHrefCandidate(coverRef)
	}

	for _, item := range pkg.Manifest.Items {
		properties := strings.Fields(strings.ToLower(item.Properties))
		for _, property := range properties {
			if property == "cover-image" {
				addManifestItem(item)
				break
			}
		}
	}

	for _, reference := range pkg.Guide.References {
		referenceType := strings.ToLower(strings.TrimSpace(reference.Type))
		if referenceType == "cover" || referenceType == "title-page" || referenceType == "titlepage" {
			addHrefCandidate(reference.Href)
		}
	}

	for _, item := range pkg.Manifest.Items {
		lowerID := strings.ToLower(item.ID)
		lowerHref := strings.ToLower(item.Href)
		if !containsEpubCoverKeyword(lowerID) && !containsEpubCoverKeyword(lowerHref) {
			continue
		}

		if isSupportedEpubCoverMediaType(item.MediaType) || isSupportedEpubItem(item.MediaType) {
			addManifestItem(item)
		}
	}

	return candidates
}

func resolveEpubCoverCandidateDataURL(
	fileMap map[string]*zip.File,
	candidate epubCoverCandidate,
) (string, error) {
	mediaType := strings.ToLower(strings.TrimSpace(candidate.MediaType))
	if mediaType == "" {
		mediaType = inferEpubMediaType(candidate.Path)
	}

	if isSupportedEpubCoverMediaType(mediaType) {
		coverBytes, err := readZipFileBytes(fileMap, candidate.Path)
		if err != nil {
			return "", err
		}

		return fmt.Sprintf(
			"data:%s;base64,%s",
			mediaType,
			base64.StdEncoding.EncodeToString(coverBytes),
		), nil
	}

	if !isSupportedEpubItem(mediaType) && !isLikelyEpubMarkupFile(candidate.Path) {
		return "", nil
	}

	return resolveEpubCoverFromMarkup(fileMap, candidate.Path)
}

func resolveEpubCoverFromMarkup(fileMap map[string]*zip.File, markupPath string) (string, error) {
	markup, err := readZipFileText(fileMap, markupPath)
	if err != nil {
		return "", err
	}

	baseDir := path.Dir(markupPath)
	if baseDir == "." {
		baseDir = ""
	}

	for _, assetRef := range extractEpubAssetReferences(markup) {
		assetPath := resolveEpubReference(baseDir, assetRef)
		if assetPath == "" {
			continue
		}

		assetMediaType := inferEpubMediaType(assetPath)
		if !isSupportedEpubCoverMediaType(assetMediaType) {
			continue
		}

		assetBytes, err := readZipFileBytes(fileMap, assetPath)
		if err != nil {
			continue
		}

		return fmt.Sprintf(
			"data:%s;base64,%s",
			assetMediaType,
			base64.StdEncoding.EncodeToString(assetBytes),
		), nil
	}

	return "", nil
}

func resolveEpubFrontMatterCoverDataURL(
	fileMap map[string]*zip.File,
	pkg epubPackage,
	manifest map[string]epubManifestItem,
	opfDir string,
) (string, error) {
	const maxFrontMatterItems = 4

	for index, itemRef := range pkg.Spine.ItemRefs {
		if index >= maxFrontMatterItems {
			break
		}

		item, exists := manifest[itemRef.IDRef]
		if !exists || !isSupportedEpubItem(item.MediaType) {
			continue
		}

		markupPath := normalizeZipPath(path.Join(opfDir, item.Href))
		markup, err := readZipFileText(fileMap, markupPath)
		if err != nil || !isLikelyEpubCoverMarkup(markup, item) {
			continue
		}

		coverDataURL, err := resolveEpubCoverFromMarkup(fileMap, markupPath)
		if err != nil {
			continue
		}
		if strings.TrimSpace(coverDataURL) != "" {
			return coverDataURL, nil
		}
	}

	return "", nil
}

func extractEpubAssetReferences(markup string) []string {
	references := make([]string, 0, 8)
	seen := make(map[string]struct{})
	addReference := func(reference string) {
		trimmed := strings.TrimSpace(stdhtml.UnescapeString(reference))
		trimmed = strings.Trim(trimmed, `"'`)
		if trimmed == "" {
			return
		}
		lowerRef := strings.ToLower(trimmed)
		if strings.HasPrefix(lowerRef, "#") ||
			strings.HasPrefix(lowerRef, "data:") ||
			strings.HasPrefix(lowerRef, "http://") ||
			strings.HasPrefix(lowerRef, "https://") ||
			strings.HasPrefix(lowerRef, "//") {
			return
		}

		if _, exists := seen[trimmed]; exists {
			return
		}

		seen[trimmed] = struct{}{}
		references = append(references, trimmed)
	}

	doc, err := xhtml.Parse(strings.NewReader(markup))
	if err == nil {
		var walk func(*xhtml.Node)
		walk = func(node *xhtml.Node) {
			if node == nil {
				return
			}

			if node.Type == xhtml.ElementNode {
				tag := strings.ToLower(node.Data)
				switch tag {
				case "img", "image":
					for _, attr := range node.Attr {
						if attr.Key == "src" || attr.Key == "href" {
							addReference(attr.Val)
						}
					}
				case "object", "embed":
					for _, attr := range node.Attr {
						if attr.Key == "data" || attr.Key == "src" {
							addReference(attr.Val)
						}
					}
				}

				for _, attr := range node.Attr {
					if attr.Key == "style" {
						for _, styleURL := range extractStyleURLs(attr.Val) {
							addReference(styleURL)
						}
					}
				}
			}

			if node.Type == xhtml.ElementNode && strings.EqualFold(node.Data, "style") && node.FirstChild != nil {
				for _, styleURL := range extractStyleURLs(node.FirstChild.Data) {
					addReference(styleURL)
				}
			}

			for child := node.FirstChild; child != nil; child = child.NextSibling {
				walk(child)
			}
		}

		walk(doc)
	}

	attributeRegexp := regexp.MustCompile(`(?i)(?:src|href|xlink:href|data)\s*=\s*["']([^"']+)["']`)
	for _, match := range attributeRegexp.FindAllStringSubmatch(markup, -1) {
		if len(match) > 1 {
			addReference(match[1])
		}
	}

	for _, styleURL := range extractStyleURLs(markup) {
		addReference(styleURL)
	}

	return references
}

func extractStyleURLs(content string) []string {
	styleURLRegexp := regexp.MustCompile(`(?i)url\(([^)]+)\)`)
	matches := styleURLRegexp.FindAllStringSubmatch(content, -1)
	urls := make([]string, 0, len(matches))
	for _, match := range matches {
		if len(match) > 1 {
			urls = append(urls, match[1])
		}
	}
	return urls
}

func resolveEpubReference(baseDir, reference string) string {
	trimmed := strings.TrimSpace(reference)
	if trimmed == "" {
		return ""
	}

	if hashIndex := strings.Index(trimmed, "#"); hashIndex >= 0 {
		trimmed = trimmed[:hashIndex]
	}
	if queryIndex := strings.Index(trimmed, "?"); queryIndex >= 0 {
		trimmed = trimmed[:queryIndex]
	}
	trimmed = strings.TrimSpace(trimmed)
	if trimmed == "" {
		return ""
	}

	if strings.HasPrefix(trimmed, "/") {
		return normalizeZipPath(trimmed)
	}

	return normalizeZipPath(path.Join(baseDir, trimmed))
}

func findManifestItemByPath(
	manifest map[string]epubManifestItem,
	targetPath string,
	opfDir string,
) (epubManifestItem, bool) {
	normalizedTargetPath := normalizeZipPath(targetPath)
	for _, item := range manifest {
		itemPath := normalizeZipPath(path.Join(opfDir, item.Href))
		if itemPath == normalizedTargetPath {
			return item, true
		}
	}

	return epubManifestItem{}, false
}

func inferEpubMediaType(filePath string) string {
	switch strings.ToLower(path.Ext(filePath)) {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".gif":
		return "image/gif"
	case ".webp":
		return "image/webp"
	case ".svg":
		return "image/svg+xml"
	case ".bmp":
		return "image/bmp"
	case ".xhtml":
		return "application/xhtml+xml"
	case ".html", ".htm":
		return "text/html"
	default:
		return ""
	}
}

func isLikelyEpubMarkupFile(filePath string) bool {
	switch strings.ToLower(path.Ext(filePath)) {
	case ".xhtml", ".html", ".htm":
		return true
	default:
		return false
	}
}

func isLikelyEpubCoverMarkup(markup string, item epubManifestItem) bool {
	references := extractEpubAssetReferences(markup)
	if len(references) == 0 {
		return false
	}

	if containsEpubCoverKeyword(item.ID) || containsEpubCoverKeyword(item.Href) {
		return true
	}

	title, text := extractEpubChapterText(markup)
	if containsEpubCoverKeyword(title) {
		return true
	}

	trimmedTextLength := runeLen(strings.TrimSpace(text))
	return trimmedTextLength <= 80
}

func containsEpubCoverKeyword(content string) bool {
	lowerContent := strings.ToLower(content)
	keywords := []string{"cover", "titlepage", "title-page", "frontcover", "jacket"}
	for _, keyword := range keywords {
		if strings.Contains(lowerContent, keyword) {
			return true
		}
	}

	return false
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}

	return ""
}

func stripHTMLTags(markup string) string {
	tagRegexp := regexp.MustCompile(`<[^>]+>`)
	return tagRegexp.ReplaceAllString(markup, " ")
}

func normalizeEpubText(content string) string {
	lines := strings.Split(content, "\n")
	normalizedLines := make([]string, 0, len(lines))
	blankCount := 0

	for _, line := range lines {
		trimmed := strings.Join(strings.Fields(strings.TrimSpace(line)), " ")
		if trimmed == "" {
			blankCount++
			if blankCount <= 1 {
				normalizedLines = append(normalizedLines, "")
			}
			continue
		}

		blankCount = 0
		normalizedLines = append(normalizedLines, trimmed)
	}

	return strings.TrimSpace(strings.Join(normalizedLines, "\n"))
}
