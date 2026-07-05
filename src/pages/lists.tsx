import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Film,
  Gift,
  LoaderCircle,
  MapPin,
  MoreHorizontal,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { ListsSkeleton } from '@/components/loading-skeleton'
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
import { Input } from '@/components/ui/input'
import { SelectField, type SelectOption } from '@/components/ui/select-field'
import { Textarea } from '@/components/ui/textarea'
import {
  ApiError,
  ApiNetworkError,
  createSharedItem,
  deleteSharedItem,
  getCachedSharedItemsList,
  listSharedItems,
  setCachedSharedItemsList,
  updateSharedItem,
} from '@/lib/api'
import type {
  SharedItem,
  SharedItemCategory,
  SharedItemStatus,
} from '@/lib/api'
import { cn } from '@/lib/utils'

type ListsState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly items: readonly SharedItem[]
      readonly isRefreshing: boolean
      readonly warning: string
    }
  | { readonly kind: 'error'; readonly message: string }

type EditorState = {
  readonly title: string
  readonly category: SharedItemCategory
  readonly status: SharedItemStatus
  readonly notes: string
  readonly error: string
}

type FilterCategory = SharedItemCategory | 'all'
type FilterStatus = SharedItemStatus | 'all'
type EditorValidation =
  | {
      readonly input: {
        readonly title: string
        readonly category: SharedItemCategory
        readonly status: SharedItemStatus
        readonly notes: string
      }
    }
  | { readonly error: string }

const categoryOptions: readonly {
  readonly label: string
  readonly value: SharedItemCategory
}[] = [
  { label: 'Tempat', value: 'place' },
  { label: 'Makan', value: 'food' },
  { label: 'Film', value: 'movie' },
  { label: 'Hadiah', value: 'gift' },
  { label: 'Aktivitas', value: 'activity' },
  { label: 'Lainnya', value: 'other' },
]

const statusOptions: readonly {
  readonly label: string
  readonly value: SharedItemStatus
}[] = [
  { label: 'Mau', value: 'todo' },
  { label: 'Lagi', value: 'doing' },
  { label: 'Sudah', value: 'done' },
]

const categoryFilterOptions: readonly SelectOption<FilterCategory>[] = [
  { label: 'Semua kategori', value: 'all' },
  ...categoryOptions,
]

const statusFilterOptions: readonly SelectOption<FilterStatus>[] = [
  { label: 'Semua status', value: 'all' },
  ...statusOptions,
]

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof ApiNetworkError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'List belum bisa diproses.'
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function emptyEditor(): EditorState {
  return {
    title: '',
    category: 'activity',
    status: 'todo',
    notes: '',
    error: '',
  }
}

function editorFromItem(item: SharedItem): EditorState {
  return {
    title: item.title,
    category: item.category,
    status: item.status,
    notes: item.notes ?? '',
    error: '',
  }
}

function categoryLabel(category: SharedItemCategory) {
  return (
    categoryOptions.find((option) => option.value === category)?.label ??
    'Aktivitas'
  )
}

function statusLabel(status: SharedItemStatus) {
  return statusOptions.find((option) => option.value === status)?.label ?? 'Mau'
}

function categoryClasses(category: SharedItemCategory) {
  switch (category) {
    case 'place':
      return 'border border-blue-300 bg-scrap-blue text-blue-950'
    case 'food':
      return 'border border-amber-300 bg-scrap-yellow text-amber-950'
    case 'movie':
      return 'border border-violet-300 bg-scrap-lavender text-violet-950'
    case 'gift':
      return 'border border-rose-300 bg-scrap-pink text-rose-950'
    case 'other':
      return 'border border-border bg-card text-foreground'
    case 'activity':
      return 'border border-emerald-300 bg-scrap-mint text-emerald-950'
  }
}

function categoryTone(category: SharedItemCategory) {
  switch (category) {
    case 'place':
      return 'blue'
    case 'food':
      return 'yellow'
    case 'movie':
      return 'lavender'
    case 'gift':
      return 'pink'
    case 'other':
      return 'white'
    case 'activity':
      return 'mint'
  }
}

function renderCategoryIcon(category: SharedItemCategory) {
  const className = 'shrink-0'
  const size = 24

  switch (category) {
    case 'place':
      return <MapPin aria-hidden="true" className={className} size={size} />
    case 'food':
      return <Utensils aria-hidden="true" className={className} size={size} />
    case 'movie':
      return <Film aria-hidden="true" className={className} size={size} />
    case 'gift':
      return <Gift aria-hidden="true" className={className} size={size} />
    case 'other':
      return (
        <MoreHorizontal aria-hidden="true" className={className} size={size} />
      )
    case 'activity':
      return <Sparkles aria-hidden="true" className={className} size={size} />
  }
}

