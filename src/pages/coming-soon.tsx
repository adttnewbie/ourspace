import { Sparkles } from 'lucide-react'
import { ScrapbookCard } from '@/components/scrapbook'

type ComingSoonPageProps = {
  readonly featureName: 'Dates' | 'Gallery'
  readonly tone: 'blue' | 'mint'
}

export function ComingSoonPage({ featureName, tone }: ComingSoonPageProps) {
  return (
    <div className="grid min-h-[calc(100dvh-9rem)] place-items-center">
      <ScrapbookCard className="w-full text-center" tape tone={tone}>
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-card">
          <Sparkles aria-hidden="true" size={28} />
        </div>
        <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
          Segera hadir
        </p>
        <h1 className="mt-2 text-4xl font-black">{featureName}</h1>
        <p className="mt-3 text-sm font-bold leading-relaxed text-muted-foreground">
          Fitur ini sengaja belum aktif di foundation v1. Sekarang fokusnya
          pairing, home, dan sticky notes dulu.
        </p>
      </ScrapbookCard>
    </div>
  )
}
