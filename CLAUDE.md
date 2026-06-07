# IA-ASSISTANT — Autobuyunion

## Stack
React 18 + Vite + Tailwind CSS + React Router. Branch: `claude/autobuyunion-sales-assistant-mfTUL`.

## Deploy
```
git add <files> && git commit -m "..." && git push -u origin claude/autobuyunion-sales-assistant-mfTUL
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_YP8dvXcN80m2sZSXoUREuk1E2tQj/TvF3agsGQe"
```

## ABUVERIF — vérificateur obligatoire avant chaque commit

**Toujours exécuter `npm run build` et confirmer `✓ built` avant de commiter ou de reporter une tâche terminée.**
Si le build échoue, corriger toutes les erreurs avant de continuer. Ne jamais ignorer cette étape.

## Hook git pre-commit ABUVERIF (auto-appliqué)
Le hook ABUVERIF lance `npm run build` automatiquement. Tout commit avec un build cassé est rejeté.

## VERROUILLÉ — Prompt Veille Prix (NE PAS MODIFIER)
La fonction `buildPrompt` de `src/pages/PriceWatch.jsx` (méthodologie, garde-fous, format de sortie) et son appel `sendMessage` (modèle Sonnet via `tool: 'veilleprix'`, `temperature: 0`, `maxSearches: 3`, `maxTokens: 4500`) sont **figés et validés**.
**AUCUNE modification automatique sur ce sujet.** Avant toute modification touchant la Veille Prix — même mineure, même découlant d'un brief plus large portant sur d'autres outils — DEMANDER SYSTÉMATIQUEMENT et explicitement la validation de l'utilisateur via une question, et attendre sa confirmation avant d'agir. Ne jamais présumer l'accord.

## Rules
- Never mention Claude, Anthropic, or AI model names in the UI, commits, or PR descriptions
- Never push to any branch other than `claude/autobuyunion-sales-assistant-mfTUL`
- Never create a PR unless the user explicitly asks
- Per-user localStorage keys use the `abu_u{userId}_{key}` prefix via `ukey()` helper
- i18n: only `fr.js` and `en.js` are shown in the UI selector (de/es/it files exist but are hidden)
- Default AI model: `performance` (Sonnet) — never change this default
- After every change: build → commit → push → curl deploy hook
