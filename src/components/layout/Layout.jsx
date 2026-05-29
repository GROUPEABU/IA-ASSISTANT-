import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { useSettings } from '@/contexts/SettingsContext'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  const { t } = useSettings()
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
    </div>
  )
}
