# Tactico : notes pour Claude

Jeu de manager de foot en JavaScript pur (sans framework), en français. L'utilisateur (kakokix) écrit en français et on le tutoie.

## Architecture
- `src/core/` : logique du jeu, sans DOM (testable avec Node).
  - `worldgen.js` génère le monde (pays, clubs, joueurs). `constants.js` : attributs (1-20), postes, formations, pays.
  - `match.js` : moteur minute par minute (`MatchSim`). Calibré : environ 2,75 buts par match, 48 % de victoires à domicile.
  - `game.js` : boucle de jeu (`continueGame`, `advanceDay`, `applyMatchResult`), semaine, mois, directeur sportif.
  - `season.js` : fin de saison (récompenses, montées et descentes, contrats, retraites, nouvelle saison).
  - `transfers.js`, `finance.js`, `board.js` (président, emplois), `competitions.js`, `save.js` (IndexedDB).
  - `score.js` : score du classement mondial, **partagé avec la fonction Netlify**.
- `src/ui/` : interface (chaînes HTML + délégation d'événements `data-a`, `data-ch`, `data-in`). `app.js` : coquille, modales, `register()`.
- `netlify/functions/leaderboard/` : API `/api/leaderboard` (GET classement, POST score) avec Netlify Blobs. `core.mjs` contient la validation.
- `build.mjs` : regroupe tout dans un seul `dist/index.html`.

## Règles
- Clubs, joueurs, compétitions : tous fictifs. Ne jamais utiliser de vrais noms de clubs ou de joueurs célèbres.
- Toute valeur affichée passe par `esc()`.
- Après une modification : `node build.mjs`, `node tests/sim.mjs 2`, puis test navigateur (`python3 tests/ui.py` avec `python3 -m http.server 8765 --directory dist`).

## Mise en ligne
- `git push origin main` : Netlify reconstruit et publie le site automatiquement.
- Republier aussi l'artefact Claude https://claude.ai/artifact/NpEFT7f33sv9NbiCjiHcAC avec `dist/index.html` (le classement y est remplacé par un lien vers le site).
