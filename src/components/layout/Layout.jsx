import { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import BottomNav from './BottomNav'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const close = useCallback(() => setSidebarOpen(false), [])
  const toggle = useCallback(() => setSidebarOpen((v) => !v), [])

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-navy-900">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={close}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={close} />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header onMenuToggle={toggle} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6 flex flex-col">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav mobile uniquement */}
      <BottomNav />
    </div>
  )
}
