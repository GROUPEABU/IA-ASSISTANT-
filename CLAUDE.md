# IA-ASSISTANT — Autobuyunion

## Stack
React 18 + Vite + Tailwind CSS + React Router. Branch: `claude/autobuyunion-sales-assistant-mfTUL`.

## Deploy
```
git add <files> && git commit -m "..." && git push -u origin claude/autobuyunion-sales-assistant-mfTUL
curl -s -X POST "https://api.vercel.com/v1/integrations/deploy/prj_YP8dvXcN80m2sZSXoUREuk1E2tQj/TvF3agsGQe"
```

## Mandatory verification before every commit

**Run `npm run build` and confirm `✓ built` before committing or reporting the task done.**
If the build fails, fix all errors before proceeding. Never skip this step.

## Pre-commit hook (auto-enforced)
A git pre-commit hook runs `npm run build` automatically. Any commit with a broken build is rejected.

## Rules
- Never mention Claude, Anthropic, or AI model names in the UI, commits, or PR descriptions
- Never push to any branch other than `claude/autobuyunion-sales-assistant-mfTUL`
- Never create a PR unless the user explicitly asks
- Per-user localStorage keys use the `abu_u{userId}_{key}` prefix via `ukey()` helper
- i18n: only `fr.js` and `en.js` are shown in the UI selector (de/es/it files exist but are hidden)
- Default AI model: `performance` (Sonnet) — never change this default
- After every change: build → commit → push → curl deploy hook
