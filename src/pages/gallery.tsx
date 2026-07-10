import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ImagePlus,
  Images,
  LoaderCircle,
  PencilLine,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { GallerySkeleton } from '@/components/loading-skeleton'
import { ScrapbookCard } from '@/components/scrapbook'
import { Button } from '@/components/ui/button'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { DatePickerInput } from '@/components/ui/date-picker-input'
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
  createGalleryItem,
  deleteGalleryItem,
  getCachedGalleryList,
  listGallery,
  setCachedGalleryList,
  updateGalleryItem,
} from '@/lib/api'
import type { GalleryItem } from '@/lib/api'

type GalleryState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly items: readonly GalleryItem[]
      readonly isRefreshing: boolean
      readonly warning: string
    }
  | { readonly kind: 'error'; readonly message: string }

type UploadEditor = {
  readonly caption: string
  readonly takenAt: string
  readonly file: File | null
  readonly error: string
}

type EditEditor = {
  readonly caption: string
  readonly takenAt: string
  readonly error: string
}

const maxPhotoSize = 5 * 1024 * 1024
const maxThumbnailDataLength = 40_000
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'] as const

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'BAD_REQUEST':
        return error.message || 'Data foto belum lengkap.'
      case 'CONFIG_MISSING':
        return 'Folder Drive belum dikonfigurasi.'
      case 'DRIVE_ERROR':
        return 'Folder Drive OurSpace belum bisa diakses.'
      default:
        return 'Gallery belum bisa diproses.'
    }
  }

  if (error instanceof ApiError || error instanceof ApiNetworkError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Gallery belum bisa diproses.'
}

function emptyUploadEditor(): UploadEditor {
  return {
    caption: '',
    takenAt: '',
    file: null,
    error: '',
  }
}

function editFromItem(item: GalleryItem): EditEditor {
  return {
    caption: item.caption,
    takenAt: item.takenAt,
    error: '',
  }
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
  }).format(new Date(value))
}

function isAllowedImage(file: File) {
  return allowedMimeTypes.some((mimeType) => mimeType === file.type)
}

function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const commaIndex = result.indexOf(',')

      resolve(commaIndex === -1 ? result : result.slice(commaIndex + 1))
    })
    reader.addEventListener('error', () => {
      reject(new Error('Foto gagal dibaca.'))
    })
    reader.readAsDataURL(file)
  })
}

