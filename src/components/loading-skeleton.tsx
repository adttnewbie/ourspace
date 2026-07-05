import { ScrapbookCard } from '@/components/scrapbook'
import { cn } from '@/lib/utils'

type SkeletonBlockProps = {
  readonly className?: string
}

function SkeletonBlock({ className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-full bg-card/65', className)}
    />
  )
}

function SkeletonHeader({ compact = false }: { readonly compact?: boolean }) {
  return (
    <header className="flex items-start justify-between gap-4" aria-hidden="true">
      <div className="min-w-0 flex-1">
        <SkeletonBlock className="h-3 w-24 bg-muted/70" />
        <SkeletonBlock className={cn('mt-3 h-9 w-56', compact && 'h-8 w-44')} />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-72 bg-muted/70" />
      </div>
      <SkeletonBlock className="size-10 shrink-0 bg-primary/35" />
    </header>
  )
}

function SkeletonActionCard() {
  return (
    <ScrapbookCard tape>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex-1">
          <SkeletonBlock className="h-7 w-36" />
          <SkeletonBlock className="mt-3 h-4 w-64 max-w-full bg-muted/70" />
        </div>
        <SkeletonBlock className="size-6 bg-muted/70" />
      </div>
      <SkeletonBlock className="h-24 w-full rounded-[1.25rem] bg-muted/60" />
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          {(['pink', 'mint', 'yellow', 'blue'] as const).map((tone) => (
            <SkeletonBlock className="size-8 bg-muted/70" key={tone} />
          ))}
        </div>
        <SkeletonBlock className="h-3 w-12 bg-muted/70" />
      </div>
      <SkeletonBlock className="mt-4 h-11 w-full bg-primary/35" />
    </ScrapbookCard>
  )
}

function SkeletonStickyNote({
  tone = 'yellow',
}: {
  readonly tone?: 'blue' | 'lavender' | 'mint' | 'pink' | 'yellow'
}) {
  return (
    <ScrapbookCard tone={tone} tape>
      <div className="space-y-3" aria-hidden="true">
        <SkeletonBlock className="h-4 w-full bg-card/60" />
        <SkeletonBlock className="h-4 w-4/5 bg-card/60" />
        <SkeletonBlock className="h-4 w-2/3 bg-card/60" />
        <div className="flex items-center justify-between pt-2">
          <SkeletonBlock className="h-3 w-24 bg-card/60" />
          <div className="flex gap-2">
            <SkeletonBlock className="size-8 bg-card/60" />
            <SkeletonBlock className="size-8 bg-card/60" />
          </div>
        </div>
      </div>
    </ScrapbookCard>
  )
}

function SkeletonDateCard() {
  return (
    <ScrapbookCard tone="mint" tape>
      <div className="space-y-3" aria-hidden="true">
        <div className="flex items-start justify-between gap-3">
          <SkeletonBlock className="h-6 w-40" />
          <SkeletonBlock className="h-7 w-20 bg-card/60" />
        </div>
        <SkeletonBlock className="h-4 w-48 bg-card/60" />
        <SkeletonBlock className="h-4 w-36 bg-card/60" />
        <SkeletonBlock className="h-4 w-full bg-card/60" />
      </div>
    </ScrapbookCard>
  )
}

function SkeletonPhotoCard() {
  return (
    <ScrapbookCard className="p-3" tape>
      <div
        aria-hidden="true"
        className="aspect-[4/3] w-full animate-pulse rounded-[1.25rem] bg-muted/70"
      />
      <div className="mt-3 space-y-2" aria-hidden="true">
        <SkeletonBlock className="h-4 w-4/5" />
        <SkeletonBlock className="h-3 w-36 bg-muted/70" />
      </div>
    </ScrapbookCard>
  )
}

function SkeletonListCard() {
  return (
    <ScrapbookCard tone="blue" tape>
      <div className="space-y-3" aria-hidden="true">
        <SkeletonBlock className="h-6 w-48" />
        <div className="flex gap-2">
          <SkeletonBlock className="h-7 w-20 bg-card/60" />
          <SkeletonBlock className="h-7 w-16 bg-card/60" />
        </div>
        <SkeletonBlock className="h-4 w-full bg-card/60" />
        <SkeletonBlock className="h-3 w-32 bg-card/60" />
      </div>
    </ScrapbookCard>
  )
}

