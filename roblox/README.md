# Tactico sur Roblox

Version Roblox de Tactico : un match amical en 3D entre deux vrais clubs (monde réel 2026-27 du site), avec des personnages R6 et des noms modifiés. La place vit dans Roblox Studio, chez l'utilisateur. Ce dossier en garde le code.

## Fonctionnement

- **Données :** `build.mjs` génère `dist/roblox/monde.json` (198 clubs, environ 4 950 joueurs) à partir du monde réel du site, avec la graine 2026. Les serveurs Roblox le lisent au démarrage, sur https://tactico123.netlify.app/roblox/monde.json.
- **Noms modifiés :** chaque vrai joueur voit la dernière voyelle de son nom changée (« K. Mbappi », « Vinicios Junior »), comme dans les anciens jeux sans licence. Les commentaires du match utilisent ces noms.
- **Personnages :** chaque joueur a un personnage R6 unique dans son équipe (coupe du catalogue Roblox, barbe, teint). Les stars de `outils/sosies.mjs` rappellent le vrai joueur. Les autres ont un look tiré au hasard, jamais deviné d'après leur nom ou leur nationalité.
- **Match :** le serveur Roblox appelle `/api/match?h=<club>&a=<club>&s=<graine>`. La fonction Netlify `netlify/functions/match` y simule le match avec le moteur du site (MatchSim) et renvoie les compos, les phases et les événements minute par minute. Le serveur habille ensuite les joueurs (modèles R6 rangés dans `ReplicatedStorage.Tactico.Acteurs`) et envoie le match à tous les joueurs. Chaque joueur le rejoue en local, avec une caméra façon télé.

## Organisation dans Studio

| Dossier | Contenu |
| --- | --- |
| `src/ReplicatedStorage/Tactico/` | `Config`, `Apparence` (coupes, teints, maillots, création des R6), `Interface` (branche l'interface), `Spectacle` (le match en 3D) |
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

- **Écrire :** le contexte Edit de l'assistant Studio ne peut pas télécharger de fichiers depuis le site. Le code s'écrit donc dans Studio avec `execute_luau`, en remplissant la propriété `Source` des scripts.
- **Sauvegarder :** `outils/exporter.luau` renvoie le code et l'interface au format JSON. Comme la réponse est longue, l'outil l'enregistre dans un fichier. On la range ensuite dans `src/` et `interface/` avec un petit script Python, puis on fait un commit.
- **Vérifier les données et l'API :** `node tests/roblox.mjs`.
