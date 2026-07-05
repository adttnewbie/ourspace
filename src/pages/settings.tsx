import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import {
  CheckCircle2,
  ChevronRight,
  Database,
  HeartHandshake,
  Images,
  LoaderCircle,
  Settings,
  UserRound,
  Wifi,
  XCircle,
} from 'lucide-react'
import { ScrapbookCard } from '@/components/scrapbook'
import { Button } from '@/components/ui/button'
import { ConfirmAlertDialog } from '@/components/ui/confirm-alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { appConfig } from '@/lib/env'
import {
  ApiConfigError,
  ApiError,
  ApiNetworkError,
  checkBackupHealth,
  checkGalleryHealth,
  getCachedHomeData,
  getHome,
  healthCheck,
  listBackups,
  resetCouple,
  resumeSession,
  runBackupNow,
} from '@/lib/api'
import type { BackupHealthData, BackupRecord } from '@/lib/api'
import { clearSession, getStoredSession } from '@/lib/session'

type ApiStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'success'; readonly details?: string; readonly message: string }
  | {
      readonly kind: 'error'
      readonly code: string
      readonly details?: string
      readonly message: string
    }

function getApiErrorStatus(error: unknown): Extract<ApiStatus, { kind: 'error' }> {
  if (error instanceof ApiConfigError) {
    return {
      kind: 'error',
      code: 'CONFIG_ERROR',
      message: 'Konfigurasi API belum siap.',
      details: cleanErrorDetails(error.message),
    }
  }

  if (error instanceof ApiError) {
    return {
      kind: 'error',
      code: error.code,
      message: friendlyApiError(error.code),
      details: cleanErrorDetails(error.message),
    }
  }

  if (error instanceof ApiNetworkError) {
    return {
      kind: 'error',
      code: 'NETWORK_ERROR',
      message: 'Proxy atau backend belum merespons dengan benar.',
      details: cleanErrorDetails(error.message),
    }
  }

  return {
    kind: 'error',
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? cleanErrorDetails(error.message) : 'Koneksi gagal.',
  }
}

function cleanErrorDetails(message: string) {
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('<html') || lowerMessage.includes('<!doctype')) {
    return 'Backend mengirim response non-JSON.'
  }

  return message
}

function friendlyApiError(code: string) {
  switch (code) {
    case 'UNAUTHORIZED':
      return 'Session lokal tidak valid atau belum ada.'
    case 'CONFIG_MISSING':
      return 'Konfigurasi Apps Script belum lengkap.'
    case 'DRIVE_ERROR':
      return 'Drive OurSpace belum bisa diakses.'
    case 'INTERNAL_ERROR':
      return 'Backend membalas tidak sesuai format OurSpace.'
    default:
      return 'Backend mengembalikan error.'
  }
}

function previewMemberId(memberId: string) {
  return memberId.length <= 14 ? memberId : memberId.slice(0, 10) + '...'
}

function friendlyDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function friendlyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
  }).format(new Date(value))
}

function useProfile() {
  const cachedHome = getCachedHomeData()
  const [storedSession, setStoredSession] = useState(() => getStoredSession())
  const [profileName, setProfileName] = useState('Belum dicek')
  const [partnerName, setPartnerName] = useState('Belum kebaca')
  const [anniversaryDate, setAnniversaryDate] = useState<string | null>(
    cachedHome?.anniversaryDate ?? null,
  )
  const [daysTogether, setDaysTogether] = useState<number | null>(
    cachedHome?.daysTogether ?? null,
  )

  useEffect(() => {
    let isActive = true

    async function loadProfile() {
      try {
        const session = await resumeSession()
        if (!isActive) {
          return
        }

        const currentMemberId = session.member?.id
        const partner = session.members?.find((member) => member.id !== currentMemberId)

        setProfileName(session.member?.nickname ?? 'Kalian')
        setPartnerName(partner?.nickname ?? 'Belum kebaca')
        setAnniversaryDate(session.anniversaryDate ?? null)
        setStoredSession(getStoredSession())

        try {
          const home = await getHome()
          if (isActive) {
            setDaysTogether(home.daysTogether ?? null)
          }
        } catch (error) {
          if (!(error instanceof ApiError || error instanceof ApiNetworkError)) {
            throw error
          }
        }
      } catch (error) {
        if (!isActive) {
          return
        }

        if (
          error instanceof ApiError ||
          error instanceof ApiNetworkError ||
          error instanceof ApiConfigError
        ) {
          setProfileName('Session perlu dicek')
          return
        }

        throw error
      }
    }

    loadProfile()

    return () => {
      isActive = false
    }
  }, [])

  return {
    anniversaryDate,
    daysTogether,
    partnerName,
    profileName,
    storedSession,
  }
}

