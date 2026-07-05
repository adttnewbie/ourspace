import type { StickyNote } from '@/lib/api'

export const noteColors = ['yellow', 'pink', 'mint', 'blue', 'lavender'] as const

export const noteToneClasses = {
  blue: 'bg-scrap-blue',
  lavender: 'bg-scrap-lavender',
  mint: 'bg-scrap-mint',
  pink: 'bg-scrap-pink',
  yellow: 'bg-scrap-yellow',
} as const

export type NoteColor = (typeof noteColors)[number]

export function isNoteColor(value: string): value is NoteColor {
  switch (value) {
    case 'blue':
    case 'lavender':
    case 'mint':
    case 'pink':
    case 'yellow':
      return true
    default:
      return false
  }
}

export function getNoteTone(note: StickyNote) {
  return isNoteColor(note.color) ? note.color : 'yellow'
}
