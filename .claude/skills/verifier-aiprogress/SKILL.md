---
name: verifier-aiprogress
description: Vérifie que la barre ET l'anneau du composant AIProgress suivent réellement le pourcentage (pas de gel). À lancer après toute modification de src/components/ui/AIProgress.jsx ou d'une page qui l'utilise (Veille Prix, Objections, Pitch, Comparateur).
---

# Vérificateur AIProgress

## Pourquoi

La barre linéaire **et** l'arc circulaire d'`AIProgress` ont régressé plusieurs
fois : le visuel se figeait alors que le numéro (%) montait correctement.

**Cause racine** : une transition CSS (`transition-[width]` sur la barre,
`transition: stroke-dashoffset` sur l'arc) redémarre à chaque frame de la boucle
`requestAnimationFrame` qui réécrit la valeur (~16 ms) et n'aboutit jamais → le
rendu reste gelé sur sa valeur initiale.

Ce bug ne se voit **que sur le build de production** dans une vraie page — pas en
dev, pas dans un harnais isolé. Le vérificateur reproduit donc ces conditions.

## Lancer

```bash
npm run verify:aiprogress
```

Cette commande : build de prod → `vite preview` → pilote les pages Objections et
Pitch avec l'API IA mockée (chargement figé) → mesure au pixel :

- le **numéro** affiché (état direct, référence)
- l'**arc** du cercle (via `stroke-dashoffset` rendu)
- la **barre** (largeur rendue / largeur de la piste)

Sortie attendue (succès, exit 0) :

```
✅ Objections   6%(arc6/bar6) 12%(arc12/bar12) ...
✅ Pitch        9%(arc9/bar9) 18%(arc18/bar18) ...
✅ OK : barre et anneau synchronisés sur toutes les pages.
```

## Échec (exit 1)

Le script échoue si, sur une page :

- l'**arc** ou la **barre** est **figé** (même valeur sur tous les échantillons) ;
- l'écart |numéro − arc| ou |numéro − barre| dépasse 4 points ;
- une **transition CSS active** (durée > 0) porte sur `width` ou
  `stroke-dashoffset` — c'est la cause racine du gel, interdite par garde-fou.

## Règle de conception (NE PAS casser)

Dans `AIProgress.jsx`, **aucune transition CSS** ne doit porter sur `width`
(barre) ni `stroke-dashoffset` (arc). La boucle `requestAnimationFrame` fournit
déjà un mouvement fluide image par image ; une transition la fige.
