import { DatePickerInput } from '@/components/ui/date-picker-input'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type DateTimePickerInputProps = {
  readonly ariaLabel: string
  readonly className?: string
  readonly onChange: (value: string) => void
  readonly value: string
}

function splitDateTime(value: string) {
  const [date = '', time = ''] = value.split('T')

  return { date, time }
}

export function DateTimePickerInput({
  ariaLabel,
  className,
  onChange,
  value,
}: DateTimePickerInputProps) {
  const { date, time } = splitDateTime(value)

  return (
    <div className={cn('grid gap-2 sm:grid-cols-[1fr_8rem]', className)}>
      <DatePickerInput
        ariaLabel={ariaLabel}
        onChange={(nextDate) => onChange(nextDate + 'T' + (time || '19:00'))}
        value={date}
      />
      <Input
        aria-label="Jam rencana date"
        className="h-12 rounded-[1.15rem] bg-card px-4 text-base font-bold"
        onChange={(event) => onChange((date || '') + 'T' + event.target.value)}
        type="time"
        value={time}
      />
    </div>
  )
}
