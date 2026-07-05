import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarHeart,
  Clock,
  LoaderCircle,
  MapPin,
  PencilLine,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  DatesCalendarSkeleton,
  DatesListSkeleton,
} from '@/components/loading-skeleton'
import { ScrapbookCard } from '@/components/scrapbook'
import { Button } from '@/components/ui/button'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { DateTimePickerInput } from '@/components/ui/date-time-picker-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SelectField } from '@/components/ui/select-field'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  ApiError,
  ApiNetworkError,
  createDatePlan,
  deleteDatePlan,
  getCachedDatePlansList,
  listDatePlans,
  setCachedDatePlansList,
  updateDatePlan,
} from '@/lib/api'
import type { DatePlan, DatePlanStatus } from '@/lib/api'
import { cn } from '@/lib/utils'

type DatesState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly plans: readonly DatePlan[]
      readonly isRefreshing: boolean
      readonly warning: string
    }
  | { readonly kind: 'error'; readonly message: string }

type EditorState = {
  readonly title: string
  readonly scheduledAt: string
  readonly locationName: string
  readonly status: DatePlanStatus
  readonly notes: string
  readonly error: string
}

type EditorValidation =
  | { readonly input: DatePlanEditorInput }
  | { readonly error: string }

type DatePlanEditorInput = {
  readonly title: string
  readonly scheduledAt: string
  readonly locationName: string
  readonly status: DatePlanStatus
  readonly notes: string
}

type ViewMode = 'list' | 'calendar'

type CalendarCell = {
  readonly date: Date | null
  readonly key: string
}

const statusOptions: readonly {
  readonly label: string
  readonly value: DatePlanStatus
}[] = [
  { label: 'Ide', value: 'idea' },
  { label: 'Direncanakan', value: 'planned' },
  { label: 'Selesai', value: 'done' },
  { label: 'Batal', value: 'cancelled' },
]

const weekdayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof ApiNetworkError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Rencana date belum bisa diproses.'
}

function localDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function planDateKey(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? localDateKey(date) : ''
}

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

function selectedDateLabel(dateKey: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
  }).format(new Date(dateKey + 'T00:00:00'))
}

function friendlyTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    timeStyle: 'short',
  }).format(new Date(value))
}

function calendarCells(month: Date): readonly CalendarCell[] {
  const firstDay = monthStart(month)
  const firstWeekdayOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth() + 1,
    0,
  ).getDate()
  const cells: CalendarCell[] = []

  for (let index = 0; index < firstWeekdayOffset; index += 1) {
    cells.push({ date: null, key: 'blank-start-' + index })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(firstDay.getFullYear(), firstDay.getMonth(), day)
    cells.push({ date, key: localDateKey(date) })
  }

  while (cells.length % 7 !== 0) {
    cells.push({ date: null, key: 'blank-end-' + cells.length })
  }

  return cells
}

function groupPlansByDay(plans: readonly DatePlan[]) {
  const groups = new Map<string, DatePlan[]>()

  for (const plan of plans) {
    const key = planDateKey(plan.scheduledAt)

    if (!key) {
      continue
    }

    const dayPlans = groups.get(key) ?? []
    dayPlans.push(plan)
    groups.set(key, dayPlans)
  }

  return groups
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value))
}

