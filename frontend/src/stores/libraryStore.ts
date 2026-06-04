import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Book, BookContentType, BookFile } from '@/types'

interface LibraryState {
  books: Book[]
  upsertBook: (book: Book) => void
  createDirectory: (name: string) => void
  renameBook: (bookId: string, title: string) => void
  renameFileInDirectory: (directoryId: string, fileId: string, title: string) => void
  updateBookContentType: (bookId: string, contentType: BookContentType) => void
  updateFileContentTypeInDirectory: (
    directoryId: string,
    fileId: string,
    contentType: BookContentType
  ) => void
  removeBook: (bookId: string) => void
  removeFileFromDirectory: (directoryId: string, fileId: string) => void
  moveBooksToDirectory: (directoryId: string, fileIds: string[]) => void
  addImportedFileToDirectory: (directoryId: string, book: Book) => void
  updateProgressByFilePath: (
    filePath: string,
    payload: { progress: number; lastReadTime: number }
  ) => void
}

const DEFAULT_AUTHOR = '未知作者'

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Number(progress || 0)))
}

function normalizeContentType(value?: string): BookContentType {
  return value === 'novel' || value === 'comic' || value === 'document' ? value : 'auto'
}

function normalizeDirectoryFiles(files: BookFile[] = []) {
  const seenKeys = new Set<string>()

  return files.reduce<BookFile[]>((result, file) => {
    const dedupeKey = file.filePath || file.id
    if (seenKeys.has(dedupeKey)) {
      return result
    }

    seenKeys.add(dedupeKey)
    result.push({
      ...file,
      author: file.author || DEFAULT_AUTHOR,
      contentType: normalizeContentType(file.contentType),
      progress: clampProgress(file.progress),
      order: result.length + 1,
    })

    return result
  }, [])
}

function normalizeLibraryBooks(books: Book[]) {
  const nestedKeys = new Set<string>()

  const normalizedBooks = books.map((book) => {
    if (!book.isDirectory) {
      return {
        ...book,
        author: book.author || DEFAULT_AUTHOR,
        contentType: normalizeContentType(book.contentType),
        progress: clampProgress(book.progress),
      }
    }

    const normalizedFiles = normalizeDirectoryFiles(book.files)
    normalizedFiles.forEach((file) => {
      nestedKeys.add(file.id)
      if (file.filePath) {
        nestedKeys.add(file.filePath)
      }
    })

    const fallbackLastReadFile = [...normalizedFiles].sort(
      (a, b) => (b.lastReadTime || 0) - (a.lastReadTime || 0)
    )[0]
    const activeLastReadFile = normalizedFiles.find((file) => file.id === book.lastReadFileId)

    return {
      ...book,
      files: normalizedFiles,
      totalFiles: normalizedFiles.length,
      lastReadFileId: activeLastReadFile?.id || fallbackLastReadFile?.id,
      lastReadTime:
        activeLastReadFile?.lastReadTime ||
        fallbackLastReadFile?.lastReadTime ||
        book.lastReadTime,
    }
  })

  return normalizedBooks.filter((book) => {
    if (book.isDirectory) {
      return true
    }

    return !nestedKeys.has(book.id) && !(book.filePath && nestedKeys.has(book.filePath))
  })
}