function SkeletonCalendarGrid() {
  return (
    <ScrapbookCard className="p-3" tone="blue" tape>
      <div className="mb-4 flex items-center justify-between" aria-hidden="true">
        <SkeletonBlock className="size-9 bg-card/70" />
        <div className="grid justify-items-center gap-2">
          <SkeletonBlock className="h-6 w-28 bg-card/70" />
          <SkeletonBlock className="h-3 w-32 bg-card/70" />
        </div>
        <SkeletonBlock className="size-9 bg-card/70" />
      </div>
      <div className="grid grid-cols-7 gap-2" aria-hidden="true">
        {Array.from({ length: 7 }).map((_, index) => (
          <SkeletonBlock className="mx-auto h-3 w-7 bg-card/60" key={index} />
        ))}
        {Array.from({ length: 35 }).map((_, index) => (
          <SkeletonBlock
            className="aspect-square w-full rounded-full bg-card/65"
            key={index}
          />
        ))}
      </div>
    </ScrapbookCard>
  )
}

export function HomeSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      <ScrapbookCard className="p-5" tone="pink" tape>
        <SkeletonBlock className="h-3 w-28 bg-card/60" />
        <SkeletonBlock className="mt-3 h-10 w-52 bg-card/60" />
        <SkeletonBlock className="mt-3 h-4 w-full max-w-72 bg-card/60" />
        <div className="mt-4 rounded-[1.25rem] bg-card/60 px-4 py-3">
          <SkeletonBlock className="h-9 w-20 bg-muted/60" />
          <SkeletonBlock className="mt-2 h-4 w-56 max-w-full bg-muted/60" />
        </div>
      </ScrapbookCard>
      <SkeletonActionCard />
      <section className="space-y-3">
        <SkeletonBlock className="h-7 w-40" />
        <SkeletonBlock className="h-4 w-56 bg-muted/70" />
        <div className="grid gap-3">
          {(['mint', 'yellow', 'blue', 'lavender'] as const).map((tone) => (
            <ScrapbookCard className="p-4" tone={tone} key={tone}>
              <div
                className="flex items-center justify-between gap-3"
                aria-hidden="true"
              >
                <div className="min-w-0 flex-1">
                  <SkeletonBlock className="h-5 w-36 bg-card/60" />
                  <SkeletonBlock className="mt-2 h-3 w-44 bg-card/60" />
                </div>
                <SkeletonBlock className="size-10 bg-card/60" />
              </div>
            </ScrapbookCard>
          ))}
        </div>
      </section>
    </div>
  )
}

export function NotesSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <SkeletonStickyNote tone="yellow" />
      <SkeletonStickyNote tone="pink" />
      <SkeletonStickyNote tone="mint" />
    </div>
  )
}

export function DatesListSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <SkeletonDateCard />
      <SkeletonDateCard />
      <SkeletonDateCard />
    </div>
  )
}

export function DatesCalendarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <SkeletonCalendarGrid />
      <ScrapbookCard className="p-4" tone="yellow" tape>
        <SkeletonBlock className="h-3 w-24 bg-card/60" />
        <SkeletonBlock className="mt-3 h-6 w-48 bg-card/60" />
        <SkeletonBlock className="mt-3 h-4 w-56 bg-card/60" />
      </ScrapbookCard>
    </div>
  )
}

export function GallerySkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
      <SkeletonPhotoCard />
      <SkeletonPhotoCard />
      <SkeletonPhotoCard />
      <SkeletonPhotoCard />
    </div>
  )
}

export function ListsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <SkeletonListCard />
      <SkeletonListCard />
      <SkeletonListCard />
    </div>
  )
}

export function PairingStatusSkeleton() {
  return (
    <main className="min-h-dvh bg-background px-4 pb-6 pt-8 text-foreground">
      <div className="mx-auto max-w-[420px] space-y-4" aria-busy="true">
        <ScrapbookCard tape>
          <SkeletonBlock className="h-3 w-28 bg-muted/70" />
          <SkeletonBlock className="mt-3 h-8 w-56" />
          <SkeletonBlock className="mt-3 h-4 w-full bg-muted/70" />
          <SkeletonBlock className="mt-2 h-4 w-4/5 bg-muted/70" />
        </ScrapbookCard>
        <ScrapbookCard className="grid place-items-center py-8" tone="pink">
          <SkeletonBlock className="size-36 bg-card/60" />
          <SkeletonBlock className="mt-5 h-4 w-44 bg-card/60" />
        </ScrapbookCard>
      </div>
    </main>
  )
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <SkeletonHeader compact />
      {(['pink', 'blue', 'mint', 'yellow', 'lavender'] as const).map((tone) => (
        <ScrapbookCard tone={tone} key={tone}>
          <SkeletonBlock className="h-5 w-40 bg-card/60" />
          <SkeletonBlock className="mt-3 h-4 w-full bg-card/60" />
          <SkeletonBlock className="mt-2 h-4 w-2/3 bg-card/60" />
        </ScrapbookCard>
      ))}
    </div>
  )
}
