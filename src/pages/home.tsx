import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import {
  CalendarHeart,
  Image,
  ListChecks,
  LoaderCircle,
  NotebookPen,
  Plus,
  RotateCcw,
  Send,
} from 'lucide-react'
import { ScrapbookCard } from '@/components/scrapbook'
import { HomeSkeleton } from '@/components/loading-skeleton'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  ApiError,
  ApiNetworkError,
  createNote,
  getCachedDatePlansList,
  getCachedGalleryList,
  getCachedHomeData,
  getCachedNotesList,
  getCachedSharedItemsList,
  getHome,
  listDatePlans,
  listGallery,
  listNotes,
  listSharedItems,
} from '@/lib/api'
import type { DatePlan, GalleryItem, HomeData, SharedItem, StickyNote } from '@/lib/api'
import {
  getNoteTone,
  noteColors,
  noteToneClasses,
  type NoteColor,
} from '@/lib/note-colors'
import { cn } from '@/lib/utils'

type HomeState =
  | { readonly kind: 'loading' }
  | {
      readonly kind: 'ready'
      readonly data: HomeData
      readonly isRefreshing: boolean
      readonly warning: string
    }
  | { readonly kind: 'error'; readonly message: string }

type HomeSummary = {
  readonly galleryItem: GalleryItem | null
  readonly latestNote: StickyNote | null
  readonly listItem: SharedItem | null
  readonly nextDate: DatePlan | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof ApiNetworkError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Home belum bisa dimuat.'
}

function formatAnniversary(value?: string | null) {
  if (!value) {
    return 'Belum tercatat'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
  }).format(new Date(value))
}

function formatCompactDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: value.includes('T') ? 'short' : undefined,
  }).format(new Date(value))
}

async function loadHomeSummary(): Promise<HomeSummary> {
  const [notes, dates, gallery, lists] = await Promise.allSettled([
    listNotes({ limit: 1 }),
    listDatePlans(),
    listGallery({ limit: 1 }),
    listSharedItems(),
  ])

  const now = Date.now()
  const dateItems = dates.status === 'fulfilled' ? dates.value.items : []
  const activeListItems =
    lists.status === 'fulfilled'
      ? lists.value.items.filter((item) => item.status !== 'done')
      : []

  return {
    galleryItem: gallery.status === 'fulfilled' ? gallery.value.items[0] ?? null : null,
    latestNote: notes.status === 'fulfilled' ? notes.value.items[0] ?? null : null,
    listItem: activeListItems[0] ?? null,
    nextDate:
      dateItems
        .filter(
          (plan) =>
            plan.status !== 'cancelled' &&
            new Date(plan.scheduledAt).getTime() >= now,
        )
        .sort(
          (first, second) =>
            new Date(first.scheduledAt).getTime() -
            new Date(second.scheduledAt).getTime(),
        )[0] ?? null,
  }
}

function createCachedSummary(): HomeSummary {
  const notes = getCachedNotesList()
  const dates = getCachedDatePlansList()
  const gallery = getCachedGalleryList()
  const lists = getCachedSharedItemsList()
  const now = Date.now()
  const activeListItems = lists?.items.filter((item) => item.status !== 'done') ?? []

  return {
    galleryItem: gallery?.items[0] ?? null,
    latestNote: notes?.items[0] ?? null,
    listItem: activeListItems[0] ?? null,
    nextDate:
      dates?.items
        .filter(
          (plan) =>
            plan.status !== 'cancelled' &&
            new Date(plan.scheduledAt).getTime() >= now,
        )
        .sort(
          (first, second) =>
            new Date(first.scheduledAt).getTime() -
            new Date(second.scheduledAt).getTime(),
        )[0] ?? null,
  }
}

