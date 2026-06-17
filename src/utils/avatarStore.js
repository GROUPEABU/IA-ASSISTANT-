import { ukey } from './userStorage'
import { cloudGet, cloudPut } from './cloudStore'

const CLOUD_KEY = 'avatar'
const LOCAL_KEY = 'avatar'
const MAX_PX = 128  // carré max pour le stockage
const QUALITY = 0.75

/** Redimensionne et encode un File en data URL JPEG (max 128x128). */
export function resizeToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', QUALITY))
    }
    img.onerror = reject
    img.src = url
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

/** Récupère la photo du compte depuis le serveur et la met en cache local. */
export async function syncAvatar(uid) {
  if (uid == null) return
  const remote = await cloudGet(CLOUD_KEY)
  if (remote === undefined || remote === null) return
  const local = getAvatar(uid)
  if (!local && typeof remote === 'string') {
    localStorage.setItem(ukey(uid, LOCAL_KEY), remote)
    window.dispatchEvent(new Event('abu:avatar'))
  }
}