function statusClasses(status: SharedItemStatus) {
  switch (status) {
    case 'doing':
      return 'border border-blue-300 bg-scrap-blue text-blue-950'
    case 'done':
      return 'border border-emerald-300 bg-scrap-mint text-emerald-950'
    case 'todo':
      return 'border border-amber-300 bg-scrap-yellow text-amber-950'
  }
}

function toCategory(value: string): SharedItemCategory {
  if (
    value === 'place' ||
    value === 'food' ||
    value === 'movie' ||
    value === 'gift' ||
    value === 'other'
  ) {
    return value
  }

  return 'activity'
}

function toStatus(value: string): SharedItemStatus {
  if (value === 'doing' || value === 'done') {
    return value
  }

  return 'todo'
}

function isCategory(value: string): value is SharedItemCategory {
  return categoryOptions.some((option) => option.value === value)
}

function isStatus(value: string): value is SharedItemStatus {
  return statusOptions.some((option) => option.value === value)
}

function validateEditor(editor: EditorState): EditorValidation {
  const title = editor.title.trim()

  if (!title) {
    return { error: 'Judul item wajib diisi.' }
  }

  if (!isCategory(editor.category)) {
    return { error: 'Kategori item belum valid.' }
  }

  if (!isStatus(editor.status)) {
    return { error: 'Status item belum valid.' }
  }

  return {
    input: {
      title,
      category: editor.category,
      status: editor.status,
      notes: editor.notes.trim(),
    },
  }
}

