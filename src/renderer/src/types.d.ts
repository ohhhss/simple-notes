import type { NotesAPI } from '../../shared/types'

declare global {
  interface Window {
    notesAPI: NotesAPI
  }
}

export {}
