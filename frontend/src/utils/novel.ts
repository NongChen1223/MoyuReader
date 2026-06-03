import type { Book, Chapter, Novel } from '@/types'

const DEFAULT_AUTHOR = '未知作者'
export const CONTENT_CHUNK_CLASS_NAME = 'reader-content-chunk'
const PLAIN_TEXT_CHUNK_SIZE = 18
const RICH_TEXT_CHUNK_SIZE = 16

type BridgeChapter = {
  index: number
  title: string
  startPos?: number
  start_pos?: number
  endPos?: number
  end_pos?: number
  wordCount?: number
  word_count?: number
}

type BridgeNovel = {
  title: string
  author?: string
  filePath?: string
  file_path?: string
  cover?: string
  format: string
  size: number
  content?: string
  contentLength?: number
  content_length?: number
  chapters?: BridgeChapter[]
  currentChapter?: number
  current_chapter?: number
  readProgress?: number
  read_progress?: number
  lastReadTime?: number
  last_read_time?: number
}

export function normalizeNovel(source: BridgeNovel | Novel): Novel {
  const sourceChapters = 'chapters' in source ? source.chapters : []

  return {
    title: source.title,
    author: ('author' in source && source.author) || DEFAULT_AUTHOR,
    filePath: 'filePath' in source ? source.filePath : source.file_path,
    cover: source.cover,
    format: source.format,
    size: source.size,
    content: source.content || '',
    contentLength:
      'contentLength' in source ? source.contentLength : source.content_length || 0,
    chapters: sourceChapters.map(normalizeChapter),
    currentChapter:
      'currentChapter' in source ? source.currentChapter : source.current_chapter,
    readProgress:
      'readProgress' in source ? source.readProgress : source.read_progress,
    lastReadTime:
      'lastReadTime' in source ? source.lastReadTime : source.last_read_time,
  }
}

export function normalizeChapter(source: BridgeChapter | Chapter): Chapter {
  return {
    index: source.index,
    title: source.title,
    startPos: 'startPos' in source ? source.startPos : source.start_pos,
    endPos: 'endPos' in source ? source.endPos : source.end_pos,
    wordCount: 'wordCount' in source ? source.wordCount : source.word_count,
  }
}

export function mapNovelToBook(novel: Novel, existingBook?: Book): Book {
  return {
    id: novel.filePath,
    title: novel.title,
    author: novel.author || existingBook?.author || DEFAULT_AUTHOR,
    type: 'novel',
    category: formatBookCategory(novel.format),
    isDirectory: false,
    cover: novel.cover || existingBook?.cover,
    filePath: novel.filePath,
    format: novel.format.replace(/^\./, ''),
    fileSize: novel.size,
    progress: clampProgress(novel.readProgress),
    lastReadTime: novel.lastReadTime || Date.now(),
    createdAt: existingBook?.createdAt || Date.now(),
  }
}

export function formatBookCategory(format: string) {
  return format.replace(/^\./, '').toUpperCase() || 'TXT'
}

export function resolveReaderFontFamily(fontFamily: string) {
  switch (fontFamily) {
    case 'serif':
      return 'var(--font-serif)'
    case 'mono':
      return 'var(--font-mono)'
    case 'sans':
    case 'system':
    default:
      return 'var(--font-sans)'
  }
}

export function buildHighlightedHtml(content: string, keyword: string) {
  return buildHighlightedHtmlChunks(content, keyword).join('')
}

export function buildHighlightedHtmlChunks(content: string, keyword: string) {
  const safeKeyword = keyword.trim()
  const paragraphSource = content.trim() ? content : '暂无内容'
  const paragraphs = paragraphSource.split(/\n{2,}/)
  const paragraphMarkup = paragraphs.map((paragraph) => {
    const escapedParagraph = escapeHtml(paragraph).replace(/\n/g, '<br />')
    if (!safeKeyword) {
      return `<p>${escapedParagraph}</p>`
    }

    const regex = new RegExp(`(${escapeRegExp(escapeHtml(safeKeyword))})`, 'gi')
    return `<p>${escapedParagraph.replace(regex, '<mark>$1</mark>')}</p>`
  })

  return wrapMarkupChunks(paragraphMarkup, PLAIN_TEXT_CHUNK_SIZE)
}

