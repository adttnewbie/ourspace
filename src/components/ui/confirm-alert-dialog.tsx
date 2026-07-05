import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type ConfirmAlertDialogProps = {
  readonly cancelLabel?: string
  readonly children?: React.ReactNode
  readonly confirmDisabled?: boolean
  readonly confirmLabel?: string
  readonly description: string
  readonly isOpen: boolean
  readonly onCancel: () => void
  readonly onConfirm: () => void
  readonly title: string
}

export function ConfirmAlertDialog({
  cancelLabel = 'Batal',
  children,
  confirmDisabled = false,
  confirmLabel = 'Hapus',
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: ConfirmAlertDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="rounded-[2rem] bg-card">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm font-bold leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={confirmDisabled}
            onClick={onConfirm}
            variant="destructive"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