function mapBookToDirectoryFile(book: Book, order: number): BookFile {
  return {
    id: book.id,
    title: book.title,
    author: book.author || DEFAULT_AUTHOR,
    cover: book.cover,
    filePath: book.filePath || '',
    format: book.format || '',
    contentType: normalizeContentType(book.contentType),
    fileSize: book.fileSize || 0,
    progress: clampProgress(book.progress || 0),
    lastReadTime: book.lastReadTime,
    order,
  }
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set) => ({
      books: [],

      upsertBook: (book) =>
        set((state) => {
          const existing = state.books.find((item) => item.id === book.id)
          if (!existing) {
            return { books: normalizeLibraryBooks([book, ...state.books]) }
          }

          return {
            books: normalizeLibraryBooks(
              state.books.map((item) => (item.id === book.id ? { ...existing, ...book } : item))
            ),
          }
        }),

      createDirectory: (name) =>
        set((state) => ({
          books: normalizeLibraryBooks([
            {
              id: `directory:${crypto.randomUUID()}`,
              title: name,
              author: '自定义目录',
              type: 'novel',
              category: '目录',
              contentType: 'auto',
              isDirectory: true,
              totalFiles: 0,
              files: [],
              createdAt: Date.now(),
            },
            ...state.books,
          ]),
        })),

      renameBook: (bookId, title) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) =>
              book.id === bookId ? { ...book, title: title.trim() || book.title } : book
            )
          ),
        })),

      renameFileInDirectory: (directoryId, fileId, title) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) => {
              if (book.id !== directoryId || !book.isDirectory) {
                return book
              }

              return {
                ...book,
                files:
                  book.files?.map((file) =>
                    file.id === fileId ? { ...file, title: title.trim() || file.title } : file
                  ) || [],
              }
            })
          ),
        })),

      updateBookContentType: (bookId, contentType) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) =>
              book.id === bookId
                ? { ...book, contentType: normalizeContentType(contentType) }
                : book
            )
          ),
        })),

      updateFileContentTypeInDirectory: (directoryId, fileId, contentType) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) => {
              if (book.id !== directoryId || !book.isDirectory) {
                return book
              }

              return {
                ...book,
                files:
                  book.files?.map((file) =>
                    file.id === fileId
                      ? { ...file, contentType: normalizeContentType(contentType) }
                      : file
                  ) || [],
              }
            })
          ),
        })),

      removeBook: (bookId) =>
        set((state) => ({
          books: normalizeLibraryBooks(state.books.filter((book) => book.id !== bookId)),
        })),

      removeFileFromDirectory: (directoryId, fileId) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) => {
              if (book.id !== directoryId || !book.isDirectory) {
                return book
              }

              return {
                ...book,
                files: book.files?.filter((file) => file.id !== fileId) || [],
              }
            })
          ),
        })),

      moveBooksToDirectory: (directoryId, fileIds) =>
        set((state) => {
          const filesToMove = state.books.filter(
            (book) => fileIds.includes(book.id) && !book.isDirectory
          )
          if (filesToMove.length === 0) {
            return state
          }

          return {
            books: normalizeLibraryBooks(
              state.books
                .map((book) => {
                  if (book.id !== directoryId || !book.isDirectory) {
                    return book
                  }

                  const existingFiles = normalizeDirectoryFiles(book.files)
                  const existingKeys = new Set(
                    existingFiles.map((file) => file.filePath || file.id)
                  )
                  const newFiles = filesToMove
                    .filter((file) => !existingKeys.has(file.filePath || file.id))
                    .map((file, index) =>
                      mapBookToDirectoryFile(file, existingFiles.length + index + 1)
                    )

                  return {
                    ...book,
                    files: [...existingFiles, ...newFiles],
                    totalFiles: existingFiles.length + newFiles.length,
                  }
                })
                .filter((book) => !fileIds.includes(book.id))
            ),
          }
        }),

      addImportedFileToDirectory: (directoryId, importedBook) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) => {
              if (book.id !== directoryId || !book.isDirectory) {
                return book
              }

              const existingFiles = normalizeDirectoryFiles(book.files)
              const alreadyExists = existingFiles.some(
                (file) => file.id === importedBook.id || file.filePath === importedBook.filePath
              )
              if (alreadyExists) {
                return book
              }

              return {
                ...book,
                files: [
                  ...existingFiles,
                  mapBookToDirectoryFile(importedBook, existingFiles.length + 1),
                ],
                totalFiles: existingFiles.length + 1,
                lastReadFileId: importedBook.id,
                lastReadTime: importedBook.lastReadTime,
              }
            })
          ),
        })),

      updateProgressByFilePath: (filePath, payload) =>
        set((state) => ({
          books: normalizeLibraryBooks(
            state.books.map((book) => {
              if (book.isDirectory) {
                const updatedFiles =
                  book.files?.map((file) =>
                    file.filePath === filePath
                      ? {
                          ...file,
                          progress: clampProgress(payload.progress),
                          lastReadTime: payload.lastReadTime,
                        }
                      : file
                  ) || []

                const lastReadFile = updatedFiles.find((file) => file.filePath === filePath)
                if (!lastReadFile) {
                  return book
                }

                return {
                  ...book,
                  files: updatedFiles,
                  lastReadTime: payload.lastReadTime,
                  lastReadFileId: lastReadFile.id,
                }
              }

              if (book.filePath !== filePath) {
                return book
              }

              return {
                ...book,
                progress: clampProgress(payload.progress),
                lastReadTime: payload.lastReadTime,
              }
            })
          ),
        })),
    }),
    {
      name: 'moyureader-library',
      merge: (persistedState, currentState) => {
        const typedState = persistedState as Partial<LibraryState> | undefined

        return {
          ...currentState,
          ...typedState,
          books: normalizeLibraryBooks(typedState?.books || currentState.books),
        }
      },
    }
  )
)
