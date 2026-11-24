# Tactico ⚽

Jeu de manager de football gratuit, dans le navigateur, avec un **classement mondial** en ligne.

👉 **Jouer : https://tactico123.netlify.app**

- **Monde réel 2026-27** : les 10 championnats des 5 grands pays avec leurs vrais clubs (20 en Premier League, 24 en Championship, 22 en LaLiga 2…) et les vrais effectifs des premières divisions (mercato de l'été 2026 compris)
- Ou **monde fictif** : 180 clubs et plus de 5 000 joueurs inventés
- Montées, descentes et barrages, coupes nationales, Coupe d'Europe (16 clubs)
- Matchs en direct sur un terrain 2D animé : passes, centres, tirs, plongeons du gardien, coups de pied arrêtés, célébrations, VAR ; commentaires, stats, remplacements, causerie de mi-temps
- Interface façon jeu de gestion : maillots sur le terrain, couleurs de ton club, fiche joueur avec radar et carte des postes
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
node tests/realdata.mjs  # vérifie les données du monde réel
node tests/sim.mjs 3     # simule 3 saisons complètes (monde réel ; « 3 777 fictif » pour le monde fictif)
node tests/engine.mjs    # calibrage du moteur de match
node tests/fn.mjs        # teste l'API du classement mondial (Netlify Blobs local)
```

## Hébergement

Le site est hébergé sur Netlify (build : `npm run build`, dossier publié : `dist`).
Le classement mondial est une fonction Netlify (`netlify/functions/leaderboard`) qui stocke les scores dans Netlify Blobs.

## Avertissement

Tactico est un jeu non officiel, sans lien avec les clubs, les ligues ou les joueurs cités. Aucun logo officiel n'est utilisé : les écussons sont génériques, aux couleurs des clubs. Les effectifs et les notes sont indicatifs.