export function isRichChapterContent(content: string) {
  const trimmedContent = content.trim()
  return trimmedContent.includes('data-chapter-rich="true"')
}

interface DesktopOverlayChapterMarkup {
  chapterIndex?: number
  title?: string | null
  content: string
  contentIsHtml?: boolean
}

export function buildDesktopOverlayMarkup(
  title: string | null | undefined,
  content: string,
  contentIsHtml = false
) {
  return buildDesktopOverlayChaptersMarkup([
    {
      title,
      content,
      contentIsHtml,
    },
  ])
}

export function buildDesktopOverlayChaptersMarkup(chapters: DesktopOverlayChapterMarkup[]) {
  const safeChapters = chapters.length > 0 ? chapters : [{ title: null, content: '', contentIsHtml: false }]
  const articleMarkup = safeChapters
    .map((chapter, index) => buildDesktopOverlayChapterMarkup(chapter, index))
    .join('')

  return [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<style>',
    'body { margin: 0; padding: 0; }',
    'article { margin: 0; padding: 0; }',
    'p, div, section, blockquote, pre, ul, ol, figure { margin: 0 0 1em; }',
    '.overlay-chapter + .overlay-chapter { margin-top: 2.8em; padding-top: 2.2em; border-top: 1px solid rgba(255, 255, 255, 0.18); }',
    '.overlay-chapter-title { margin: 0 0 1.2em; }',
    'img { display: block; max-width: 100%; height: auto; margin: 0 auto; }',
    'figcaption { margin-top: 0.4em; }',
    '</style>',
    '</head>',
    '<body>',
    `<article>${articleMarkup}</article>`,
    '</body>',
    '</html>',
  ].join('')
}

export function buildDesktopOverlayPreviewText(
  content: string,
  contentIsHtml: boolean,
  maxLength = 12000
) {
  const plainTextSource = contentIsHtml ? stripHtmlToText(content) : content
  const normalizedText = plainTextSource
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (!normalizedText) {
    return '暂无内容'
  }

  const runes = Array.from(normalizedText)
  if (runes.length <= maxLength) {
    return normalizedText
  }

  return `${runes.slice(0, maxLength).join('').trimEnd()}...`
}

interface DesktopOverlayPreviewMarkupOptions {
  maxLength?: number
  maxImages?: number
}

