/* Autobuyunion — service worker KILL-SWITCH (auto-destruction).
 *
 * La PWA est abandonnée : l'ancien service worker servait des assets en cache
 * obsolète (impossible de purger côté utilisateur) et cassait le streaming IA
 * sur iOS Safari.
 *
 * Le navigateur revérifie TOUJOURS /sw.js à chaque navigation (il ne passe pas
 * par le cache du SW pour ce fichier). En livrant cette version, tout navigateur
 * encore contrôlé par l'ancien SW récupère celle-ci, qui :
 *   1. prend le contrôle immédiatement (skipWaiting + claim) ;
 *   2. supprime TOUS les caches ;
 *   3. se désenregistre lui-même ;
 *   4. recharge les onglets ouverts → ils repartent du réseau, code à jour.
 *
 * Aucun handler `fetch` : plus rien n'est servi depuis le cache.
 */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch { /* non bloquant */ }
    try { await self.registration.unregister() } catch { /* non bloquant */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const client of clients) {
        // Recharge l'onglet pour charger les assets frais depuis le réseau.
        client.navigate(client.url)
      }
    } catch { /* non bloquant */ }
  })())
})
