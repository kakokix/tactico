# Tactico sur Roblox

Version Roblox de Tactico, en construction. Le code est rangé ici. La place elle-même vit dans Roblox Studio, chez l'utilisateur.

## Stade (`stade/Stade.luau`)

- **Échelle :** 1 m = 3 studs, soit la taille d'un personnage Roblox. Le terrain fait 105 x 68 m, donc 315 x 204 studs. Le dessus de la pelouse est à y = 1,2 et le centre du terrain à (0 ; 1,2 ; 0).
- **Contenu :**
  - pelouse rayée (21 bandes de 5 m) et toutes les lignes réglementaires ;
  - buts de 7,32 x 2,44 m avec filet, armature, parois invisibles (`FiletCollision`) et zone de but (`ZoneBut`) ;
  - drapeaux de corner et panneaux (TACTICO, RESPECT, FAIR-PLAY) ;
  - bancs : `BancDomicile` en rouge à gauche, `BancExterieur` en bleu à droite ;
  - quatre tribunes de 16 rangs avec toit ;
  - quatre pylônes d'éclairage ;
  - écran géant avec le SurfaceGui `Affichage` (`Titre`, `Score`, `Chrono`).
- **Repère :** la pièce invisible `Stade.Centre` est le PrimaryPart du modèle. Ses attributs sont `Echelle`, `Longueur` et `Largeur`. Pour passer des coordonnées du site (x de 0 à 105, y de 0 à 68) au monde Roblox :
  `Centre.CFrame:PointToWorldSpace(Vector3.new((x - 52.5) * Echelle, 0, (y - 34) * Echelle))`.
- **Streaming :** le modèle est en mode « Persistent », il est donc toujours chargé chez les joueurs.
- **Reconstruire le stade :** coller le fichier dans la barre de commande de Studio (View > Command Bar), ou le lancer avec l'outil `execute_luau` du serveur MCP de Studio. L'ancien modèle `Stade` est remplacé.
