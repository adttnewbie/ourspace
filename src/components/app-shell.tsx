import {
  CalendarHeart,
  Home,
  Images,
  MoreHorizontal,
  NotebookText,
} from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Notes', to: '/notes', icon: NotebookText },
  { label: 'Gallery', to: '/gallery', icon: Images },
  { label: 'Dates', to: '/dates', icon: CalendarHeart },
  { label: 'More', to: '/settings', icon: MoreHorizontal },
] as const

export function AppShell() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-hidden border-x bg-background shadow-[0_24px_80px_rgb(103_74_58_/_0.14)]">
        <main className="flex-1 px-4 pb-32 pt-5 sm:px-5">
          <Outlet />
        </main>
        <nav
          aria-label="Navigasi utama"
          className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-x border-t bg-card/95 px-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_40px_rgb(103_74_58_/_0.14)] backdrop-blur"
        >
          <div className="grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  className={({ isActive }) =>
                    cn(
                      'flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-muted-foreground transition-[background-color,color,transform] duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.98]',
                      isActive && 'bg-scrap-yellow text-foreground',
                    )
                  }
                  end={item.to === '/'}
                  key={item.label}
                  to={item.to}
                >
                  <Icon aria-hidden="true" size={20} strokeWidth={2.2} />
                  <span className="text-[11px] font-extrabold">
                    {item.label}
                  </span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
