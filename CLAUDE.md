# Tactico : notes pour Claude

Jeu de manager de foot en JavaScript pur (sans framework), en français. L'utilisateur (kakokix) écrit en français et on le tutoie.

## Architecture
- `src/core/` : logique du jeu, sans DOM (testable avec Node).
  - `worldgen.js` génère le monde : `generateRealWorld` (vrais clubs 2026-27, mode par défaut) ou `generateWorld` (monde fictif). `constants.js` : attributs (1-20), postes, formations, pays fictifs ; `applyWorld(state)` remplace la liste des pays selon le monde de la partie.
  - `match.js` : moteur minute par minute (`MatchSim`). Calibré : environ 2,7 buts par match, 47 % de victoires à domicile, note moyenne des joueurs 6,7, meilleurs buteurs entre 25 et 40 buts. Chaque minute produit des `phases` (pour l'animation) ; la VAR vérifie environ 5 % des buts.
  - `game.js` : boucle de jeu (`continueGame`, `advanceDay`, `applyMatchResult`), semaine, mois, directeur sportif.
  - `season.js` : fin de saison (récompenses, montées, descentes et barrages, contrats, retraites, nouvelle saison).
  - `transfers.js`, `finance.js`, `board.js` (président, emplois), `competitions.js` (calendriers de 34 à 46 journées), `save.js` (IndexedDB).
  - `score.js` : score du classement mondial, **partagé avec la fonction Netlify**.
- `src/data/real/` : un fichier par pays (`fr.js`, `en.js`, `es.js`, `it.js`, `de.js`). Ligne de club `nom|court|abr|couleur1|couleur2|stade|capacité|réputation|ville|niveau`, puis une ligne par joueur `nom|poste|note|âge|nationalité|postes secondaires|potentiel` (`*` = nom d'usage, `_` = séparation prénom/nom). Les joueurs manquants sont générés. Vérifier avec `node tests/realdata.mjs`.
- `src/ui/` : interface (chaînes HTML + délégation d'événements `data-a`, `data-ch`, `data-in`). `app.js` : coquille, modales, `register()`, couleurs du club. `anim.js` : animation 2D du match en direct (passes, tirs, plongeons, coups de pied arrêtés, célébrations, VAR).
- `netlify/functions/leaderboard/` : API `/api/leaderboard` (GET classement, POST score) avec Netlify Blobs. `core.mjs` contient la validation.
- `build.mjs` : regroupe tout dans un seul `dist/index.html`.

## Règles
- Monde réel : vrais noms de clubs, de joueurs, de championnats et de stades (choix de l'utilisateur, prévenu des questions de droits). Jamais de vrai logo : écussons génériques aux couleurs du club. Entraîneurs fictifs. Jamais de fausse citation attribuée à un vrai joueur (messages en style indirect). L'avertissement « jeu non officiel » reste sur l'écran titre et en pied de page.
- Le monde fictif reste disponible (choix à la création de carrière) et les anciennes sauvegardes fictives doivent continuer à fonctionner.
- Toute valeur affichée passe par `esc()`.
- Après une modification : `node build.mjs`, `node tests/realdata.mjs`, `node tests/sim.mjs 2` (monde réel ; ajouter `777 fictif` pour le monde fictif), `node tests/engine.mjs`, puis test navigateur (`python3 tests/ui.py`, `python3 tests/ui_live.py` pour le match en direct, avec `python3 -m http.server 8765 --directory dist`).

## Mise en ligne
- Site public : https://tactico123.netlify.app (projet Netlify `tactico123`, id `9cd0f0a1-6b0c-4f67-929a-6d18aba6e205`, relié à GitHub `kakokix/tactico`).
- `git push origin main` : Netlify reconstruit et publie le site automatiquement. Vérifier ensuite `https://tactico123.netlify.app/api/leaderboard` (JSON attendu).
- Republier aussi l'artefact Claude https://claude.ai/artifact/NpEFT7f33sv9NbiCjiHcAC avec `dist/index.html` (le classement y est remplacé par un lien vers le site).