export function ListsPage() {
  const [listsState, setListsState] = useState<ListsState>(() => {
    const cached = getCachedSharedItemsList()
    return cached
      ? { kind: 'ready', items: cached.items, isRefreshing: true, warning: '' }
      : { kind: 'loading' }
  })
  const [createEditor, setCreateEditor] = useState<EditorState>(emptyEditor)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEditor, setEditEditor] = useState<EditorState>(emptyEditor)
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [deleteTarget, setDeleteTarget] = useState<SharedItem | null>(null)

  const loadItems = useCallback(async () => {
    if (getCachedSharedItemsList() === null) {
      setListsState({ kind: 'loading' })
    }

    try {
      const data = await listSharedItems()
      setListsState({
        kind: 'ready',
        items: data.items,
        isRefreshing: false,
        warning: '',
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setListsState((current) =>
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

    listSharedItems()
      .then((data) => {
        if (isActive) {
          setListsState({
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
          setListsState((current) =>
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

  const visibleItems = useMemo(() => {
    if (listsState.kind !== 'ready') {
      return []
    }

    return listsState.items.filter((item) => {
      return (
        (categoryFilter === 'all' || item.category === categoryFilter) &&
        (statusFilter === 'all' || item.status === statusFilter)
      )
    })
  }, [categoryFilter, listsState, statusFilter])

  async function handleCreate() {
    const input = validateEditor(createEditor)

    if ('error' in input) {
      setCreateEditor({ ...createEditor, error: input.error })
      return
    }

    setBusyAction('create')
    setCreateEditor({ ...createEditor, error: '' })

    try {
      const data = await createSharedItem(input.input)
      setCreateEditor(emptyEditor())
      setIsCreateOpen(false)
      setListsState((current) => {
        const items = [data.item, ...(current.kind === 'ready' ? current.items : [])]
        setCachedSharedItemsList({ items })
        return { kind: 'ready', items, isRefreshing: false, warning: '' }
      })
      toast.success('Wishlist ditambah.')
    } catch (error) {
      const message = getErrorMessage(error)
      setCreateEditor({ ...createEditor, error: message })
      toast.error('Wishlist belum bisa ditambah.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  function startEdit(item: SharedItem) {
    setEditingId(item.id)
    setEditEditor(editorFromItem(item))
  }

  async function handleUpdate(item: SharedItem) {
    const input = validateEditor(editEditor)

    if ('error' in input) {
      setEditEditor({ ...editEditor, error: input.error })
      return
    }

    setBusyAction('update:' + item.id)
    setEditEditor({ ...editEditor, error: '' })

    try {
      const data = await updateSharedItem({ id: item.id, ...input.input })
      setEditingId(null)
      setListsState((current) => {
        const items =
          current.kind === 'ready'
            ? current.items.map((listItem) =>
                listItem.id === item.id ? data.item : listItem,
              )
            : [data.item]
        setCachedSharedItemsList({ items })
        return { kind: 'ready', items, isRefreshing: false, warning: '' }
      })
      toast.success('Wishlist diperbarui.')
    } catch (error) {
      const message = getErrorMessage(error)
      setEditEditor({ ...editEditor, error: message })
      toast.error('Wishlist belum bisa diperbarui.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDelete(item: SharedItem) {
    setBusyAction('delete:' + item.id)

    try {
      const data = await deleteSharedItem(item.id)
      setListsState((current) => {
        const items =
          current.kind === 'ready'
            ? current.items.filter((listItem) => listItem.id !== data.id)
            : []
        setCachedSharedItemsList({ items })
        return { kind: 'ready', items, isRefreshing: false, warning: '' }
      })
      toast.success('Wishlist dihapus.')
    } catch (error) {
      const message = getErrorMessage(error)
      setListsState({ kind: 'error', message })
      toast.error('Wishlist belum bisa dihapus.', { description: message })
    } finally {
      setDeleteTarget(null)
      setBusyAction(null)
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            Shared Lists
          </p>
          <h1 className="mt-2 text-4xl font-black">Wishlist bareng</h1>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            Simpan tempat, makanan, film, hadiah, dan ide random kalian.
          </p>
        </div>
        <Button
          aria-label="Tambah item wishlist"
          className="mt-1 shrink-0"
          onClick={() => setIsCreateOpen(true)}
          size="icon"
        >
          <Plus aria-hidden="true" size={20} />
        </Button>
      </header>

      <Filters
        category={categoryFilter}
        onCategoryChange={setCategoryFilter}
        onStatusChange={setStatusFilter}
        status={statusFilter}
      />

      {listsState.kind === 'loading' ? (
        <ListsSkeleton />
      ) : null}

      {listsState.kind === 'ready' &&
      (listsState.isRefreshing || listsState.warning) ? (
        <p className="rounded-full bg-scrap-yellow px-4 py-2 text-xs font-extrabold text-muted-foreground">
          {listsState.warning ||
            'Data terakhir ditampilkan dulu. Lagi nyegerin data...'}
        </p>
      ) : null}

      {listsState.kind === 'error' ? (
        <ScrapbookCard tone="pink" tape>
          <h2 className="text-2xl font-black">List belum kebuka.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            {listsState.message}
          </p>
          <Button className="mt-4 w-full" onClick={loadItems} variant="secondary">
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
        </ScrapbookCard>
      ) : null}

      {listsState.kind === 'ready' && listsState.items.length === 0 ? (
        <ScrapbookCard className="p-4" tone="mint" tape>
          <h2 className="text-xl font-black">Belum ada wishlist.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            Tambah satu ide, nanti jadi list kecil buat kalian.
          </p>
          <Button className="mt-4 w-full" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden="true" size={18} />
            Tambah item pertama
          </Button>
        </ScrapbookCard>
      ) : null}

      {listsState.kind === 'ready' &&
      listsState.items.length > 0 &&
      visibleItems.length === 0 ? (
        <ScrapbookCard className="p-4" tone="lavender">
          <h2 className="text-xl font-black">Filter ini masih kosong.</h2>
          <p className="mt-2 text-sm font-bold text-muted-foreground">
            Coba ganti kategori atau statusnya.
          </p>
        </ScrapbookCard>
      ) : null}

      {visibleItems.length > 0 ? (
        <div className="grid gap-4">
          {visibleItems.map((item) => (
            <SharedItemCard
              isDeleting={busyAction === 'delete:' + item.id}
              item={item}
              key={item.id}
              onDelete={() => setDeleteTarget(item)}
              onEdit={() => startEdit(item)}
            />
          ))}
        </div>
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah wishlist</DialogTitle>
            <DialogDescription>
              Simpan tempat, makanan, film, hadiah, atau ide kecil.
            </DialogDescription>
          </DialogHeader>
          <SharedItemEditor
            editor={createEditor}
            isBusy={busyAction === 'create'}
            onChange={setCreateEditor}
            onSubmit={handleCreate}
            submitLabel="Tambah item"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit wishlist</DialogTitle>
            <DialogDescription>Ubah detailnya tanpa ganggu filter.</DialogDescription>
          </DialogHeader>
          {listsState.kind === 'ready'
            ? listsState.items
                .filter((item) => item.id === editingId)
                .map((item) => (
                  <SharedItemEditor
                    editor={editEditor}
                    isBusy={busyAction === 'update:' + item.id}
                    key={item.id}
                    onCancel={() => setEditingId(null)}
                    onChange={setEditEditor}
                    onSubmit={() => handleUpdate(item)}
                    submitLabel="Simpan"
                  />
                ))
            : null}
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        confirmLabel="Hapus"
        description="Item ini cuma disembunyikan dari app. Wishlist lain tetap aman."
        isOpen={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget)
          }
        }}
        title="Hapus item wishlist?"
      />
    </div>
  )
}

type SharedItemEditorProps = {
  readonly editor: EditorState
  readonly isBusy: boolean
  readonly onCancel?: () => void
  readonly onChange: (editor: EditorState) => void
  readonly onSubmit: () => void
  readonly submitLabel: string
}

function SharedItemEditor({
  editor,
  isBusy,
  onCancel,
  onChange,
  onSubmit,
  submitLabel,
}: SharedItemEditorProps) {
  return (
    <ScrapbookCard className="p-4" tape>
      <div className="grid gap-2">
        <Input
          aria-label="Judul item list"
          onChange={(event) =>
            onChange({ ...editor, title: event.target.value, error: '' })
          }
          placeholder="Contoh: ramen date"
          value={editor.title}
        />
        <div className="grid grid-cols-2 gap-2">
          <SelectField
            ariaLabel="Kategori item list"
            className="h-12 w-full rounded-[1.15rem] bg-card px-4 text-base font-bold"
            onValueChange={(value) =>
              onChange({
                ...editor,
                category: toCategory(value),
                error: '',
              })
            }
            options={categoryOptions}
            value={editor.category}
          />
          <SelectField
            ariaLabel="Status item list"
            className="h-12 w-full rounded-[1.15rem] bg-card px-4 text-base font-bold"
            onValueChange={(value) =>
              onChange({
                ...editor,
                status: toStatus(value),
                error: '',
              })
            }
            options={statusOptions}
            value={editor.status}
          />
        </div>
        <Textarea
          aria-label="Catatan item list"
          className="min-h-20"
          onChange={(event) =>
            onChange({ ...editor, notes: event.target.value, error: '' })
          }
          placeholder="Catatan opsional"
          value={editor.notes}
        />
      </div>

      {editor.error ? (
        <p className="mt-3 text-sm font-extrabold text-destructive">
          {editor.error}
        </p>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Button className="flex-1" disabled={isBusy} onClick={onSubmit}>
          {isBusy ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          ) : submitLabel === 'Simpan' ? (
            <Save aria-hidden="true" size={18} />
          ) : (
            <Plus aria-hidden="true" size={18} />
          )}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            aria-label="Batal edit item list"
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

type FiltersProps = {
  readonly category: FilterCategory
  readonly onCategoryChange: (category: FilterCategory) => void
  readonly onStatusChange: (status: FilterStatus) => void
  readonly status: FilterStatus
}

function Filters({
  category,
  onCategoryChange,
  onStatusChange,
  status,
}: FiltersProps) {
  return (
    <ScrapbookCard className="p-3" tone="blue">
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          ariaLabel="Filter kategori list"
          className="h-10 rounded-[1rem] px-3 text-sm font-extrabold"
          onValueChange={(value) =>
            onCategoryChange(
              value === 'all' ? 'all' : toCategory(value),
            )
          }
          options={categoryFilterOptions}
          value={category}
        />
        <SelectField
          ariaLabel="Filter status list"
          className="h-10 rounded-[1rem] px-3 text-sm font-extrabold"
          onValueChange={(value) =>
            onStatusChange(
              value === 'all' ? 'all' : toStatus(value),
            )
          }
          options={statusFilterOptions}
          value={status}
        />
      </div>
    </ScrapbookCard>
  )
}

type SharedItemCardProps = {
  readonly isDeleting: boolean
  readonly item: SharedItem
  readonly onDelete: () => void
  readonly onEdit: () => void
}

function SharedItemCard({
  isDeleting,
  item,
  onDelete,
  onEdit,
}: SharedItemCardProps) {
  return (
    <ScrapbookCard tone={categoryTone(item.category)} tape>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-black">{item.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold',
                categoryClasses(item.category),
              )}
            >
              Kategori: {categoryLabel(item.category)}
            </span>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold',
                statusClasses(item.status),
              )}
            >
              Status: {statusLabel(item.status)}
            </span>
          </div>
        </div>
        {renderCategoryIcon(item.category)}
      </div>

      {item.notes ? (
        <p className="mt-5 whitespace-pre-wrap break-words rounded-[1.15rem] bg-white/45 px-4 py-3 text-sm font-bold leading-relaxed">
          {item.notes}
        </p>
      ) : null}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            {item.createdByNickname || 'Kalian'}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            Dibikin {friendlyDate(item.createdAt)}
          </p>
        </div>
        {item.canEdit ? (
          <div className="flex shrink-0 gap-2">
            <Button
              aria-label="Edit item list"
              onClick={onEdit}
              size="icon"
              variant="outline"
            >
              <PencilLine aria-hidden="true" size={17} />
            </Button>
            <Button
              aria-label="Hapus item list"
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
    </ScrapbookCard>
  )
}