export function SettingsPage() {
  const profile = useProfile()

  return (
    <div className="space-y-5">
      <SettingsHeader title="Pengaturan" />

      <ScrapbookCard tape>
        <div className="flex items-start gap-3">
          <HeartHandshake aria-hidden="true" size={24} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">{profile.profileName}</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
              Ruang kecil kalian. Ini info akun dan device yang lagi dipakai.
            </p>
            <DebugRow label="Pasangan" value={profile.partnerName} />
            <DebugRow
              label="Session lokal"
              value={profile.storedSession ? 'Ada di device ini' : 'Belum ada'}
            />
            <DebugRow
              label="memberId"
              value={
                profile.storedSession
                  ? previewMemberId(profile.storedSession.memberId)
                  : '-'
              }
            />
            <DebugRow
              label="Tanggal jadian"
              value={
                profile.anniversaryDate
                  ? friendlyDate(profile.anniversaryDate)
                  : 'Belum kebaca'
              }
            />
            <DebugRow
              label="Hari bareng"
              value={
                profile.daysTogether === null
                  ? 'Belum kebaca'
                  : String(profile.daysTogether) + ' hari'
              }
            />
          </div>
        </div>
      </ScrapbookCard>

      <div className="grid gap-3">
        <SettingsMenuCard
          description="Cek koneksi API, Gallery Drive, dan Backup."
          icon={<Wifi aria-hidden="true" size={22} />}
          title="Connection & Health"
          to="/settings/health"
          tone="mint"
        />
        <SettingsMenuCard
          description="API path, schema, Drive folder, dan trigger backup."
          icon={<Settings aria-hidden="true" size={22} />}
          title="App Setup"
          to="/settings/setup"
          tone="blue"
        />
        <SettingsMenuCard
          description="Hapus session lokal atau reset pairing."
          icon={<XCircle aria-hidden="true" size={22} />}
          title="Danger Zone"
          to="/settings/danger"
          tone="pink"
        />
      </div>
    </div>
  )
}