export function buildDesktopOverlayPreviewMarkup(
  content: string,
  contentIsHtml: boolean,
  options?: DesktopOverlayPreviewMarkupOptions
) {
  const maxLength = options?.maxLength ?? 12000
  const maxImages = options?.maxImages ?? 2

  if (!contentIsHtml) {
    const previewText = buildDesktopOverlayPreviewText(content, false, maxLength)
    return buildDesktopOverlayPlainTextMarkup(previewText)
  }

  const trimmedContent = content.trim()
  if (!trimmedContent) {
    return '<p>暂无内容</p>'
  }

  if (typeof DOMParser === 'undefined') {
    const previewText = buildDesktopOverlayPreviewText(content, true, maxLength)
    return buildDesktopOverlayPlainTextMarkup(previewText)
  }

  const parsed = new DOMParser().parseFromString(trimmedContent, 'text/html')
  const fragment = document.createDocumentFragment()
  let remainingChars = maxLength
  let remainingImages = maxImages

  const appendPlainTextBlock = (target: HTMLElement, text: string) => {
    const normalized = buildDesktopOverlayPreviewText(text, false, remainingChars)
    if (!normalized.trim()) {
      return
    }

    const paragraph = document.createElement('p')
    paragraph.innerHTML = escapeHtml(normalized).replace(/\n/g, '<br />')
    target.appendChild(paragraph)
    remainingChars -= Array.from(normalized).length
  }

  const sanitizeNode = (node: Node): Node | null => {
    if (remainingChars <= 0 && remainingImages <= 0) {
      return null
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.textContent?.replace(/\s+/g, ' ') || ''
      if (!value.trim()) {
        return null
      }

      const nextValue = Array.from(value).slice(0, remainingChars).join('')
      if (!nextValue.trim()) {
        return null
      }

      remainingChars -= Array.from(nextValue).length
      return document.createTextNode(nextValue)
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null
    }

    const sourceElement = node as HTMLElement
    const tagName = sourceElement.tagName.toLowerCase()

    if (['script', 'style', 'link', 'meta', 'svg'].includes(tagName)) {
      return null
    }

    if (tagName === 'img') {
      if (remainingImages <= 0) {
        return null
      }

      const src = sourceElement.getAttribute('src')?.trim()
      if (!src) {
        return null
      }

      remainingImages -= 1
      const image = document.createElement('img')
      image.setAttribute('src', src)
      image.setAttribute('alt', sourceElement.getAttribute('alt') || '')
      return image
    }

    const allowedTagMap: Record<string, string> = {
      article: 'div',
      section: 'section',
      div: 'div',
      p: 'p',
      h1: 'p',
      h2: 'p',
      h3: 'p',
      h4: 'p',
      h5: 'p',
      h6: 'p',
      blockquote: 'blockquote',
      pre: 'pre',
      ul: 'ul',
      ol: 'ol',
      li: 'li',
      strong: 'strong',
      b: 'strong',
      em: 'em',
      i: 'em',
      span: 'span',
      br: 'br',
      figure: 'figure',
      figcaption: 'figcaption',
    }

    const safeTagName = allowedTagMap[tagName]
    if (!safeTagName) {
      const fallbackText = sourceElement.textContent || ''
      if (fallbackText.trim()) {
        return sanitizeNode(document.createTextNode(fallbackText))
      }
      return null
    }

    if (safeTagName === 'br') {
      return document.createElement('br')
    }

    const safeElement = document.createElement(safeTagName)
    if (safeTagName === 'p' && /^h[1-6]$/.test(tagName)) {
      safeElement.style.fontWeight = '700'
    }

    Array.from(sourceElement.childNodes).forEach((childNode) => {
      const sanitizedChild = sanitizeNode(childNode)
      if (sanitizedChild) {
        safeElement.appendChild(sanitizedChild)
      }
    })

    if (!safeElement.childNodes.length && !['img', 'br'].includes(safeTagName)) {
      return null
    }

    return safeElement
  }

  Array.from(parsed.body.childNodes).forEach((childNode) => {
    if (remainingChars <= 0 && remainingImages <= 0) {
      return
    }

    const sanitizedChild = sanitizeNode(childNode)
    if (sanitizedChild) {
      fragment.appendChild(sanitizedChild)
    }
  })

  const container = document.createElement('div')
  container.appendChild(fragment)
  const previewHtml = container.innerHTML.trim()

  if (previewHtml) {
    return previewHtml
  }

  appendPlainTextBlock(container, content)
  return container.innerHTML.trim() || '<p>暂无内容</p>'
}

export function stripHtmlToText(content: string) {
  if (!content.includes('<')) {
    return content
  }

  if (typeof DOMParser !== 'undefined') {
    const parsed = new DOMParser().parseFromString(content, 'text/html')
    return parsed.body.textContent?.replace(/\s+\n/g, '\n').trim() || ''
  }

  return content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function findChapterIndexByPosition(chapters: Chapter[], position: number) {
  const chapterIndex = chapters.findIndex(
    (chapter) => position >= chapter.startPos && position < chapter.endPos
  )

  return chapterIndex >= 0 ? chapterIndex : 0
}

export function calculateProgressFromPosition(
  novel: Novel,
  chapterIndex: number,
  chapterScrollProgress: number
) {
  const chapter = novel.chapters[chapterIndex]
  const totalLength = novel.contentLength || novel.content.length
  if (!chapter || totalLength <= 0) {
    return 0
  }

  const normalizedChapterProgress = Math.max(0, Math.min(1, chapterScrollProgress))
  const chapterLength = Math.max(chapter.endPos - chapter.startPos, 1)
  const absolutePosition =
    chapter.startPos + Math.round(chapterLength * normalizedChapterProgress)

  return clampProgress((absolutePosition / Math.max(totalLength, 1)) * 100)
}

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Number(progress || 0)))
}

