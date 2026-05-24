import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import Layout from '@/components/layout/Layout'
import Login from '@/pages/Login'
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
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/hub" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/hub" replace />} />
        <Route path="hub" element={<Hub />} />
        <Route path="products" element={<Products />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="co2-malus" element={<CO2Malus />} />
        <Route path="chat" element={<Chat />} />
        <Route path="price-watch" element={<PriceWatch />} />
        <Route path="objections" element={<Objections />} />
        <Route path="pitch" element={<PitchGenerator />} />
        <Route path="tco" element={<Tco />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/hub" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
