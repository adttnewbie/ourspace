import { CalendarDays } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

type DatePickerInputProps = {
  readonly ariaLabel: string
  readonly className?: string
  readonly onChange: (value: string) => void
  readonly value: string
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  if (!value) {
    return undefined
  }

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

function friendlyDate(value: string) {
  const date = parseDateValue(value)

  if (!date) {
    return 'Pilih tanggal'
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
  }).format(date)
}

export function DatePickerInput({
  ariaLabel,
  className,
  onChange,
  value,
}: DatePickerInputProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={ariaLabel}
          className={cn(
            'h-12 w-full justify-start rounded-[1.15rem] bg-card px-4 text-left text-base font-bold text-foreground hover:bg-card/80',
            !value && 'text-muted-foreground',
            className,
          )}
          variant="outline"
        >
          <CalendarDays aria-hidden="true" size={18} />
          {friendlyDate(value)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto rounded-[1.75rem] border border-border bg-card p-2 shadow-[0_18px_45px_rgb(103_74_58_/_0.16)]"
      >
        <Calendar
          className="bg-transparent"
          mode="single"
          onSelect={(date) => {
            if (date) {
              onChange(formatDateValue(date))
              setIsOpen(false)
            }
          }}
          selected={parseDateValue(value)}
        />
      </PopoverContent>
    </Popover>
  )
}
