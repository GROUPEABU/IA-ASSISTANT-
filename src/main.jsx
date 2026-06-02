import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installGlobalErrorReporting } from '@/utils/reportError'

// Capture les erreurs non gérées (hors arbre React) + promesses rejetées.
installGlobalErrorReporting()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA : chargement instantané en visite répétée + outils non-IA hors-ligne.
// Enregistré en production uniquement (évite d'interférer avec le HMR de dev).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* non bloquant */ })
  })
}
