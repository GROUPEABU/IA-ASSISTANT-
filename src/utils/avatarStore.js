import { ukey } from './userStorage'
import { cloudGet, cloudPut } from './cloudStore'

const CLOUD_KEY = 'avatar'
const LOCAL_KEY = 'avatar'
const MAX_PX = 128  // carré max pour le stockage
const QUALITY = 0.75

/**
 * Redimensionne et encode un File en data URL JPEG (max 128×128).
 * On passe par FileReader (URL `data:`) plutôt que URL.createObjectURL (`blob:`)
 * car la Content Security Policy du site autorise `data:` mais pas `blob:` en
 * img-src — un blob bloquerait silencieusement le chargement de l'image.
 */
export function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', QUALITY))
      }
      img.onerror = reject
      img.src = reader.result // data: URL — autorisée par la CSP
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getAvatar(uid) {
  if (uid == null) return null
  return localStorage.getItem(ukey(uid, LOCAL_KEY)) || null
}

export function saveAvatar(uid, dataUrl) {
  if (uid == null) return
  localStorage.setItem(ukey(uid, LOCAL_KEY), dataUrl)
  cloudPut(CLOUD_KEY, dataUrl)
  window.dispatchEvent(new Event('abu:avatar'))
}

export function removeAvatar(uid) {
  if (uid == null) return
  localStorage.removeItem(ukey(uid, LOCAL_KEY))
  cloudPut(CLOUD_KEY, null)
  window.dispatchEvent(new Event('abu:avatar'))
}

/**
 * Aligne la photo locale sur celle du compte (serveur, source de vérité partagée).
 * - remote string  → on met en cache local.
 * - remote null    → le compte n'a pas de photo : on efface le cache local
 *   (propagation de suppression → les initiales reviennent par défaut).
 * - remote undefined → synchro indisponible : on ne touche à rien.
 */
export async function syncAvatar(uid) {
  if (uid == null) return
  const remote = await cloudGet(CLOUD_KEY)
  if (remote === undefined) return // synchro inactive — on garde le local
  const local = getAvatar(uid)
  if (typeof remote === 'string' && remote) {
    if (local !== remote) {
      localStorage.setItem(ukey(uid, LOCAL_KEY), remote)
      window.dispatchEvent(new Event('abu:avatar'))
    }
  } else if (local) {
    // Pas de photo sur le compte → on retire la copie locale obsolète.
    localStorage.removeItem(ukey(uid, LOCAL_KEY))
    window.dispatchEvent(new Event('abu:avatar'))
  }
}
