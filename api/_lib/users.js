// Registre des comptes — source unique partagée par api/login.js et
// api/team-usage.js. Le dossier `_lib` n'est PAS exposé comme route par Vercel.
//
// Surchargé par la variable d'environnement AUTH_USERS (JSON, même schéma) pour
// ajouter/modifier des comptes sans redéployer le code. Hash de mot de passe =
// SHA-256("abu_v1:" + motDePasse).

const DEFAULT_USERS = [
  { id: 1, username: 'hubert.saget@aafgroup.eu', passwordHash: 'ed74e595563f0f76da37eebc8eeb20afb8fac7ee82d8e550104392fe975d4dcb', name: 'HUBERT SAGET', role: 'admin',  initials: 'HS' },
  { id: 3, username: 'demo@autobuyunion.eu',     passwordHash: '092c365fd32a2be2ef2631fafc3a8df0e75aaafbc1b87f69480abc170f8816e8', name: 'Compte Démo',  role: 'membre', initials: 'DM' },
  { id: 4, username: 'pascal.lopez@aafgroup.eu',     passwordHash: 'df36b23ebcf05dbadaf0e53e951d33c09facecb6caf8ed6d5e3d25b9664dd64f', name: 'PASCAL LOPEZ',     role: 'membre', initials: 'PL' },
  { id: 5, username: 'olivier.amengual@aafgroup.eu', passwordHash: 'bb96d19f4b23599db74c46ab9dd6183e5a0a40b1a8d39f7fcef872bf99577cf7', name: 'OLIVIER AMENGUAL', role: 'membre', initials: 'OA' },
]

/** Registre complet (avec passwordHash). À n'utiliser que côté serveur. */
export function getUsers() {
  try {
    const raw = process.env.AUTH_USERS
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) return parsed
    }
  } catch { /* JSON invalide → registre par défaut */ }
  return DEFAULT_USERS
}

/** Liste publique des comptes (sans secret) — pour la vue admin d'utilisation. */
export function getPublicUsers() {
  return getUsers().map(({ passwordHash: _ph, expiresAt, ...safe }) => ({
    ...safe,
    expiresAt: expiresAt ?? null,
  }))
}
