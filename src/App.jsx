import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { getSessionUserId } from '@/utils/userStorage'

// Apply saved theme immediately (before first render), using user-scoped key
;(() => {
  try {
    const uid = getSessionUserId()
    const key = uid != null ? `abu_u${uid}_theme` : 'theme'
    const saved = localStorage.getItem(key) || 'dark'
    if (saved === 'light') {
      document.documentElement.classList.add('light')
    } else if (saved === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('light')
    }
  } catch {}
})()

import Layout from '@/components/layout/Layout'
import CookieBanner from '@/components/ui/CookieBanner'
import ErrorBoundary from '@/components/ErrorBoundary'

// Auth pages (public — kept eager for fast login)
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'

// Legal pages (public)
import MentionsLegales from '@/pages/MentionsLegales'
import PolitiqueConfidentialite from '@/pages/PolitiqueConfidentialite'
import ConditionsUtilisation from '@/pages/ConditionsUtilisation'

// Protected pages — lazy loaded to reduce initial bundle
const Hub            = lazy(() => import('@/pages/Hub'))
const Products       = lazy(() => import('@/pages/Products'))
const ProductDetail  = lazy(() => import('@/pages/ProductDetail'))
const CO2Malus       = lazy(() => import('@/pages/CO2Malus'))
const Chat           = lazy(() => import('@/pages/Chat'))
const Settings       = lazy(() => import('@/pages/Settings'))
const PriceWatch     = lazy(() => import('@/pages/PriceWatch'))
const Objections     = lazy(() => import('@/pages/Objections'))
const PitchGenerator = lazy(() => import('@/pages/PitchGenerator'))
const Tco            = lazy(() => import('@/pages/Tco'))
const Compare        = lazy(() => import('@/pages/Compare'))

function S({ children }) {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-navy-700 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    }>
      {children}
    </Suspense>
  )
}

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login"           element={isAuthenticated ? <Navigate to="/hub" replace /> : <Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />

        {/* Public legal routes */}
        <Route path="/mentions-legales"           element={<MentionsLegales />} />
        <Route path="/politique-confidentialite"  element={<PolitiqueConfidentialite />} />
        <Route path="/conditions-utilisation"     element={<ConditionsUtilisation />} />

        {/* Protected app routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/hub" replace />} />
          <Route path="hub"          element={<S><Hub /></S>} />
          <Route path="products"     element={<S><Products /></S>} />
          <Route path="products/:id" element={<S><ProductDetail /></S>} />
          <Route path="co2-malus"    element={<S><CO2Malus /></S>} />
          <Route path="chat"         element={<S><Chat /></S>} />
          <Route path="price-watch"  element={<S><PriceWatch /></S>} />
          <Route path="objections"   element={<S><Objections /></S>} />
          <Route path="pitch"        element={<S><PitchGenerator /></S>} />
          <Route path="tco"          element={<S><Tco /></S>} />
          <Route path="compare"      element={<S><Compare /></S>} />
          <Route path="settings"     element={<S><Settings /></S>} />
        </Route>

        <Route path="*" element={<Navigate to="/hub" replace />} />
      </Routes>

      <CookieBanner />
    </>
  )
}

function SettingsShell({ children }) {
  const { user } = useAuth()
  return (
    <SettingsProvider userId={user?.id ?? null}>
      {children}
    </SettingsProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsShell>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </SettingsShell>
      </AuthProvider>
    </ErrorBoundary>
  )
}