async function createThumbnailData(file: File) {
  const objectUrl = URL.createObjectURL(file)

  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()

    const maxSide = 320
    let scale = Math.min(
      1,
      maxSide / Math.max(image.naturalWidth, image.naturalHeight),
    )

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
      const context = canvas.getContext('2d')

      if (!context) {
        return ''
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const thumbnailData = canvas.toDataURL(
        'image/jpeg',
        Math.max(0.35, 0.75 - attempt * 0.1),
      )

      if (thumbnailData.length <= maxThumbnailDataLength) {
        return thumbnailData
      }

      scale *= 0.7
    }

    return ''
  } catch {
    return ''
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function validateUpload(editor: UploadEditor) {
  if (!editor.file) {
    return 'Pilih foto dulu.'
  }

  if (!isAllowedImage(editor.file)) {
    return 'Foto harus JPG, PNG, atau WebP.'
  }

  if (editor.file.size > maxPhotoSize) {
    return 'Ukuran foto maksimal 5 MB.'
  }

  if (!editor.caption.trim()) {
    return 'Caption foto wajib diisi.'
  }

  if (!editor.takenAt) {
    return 'Tanggal foto wajib diisi.'
  }

  return ''
}

function hasUsableThumbnail(item: GalleryItem) {
  return item.thumbnailData.startsWith('data:image/')
}

function sortGalleryItems(items: readonly GalleryItem[]) {
  return [...items].sort((first, second) => {
    const takenDiff =
      new Date(second.takenAt).getTime() - new Date(first.takenAt).getTime()

    if (takenDiff !== 0) {
      return takenDiff
    }

    return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  })
}

function validateEdit(editor: EditEditor) {
  if (!editor.caption.trim()) {
    return 'Caption foto wajib diisi.'
  }

  if (!editor.takenAt) {
    return 'Tanggal foto wajib diisi.'
  }

  return ''
}

export function GalleryPage() {
  const [galleryState, setGalleryState] = useState<GalleryState>(() => {
    const cached = getCachedGalleryList()
    return cached
      ? { kind: 'ready', items: cached.items, isRefreshing: true, warning: '' }
      : { kind: 'loading' }
  })
  const [uploadEditor, setUploadEditor] =
    useState<UploadEditor>(emptyUploadEditor)
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEditor, setEditEditor] = useState<EditEditor>({
    caption: '',
    takenAt: '',
    error: '',
  })
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GalleryItem | null>(null)

  const loadGallery = useCallback(async () => {
    if (getCachedGalleryList() === null) {
      setGalleryState({ kind: 'loading' })
    }

    try {
      const data = await listGallery()
      setGalleryState({
        kind: 'ready',
        items: data.items,
        isRefreshing: false,
        warning: '',
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setGalleryState((current) =>
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

    listGallery()
      .then((data) => {
        if (isActive) {
          setGalleryState({
            kind: 'ready',
            items: data.items,
            isRefreshing: false,
            warning: '',
          })
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          const message = getErrorMessage(error)
          setGalleryState((current) =>
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

  async function handleUpload() {
    const validationError = validateUpload(uploadEditor)

    if (validationError) {
      setUploadEditor({ ...uploadEditor, error: validationError })
      return
    }

    if (!uploadEditor.file) {
      return
    }

    setBusyAction('create')
    setUploadEditor({ ...uploadEditor, error: '' })

    try {
      const [base64, thumbnailData] = await Promise.all([
        fileToBase64(uploadEditor.file),
        createThumbnailData(uploadEditor.file),
      ])

      const data = await createGalleryItem({
        fileName: uploadEditor.file.name,
        mimeType: uploadEditor.file.type,
        fileSize: uploadEditor.file.size,
        base64,
        thumbnailData,
        caption: uploadEditor.caption.trim(),
        takenAt: uploadEditor.takenAt,
      })
      setUploadEditor(emptyUploadEditor())
      setIsUploadOpen(false)
      setGalleryState((current) => {
        const items = sortGalleryItems([
          data.item,
          ...(current.kind === 'ready' ? current.items : []),
        ])
        setCachedGalleryList({ items })
        return { kind: 'ready', items, isRefreshing: false, warning: '' }
      })
      toast.success('Foto disimpan private.')
    } catch (error) {
      const message = getErrorMessage(error)
      setUploadEditor({ ...uploadEditor, error: message })
      toast.error('Foto belum bisa disimpan.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  function startEdit(item: GalleryItem) {
    setEditingId(item.id)
    setEditEditor(editFromItem(item))
  }

  async function handleUpdate(item: GalleryItem) {
    const validationError = validateEdit(editEditor)

    if (validationError) {
      setEditEditor({ ...editEditor, error: validationError })
      return
    }

    setBusyAction('update:' + item.id)
    setEditEditor({ ...editEditor, error: '' })

    try {
      const data = await updateGalleryItem({
        id: item.id,
        caption: editEditor.caption.trim(),
        takenAt: editEditor.takenAt,
      })
      setEditingId(null)
      setGalleryState((current) => {
        const items = sortGalleryItems(
          current.kind === 'ready'
            ? current.items.map((galleryItem) =>
                galleryItem.id === item.id ? data.item : galleryItem,
              )
            : [data.item],
        )
        setCachedGalleryList({ items })
        return { kind: 'ready', items, isRefreshing: false, warning: '' }
      })
      toast.success('Foto diperbarui.')
    } catch (error) {
      const message = getErrorMessage(error)
      setEditEditor({ ...editEditor, error: message })
      toast.error('Foto belum bisa diperbarui.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDelete(item: GalleryItem) {
    setBusyAction('delete:' + item.id)

    try {
      const data = await deleteGalleryItem(item.id)
      setGalleryState((current) => {
        const items =
          current.kind === 'ready'
            ? current.items.filter((galleryItem) => galleryItem.id !== data.id)
            : []
        setCachedGalleryList({ items })
        return { kind: 'ready', items, isRefreshing: false, warning: '' }
      })
      toast.success('Foto dihapus dari gallery.')
    } catch (error) {
      const message = getErrorMessage(error)
      setGalleryState({ kind: 'error', message })
      toast.error('Foto belum bisa dihapus.', { description: message })
    } finally {
      setDeleteTarget(null)
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-5">
      <header className="page-header flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            Gallery
          </p>
          <h1 className="mt-2 text-4xl font-black">Foto kecil</h1>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            Simpan momen private, preview-nya tetap lewat API kalian.
          </p>
        </div>
        <Button
          aria-label="Upload foto"
          className="page-action mt-1 shrink-0"
          onClick={() => setIsUploadOpen(true)}
          size="icon"
        >
          <ImagePlus aria-hidden="true" size={20} />
        </Button>
      </header>

      {galleryState.kind === 'loading' ? (
        <GallerySkeleton />
      ) : null}

      {galleryState.kind === 'ready' &&
      (galleryState.isRefreshing || galleryState.warning) ? (
        <p className="rounded-full bg-scrap-yellow px-4 py-2 text-xs font-extrabold text-muted-foreground">
          {galleryState.warning ||
            'Data terakhir ditampilkan dulu. Lagi nyegerin data...'}
        </p>
      ) : null}

      {galleryState.kind === 'error' ? (
        <ScrapbookCard tone="pink" tape>
          <h2 className="text-2xl font-black">Gallery belum kebuka.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            {galleryState.message}
          </p>
          <Button className="mt-4 w-full" onClick={loadGallery} variant="secondary">
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
        </ScrapbookCard>
      ) : null}

      {galleryState.kind === 'ready' && galleryState.items.length === 0 ? (
        <ScrapbookCard tone="mint" tape>
          <h2 className="text-2xl font-black">Belum ada foto.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            Simpan momen pertama dulu? Pilih satu foto dari device kamu.
          </p>
          <Button className="mt-4 w-full" onClick={() => setIsUploadOpen(true)}>
            <ImagePlus aria-hidden="true" size={18} />
            Simpan foto pertama
          </Button>
        </ScrapbookCard>
      ) : null}

      {galleryState.kind === 'ready' && galleryState.items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {galleryState.items.map((item) => (
            <GalleryCard
              isDeleting={busyAction === 'delete:' + item.id}
              item={item}
              key={item.id}
              onDelete={() => setDeleteTarget(item)}
              onEdit={() => startEdit(item)}
            />
          ))}
        </div>
      ) : null}

      <Dialog
        open={isUploadOpen}
        onOpenChange={(open) => {
          setIsUploadOpen(open)

          if (!open) {
            setUploadEditor(emptyUploadEditor())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simpan foto</DialogTitle>
            <DialogDescription>
              Satu foto dulu, caption wajib, file tetap private di Drive.
            </DialogDescription>
          </DialogHeader>
          <GalleryUploadForm
            editor={uploadEditor}
            isBusy={busyAction === 'create'}
            onChange={setUploadEditor}
            onSubmit={handleUpload}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit foto</DialogTitle>
            <DialogDescription>Ubah caption atau tanggal momennya.</DialogDescription>
          </DialogHeader>
          {galleryState.kind === 'ready'
            ? galleryState.items
                .filter((item) => item.id === editingId)
                .map((item) => (
                  <GalleryEditForm
                    editor={editEditor}
                    isBusy={busyAction === 'update:' + item.id}
                    key={item.id}
                    onCancel={() => setEditingId(null)}
                    onChange={setEditEditor}
                    onSubmit={() => handleUpdate(item)}
                  />
                ))
            : null}
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        confirmLabel="Hapus"
        description="Foto akan dihapus dari gallery dan dipindahkan ke Trash di Drive."
        isOpen={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget)
          }
        }}
        title="Hapus foto dari gallery?"
      />
    </div>
  )
}

type GalleryUploadFormProps = {
  readonly editor: UploadEditor
  readonly isBusy: boolean
  readonly onChange: (editor: UploadEditor) => void
  readonly onSubmit: () => void
}

function GalleryUploadForm({
  editor,
  isBusy,
  onChange,
  onSubmit,
}: GalleryUploadFormProps) {
  const previewUrl = useMemo(() => {
    return editor.file && isAllowedImage(editor.file)
      ? URL.createObjectURL(editor.file)
      : ''
  }, [editor.file])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  return (
    <ScrapbookCard tape>
      <div className="grid gap-3">
        <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border border-dashed bg-scrap-blue px-4 py-5 text-center transition-colors focus-within:border-ring">
          {previewUrl ? (
            <img
              alt="Preview foto yang dipilih"
              className="mb-3 aspect-[4/3] w-full rounded-[1.25rem] object-cover shadow-[0_10px_30px_rgb(103_74_58_/_0.10)]"
              src={previewUrl}
            />
          ) : (
            <PhotoPlaceholder
              description="Preview muncul setelah pilih foto"
              title="Foto private"
            />
          )}
          <span className="mt-3 text-sm font-extrabold">
            {editor.file ? editor.file.name : 'Pilih satu foto'}
          </span>
          <span className="mt-1 text-xs font-bold text-muted-foreground">
            JPG, PNG, atau WebP. Maks 5 MB.
          </span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) =>
              onChange({
                ...editor,
                file: event.target.files?.[0] ?? null,
                error: '',
              })
            }
            type="file"
          />
        </label>
        <p className="rounded-[1.15rem] bg-scrap-yellow px-4 py-3 text-xs font-extrabold leading-relaxed text-muted-foreground">
          Preview kecil akan dibuat di device ini. Original foto tetap private di
          Drive.
        </p>
        <Textarea
          aria-label="Caption foto"
          className="min-h-20"
          onChange={(event) =>
            onChange({ ...editor, caption: event.target.value, error: '' })
          }
          placeholder="Caption wajib"
          value={editor.caption}
        />
        <DatePickerInput
          ariaLabel="Tanggal foto"
          onChange={(value) =>
            onChange({ ...editor, takenAt: value, error: '' })
          }
          value={editor.takenAt}
        />
      </div>

      {editor.error ? (
        <p className="mt-3 text-sm font-extrabold text-destructive">
          {editor.error}
        </p>
      ) : null}

      <Button className="mt-4 w-full" disabled={isBusy} onClick={onSubmit}>
        {isBusy ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
        ) : (
          <Upload aria-hidden="true" size={18} />
        )}
        Simpan foto
      </Button>
    </ScrapbookCard>
  )
}

type GalleryEditFormProps = {
  readonly editor: EditEditor
  readonly isBusy: boolean
  readonly onCancel: () => void
  readonly onChange: (editor: EditEditor) => void
  readonly onSubmit: () => void
}

function GalleryEditForm({
  editor,
  isBusy,
  onCancel,
  onChange,
  onSubmit,
}: GalleryEditFormProps) {
  return (
    <ScrapbookCard tape>
      <Textarea
        aria-label="Caption foto"
        className="min-h-24"
        onChange={(event) =>
          onChange({ ...editor, caption: event.target.value, error: '' })
        }
        value={editor.caption}
      />
      <DatePickerInput
        ariaLabel="Tanggal foto"
        className="mt-3"
        onChange={(value) =>
          onChange({ ...editor, takenAt: value, error: '' })
        }
        value={editor.takenAt}
      />
      {editor.error ? (
        <p className="mt-3 text-sm font-extrabold text-destructive">
          {editor.error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" disabled={isBusy} onClick={onSubmit}>
          {isBusy ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          ) : (
            <Save aria-hidden="true" size={18} />
          )}
          Simpan
        </Button>
        <Button
          aria-label="Batal edit foto"
          disabled={isBusy}
          onClick={onCancel}
          size="icon"
          variant="outline"
        >
          <X aria-hidden="true" size={18} />
        </Button>
      </div>
    </ScrapbookCard>
  )
}

type GalleryCardProps = {
  readonly isDeleting: boolean
  readonly item: GalleryItem
  readonly onDelete: () => void
  readonly onEdit: () => void
}

function GalleryCard({
  isDeleting,
  item,
  onDelete,
  onEdit,
}: GalleryCardProps) {
  return (
    <article className="relative rounded-[1.75rem] border bg-card p-3 shadow-[0_10px_30px_rgb(103_74_58_/_0.10)]">
      <span
        aria-hidden="true"
        className="absolute -top-3 left-8 h-6 w-20 rotate-[-3deg] rounded-sm bg-white/70 shadow-[0_8px_20px_rgb(103_74_58_/_0.10)]"
      />
      <div className="aspect-square overflow-hidden rounded-[1.25rem] bg-scrap-lavender">
        {hasUsableThumbnail(item) ? (
          <img
            alt={item.caption}
            className="size-full object-cover"
            src={item.thumbnailData}
          />
        ) : (
          <PhotoPlaceholder
            description="Preview kecil belum dibuat"
            title="Foto tersimpan private"
          />
        )}
      </div>
      <div className="px-2 pb-2 pt-3">
        <p className="mt-2 break-words text-base font-extrabold leading-relaxed">
          {item.caption}
        </p>
        <p className="mt-2 text-xs font-bold text-muted-foreground">
          {friendlyDate(item.takenAt)}
        </p>
        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
              {item.createdByNickname || 'Kalian'}
            </p>
            <p className="mt-1 text-xs font-bold text-muted-foreground">
              {Math.round(item.fileSize / 1024)} KB
            </p>
          </div>
          {item.canEdit ? (
            <div className="flex shrink-0 gap-2">
              <Button
                aria-label="Edit foto"
                onClick={onEdit}
                size="icon"
                variant="outline"
              >
                <PencilLine aria-hidden="true" size={17} />
              </Button>
              <Button
                aria-label="Hapus foto"
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
      </div>
    </article>
  )
}

function PhotoPlaceholder({
  description,
  title,
}: {
  readonly description: string
  readonly title: string
}) {
  return (
    <div className="flex size-full min-h-32 flex-col items-center justify-center bg-[linear-gradient(135deg,var(--accent-lavender),var(--accent-blue))] px-4 py-5 text-center">
      <div className="rounded-full bg-card/80 p-4 shadow-[0_10px_30px_rgb(103_74_58_/_0.12)]">
        <Images aria-hidden="true" size={30} />
      </div>
      <p className="mt-3 text-xs font-extrabold text-foreground">{title}</p>
      <p className="mt-1 text-xs font-bold text-muted-foreground">
        {description}
      </p>
    </div>
  )
}