function toLocalDateTimeValue(value: string) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (!Number.isFinite(date.getTime())) {
    return ''
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

function editorFromPlan(plan?: DatePlan): EditorState {
  return {
    title: plan?.title ?? '',
    scheduledAt: plan ? toLocalDateTimeValue(plan.scheduledAt) : '',
    locationName: plan?.locationName ?? '',
    status: plan?.status ?? 'idea',
    notes: plan?.notes ?? '',
    error: '',
  }
}

function validateEditor(editor: EditorState): EditorValidation {
  const title = editor.title.trim()
  const timestamp = new Date(editor.scheduledAt).getTime()

  if (!title) {
    return { error: 'Judul rencana date wajib diisi.' }
  }

  if (!editor.scheduledAt || !Number.isFinite(timestamp)) {
    return { error: 'Tanggal dan jam date wajib valid.' }
  }

  return {
    input: {
      title,
      scheduledAt: new Date(timestamp).toISOString(),
      locationName: editor.locationName.trim(),
      status: editor.status,
      notes: editor.notes.trim(),
    },
  }
}

function statusLabel(status: DatePlanStatus) {
  return (
    statusOptions.find((option) => option.value === status)?.label ?? 'Ide'
  )
}

function statusClasses(status: DatePlanStatus) {
  switch (status) {
    case 'planned':
      return 'border border-blue-300 bg-scrap-blue text-blue-950'
    case 'done':
      return 'border border-emerald-300 bg-scrap-mint text-emerald-950'
    case 'cancelled':
      return 'border border-rose-300 bg-scrap-pink text-rose-950'
    case 'idea':
      return 'border border-amber-300 bg-scrap-yellow text-amber-950'
  }
}

function cardTone(status: DatePlanStatus) {
  switch (status) {
    case 'planned':
      return 'blue'
    case 'done':
      return 'mint'
    case 'cancelled':
      return 'pink'
    case 'idea':
      return 'yellow'
  }
}

function sortDatePlans(plans: readonly DatePlan[]) {
  return [...plans].sort(
    (first, second) =>
      new Date(first.scheduledAt).getTime() -
      new Date(second.scheduledAt).getTime(),
  )
}

function toStatus(value: string): DatePlanStatus {
  switch (value) {
    case 'planned':
    case 'done':
    case 'cancelled':
      return value
    default:
      return 'idea'
  }
}

export function DatesPage() {
  const [datesState, setDatesState] = useState<DatesState>(() => {
    const cached = getCachedDatePlansList()
    return cached
      ? { kind: 'ready', plans: cached.items, isRefreshing: true, warning: '' }
      : { kind: 'loading' }
  })
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [calendarMonth, setCalendarMonth] = useState(() =>
    monthStart(new Date()),
  )
  const [selectedDateKey, setSelectedDateKey] = useState(() =>
    localDateKey(new Date()),
  )
  const [createEditor, setCreateEditor] = useState<EditorState>(
    editorFromPlan(),
  )
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editEditor, setEditEditor] = useState<EditorState>(editorFromPlan())
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DatePlan | null>(null)

  const loadDatePlans = useCallback(async () => {
    if (getCachedDatePlansList() === null) {
      setDatesState({ kind: 'loading' })
    }

    try {
      const data = await listDatePlans()
      setDatesState({
        kind: 'ready',
        plans: data.items,
        isRefreshing: false,
        warning: '',
      })
    } catch (error) {
      const message = getErrorMessage(error)
      setDatesState((current) =>
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

    listDatePlans()
      .then((data) => {
        if (isActive) {
          setDatesState({
            kind: 'ready',
            plans: data.items,
            isRefreshing: false,
            warning: '',
          })
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          const message = getErrorMessage(error)
          setDatesState((current) =>
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
    const result = validateEditor(createEditor)

    if ('error' in result) {
      setCreateEditor({ ...createEditor, error: result.error })
      return
    }

    setBusyAction('create')
    setCreateEditor({ ...createEditor, error: '' })

    try {
      const data = await createDatePlan(result.input)
      setCreateEditor(editorFromPlan())
      setIsCreateOpen(false)
      setDatesState((current) => {
        const plans = sortDatePlans([
          data.plan,
          ...(current.kind === 'ready' ? current.plans : []),
        ])
        setCachedDatePlansList({ items: plans })
        return { kind: 'ready', plans, isRefreshing: false, warning: '' }
      })
      toast.success('Rencana date disimpan.')
    } catch (error) {
      const message = getErrorMessage(error)
      setCreateEditor({ ...createEditor, error: message })
      toast.error('Rencana belum bisa disimpan.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  function startEdit(plan: DatePlan) {
    setEditingId(plan.id)
    setEditEditor(editorFromPlan(plan))
  }

  async function handleUpdate(plan: DatePlan) {
    const result = validateEditor(editEditor)

    if ('error' in result) {
      setEditEditor({ ...editEditor, error: result.error })
      return
    }

    setBusyAction('update:' + plan.id)
    setEditEditor({ ...editEditor, error: '' })

    try {
      const data = await updateDatePlan({ id: plan.id, ...result.input })
      setEditingId(null)
      setDatesState((current) => {
        const plans = sortDatePlans(
          current.kind === 'ready'
            ? current.plans.map((item) => (item.id === plan.id ? data.plan : item))
            : [data.plan],
        )
        setCachedDatePlansList({ items: plans })
        return { kind: 'ready', plans, isRefreshing: false, warning: '' }
      })
      toast.success('Rencana date diperbarui.')
    } catch (error) {
      const message = getErrorMessage(error)
      setEditEditor({ ...editEditor, error: message })
      toast.error('Rencana belum bisa diperbarui.', { description: message })
    } finally {
      setBusyAction(null)
    }
  }

  async function handleDelete(plan: DatePlan) {
    setBusyAction('delete:' + plan.id)

    try {
      const data = await deleteDatePlan(plan.id)
      setDatesState((current) => {
        const plans =
          current.kind === 'ready'
            ? current.plans.filter((item) => item.id !== data.id)
            : []
        setCachedDatePlansList({ items: plans })
        return { kind: 'ready', plans, isRefreshing: false, warning: '' }
      })
      toast.success('Rencana date dihapus.')
    } catch (error) {
      const message = getErrorMessage(error)
      setDatesState({ kind: 'error', message })
      toast.error('Rencana belum bisa dihapus.', { description: message })
    } finally {
      setBusyAction(null)
      setDeleteTarget(null)
    }
  }

  function changeCalendarMonth(monthOffset: number) {
    const nextMonth = addMonths(calendarMonth, monthOffset)
    setCalendarMonth(nextMonth)
    setSelectedDateKey(localDateKey(nextMonth))
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            Date Plans
          </p>
          <h1 className="mt-1 text-3xl font-black sm:text-4xl">
            Rencana date
          </h1>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            Simpan ide jalan, jam ketemu, dan tempat favorit kalian.
          </p>
        </div>
        <Button
          aria-label="Buat rencana date"
          className="mt-1 shrink-0"
          onClick={() => {
            setViewMode('list')
            setIsCreateOpen(true)
          }}
          size="icon"
        >
          <Plus aria-hidden="true" size={20} />
        </Button>
      </header>

      <Tabs
        className="mb-4"
        onValueChange={(value) =>
          setViewMode(value === 'calendar' ? 'calendar' : 'list')
        }
        value={viewMode}
      >
        <TabsList
          aria-label="Mode tampilan rencana date"
          className="grid !h-12 w-full grid-cols-2 items-center border border-blue-200 bg-scrap-blue/70 p-1.5"
        >
          <TabsTrigger
            className="!h-9 !min-h-0 !py-0 text-sm font-extrabold leading-none focus-visible:!ring-1 data-active:bg-primary data-active:text-primary-foreground"
            value="list"
          >
            List
          </TabsTrigger>
          <TabsTrigger
            className="!h-9 !min-h-0 !py-0 text-sm font-extrabold leading-none focus-visible:!ring-1 data-active:bg-primary data-active:text-primary-foreground"
            value="calendar"
          >
            Kalender
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {datesState.kind === 'loading' ? (
        viewMode === 'calendar' ? (
          <DatesCalendarSkeleton />
        ) : (
          <DatesListSkeleton />
        )
      ) : null}

      {datesState.kind === 'ready' &&
      (datesState.isRefreshing || datesState.warning) ? (
        <p className="rounded-full bg-scrap-yellow px-4 py-2 text-xs font-extrabold text-muted-foreground">
          {datesState.warning ||
            'Data terakhir ditampilkan dulu. Lagi nyegerin data...'}
        </p>
      ) : null}

      {datesState.kind === 'error' ? (
        <ScrapbookCard tone="pink" tape>
          <h2 className="text-2xl font-black">Rencana belum kebuka.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            {datesState.message}
          </p>
          <Button
            className="mt-4 w-full"
            onClick={loadDatePlans}
            variant="secondary"
          >
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
        </ScrapbookCard>
      ) : null}

      {datesState.kind === 'ready' && viewMode === 'calendar' ? (
        <DateCalendarView
          month={calendarMonth}
          onEditInList={() => setViewMode('list')}
          onMonthChange={changeCalendarMonth}
          onSelectDate={setSelectedDateKey}
          plans={datesState.plans}
          selectedDateKey={selectedDateKey}
        />
      ) : null}

      {datesState.kind === 'ready' &&
      viewMode === 'list' &&
      datesState.plans.length === 0 ? (
        <ScrapbookCard tone="mint" tape>
          <h2 className="text-2xl font-black">Belum ada rencana date.</h2>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            Bikin satu dulu? Tulis idenya, nanti masuk scrapbook kalian.
          </p>
          <Button className="mt-4 w-full" onClick={() => setIsCreateOpen(true)}>
            <Plus aria-hidden="true" size={18} />
            Bikin rencana
          </Button>
        </ScrapbookCard>
      ) : null}

      {datesState.kind === 'ready' &&
      viewMode === 'list' &&
      datesState.plans.length > 0 ? (
        <div className="grid gap-4">
          {datesState.plans.map((plan) => (
            <DatePlanCard
              isDeleting={busyAction === 'delete:' + plan.id}
              key={plan.id}
              onDelete={() => setDeleteTarget(plan)}
              onEdit={() => startEdit(plan)}
              plan={plan}
            />
          ))}
        </div>
      ) : null}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rencana date baru</DialogTitle>
            <DialogDescription>
              Isi tanggal, jam, dan tempatnya secukupnya.
            </DialogDescription>
          </DialogHeader>
          <DatePlanEditor
            editor={createEditor}
            isBusy={busyAction === 'create'}
            onChange={setCreateEditor}
            onSubmit={handleCreate}
            submitLabel="Bikin rencana"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editingId !== null} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit rencana</DialogTitle>
            <DialogDescription>Update detailnya tanpa keluar dari list.</DialogDescription>
          </DialogHeader>
          {datesState.kind === 'ready'
            ? datesState.plans
                .filter((plan) => plan.id === editingId)
                .map((plan) => (
                  <DatePlanEditor
                    editor={editEditor}
                    isBusy={busyAction === 'update:' + plan.id}
                    key={plan.id}
                    onCancel={() => setEditingId(null)}
                    onChange={setEditEditor}
                    onSubmit={() => handleUpdate(plan)}
                    submitLabel="Simpan"
                  />
                ))
            : null}
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        confirmLabel="Hapus"
        description="Rencana ini cuma disembunyikan dari app. Kenangan lain tetap aman."
        isOpen={deleteTarget !== null}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            void handleDelete(deleteTarget)
          }
        }}
        title="Hapus rencana date?"
      />
    </div>
  )
}

type DateCalendarViewProps = {
  readonly month: Date
  readonly onEditInList: () => void
  readonly onMonthChange: (monthOffset: number) => void
  readonly onSelectDate: (dateKey: string) => void
  readonly plans: readonly DatePlan[]
  readonly selectedDateKey: string
}

function DateCalendarView({
  month,
  onEditInList,
  onMonthChange,
  onSelectDate,
  plans,
  selectedDateKey,
}: DateCalendarViewProps) {
  const cells = useMemo(() => calendarCells(month), [month])
  const plansByDay = useMemo(() => groupPlansByDay(plans), [plans])
  const selectedPlans = useMemo(
    () =>
      [...(plansByDay.get(selectedDateKey) ?? [])].sort(
        (firstPlan, secondPlan) =>
          new Date(firstPlan.scheduledAt).getTime() -
          new Date(secondPlan.scheduledAt).getTime(),
      ),
    [plansByDay, selectedDateKey],
  )
  const monthPlanCount = useMemo(
    () =>
      cells.reduce((count, cell) => {
        if (!cell.date) {
          return count
        }

        return count + (plansByDay.get(cell.key)?.length ?? 0)
      }, 0),
    [cells, plansByDay],
  )

  return (
    <div className="space-y-3">
      <ScrapbookCard className="p-3" tone="blue" tape>
        <div className="flex items-center justify-between gap-3">
          <Button
            aria-label="Bulan sebelumnya"
            onClick={() => onMonthChange(-1)}
            size="icon"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" size={17} />
          </Button>
          <div className="text-center">
            <h2 className="text-xl font-black capitalize sm:text-2xl">
              {monthLabel(month)}
            </h2>
            <p className="mt-1 text-xs font-extrabold text-muted-foreground">
              {monthPlanCount > 0
                ? `${monthPlanCount} rencana bulan ini`
                : 'Belum ada rencana bulan ini'}
            </p>
          </div>
          <Button
            aria-label="Bulan berikutnya"
            onClick={() => onMonthChange(1)}
            size="icon"
            variant="outline"
          >
            <RotateCcw
              aria-hidden="true"
              className="rotate-180"
              size={17}
            />
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.68rem] font-extrabold text-muted-foreground">
          {weekdayLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            if (!cell.date) {
              return <div aria-hidden="true" key={cell.key} />
            }

            const count = plansByDay.get(cell.key)?.length ?? 0
            const isSelected = selectedDateKey === cell.key
            const isToday = localDateKey(new Date()) === cell.key

            return (
              <button
                aria-label={`${selectedDateLabel(cell.key)}${
                  count > 0 ? `, ${count} rencana` : ', tidak ada rencana'
                }`}
                aria-pressed={isSelected}
                className={cn(
                  'min-h-10 rounded-xl border bg-white/55 px-1 py-1 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-primary bg-scrap-pink text-foreground'
                    : 'border-border',
                )}
                key={cell.key}
                onClick={() => onSelectDate(cell.key)}
                type="button"
              >
                <span className="block text-[0.82rem] font-black">
                  {cell.date.getDate()}
                </span>
                {count > 0 ? (
                  <span className="mx-auto mt-1 block w-fit rounded-full bg-foreground px-1.5 py-0.5 text-[0.62rem] font-extrabold text-background">
                    {count}
                  </span>
                ) : isToday ? (
                  <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-primary" />
                ) : null}
              </button>
            )
          })}
        </div>
      </ScrapbookCard>

      <ScrapbookCard className="p-4" tone="yellow" tape>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
              Hari dipilih
            </p>
            <h2 className="mt-1 text-xl font-black">
              {selectedDateLabel(selectedDateKey)}
            </h2>
          </div>
          <Button
            aria-label="Edit rencana di List"
            className="shrink-0"
            onClick={onEditInList}
            size="sm"
            variant="secondary"
          >
            Ke List
          </Button>
        </div>

        {selectedPlans.length === 0 ? (
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            Belum ada rencana di tanggal ini.
          </p>
        ) : (
          <div className="mt-4 grid gap-3">
            {selectedPlans.map((plan) => (
              <div
                className="rounded-[1.15rem] border bg-white/55 p-4"
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="break-words text-lg font-black">
                    {plan.title}
                  </h3>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-3 py-1 text-xs font-extrabold',
                      statusClasses(plan.status),
                    )}
                  >
                    {statusLabel(plan.status)}
                  </span>
                </div>
                <p className="mt-3 flex items-center gap-2 text-sm font-bold text-muted-foreground">
                  <Clock aria-hidden="true" size={16} />
                  {friendlyTime(plan.scheduledAt)}
                </p>
                {plan.locationName ? (
                  <p className="mt-2 flex items-start gap-2 text-sm font-bold text-muted-foreground">
                    <MapPin
                      aria-hidden="true"
                      className="mt-0.5 shrink-0"
                      size={16}
                    />
                    <span>{plan.locationName}</span>
                  </p>
                ) : null}
                {plan.notes ? (
                  <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold leading-relaxed">
                    {plan.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </ScrapbookCard>
    </div>
  )
}

type DatePlanEditorProps = {
  readonly editor: EditorState
  readonly isBusy: boolean
  readonly onCancel?: () => void
  readonly onChange: (editor: EditorState) => void
  readonly onSubmit: () => void
  readonly submitLabel: string
}

function DatePlanEditor({
  editor,
  isBusy,
  onCancel,
  onChange,
  onSubmit,
  submitLabel,
}: DatePlanEditorProps) {
  return (
    <ScrapbookCard tape>
      <div className="grid gap-3">
        <Input
          aria-label="Judul rencana date"
          onChange={(event) =>
            onChange({ ...editor, title: event.target.value, error: '' })
          }
          placeholder="Judul date, misal: nonton sore"
          value={editor.title}
        />
        <DateTimePickerInput
          ariaLabel="Tanggal dan jam date"
          onChange={(value) =>
            onChange({ ...editor, scheduledAt: value, error: '' })
          }
          value={editor.scheduledAt}
        />
        <Input
          aria-label="Tempat date"
          onChange={(event) =>
            onChange({ ...editor, locationName: event.target.value, error: '' })
          }
          placeholder="Tempat, opsional"
          value={editor.locationName}
        />
        <SelectField
          ariaLabel="Status rencana date"
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
        <Textarea
          aria-label="Catatan rencana date"
          onChange={(event) =>
            onChange({ ...editor, notes: event.target.value, error: '' })
          }
          placeholder="Catatan kecil, opsional"
          value={editor.notes}
        />
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
          ) : submitLabel === 'Simpan' ? (
            <Save aria-hidden="true" size={18} />
          ) : (
            <Plus aria-hidden="true" size={18} />
          )}
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button
            aria-label="Batal edit rencana date"
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

type DatePlanCardProps = {
  readonly isDeleting: boolean
  readonly onDelete: () => void
  readonly onEdit: () => void
  readonly plan: DatePlan
}

function DatePlanCard({
  isDeleting,
  onDelete,
  onEdit,
  plan,
}: DatePlanCardProps) {
  return (
    <ScrapbookCard tone={cardTone(plan.status)} tape>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="break-words text-2xl font-black">{plan.title}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-extrabold',
                statusClasses(plan.status),
              )}
            >
              Status: {statusLabel(plan.status)}
            </span>
            {plan.isPast ? (
              <span className="rounded-full bg-card px-3 py-1 text-xs font-extrabold text-muted-foreground">
                Lewat
              </span>
            ) : null}
          </div>
        </div>
        <CalendarHeart aria-hidden="true" className="shrink-0" size={24} />
      </div>

      <div className="mt-5 grid gap-3 text-sm font-bold text-muted-foreground">
        <p className="flex items-start gap-2">
          <Clock aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
          <span>{friendlyDate(plan.scheduledAt)}</span>
        </p>
        {plan.locationName ? (
          <p className="flex items-start gap-2">
            <MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
            <span>{plan.locationName}</span>
          </p>
        ) : null}
      </div>

      {plan.notes ? (
        <p className="mt-5 whitespace-pre-wrap break-words rounded-[1.15rem] bg-white/45 px-4 py-3 text-sm font-bold leading-relaxed">
          {plan.notes}
        </p>
      ) : null}

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
            {plan.createdByNickname || 'Kalian'}
          </p>
          <p className="mt-1 text-xs font-bold text-muted-foreground">
            Dibikin {friendlyDate(plan.createdAt)}
          </p>
        </div>
        {plan.canEdit ? (
          <div className="flex gap-2">
            <Button
              aria-label="Edit rencana date"
              onClick={onEdit}
              size="icon"
              variant="outline"
            >
              <PencilLine aria-hidden="true" size={17} />
            </Button>
            <Button
              aria-label="Hapus rencana date"
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
