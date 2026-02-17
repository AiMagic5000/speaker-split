// User file storage - tracks all files created by user
// Uses localStorage for persistence, keyed by Clerk user ID

export type FileType = 'transcription' | 'speaker-split' | 'document' | 'voice-clone'

export interface UserFile {
  id: string
  type: FileType
  name: string
  createdAt: string
  // For transcriptions
  transcript?: Array<{
    speaker: string
    start: number
    end: number
    text: string
  }>
  // For speaker splits
  speakerAudios?: Array<{
    speaker: string
    url: string
  }>
  // For documents
  htmlContent?: string
  docxContent?: string  // Base64 encoded Word document
  documentType?: 'html' | 'docx'  // Type of document
  documentUrl?: string
  // For voice clones
  clonedAudioUrl?: string
  generatedText?: string
  // Original audio info
  originalFileName?: string
  originalFileSize?: number
  jobId?: string
}

const STORAGE_KEY_PREFIX = 'speaker-split-files-'

function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`
}

export function getUserFiles(userId: string): UserFile[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(getStorageKey(userId))
    if (!stored) return []
    return JSON.parse(stored)
  } catch {
    return []
  }
}

export function saveUserFile(userId: string, file: Omit<UserFile, 'id' | 'createdAt'>): UserFile {
  const files = getUserFiles(userId)

  const newFile: UserFile = {
    ...file,
    id: `file_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    createdAt: new Date().toISOString()
  }

  files.unshift(newFile) // Add to beginning

  // Keep only last 100 files
  const trimmedFiles = files.slice(0, 100)

  if (typeof window !== 'undefined') {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(trimmedFiles))
  }

  return newFile
}

export function deleteUserFile(userId: string, fileId: string): void {
  const files = getUserFiles(userId)
  const filtered = files.filter(f => f.id !== fileId)

  if (typeof window !== 'undefined') {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(filtered))
  }
}

export function clearUserFiles(userId: string): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(getStorageKey(userId))
  }
}

export function getFileTypeLabel(type: FileType): string {
  switch (type) {
    case 'transcription':
      return 'Transcription'
    case 'speaker-split':
      return 'Speaker Split'
    case 'document':
      return 'Document'
    case 'voice-clone':
      return 'Voice Clone'
    default:
      return 'File'
  }
}

export function getFileTypeColor(type: FileType): string {
  switch (type) {
    case 'transcription':
      return 'blue'
    case 'speaker-split':
      return 'teal'
    case 'document':
      return 'amber'
    case 'voice-clone':
      return 'violet'
    default:
      return 'slate'
  }
}
