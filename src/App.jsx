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

// Auth pages (public)
import Login from '@/pages/Login'
import ForgotPassword from '@/pages/ForgotPassword'
import ResetPassword from '@/pages/ResetPassword'

// Legal pages (public)
import MentionsLegales from '@/pages/MentionsLegales'
import PolitiqueConfidentialite from '@/pages/PolitiqueConfidentialite'
import ConditionsUtilisation from '@/pages/ConditionsUtilisation'

// Protected pages
import Hub from '@/pages/Hub'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import CO2Malus from '@/pages/CO2Malus'
import Chat from '@/pages/Chat'
import Settings from '@/pages/Settings'
import PriceWatch from '@/pages/PriceWatch'
import Objections from '@/pages/Objections'
import PitchGenerator from '@/pages/PitchGenerator'
import Tco from '@/pages/Tco'

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
          <Route path="hub"          element={<Hub />} />
          <Route path="products"     element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="co2-malus"    element={<CO2Malus />} />
          <Route path="chat"         element={<Chat />} />
          <Route path="price-watch"  element={<PriceWatch />} />
          <Route path="objections"   element={<Objections />} />
          <Route path="pitch"        element={<PitchGenerator />} />
          <Route path="tco"          element={<Tco />} />
          <Route path="settings"     element={<Settings />} />
        </Route>

        <Route path="*" element={<Navigate to="/hub" replace />} />
      </Routes>

      <CookieBanner />
    </>
  )
}

/**
 * Bridge: reads the authenticated user from AuthContext and passes
 * their ID down to SettingsProvider so prefs are scoped per user.
 */
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
