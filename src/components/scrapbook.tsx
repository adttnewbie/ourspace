import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const cardTones = {
  blue: 'bg-scrap-blue',
  lavender: 'bg-scrap-lavender',
  mint: 'bg-scrap-mint',
  pink: 'bg-scrap-pink',
  white: 'bg-card',
  yellow: 'bg-scrap-yellow',
} as const

type CardTone = keyof typeof cardTones

type ScrapbookCardProps = HTMLAttributes<HTMLDivElement> & {
  readonly children: ReactNode
  readonly tape?: boolean
  readonly tone?: CardTone
}

export function ScrapbookCard({
  children,
  className,
  tape = false,
  tone = 'white',
  ...props
}: ScrapbookCardProps) {
  return (
    <section
      className={cn(
        'paper-card relative rounded-[1.75rem] border p-4 shadow-[0_10px_30px_rgb(103_74_58_/_0.10)] sm:p-5',
        cardTones[tone],
        className,
      )}
      {...props}
    >
      {tape ? (
        <span
          aria-hidden="true"
          className="absolute -top-3 left-8 h-6 w-20 rotate-[-3deg] rounded-sm bg-white/70 shadow-[0_8px_20px_rgb(103_74_58_/_0.10)]"
        />
      ) : null}
      {children}
    </section>
  )
}
