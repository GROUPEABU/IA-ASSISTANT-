import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import Hub from '@/pages/Hub'
import Products from '@/pages/Products'
import ProductDetail from '@/pages/ProductDetail'
import CO2Malus from '@/pages/CO2Malus'
import Chat from '@/pages/Chat'
import Settings from '@/pages/Settings'
import PriceWatch from '@/pages/PriceWatch'
import Objections from '@/pages/Objections'
import Compare from '@/pages/Compare'

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
          <Route path="chat" element={<Chat />} />
          <Route path="price-watch" element={<PriceWatch />} />
          <Route path="objections" element={<Objections />} />
          <Route path="compare" element={<Compare />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