export function SettingsHealthPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>({ kind: 'idle' })
  const [sessionStatus, setSessionStatus] = useState<ApiStatus>({ kind: 'idle' })
  const [galleryStatus, setGalleryStatus] = useState<ApiStatus>({ kind: 'idle' })
  const [backupStatus, setBackupStatus] = useState<ApiStatus>({ kind: 'idle' })
  const [backupHealth, setBackupHealth] = useState<BackupHealthData | null>(null)
  const [backupRecords, setBackupRecords] = useState<readonly BackupRecord[]>([])
  const backupRunLocked = useRef(false)

  async function handleCheckConnection() {
    setApiStatus({ kind: 'checking' })

    try {
      const data = await healthCheck()
      setApiStatus({
        kind: 'success',
        message: data.status === 'ok' ? 'Backend tersambung.' : 'Backend merespons.',
        details: data.service,
      })
    } catch (error) {
      setApiStatus(getApiErrorStatus(error))
    }
  }

  async function handleCheckSession() {
    setSessionStatus({ kind: 'checking' })

    try {
      const data = await resumeSession({ force: true })
      setSessionStatus({
        kind: 'success',
        message: data.member?.nickname
          ? 'Session device valid untuk ' + data.member.nickname + '.'
          : 'Session device valid.',
        details: data.anniversaryDate ? friendlyDate(data.anniversaryDate) : undefined,
      })
    } catch (error) {
      setSessionStatus(getApiErrorStatus(error))
    }
  }

  async function handleCheckGallery() {
    setGalleryStatus({ kind: 'checking' })

    try {
      const data = await checkGalleryHealth()
      setGalleryStatus({
        kind: 'success',
        message: 'Gallery siap dipakai.',
        details: data.galleryFolderName
          ? 'Folder: ' + data.galleryFolderName
          : data.service,
      })
    } catch (error) {
      setGalleryStatus(getApiErrorStatus(error))
    }
  }

  async function handleCheckBackup() {
    setBackupStatus({ kind: 'checking' })

    try {
      const [health, backups] = await Promise.all([
        checkBackupHealth(),
        listBackups(),
      ])

      setBackupRecords(backups.items)
      setBackupHealth(health)
      setBackupStatus({
        kind: 'success',
        message: 'Backup siap dipakai.',
        details: health.latestBackup?.createdAt
          ? 'Backup terakhir: ' + friendlyDateTime(health.latestBackup.createdAt)
          : health.backupFolderName
            ? 'Folder: ' + health.backupFolderName
            : health.service,
      })
    } catch (error) {
      setBackupStatus(getApiErrorStatus(error))
    }
  }

  async function handleRunBackupNow() {
    if (backupRunLocked.current) {
      return
    }

    backupRunLocked.current = true
    setBackupStatus({ kind: 'checking' })

    try {
      const data = await runBackupNow()
      const [health, backups] = await Promise.all([
        checkBackupHealth(),
        listBackups(),
      ])

      setBackupHealth(health)
      setBackupRecords(backups.items)
      setBackupStatus({
        kind: 'success',
        message: 'Backup selesai.',
        details: data.backup?.message,
      })
      toast.success('Backup selesai.')
    } catch (error) {
      const status = getApiErrorStatus(error)
      setBackupStatus(status)
      toast.error('Backup belum bisa jalan.', { description: status.message })
    } finally {
      backupRunLocked.current = false
    }
  }

  return (
    <div className="space-y-5">
      <SettingsHeader back title="Connection & Health" />

      <HealthCard
        description="Tes endpoint Apps Script lewat proxy."
        icon={<Wifi aria-hidden="true" size={24} />}
        isChecking={apiStatus.kind === 'checking'}
        onClick={handleCheckConnection}
        status={apiStatus}
        title="Koneksi"
      />
      <HealthCard
        description="Cek apakah device ini masih punya akses valid."
        icon={<UserRound aria-hidden="true" size={24} />}
        isChecking={sessionStatus.kind === 'checking'}
        onClick={handleCheckSession}
        status={sessionStatus}
        title="Session device"
        tone="blue"
      />
      <HealthCard
        description="Cek property Drive dan folder gallery tanpa upload foto."
        icon={<Images aria-hidden="true" size={24} />}
        isChecking={galleryStatus.kind === 'checking'}
        onClick={handleCheckGallery}
        status={galleryStatus}
        title="Penyimpanan foto"
        tone="lavender"
      />
      <ScrapbookCard tone="blue">
        <div className="flex items-start gap-3">
          <Database aria-hidden="true" size={24} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">Backup otomatis</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
              Cek folder backups dan data backup terakhir.
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                disabled={backupStatus.kind === 'checking'}
                onClick={handleCheckBackup}
                variant="secondary"
              >
                {backupStatus.kind === 'checking' ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
                ) : (
                  <Database aria-hidden="true" size={18} />
                )}
                Cek Backup
              </Button>
              <Button
                disabled={backupStatus.kind === 'checking'}
                onClick={handleRunBackupNow}
                variant="outline"
              >
                {backupStatus.kind === 'checking' ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
                ) : (
                  <Database aria-hidden="true" size={18} />
                )}
                Backup sekarang
              </Button>
            </div>
            {backupStatus.kind === 'success' ? (
              <StatusMessage status={backupStatus} />
            ) : null}
            {backupStatus.kind === 'error' ? (
              <StatusMessage status={backupStatus} />
            ) : null}
            {backupHealth ? (
              <div className="mt-3 grid gap-2">
                <DebugRow
                  label="Drive root"
                  value={
                    backupHealth.driveRootFolderConfigured
                      ? 'Sudah dikonfigurasi'
                      : 'Belum dikonfigurasi'
                  }
                />
                <DebugRow
                  label="Folder backups"
                  value={
                    backupHealth.backupsFolderAccessible
                      ? 'Bisa diakses'
                      : 'Belum bisa diakses'
                  }
                />
                <DebugRow
                  label="Backup terakhir"
                  value={
                    backupHealth.latestBackup
                      ? backupHealth.latestBackup.status +
                        ' - ' +
                        friendlyDateTime(backupHealth.latestBackup.createdAt)
                      : 'Belum ada backup'
                  }
                />
              </div>
            ) : null}
            {backupRecords.length > 0 ? (
              <div className="mt-3 grid gap-2">
                <p className="text-xs font-black uppercase tracking-[0.04em] text-muted-foreground">
                  5 backup terakhir
                </p>
                {backupRecords.slice(0, 5).map((backup) => (
                  <div
                    className="rounded-2xl bg-card px-3 py-2 text-xs font-extrabold text-muted-foreground"
                    key={backup.id}
                  >
                    <p>
                      <span
                        className={
                          backup.status === 'success'
                            ? 'text-foreground'
                            : 'text-destructive'
                        }
                      >
                        {backup.status}:{' '}
                      </span>
                      {friendlyDateTime(backup.createdAt)}
                    </p>
                    <p className="mt-1 break-words">{backup.message}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </ScrapbookCard>
    </div>
  )
}

export function SettingsSetupPage() {
  return (
    <div className="space-y-5">
      <SettingsHeader back title="App Setup" />

      <ScrapbookCard tone="blue">
        <div className="flex items-start gap-3">
          <Settings aria-hidden="true" size={24} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">Konfigurasi app</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
              Frontend harus selalu lewat proxy lokal, bukan Apps Script langsung.
            </p>
            <DebugRow
              label="VITE_API_URL"
              value={appConfig.apiUrl === '' ? 'API belum di-set' : appConfig.apiUrl}
            />
            <p className="mt-3 rounded-2xl bg-card px-3 py-2 text-xs font-extrabold text-muted-foreground">
              APPS_SCRIPT_URL disimpan di env server Vercel/local proxy. Jangan
              taruh URL Apps Script di kode frontend.
            </p>
          </div>
        </div>
      </ScrapbookCard>

      <SetupChecklistCard
        items={[
          'Jalankan setupSchema() setelah schema berubah.',
          'Isi SHEET_ID di Script Properties.',
          'Isi SESSION_SECRET sekali dan jangan regenerate otomatis.',
          'PAIRING_WINDOW_SECONDS boleh tetap 30.',
        ]}
        title="Spreadsheet & session"
        tone="yellow"
      />
      <SetupChecklistCard
        items={[
          'Isi DRIVE_ROOT_FOLDER_ID dengan folder Drive OurSpace.',
          'Pastikan Apps Script sudah authorize Drive.',
          'Redeploy Web App setelah push backend.',
        ]}
        title="Drive & Gallery"
        tone="lavender"
      />
      <SetupChecklistCard
        items={[
          'Jalankan installBackupTrigger() dari Apps Script editor.',
          'Pakai removeBackupTriggers() kalau mau matikan backup otomatis.',
          'Cek hasilnya di halaman Connection & Health.',
        ]}
        title="Backup otomatis"
        tone="mint"
      />
    </div>
  )
}

export function SettingsDangerPage() {
  const navigate = useNavigate()
  const [resetStatus, setResetStatus] = useState<ApiStatus>({ kind: 'idle' })
  const [isClearSessionOpen, setIsClearSessionOpen] = useState(false)
  const [isResetPairingOpen, setIsResetPairingOpen] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')

  function handleClearSession() {
    setIsClearSessionOpen(false)
    clearSession()
    toast.success('Session lokal dihapus.')
    navigate('/pairing', { replace: true })
  }

  async function handleResetPairing() {
    setIsResetPairingOpen(false)
    setResetConfirmation('')
    setResetStatus({ kind: 'checking' })

    try {
      await resetCouple()
      clearSession()
      toast.success('Pairing direset.')
      navigate('/pairing', {
        replace: true,
        state: {
          message: 'Pairing sudah direset. Mulai ulang dari awal ya.',
        },
      })
    } catch (error) {
      const status = getApiErrorStatus(error)
      setResetStatus(status)
      toast.error('Reset pairing gagal.', { description: status.message })
    }
  }

  return (
    <div className="space-y-5">
      <SettingsHeader back title="Danger Zone" />

      <ScrapbookCard tone="pink">
        <div className="flex items-start gap-3">
          <XCircle aria-hidden="true" size={24} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">Session lokal</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
              Pakai kalau device ini mau keluar. Data OurSpace di backend tetap
              aman.
            </p>
            <div className="mt-4 grid gap-2">
              <Button onClick={() => setIsClearSessionOpen(true)} variant="outline">
                <XCircle aria-hidden="true" size={18} />
                Hapus session lokal
              </Button>
            </div>
          </div>
        </div>
      </ScrapbookCard>

      <ScrapbookCard tone="pink">
        <div className="flex items-start gap-3">
          <XCircle aria-hidden="true" size={24} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-black">Reset pairing</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
              Ini bukan buat login ulang. Kalau session gagal, pakai recovery.
              Reset hanya kalau benar-benar mau mulai ulang tanggal jadian.
            </p>
            <div className="mt-4 grid gap-2">
              <Button
                disabled={resetStatus.kind === 'checking'}
                onClick={() => setIsResetPairingOpen(true)}
                variant="destructive"
              >
                {resetStatus.kind === 'checking' ? (
                  <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
                ) : (
                  <XCircle aria-hidden="true" size={18} />
                )}
                Reset pairing
              </Button>
            </div>
            {resetStatus.kind === 'error' ? (
              <StatusMessage status={resetStatus} />
            ) : null}
          </div>
        </div>
      </ScrapbookCard>

      <ConfirmAlertDialog
        confirmLabel="Hapus session"
        description="Device ini akan keluar dan balik ke halaman pairing/recovery. Data OurSpace di backend tidak dihapus."
        isOpen={isClearSessionOpen}
        onCancel={() => setIsClearSessionOpen(false)}
        onConfirm={handleClearSession}
        title="Hapus session lokal?"
      />
      <ConfirmAlertDialog
        confirmDisabled={resetConfirmation !== 'RESET'}
        confirmLabel="Reset pairing"
        description="Tanggal jadian akan dikosongkan, semua session member lama dimatikan, dan OurSpace balik ke flow pairing pertama. Notes, dates, gallery, lists, dan backup tidak dihapus. Ketik RESET untuk lanjut."
        isOpen={isResetPairingOpen}
        onCancel={() => {
          setIsResetPairingOpen(false)
          setResetConfirmation('')
        }}
        onConfirm={handleResetPairing}
        title="Reset pairing OurSpace?"
      >
        <div className="grid gap-2">
          <Label htmlFor="reset-confirmation">Ketik RESET</Label>
          <Input
            autoComplete="off"
            id="reset-confirmation"
            onChange={(event) => setResetConfirmation(event.target.value)}
            placeholder="RESET"
            value={resetConfirmation}
          />
        </div>
      </ConfirmAlertDialog>
    </div>
  )
}

function SettingsHeader({
  back = false,
  title,
}: {
  readonly back?: boolean
  readonly title: string
}) {
  return (
    <header>
      {back ? (
        <Link
          className="text-sm font-extrabold text-muted-foreground"
          to="/settings"
        >
          Kembali ke Settings
        </Link>
      ) : (
        <p className="text-xs font-extrabold uppercase tracking-[0.04em] text-muted-foreground">
          More
        </p>
      )}
      <h1 className="mt-2 text-4xl font-black">{title}</h1>
    </header>
  )
}

function SettingsMenuCard({
  description,
  icon,
  title,
  to,
  tone,
}: {
  readonly description: string
  readonly icon: ReactNode
  readonly title: string
  readonly to: string
  readonly tone: 'blue' | 'mint' | 'pink'
}) {
  return (
    <Link className="block" to={to}>
      <ScrapbookCard tone={tone}>
        <div className="flex items-center gap-3">
          {icon}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <ChevronRight aria-hidden="true" size={20} />
        </div>
      </ScrapbookCard>
    </Link>
  )
}

function SetupChecklistCard({
  items,
  title,
  tone,
}: {
  readonly items: readonly string[]
  readonly title: string
  readonly tone: 'lavender' | 'mint' | 'yellow'
}) {
  return (
    <ScrapbookCard tone={tone}>
      <div className="flex items-start gap-3">
        <Database aria-hidden="true" size={24} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{title}</h2>
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <div
                className="flex items-start gap-2 rounded-2xl bg-card/70 px-3 py-2 text-sm font-extrabold text-muted-foreground"
                key={item}
              >
                <CheckCircle2
                  aria-hidden="true"
                  className="mt-0.5 shrink-0 text-foreground"
                  size={16}
                />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ScrapbookCard>
  )
}

function HealthCard({
  description,
  icon,
  isChecking,
  onClick,
  status,
  title,
  tone = 'mint',
}: {
  readonly description: string
  readonly icon: ReactNode
  readonly isChecking: boolean
  readonly onClick: () => void
  readonly status: ApiStatus
  readonly title: string
  readonly tone?: 'blue' | 'lavender' | 'mint'
}) {
  return (
    <ScrapbookCard tone={tone}>
      <div className="flex items-start gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{title}</h2>
          <p className="mt-1 text-sm font-bold leading-relaxed text-muted-foreground">
            {description}
          </p>
          <Button
            className="mt-4 w-full"
            disabled={isChecking}
            onClick={onClick}
            variant="secondary"
          >
            {isChecking ? (
              <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
            ) : (
              icon
            )}
            Cek
          </Button>
          {status.kind === 'success' ? <StatusMessage status={status} /> : null}
          {status.kind === 'error' ? <StatusMessage status={status} /> : null}
        </div>
      </div>
    </ScrapbookCard>
  )
}

function DebugRow({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="mt-3 flex items-start justify-between gap-3 rounded-2xl bg-card/70 px-3 py-2 text-xs font-extrabold">
      <span className="shrink-0 uppercase tracking-[0.04em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 break-words text-right text-foreground">{value}</span>
    </div>
  )
}

function StatusMessage({ status }: { readonly status: ApiStatus }) {
  if (status.kind === 'success') {
    return (
      <div className="mt-3 rounded-2xl bg-accent-mint/70 px-3 py-2 text-sm font-extrabold text-foreground">
        <div className="flex items-start gap-2">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          <div className="min-w-0">
            <p>{status.message}</p>
            {status.details ? (
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {status.details}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (status.kind === 'error') {
    return (
      <div className="mt-3 rounded-2xl bg-destructive/10 px-3 py-2 text-sm font-extrabold text-destructive">
        <div className="flex items-start gap-2">
          <XCircle aria-hidden="true" className="mt-0.5 shrink-0" size={16} />
          <div className="min-w-0">
            <p>{status.message}</p>
            <p className="mt-1 break-words text-xs">
              {status.code}
              {status.details ? ' - ' + status.details : ''}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
