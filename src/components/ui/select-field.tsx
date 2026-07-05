import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export type SelectOption<TValue extends string> = {
  readonly label: string
  readonly value: TValue
}

type SelectFieldProps<TValue extends string> = {
  readonly ariaLabel: string
  readonly className?: string
  readonly onValueChange: (value: TValue) => void
  readonly options: readonly SelectOption<TValue>[]
  readonly placeholder?: string
  readonly value: TValue
}

export function SelectField<TValue extends string>({
  ariaLabel,
  className,
  onValueChange,
  options,
  placeholder = 'Pilih',
  value,
}: SelectFieldProps<TValue>) {
  return (
    <Select
      onValueChange={(nextValue) => {
        const option = options.find((item) => item.value === nextValue)

        if (option) {
          onValueChange(option.value)
        }
      }}
      value={value}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn(
          'h-12 w-full rounded-[1.15rem] border-border bg-card px-4 text-base font-bold shadow-[0_8px_18px_rgb(103_74_58_/_0.06)] hover:bg-card/80',
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border border-border bg-card p-1 shadow-[0_18px_45px_rgb(103_74_58_/_0.16)]">
        {options.map((option) => (
          <SelectItem
            className="rounded-[1rem] text-sm font-extrabold focus:bg-scrap-yellow"
            key={option.value}
            value={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
