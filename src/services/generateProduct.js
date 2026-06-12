import { sendMessage } from './claude'
import { veillePrixRefBlock } from '@/utils/veillePrix'

// Le prompt système (STATIC_FICHEAI) est construit côté serveur dans
// api/chat.js via systemStaticKey 'ficheIA' — jamais embarqué dans le bundle.

export async function generateProductFromWeb(query, details = '') {
  const prompt = `L'utilisateur demande une fiche produit pour : "${query}"
${details ? `Précisions à RESPECTER STRICTEMENT (motorisation, finition, carrosserie, millésime, kilométrage) : ${details}.` : ''}${veillePrixRefBlock(query)}`

  const raw = await sendMessage([{ role: 'user', content: prompt }], {
    maxTokens: 6000, expert: true, temperature: 0.25,
    tool: 'ficheIA', stream: true,
    systemStaticKey: 'ficheIA',
    webSearch: true, maxSearches: 3,
  })

  // Extraire le JSON de la réponse
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Impossible de parser la réponse IA. Réessayez.')

  const product = JSON.parse(match[0])

  // Validation basique
  if (!product.brand || !product.specs?.co2_wltp || !product.prix?.base) {
    throw new Error('Données incomplètes générées. Réessayez avec un nom de véhicule plus précis.')
  }

  // S'assurer que les types sont corrects
  product.specs.co2_wltp = Number(product.specs.co2_wltp)
  product.prix.base = Number(product.prix.base)
  product.prix.haut = Number(product.prix.haut)
  product._generated = true
  product._generatedAt = new Date().toISOString()

  return product
}
