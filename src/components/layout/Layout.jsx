import { useState, useCallback, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useSettings } from '@/contexts/SettingsContext'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'
import CommandPalette from '@/components/ui/CommandPalette'
import { ToastContainer, useToast } from '@/components/ui/Toast'

export default function Layout() {
  const { t } = useSettings()
  const { toast } = useToast()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  useEffect(() => {
    const goOffline = () => { setIsOffline(true);  toast(t('offline_banner'), 'offline', 8000) }
    const goOnline  = () => { setIsOffline(false) }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online',  goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online',  goOnline)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const close = useCallback(() => setSidebarOpen(false), [])
  const toggle = useCallback(() => setSidebarOpen((v) => !v), [])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-navy-900 relative">
      {/* Skip-to-content link for keyboard users (visible on focus only) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50
                   focus:px-3 focus:py-2 focus:bg-cyan-400 focus:text-navy-900
                   focus:font-semibold focus:text-sm focus:rounded-lg focus:shadow-lg"
      >
        {t('skip_to_content')}
      </a>

      {/* Subtle background gradient */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(80,229,229,0.04) 0%, transparent 70%)' }} />
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={close} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuToggle={toggle} />
        <main
          id="main-content"
          tabIndex={-1}
          className="layout-scroll-main flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6 lg:p-8 flex flex-col"
        >
          <Outlet />
        </main>
      </div>

      {/* Bottom nav mobile uniquement */}
      <BottomNav />

      {/* Palette de commandes (Ctrl/Cmd+K ou « / ») */}
      <CommandPalette />

      {/* Offline banner */}
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 py-2 px-4
                        bg-warn/15 border-b border-warn/30 text-xs font-semibold text-warn">
          <span className="w-1.5 h-1.5 rounded-full bg-warn animate-pulse flex-shrink-0" />
          {t('offline_banner')}
        </div>
      )}

      <ToastContainer />
    </div>
  )
}
