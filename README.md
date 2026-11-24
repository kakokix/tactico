# Tactico ⚽

Jeu de manager de football gratuit, dans le navigateur, avec un **classement mondial** en ligne.

👉 **Jouer : https://tactico123.netlify.app**

- 5 pays (France, Angleterre, Espagne, Italie, Allemagne), 2 divisions chacun, 180 clubs et plus de 5 000 joueurs **fictifs**
- Montées et descentes, coupes nationales, Coupe des Étoiles (coupe continentale)
- Matchs en direct sur un terrain 2D (commentaires, stats, remplacements, causerie de mi-temps) ou en résultat rapide
- 9 formations, consignes (mentalité, pressing, style, largeur, ligne défensive)
- Mercato : offres, contrats, prêts, joueurs libres, offres de l'IA
- Entraînement, centre de formation, finances, stade, infrastructures
- Objectifs du président, licenciements, offres d'emploi, carrière d'entraîneur
- Classement mondial : score calculé avec les victoires, les trophées et les objectifs atteints

## Lancer en local

```sh
npm install
npm run build        # crée dist/index.html (un seul fichier)
npx serve dist       # ou n'importe quel serveur statique
```

## Tests

```sh
node tests/sim.mjs 3     # simule 3 saisons complètes
node tests/engine.mjs    # calibrage du moteur de match
node tests/fn.mjs        # teste l'API du classement mondial (Netlify Blobs local)
```

## Hébergement

Le site est hébergé sur Netlify (build : `npm run build`, dossier publié : `dist`).
Le classement mondial est une fonction Netlify (`netlify/functions/leaderboard`) qui stocke les scores dans Netlify Blobs.