export function HomePage() {
  const [homeState, setHomeState] = useState<HomeState>(() => {
    const cached = getCachedHomeData()
    return cached
      ? { kind: 'ready', data: cached, isRefreshing: true, warning: '' }
      : { kind: 'loading' }
  })
  const [summary, setSummary] = useState<HomeSummary>(() => createCachedSummary())
  const [body, setBody] = useState('')
  const [color, setColor] = useState<NoteColor>('yellow')
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState('')

  const loadHome = useCallback(async () => {
    setHomeState((current) =>
      current.kind === 'ready'
        ? { ...current, isRefreshing: true, warning: '' }
        : { kind: 'loading' },
    )

    try {
      const [home, nextSummary] = await Promise.all([getHome(), loadHomeSummary()])
      setHomeState({
        kind: 'ready',
        data: home,
        isRefreshing: false,
        warning: '',
      })
      setSummary(nextSummary)
    } catch (error) {
      const message = getErrorMessage(error)
      setHomeState((current) =>
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

    Promise.all([getHome(), loadHomeSummary()])
      .then(([data, nextSummary]) => {
        if (isActive) {
          setHomeState({
            kind: 'ready',
            data,
            isRefreshing: false,
            warning: '',
          })
          setSummary(nextSummary)
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          const message = getErrorMessage(error)
          setHomeState((current) =>
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

  const todayNotes = useMemo(() => {
    return homeState.kind === 'ready'
      ? homeState.data.today?.stickyNotes ?? []
      : []
  }, [homeState])

  async function handleCreateNote() {
    const nextBody = body.trim()

    if (!nextBody || nextBody.length > 280) {
      setFormError('Note wajib 1-280 karakter.')
      return
    }

    setFormError('')
    setIsCreating(true)

    try {
      await createNote({ body: nextBody, color })
      setBody('')
      const [home, nextSummary] = await Promise.all([getHome(), loadHomeSummary()])
      setHomeState({
        kind: 'ready',
        data: home,
        isRefreshing: false,
        warning: '',
      })
      setSummary(nextSummary)
      toast.success('Note ditempel.')
    } catch (error) {
      const message = getErrorMessage(error)
      setFormError(message)
      toast.error('Note belum bisa ditempel.', { description: message })
    } finally {
      setIsCreating(false)
    }
  }

  if (homeState.kind === 'loading') {
    return (
      <div className="py-6">
        <HomeSkeleton />
      </div>
    )
  }

  if (homeState.kind === 'error') {
    return (
      <div className="grid min-h-[60dvh] place-items-center">
        <ScrapbookCard className="w-full" tone="pink" tape>
          <h1 className="text-2xl font-black">Home belum kebuka.</h1>
          <p className="mt-2 text-sm font-bold leading-relaxed text-muted-foreground">
            {homeState.message}
          </p>
          <Button className="mt-4 w-full" onClick={loadHome} variant="secondary">
            <RotateCcw aria-hidden="true" size={18} />
            Coba lagi
          </Button>
        </ScrapbookCard>
      </div>
    )
  }

  const home = homeState.data

  return (
    <div className="space-y-5">
      {homeState.isRefreshing || homeState.warning ? (
        <p className="rounded-full bg-scrap-yellow px-4 py-2 text-xs font-extrabold text-muted-foreground">
          {homeState.warning || 'Data terakhir ditampilkan dulu. Lagi nyegerin data...'}
        </p>
      ) : null}

      <ScrapbookCard className="p-5" tone="pink" tape>
        <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
          Selamat datang
        </p>
        <h1 className="mt-2 text-4xl font-black leading-tight">
          {home.greeting ?? 'Hai, kamu'}
        </h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-muted-foreground">
          Ruang kecil buat tempel kabar manis hari ini.
        </p>
        <div className="mt-4 rounded-[1.25rem] bg-card/60 px-4 py-3">
          <p className="text-3xl font-black">{home.daysTogether ?? 0}</p>
          <p className="text-sm font-extrabold text-muted-foreground">
            hari bareng sejak {formatAnniversary(home.anniversaryDate)}
          </p>
        </div>
      </ScrapbookCard>

      <ScrapbookCard tape>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">Tempel note</h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              Tulis pendek aja, biar kerasa kayak sticky note.
            </p>
          </div>
          <Plus aria-hidden="true" className="mt-1 shrink-0" size={22} />
        </div>

        <Textarea
          aria-label="Isi note"
          className="min-h-24 rounded-[1.25rem]"
          maxLength={280}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Contoh: nanti malam movie call yuk."
          value={body}
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex gap-2" aria-label="Pilih warna note">
            {noteColors.map((noteColor) => (
              <button
                aria-label={'Warna ' + noteColor}
                aria-pressed={color === noteColor}
                className={cn(
                  'size-8 rounded-full border-2 border-white shadow-[0_8px_18px_rgb(103_74_58_/_0.12)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  noteToneClasses[noteColor],
                  color === noteColor ? 'scale-110 ring-2 ring-foreground' : '',
                )}
                key={noteColor}
                onClick={() => setColor(noteColor)}
                type="button"
              />
            ))}
          </div>
          <p className="text-xs font-extrabold text-muted-foreground">
            {body.trim().length}/280
          </p>
        </div>

        {formError ? (
          <p className="mt-3 text-sm font-extrabold text-destructive">
            {formError}
          </p>
        ) : null}

        <Button
          className="mt-4 w-full"
          disabled={isCreating}
          onClick={handleCreateNote}
        >
          {isCreating ? (
            <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
          ) : (
            <Send aria-hidden="true" size={18} />
          )}
          Tempel note
        </Button>
      </ScrapbookCard>

      <section className="space-y-3">
        <div>
          <h2 className="text-2xl font-black">Ringkasan kecil</h2>
          <p className="mt-1 text-sm font-bold text-muted-foreground">
            Sekilas isi scrapbook kalian.
          </p>
        </div>
        <div className="grid gap-3">
          <SummaryCard
            description={
              summary.nextDate
                ? formatCompactDate(summary.nextDate.scheduledAt)
                : 'Belum ada rencana dekat.'
            }
            icon={<CalendarHeart aria-hidden="true" size={22} />}
            meta={summary.nextDate?.locationName || 'Dates'}
            title={summary.nextDate?.title ?? 'Date terdekat'}
            to="/dates"
            tone="mint"
          />
          <SummaryCard
            description={
              summary.latestNote
                ? summary.latestNote.body
                : String(home.counts?.stickyNotes ?? 0) + ' note tersimpan.'
            }
            icon={<NotebookPen aria-hidden="true" size={22} />}
            meta={summary.latestNote?.createdByNickname || 'Notes'}
            title="Note terbaru"
            to="/notes"
            tone="lavender"
          />
          <SummaryCard
            description={
              summary.galleryItem
                ? formatCompactDate(summary.galleryItem.takenAt)
                : 'Belum ada foto terbaru.'
            }
            icon={<Image aria-hidden="true" size={22} />}
            meta={summary.galleryItem?.createdByNickname || 'Gallery'}
            title={summary.galleryItem?.caption ?? 'Foto terbaru'}
            to="/gallery"
            tone="blue"
          />
          <SummaryCard
            description={
              summary.listItem
                ? summary.listItem.notes || 'Masih masuk wishlist.'
                : 'Belum ada wishlist aktif.'
            }
            icon={<ListChecks aria-hidden="true" size={22} />}
            meta={summary.listItem?.category || 'Lists'}
            title={summary.listItem?.title ?? 'Wishlist aktif'}
            to="/lists"
            tone="yellow"
          />
        </div>
      </section>

      {todayNotes.length > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-2xl font-black">Terbaru hari ini</h2>
            <p className="mt-1 text-sm font-bold text-muted-foreground">
              Yang baru ditempel buat kalian.
            </p>
          </div>
          <div className="grid gap-3">
            {todayNotes.map((note) => (
              <article
                className={cn(
                  'relative rounded-[1.5rem] border p-4 shadow-[0_10px_30px_rgb(103_74_58_/_0.10)]',
                  noteToneClasses[getNoteTone(note)],
                )}
                key={note.id}
              >
                <span
                  aria-hidden="true"
                  className="absolute -top-2 left-6 h-4 w-14 rotate-[-4deg] rounded-sm bg-white/70 shadow-[0_6px_16px_rgb(103_74_58_/_0.10)]"
                />
                <p className="text-base font-extrabold leading-relaxed">
                  {note.body}
                </p>
                <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
                  {note.createdByNickname || 'Kalian'}
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function SummaryCard({
  description,
  icon,
  meta,
  title,
  to,
  tone,
}: {
  readonly description: string
  readonly icon: ReactNode
  readonly meta: string
  readonly title: string
  readonly to: string
  readonly tone: 'blue' | 'lavender' | 'mint' | 'yellow'
}) {
  return (
    <Link className="group block" to={to}>
      <ScrapbookCard className="p-4" tone={tone}>
        <div className="flex items-start gap-3">
          <div className="mt-1 shrink-0">{icon}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
                {meta}
              </p>
              <span aria-hidden="true" className="text-lg font-black">
                +
              </span>
            </div>
            <h3 className="mt-1 line-clamp-1 text-lg font-black">{title}</h3>
            <p className="mt-1 line-clamp-2 text-sm font-bold leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </ScrapbookCard>
    </Link>
  )
}