function buildDesktopOverlayChapterMarkup(
  chapter: DesktopOverlayChapterMarkup,
  index: number
) {
  const safeTitle = chapter.title?.trim()
  const contentMarkup = chapter.contentIsHtml
    ? normalizeDesktopOverlayHtml(chapter.content)
    : buildDesktopOverlayPlainTextMarkup(chapter.content)

  const titleMarkup = safeTitle
    ? `<p class="overlay-chapter-title"><strong>${escapeHtml(safeTitle)}</strong></p>`
    : ''
  const bodyMarkup = contentMarkup || '<p>暂无内容</p>'
  const chapterIndexAttr =
    typeof chapter.chapterIndex === 'number'
      ? ` data-overlay-chapter-index="${chapter.chapterIndex}"`
      : ` data-overlay-chapter-index="${index}"`
  const chapterSection = `<section class="overlay-chapter"${chapterIndexAttr}>${titleMarkup}${bodyMarkup}</section>`

  if (typeof chapter.chapterIndex !== 'number') {
    return chapterSection
  }

  return `<!--moyureader-chapter:${chapter.chapterIndex}:start-->${chapterSection}<!--moyureader-chapter:${chapter.chapterIndex}:end-->`
}

function buildDesktopOverlayPlainTextMarkup(content: string) {
  const paragraphSource = content.trim() ? content : '暂无内容'
  const paragraphs = paragraphSource.split(/\n{2,}/)

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function normalizeDesktopOverlayHtml(content: string) {
  const trimmedContent = content.trim()
  if (!trimmedContent) {
    return ''
  }

  if (typeof DOMParser === 'undefined') {
    return trimmedContent
  }

  const parsed = new DOMParser().parseFromString(trimmedContent, 'text/html')
  parsed.querySelectorAll('script,style,link,meta,svg').forEach((node) => node.remove())

  parsed.querySelectorAll('img').forEach((image) => {
    image.removeAttribute('loading')
    image.removeAttribute('class')
    image.setAttribute(
      'style',
      'display:block; max-width:100%; height:auto; margin:0 auto; opacity:inherit;'
    )
    if (!image.getAttribute('alt')) {
      image.setAttribute('alt', '')
    }
  })

  parsed.querySelectorAll('figure').forEach((figure) => {
    figure.removeAttribute('class')
    figure.setAttribute('style', 'margin:0 0 1em; background:transparent;')
  })

  parsed
    .querySelectorAll<HTMLElement>('*')
    .forEach((element) => {
      if (element.tagName.toLowerCase() === 'img') {
        return
      }

      element.removeAttribute('class')
      const currentStyle = element.getAttribute('style') || ''
      const sanitizedStyle = currentStyle
        .replace(/color\s*:[^;]+;?/gi, '')
        .replace(/background(?:-color)?\s*:[^;]+;?/gi, '')
        .replace(/font-family\s*:[^;]+;?/gi, '')
        .replace(/opacity\s*:[^;]+;?/gi, '')
        .trim()

      element.setAttribute(
        'style',
        `${sanitizedStyle ? `${sanitizedStyle.replace(/;?$/, '; ')} ` : ''}color: inherit; background: transparent;`.trim()
      )
    })

  return parsed.body.innerHTML.trim()
}

export function splitReaderContentIntoChunks(
  content: string,
  isRichContent: boolean,
  keyword = ''
) {
  if (!content.trim()) {
    return []
  }

  return isRichContent ? splitRichContentIntoChunks(content) : buildHighlightedHtmlChunks(content, keyword)
}

function splitRichContentIntoChunks(content: string) {
  if (typeof DOMParser === 'undefined') {
    return [content]
  }

  const parsed = new DOMParser().parseFromString(content, 'text/html')
  const body = parsed.body
  const chunks: string[] = []
  let buffer: string[] = []

  Array.from(body.childNodes).forEach((node) => {
    const html =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as HTMLElement).outerHTML
        : escapeHtml(node.textContent || '')

    if (!html.trim()) {
      return
    }

    buffer.push(html)
    if (buffer.length >= RICH_TEXT_CHUNK_SIZE) {
      chunks.push(buffer.join(''))
      buffer = []
    }
  })

  if (buffer.length > 0) {
    chunks.push(buffer.join(''))
  }

  return chunks.length > 0 ? chunks : [content]
}

function wrapMarkupChunks(items: string[], chunkSize: number) {
  const chunks: string[] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize).join(''))
  }

  return chunks
}

function escapeHtml(content: string) {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeRegExp(content: string) {
  return content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
