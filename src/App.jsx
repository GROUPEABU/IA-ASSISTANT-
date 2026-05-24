import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Hub from '@/pages/Hub'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import CO2Malus from '@/pages/CO2Malus'
import Dashboard from '@/pages/Dashboard'
import Chat from '@/pages/Chat'
import Reports from '@/pages/Reports'
import Settings from '@/pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/hub" replace />} />
          <Route path="hub" element={<Hub />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="co2-malus" element={<CO2Malus />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="chat" element={<Chat />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
