# Tactico sur Roblox

Version Roblox de Tactico, **entièrement en anglais** : le mode carrière complet du site (mêmes écrans) et un match amical en 3D entre deux vrais clubs, avec des personnages R6 et des noms modifiés. La place vit dans Roblox Studio, chez l'utilisateur. Ce dossier en garde le code.

## Fonctionnement

- **Données :** `build.mjs` génère `dist/roblox/monde.json` (348 clubs de 10 pays) à partir du monde réel du site, avec la graine 2026. Les serveurs Roblox le lisent au démarrage, sur https://tactico123.netlify.app/roblox/monde.json. Le jeu suit donc toutes les mises à jour des données du site.
- **Carrière :** l'API `/api/carriere` (fonction Netlify, `setLang('en')`) fait tourner le moteur du site et renvoie des vues prêtes à afficher. Chaque carrière est rangée dans Netlify Blobs sous un jeton secret ; le serveur Roblox garde le jeton dans le DataStore `TacticoCarrieres`. Les carrières Roblox entrent au classement mondial du site (noms filtrés par `TextService` avant affichage).
- **Liaison avec le site :** un code à 6 caractères (30 minutes, une seule fois) fait passer une carrière du site vers Roblox (`importer`) ou de Roblox vers le site (`exporter`, `/api/lien`). Côté Roblox, les vrais joueurs reçoivent leur nom modifié et un personnage ; les vrais noms restent à part (`fn0`, `ln0`, jamais envoyés au jeu) pour le retour sur le site.
- **Portraits :** la fiche d'un joueur montre la tête de son personnage R6 (construit par le serveur, rangé dans `PlayerGui.TacticoPortraits`, affiché dans un `ViewportFrame`).
- **Ballon :** `ReplicatedStorage.Tactico.Ballon` (sphère blanche et 12 pentagones noirs, construit par `outils/ballon.luau`) sert aux matchs en 3D. Un ballon libre (`workspace.BallonLibre`) attend sur la pelouse : les joueurs le frappent en courant dessus.
- **Noms modifiés :** chaque vrai joueur voit la dernière voyelle de son nom changée (« K. Mbappi », « Vinicios Junior »), comme dans les anciens jeux sans licence. Les commentaires du match utilisent ces noms.
- **Personnages :** chaque joueur a un personnage R6 unique dans son équipe (coupe du catalogue Roblox, barbe, teint). Les stars de `outils/sosies.mjs` rappellent le vrai joueur. Les autres ont un look tiré au hasard, jamais deviné d'après leur nom ou leur nationalité.
- **Match :** le serveur Roblox appelle `/api/match?h=<club>&a=<club>&s=<graine>`. La fonction Netlify `netlify/functions/match` y simule le match avec le moteur du site (MatchSim) et renvoie les compos, les phases et les événements minute par minute. Le serveur habille ensuite les joueurs (modèles R6 rangés dans `ReplicatedStorage.Tactico.Acteurs`) et envoie le match à tous les joueurs. Chaque joueur le rejoue en local, avec une caméra façon télé.

## Organisation dans Studio

| Dossier | Contenu |
| --- | --- |
| `src/ReplicatedStorage/Tactico/` | `Config`, `Apparence` (coupes, teints, maillots, création des R6), `Interface` (match amical), `Carriere` (les 13 écrans de la carrière), `Spectacle` (le match en 3D) |
| `src/ServerScriptService/TacticoServeur.server.luau` | chargement du monde, préparation des matchs |
| `src/StarterPlayerScripts/TacticoClient.client.luau` | relie l'interface, le serveur et le match |
| `interface/` | `StarterGui.TacticoGui`, construite dans Studio. `TacticoGui.luau` la recrée (barre de commande), `TacticoGui.json` la décrit |
| `stade/Stade.luau` | le stade |

Dans Studio, il faut aussi le dossier `ReplicatedStorage.Tactico.Remotes` avec quatre objets : `Monde` (RemoteFunction) et `Lancer`, `Match`, `Etat` (RemoteEvent). Il faut également un dossier vide `ReplicatedStorage.Tactico.Acteurs`. Enfin, l'option « Allow HTTP Requests » doit être activée.

L'interface se modifie directement dans Studio. Seuls les noms utilisés par `Interface.luau` doivent rester les mêmes :
- `Menu.Zone.Domicile` et `Menu.Zone.Exterieur`, qui contiennent `Pays`, `Divisions`, `Liste.ModeleClub`, `Choix` et `Bande` ;
- `Menu.Bas` ;
- `Hud.Tableau`, `Hud.Fil.ModeleLigne`, `Hud.Banniere` et `Hud.Commandes` ;
- `Fin`.

## Stade (`stade/Stade.luau`)

- **Échelle :** 1 m = 3 studs. Le terrain fait 105 x 68 m. Le dessus de la pelouse est à y = 1,2.
- **Repère :** la pièce invisible `Stade.Centre` est le PrimaryPart du modèle. Ses attributs sont `Echelle`, `Longueur` et `Largeur`. Pour passer des coordonnées du site (x de 0 à 105, y de 0 à 68) au monde Roblox :
  `Centre.CFrame:PointToWorldSpace(Vector3.new((x - 52.5) * Echelle, 0, (y - 34) * Echelle))`.
- **Streaming :** le stade est en mode « Persistent », il est toujours chargé chez les joueurs.

## Travailler sur le code

- **Écrire :** le contexte Edit de l'assistant Studio ne peut pas télécharger de fichiers depuis le site. On modifie les scripts avec l'outil `multi_edit` (remplacements exacts), ou avec `ScriptEditorService:UpdateSourceAsync`. Ne pas écrire `.Source` directement : un onglet ouvert dans l'éditeur garde l'ancien texte et l'écrase au lancement du test.
- **Vérifier :** comparer la longueur et un hachage du texte de l'éditeur (`ScriptEditorService:GetEditorSource`) avec le fichier du dépôt, et `loadstring` pour la syntaxe.
- **Sauvegarder :** `outils/exporter.luau` construit le JSON du code et de l'interface. L'outil coupe les réponses vers 100 000 caractères : garder le texte dans `_G`, le renvoyer en morceaux de 95 000 caractères (coupés entre deux caractères UTF-8), recoller les morceaux, puis `python3 roblox/outils/ranger.py <fichier>` range tout dans `src/` et `interface/`.
- **Icônes :** les pictogrammes viennent du pack Tactico Outline (`assets/pack`). `outils/assets.py` en fait deux atlas (`src/assets/roblox-icones.png`, `roblox-drapeaux.png`), importés une fois comme images Roblox (icônes `rbxassetid://99327349946191`, drapeaux `rbxassetid://90302822209659`, avec Open Cloud `POST /assets/v1/assets` depuis un dossier autorisé dans les permissions MCP de Studio) ; chaque `Pictogramme` porte une `ImageLabel` « ImageOutline » qui en découpe une case (`ImageRectOffset`, `ImageRectSize`). `outils/poser_icones.luau` pose les 69 cases du kit (22 frames) et les drapeaux des nouveaux pays ; si on change les atlas, les réimporter et remplacer les deux identifiants en tête du script.
- **Vérifier les données et l'API :** `node tests/roblox.mjs`.
