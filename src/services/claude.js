const SYSTEM_PROMPT = `Tu es un assistant IA expert en analyse des ventes automobiles pour Autobuyunion,
le premier groupement européen d'achat automobile. Tu aides les équipes commerciales à analyser
leurs données de ventes, identifier des tendances, comparer des performances régionales,
et générer des insights actionnables. Réponds toujours en français, de façon précise et professionnelle.
Formate tes réponses avec des listes et chiffres quand c'est pertinent.`

export async function sendMessage(messages) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('Clé API Anthropic manquante. Configurez VITE_ANTHROPIC_API_KEY dans votre fichier .env')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages.map(({ role, content }) => ({ role, content })),
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message ?? `Erreur API: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}
