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

// PWA DÉSACTIVÉE (non souhaitée). De plus, sur iOS Safari un service worker
// enregistré casse fréquemment les requêtes en streaming (erreur « Load failed »)
// et servait des assets en cache obsolète. On désenregistre donc tout SW existant
// et on purge ses caches au chargement — nettoyage des installations passées.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations?.()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => { /* non bloquant */ })
  if (typeof caches !== 'undefined' && caches.keys) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
  }
}
