import { useCallback, useEffect, useState } from 'react'
import {
  LoaderCircle,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { NotesSkeleton } from '@/components/loading-skeleton'
import { ScrapbookCard } from '@/components/scrapbook'
import { Button } from '@/components/ui/button'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  ApiError,
  ApiNetworkError,
  createNote,
  deleteNote,
  getCachedNotesList,
  listNotes,
  setCachedNotesList,
  updateNote,
} from '@/lib/api'
import type { StickyNote } from '@/lib/api'
import {
  getNoteTone,
  isNoteColor,
  noteColors,
  noteToneClasses,
  type NoteColor,
} from '@/lib/note-colors'
import { cn } from '@/lib/utils'

type NotesState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly notes: readonly StickyNote[]
      readonly isRefreshing: boolean
      readonly warning: string
    }
  | { readonly kind: 'error'; readonly message: string }

type EditorState = {
  readonly body: string
  readonly color: NoteColor
  readonly error: string
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof ApiNetworkError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Notes belum bisa diproses.'
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function editorFromNote(note?: StickyNote): EditorState {
  const color = note && isNoteColor(note.color) ? note.color : 'yellow'

  return {
    body: note?.body ?? '',
    color,
    error: '',
  }
}

function validateBody(body: string) {
  const nextBody = body.trim()

  if (!nextBody || nextBody.length > 280) {
    return null
  }

  return nextBody
}

export function NotesPage() {
  const [notesState, setNotesState] = useState<NotesState>(() => {
    const cached = getCachedNotesList()
    return cached
      ? { kind: 'ready', notes: cached.items, isRefreshing: true, warning: '' }
      : { kind: 'loading' }
  })
  const [createEditor, setCreateEditor] = useState<EditorState>(editorFromNote())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEditor, setEditEditor] = useState<EditorState>(editorFromNote())
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StickyNote | null>(null)

  const loadNotes = useCallback(async () => {
    if (getCachedNotesList() === null) {
      setNotesState({ kind: 'loading' })
    }

    try {
      const data = await listNotes({ limit: 50, cursor: null })
      setNotesState({
        kind: 'ready',
        notes: data.items,
        isRefreshing: false,
        warning: '',
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setNotesState((current) =>
        current.kind === 'ready'
          ? {
              ...current,
              isRefreshing: false,
              warning: 'Data terakhir ditampilkan dulu. ' + message,
            }
          : { kind: 'error', message },
      )
    }
  }, [])

  useEffect(() => {
    let isActive = true

    listNotes({ limit: 50, cursor: null })
      .then((data) => {
        if (isActive) {
          setNotesState({
            kind: 'ready',
            notes: data.items,
            isRefreshing: false,
            warning: '',
          })
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          const message = getErrorMessage(error)
          setNotesState((current) =>
            current.kind === 'ready'
              ? {
                  ...current,
                  isRefreshing: false,
                  warning: 'Data terakhir ditampilkan dulu. ' + message,
                }
              : { kind: 'error', message },
          )
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  async function handleCreate() {
    const body = validateBody(createEditor.body)

    if (body === null) {
      setCreateEditor({
        ...createEditor,
        error: 'Note wajib 1-280 karakter.',
      })
      return
    }

    setBusyAction('create')
    setCreateEditor({ ...createEditor, error: '' })

    try {
      const data = await createNote({ body, color: createEditor.color })
      setCreateEditor(editorFromNote())
      setIsCreateOpen(false)
      setNotesState((current) => {
        const notes = current.kind === 'ready' ? current.notes : []
        const nextNotes = [data.note, ...notes]
        setCachedNotesList({ items: nextNotes, nextCursor: null })
        return {
          kind: 'ready',
          notes: nextNotes,
          isRefreshing: false,
          warning: '',
        }
      })
      toast.success('Note ditempel.')
    } catch (error) {
      const message = getErrorMessage(error)
      setCreateEditor({
        ...createEditor,
        error: message,
      })
      toast.error('Note belum bisa ditempel.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  function startEdit(note: StickyNote) {
    setEditingId(note.id)
    setEditEditor(editorFromNote(note))
  }

  async function handleUpdate(note: StickyNote) {
    const body = validateBody(editEditor.body)

    if (body === null) {
      setEditEditor({
        ...editEditor,
        error: 'Note wajib 1-280 karakter.',
      })
      return
    }

    setBusyAction('update:' + note.id)
    setEditEditor({ ...editEditor, error: '' })

    try {
      const data = await updateNote({ id: note.id, body, color: editEditor.color })
      setEditingId(null)
      setNotesState((current) => {
        const notes =
          current.kind === 'ready'
            ? current.notes.map((item) => (item.id === note.id ? data.note : item))
            : [data.note]
        setCachedNotesList({ items: notes, nextCursor: null })
        return { kind: 'ready', notes, isRefreshing: false, warning: '' }
      })
      toast.success('Note diperbarui.')
    } catch (error) {
      const message = getErrorMessage(error)
      setEditEditor({
        ...editEditor,
        error: message,
      })
      toast.error('Note belum bisa diperbarui.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDelete(note: StickyNote) {
    setBusyAction('delete:' + note.id)

    try {
      const data = await deleteNote(note.id)
      setNotesState((current) => {
        const notes =
          current.kind === 'ready'
            ? current.notes.filter((item) => item.id !== data.id)
            : []
        setCachedNotesList({ items: notes, nextCursor: null })
        return { kind: 'ready', notes, isRefreshing: false, warning: '' }
      })
      toast.success('Note dilepas.')
    } catch (error) {
      const message = getErrorMessage(error)
      setNotesState({ kind: 'error', message })
      toast.error('Note belum bisa dihapus.', { description: message })
    } finally {
      setDeleteTarget(null)
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            Sticky Notes
          </p>
          <h1 className="mt-2 text-4xl font-black">Catatan kecil</h1>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            Tempel pesan pendek buat kalian berdua.
          </p>
        </div>
        <Button
          aria-label="Buat note baru"
          className="mt-1 shrink-0"
          onClick={() => setIsCreateOpen(true)}
          size="icon"
        >
          <Plus aria-hidden="true" size={20} />
        </Button>
      </header>

      {notesState.kind === 'loading' ? (
        <NotesSkeleton />
      ) : null}

      {notesState.kind === 'ready' &&
      (notesState.isRefreshing || notesState.warning) ? (
        <p className="rounded-full bg-scrap-yellow px-4 py-2 text-xs font-extrabold text-muted-foreground">
          {notesState.warning ||
            'Data terakhir ditampilkan dulu. Lagi nyegerin data...'}
        </p>
      ) : null}

      {notesState.kind === 'error' ? (
        <ScrapbookCard tone="pink" tape>
          <h2 className="text-2xl font-black">Notes belum kebuka.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            {notesState.message}
          </p>
          <Button className="mt-4 w-full" onClick={loadNotes} variant="secondary">
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
        </ScrapbookCard>
      ) : null}

      {notesState.kind === 'ready' && notesState.notes.length === 0 ? (
        <ScrapbookCard tone="mint" tape>
          <h2 className="text-2xl font-black">Belum ada note.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            Tulis satu catatan kecil, nanti dia muncul di sini.
          </p>
          <Button className="mt-4 w-full" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden="true" size={18} />
            Buat note pertama
          </Button>
        </ScrapbookCard>
      ) : null}

      {notesState.kind === 'ready' && notesState.notes.length > 0 ? (
        <div className="grid gap-4">
          {notesState.notes.map((note) => (
            <StickyNoteCard
              isDeleting={busyAction === 'delete:' + note.id}
              key={note.id}
              note={note}
              onDelete={() => setDeleteTarget(note)}
              onEdit={() => startEdit(note)}
            />
          ))}
        </div>
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note baru</DialogTitle>
            <DialogDescription>
              Tulis pendek aja, kayak tempelan kecil di scrapbook.
            </DialogDescription>
          </DialogHeader>
          <NoteEditor
            editor={createEditor}
            isBusy={busyAction === 'create'}
            onChange={setCreateEditor}
            onSubmit={handleCreate}
            submitLabel="Tempel note"
            submitIcon="send"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit note</DialogTitle>
            <DialogDescription>Rapikan pesannya tanpa ganggu list.</DialogDescription>
          </DialogHeader>
          {notesState.kind === 'ready'
            ? notesState.notes
                .filter((note) => note.id === editingId)
                .map((note) => (
                  <NoteEditor
                    editor={editEditor}
                    isBusy={busyAction === 'update:' + note.id}
                    key={note.id}
                    onCancel={() => setEditingId(null)}
                    onChange={setEditEditor}
                    onSubmit={() => handleUpdate(note)}
                    submitLabel="Simpan"
                    submitIcon="save"
                  />
                ))
            : null}
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        confirmLabel="Hapus"
        description="Note ini cuma disembunyikan dari scrapbook kalian."
        isOpen={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget)
          }
        }}
        title="Hapus note kecil ini?"
      />
    </div>
  )
}

type NoteEditorProps = {
  readonly editor: EditorState
  readonly isBusy: boolean
  readonly onCancel?: () => void
  readonly onChange: (editor: EditorState) => void
  readonly onSubmit: () => void
  readonly submitIcon: 'save' | 'send'
  readonly submitLabel: string
}

function NoteEditor({
  editor,
  isBusy,
  onCancel,
  onChange,
  onSubmit,
  submitIcon,
  submitLabel,
}: NoteEditorProps) {
  return (
    <ScrapbookCard tape>
      <Textarea
        aria-label="Isi note"
        className="min-h-24 rounded-[1.25rem]"
        maxLength={280}
        onChange={(event) =>
          onChange({ ...editor, body: event.target.value, error: '' })
        }
        placeholder="Contoh: semangat hari ini, ya."
        value={editor.body}
      />

      <div className="mt-3 flex items-center justify-between gap-3">
        <ColorPicker
          color={editor.color}
          onChange={(color) => onChange({ ...editor, color, error: '' })}
        />
        <p className="text-xs font-extrabold text-muted-foreground">
          {editor.body.trim().length}/280
        </p>
      </div>

      {editor.error ? (
        <p className="mt-3 text-sm font-extrabold text-destructive">
          {editor.error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <Button className="flex-1" disabled={isBusy} onClick={onSubmit}>
          {isBusy ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          ) : submitIcon === 'save' ? (
            <Save aria-hidden="true" size={18} />
          ) : (
            <Send aria-hidden="true" size={18} />
          )}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            aria-label="Batal edit note"
            disabled={isBusy}
            onClick={onCancel}
            size="icon"
            variant="outline"
          >
            <X aria-hidden="true" size={18} />
          </Button>
        ) : null}
      </div>
    </ScrapbookCard>
  )
}

type ColorPickerProps = {
  readonly color: NoteColor
  readonly onChange: (color: NoteColor) => void
}

function ColorPicker({ color, onChange }: ColorPickerProps) {
  return (
    <div className="flex gap-2" aria-label="Pilih warna note">
      {noteColors.map((noteColor) => (
        <button
          aria-label={'Warna ' + noteColor}
          aria-pressed={color === noteColor}
          className={cn(
            'size-8 rounded-full border-2 border-white shadow-[0_8px_18px_rgb(103_74_58_/_0.12)] outline-none transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            noteToneClasses[noteColor],
            color === noteColor ? 'scale-110 ring-2 ring-foreground' : '',
          )}
          key={noteColor}
          onClick={() => onChange(noteColor)}
          type="button"
        />
      ))}
    </div>
  )
}

type StickyNoteCardProps = {
  readonly isDeleting: boolean
  readonly note: StickyNote
  readonly onDelete: () => void
  readonly onEdit: () => void
}

function StickyNoteCard({
  isDeleting,
  note,
  onDelete,
  onEdit,
}: StickyNoteCardProps) {
  return (
    <article
      className={cn(
        'relative rounded-[1.75rem] border p-4 shadow-[0_10px_30px_rgb(103_74_58_/_0.10)] sm:p-5',
        noteToneClasses[getNoteTone(note)],
      )}
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 left-8 h-6 w-20 rotate-[-3deg] rounded-sm bg-white/70 shadow-[0_8px_20px_rgb(103_74_58_/_0.10)]"
      />
      <p className="min-h-16 text-lg font-extrabold leading-relaxed">
        {note.body}
      </p>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            {note.createdByNickname || 'Kalian'}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            {friendlyDate(note.createdAt)}
          </p>
        </div>
        {note.canEdit ? (
          <div className="flex shrink-0 gap-2">
            <Button
              aria-label="Edit note"
              onClick={onEdit}
              size="icon"
              variant="outline"
            >
              <PencilLine aria-hidden="true" size={17} />
            </Button>
            <Button
              aria-label="Hapus note"
              disabled={isDeleting}
              onClick={onDelete}
              size="icon"
              variant="destructive"
            >
              {isDeleting ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Trash2 aria-hidden="true" size={17} />
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </article>
  )
}
