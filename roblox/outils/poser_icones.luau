-- Les deux identifiants viennent de l'import des atlas src/assets/roblox-icones.png et roblox-drapeaux.png (assetType Image).
-- Pose les icônes du kit Tactico Outline (22 frames) dans TacticoGui, à partir des deux atlas importés.
local ICONES, DRAPEAUX = "rbxassetid://%ICONES%", "rbxassetid://%DRAPEAUX%"
local CHS = game:GetService("ChangeHistoryService")
local rec = CHS:TryBeginRecording("Tactico : icônes Outline")
local gui = game.StarterGui.TacticoGui
local POSES = {
	{ "Titre.Colonne.Boutons.Nouvelle.Pictogramme.ImageOutline", "i", 25 },
	{ "Titre.Colonne.Boutons.Reprendre.Pictogramme.ImageOutline", "i", 30 },
	{ "Titre.Colonne.Boutons.Amical.Pictogramme.ImageOutline", "i", 43 },
	{ "Titre.Colonne.Boutons.Mondial.Pictogramme.ImageOutline", "i", 2 },
	{ "Titre.Colonne.Boutons.Site.Pictogramme.ImageOutline", "i", 2 },
	{ "Creation.Page.Pays.FR.Pictogramme.ImageOutline", "d", 74 },
	{ "Creation.Page.Pays.EN.Pictogramme.ImageOutline", "d", 254 },
	{ "Creation.Page.Pays.ES.Pictogramme.ImageOutline", "d", 67 },
	{ "Creation.Page.Pays.IT.Pictogramme.ImageOutline", "d", 109 },
	{ "Creation.Page.Pays.DE.Pictogramme.ImageOutline", "d", 56 },
	{ "Amical.Zone.Domicile.Pays.FR.Pictogramme.ImageOutline", "d", 74 },
	{ "Amical.Zone.Domicile.Pays.EN.Pictogramme.ImageOutline", "d", 254 },
	{ "Amical.Zone.Domicile.Pays.ES.Pictogramme.ImageOutline", "d", 67 },
	{ "Amical.Zone.Domicile.Pays.IT.Pictogramme.ImageOutline", "d", 109 },
	{ "Amical.Zone.Domicile.Pays.DE.Pictogramme.ImageOutline", "d", 56 },
	{ "Amical.Zone.Exterieur.Pays.FR.Pictogramme.ImageOutline", "d", 74 },
	{ "Amical.Zone.Exterieur.Pays.EN.Pictogramme.ImageOutline", "d", 254 },
	{ "Amical.Zone.Exterieur.Pays.ES.Pictogramme.ImageOutline", "d", 67 },
	{ "Amical.Zone.Exterieur.Pays.IT.Pictogramme.ImageOutline", "d", 109 },
	{ "Amical.Zone.Exterieur.Pays.DE.Pictogramme.ImageOutline", "d", 56 },
	{ "Amical.Bas.Hasard.Pictogramme.ImageOutline", "i", 26 },
	{ "Amical.Bas.Lancer.Pictogramme.ImageOutline", "i", 43 },
	{ "Fin.Rejouer.Pictogramme.ImageOutline", "i", 34 },
	{ "Fin.Nouveau.Pictogramme.ImageOutline", "i", 43 },
	{ "Jeu.Haut.Continuer.Pictogramme.ImageOutline", "i", 38 },
	{ "Jeu.Corps.Menu.Liste.accueil.Icone.Pictogramme.ImageOutline", "i", 0 },
	{ "Jeu.Corps.Menu.Liste.messagerie.Icone.Pictogramme.ImageOutline", "i", 4 },
	{ "Jeu.Corps.Menu.Liste.effectif.Icone.Pictogramme.ImageOutline", "i", 3 },
	{ "Jeu.Corps.Menu.Liste.tactique.Icone.Pictogramme.ImageOutline", "i", 21 },
	{ "Jeu.Corps.Menu.Liste.calendrier.Icone.Pictogramme.ImageOutline", "i", 1 },
	{ "Jeu.Corps.Menu.Liste.competitions.Icone.Pictogramme.ImageOutline", "i", 22 },
	{ "Jeu.Corps.Menu.Liste.mercato.Icone.Pictogramme.ImageOutline", "i", 17 },
	{ "Jeu.Corps.Menu.Liste.entrainement.Icone.Pictogramme.ImageOutline", "i", 6 },
	{ "Jeu.Corps.Menu.Liste.finances.Icone.Pictogramme.ImageOutline", "i", 14 },
	{ "Jeu.Corps.Menu.Liste.club.Icone.Pictogramme.ImageOutline", "i", 12 },
	{ "Jeu.Corps.Menu.Liste.carriere.Icone.Pictogramme.ImageOutline", "i", 5 },
	{ "Jeu.Corps.Menu.Liste.mondial.Icone.Pictogramme.ImageOutline", "i", 2 },
	{ "Jeu.Corps.Menu.Liste.options.Icone.Pictogramme.ImageOutline", "i", 7 },
	{ "Jeu.Corps.Contenu.accueil.Hero.Boutons.Avancer.Pictogramme.ImageOutline", "i", 38 },
	{ "Jeu.Corps.Contenu.accueil.Hero.Boutons.Preparer.Pictogramme.ImageOutline", "i", 43 },
	{ "Jeu.Corps.Contenu.accueil.Hero.Boutons.Tactique.Pictogramme.ImageOutline", "i", 21 },
	{ "Jeu.Corps.Contenu.messagerie.Entete.Actions.ToutLire.Pictogramme.ImageOutline", "i", 4 },
	{ "Jeu.Corps.Contenu.tactique.Entete.Actions.Auto.Pictogramme.ImageOutline", "i", 3 },
	{ "Jeu.Corps.Contenu.match.Hero.Boutons.Direct.Pictogramme.ImageOutline", "i", 30 },
	{ "Jeu.Corps.Contenu.match.Hero.Boutons.Rapide.Pictogramme.ImageOutline", "i", 38 },
	{ "Jeu.Corps.Contenu.match.Hero.Boutons.Tactique.Pictogramme.ImageOutline", "i", 21 },
	{ "Jeu.Corps.Contenu.competitions.Pays.FR.Pictogramme.ImageOutline", "d", 74 },
	{ "Jeu.Corps.Contenu.competitions.Pays.EN.Pictogramme.ImageOutline", "d", 254 },
	{ "Jeu.Corps.Contenu.competitions.Pays.ES.Pictogramme.ImageOutline", "d", 67 },
	{ "Jeu.Corps.Contenu.competitions.Pays.IT.Pictogramme.ImageOutline", "d", 109 },
	{ "Jeu.Corps.Contenu.competitions.Pays.DE.Pictogramme.ImageOutline", "d", 56 },
	{ "Jeu.Corps.Contenu.carriere.Grille.A.Calcul.Ttl.Bouton.Pictogramme.ImageOutline", "i", 2 },
	{ "Jeu.Corps.Contenu.mondial.Entete.Actions.Actualiser.Pictogramme.ImageOutline", "i", 34 },
	{ "Jeu.Corps.Contenu.mondial.Carte.Tableau.Entete.Trophees.Pictogramme.ImageOutline", "i", 22 },
	{ "Modale.Boite.Fermer.Pictogramme.ImageOutline", "i", 27 },
	{ "Jeu.Corps.Contenu.accueil.Entete.Textes.Titre.ImageOutline", "i", 0 },
	{ "Jeu.Corps.Contenu.messagerie.Entete.Textes.Titre.ImageOutline", "i", 4 },
	{ "Jeu.Corps.Contenu.effectif.Entete.Textes.Titre.ImageOutline", "i", 3 },
	{ "Jeu.Corps.Contenu.tactique.Entete.Textes.Titre.ImageOutline", "i", 21 },
	{ "Jeu.Corps.Contenu.match.Entete.Textes.Titre.ImageOutline", "i", 43 },
	{ "Jeu.Corps.Contenu.calendrier.Entete.Textes.Titre.ImageOutline", "i", 1 },
	{ "Jeu.Corps.Contenu.competitions.Entete.Textes.Titre.ImageOutline", "i", 22 },
	{ "Jeu.Corps.Contenu.mercato.Entete.Textes.Titre.ImageOutline", "i", 17 },
	{ "Jeu.Corps.Contenu.entrainement.Entete.Textes.Titre.ImageOutline", "i", 6 },
	{ "Jeu.Corps.Contenu.finances.Entete.Textes.Titre.ImageOutline", "i", 14 },
	{ "Jeu.Corps.Contenu.carriere.Entete.Textes.Titre.ImageOutline", "i", 5 },
	{ "Jeu.Corps.Contenu.mondial.Entete.Textes.Titre.ImageOutline", "i", 2 },
	{ "Jeu.Corps.Contenu.options.Entete.Textes.Titre.ImageOutline", "i", 7 },
	{ "Jeu.Corps.Contenu.club.Entete.Textes.Titre.ImageOutline", "i", 12 }
}
local FLAGS = { ["PT"] = 183, ["NL"] = 165, ["BE"] = 19, ["TR"] = 224, ["GB-SCT"] = 256 }
local function image(parent, atlas, i)
	local im = parent:FindFirstChild("ImageOutline") or Instance.new("ImageLabel")
	im.Name = "ImageOutline"
	im.BackgroundTransparency = 1
	im.ScaleType = Enum.ScaleType.Fit
	if atlas == "i" then
		im.Image = ICONES
		im.ImageRectSize = Vector2.new(128, 128)
		im.ImageRectOffset = Vector2.new((i % 8) * 128, (i // 8) * 128)
	else
		im.Image = DRAPEAUX
		im.ImageRectSize = Vector2.new(64, 46)
		im.ImageRectOffset = Vector2.new((i % 16) * 64, (i // 16) * 46)
	end
	im.Parent = parent
	return im
end
local function trouver(chemin)
	local x = gui
	for part in string.gmatch(chemin, "[^%.]+") do
		x = x and x:FindFirstChild(part)
	end
	return x
end
-- pictogramme d'un bouton : on retire les anciennes formes et on pose l'image
local function pictogramme(pic, atlas, i)
	for _, c in pic:GetChildren() do
		if c:IsA("GuiObject") and c.Name ~= "ImageOutline" then
			c:Destroy()
		end
	end
	pic.BackgroundTransparency = 1
	local im = image(pic, atlas, i)
	im.Size = UDim2.fromScale(1, 1)
	im.Position = UDim2.fromScale(0, 0)
	im.AnchorPoint = Vector2.zero
	im.ZIndex = pic.ZIndex + 1
end
local manquants, poses = {}, 0
for _, p in POSES do
	local chemin, atlas, i = p[1], p[2], p[3]
	if string.find(chemin, "%.Pictogramme%.ImageOutline$") then
		local pic = trouver(string.gsub(chemin, "%.ImageOutline$", ""))
		if pic then
			pictogramme(pic, atlas, i)
			poses += 1
		else
			table.insert(manquants, chemin)
		end
	else
		-- icône d'un titre de page (30 px, à gauche du texte)
		local titre = trouver(string.gsub(chemin, "%.ImageOutline$", ""))
		if titre then
			local pad = titre:FindFirstChildOfClass("UIPadding") or Instance.new("UIPadding")
			pad.PaddingLeft = UDim.new(0, 39)
			pad.Parent = titre
			local im = image(titre, atlas, i)
			im.Size = UDim2.fromOffset(30, 30)
			im.AnchorPoint = Vector2.new(0.5, 0.5)
			im.Position = UDim2.new(0, -24, 0.5, 0)
			im.ZIndex = titre.ZIndex + 1
			poses += 1
		else
			table.insert(manquants, chemin)
		end
	end
end
-- onglets des nouveaux pays : même pictogramme que l'onglet France, avec leur drapeau
local NOUVEAUX = { PT = FLAGS.PT, NL = FLAGS.NL, BE = FLAGS.BE, TR = FLAGS.TR, SCO = FLAGS["GB-SCT"] }
for _, cadre in { gui.Creation.Page.Pays, gui.Jeu.Corps.Contenu.competitions.Pays, gui.Amical.Zone.Domicile.Pays, gui.Amical.Zone.Exterieur.Pays } do
	local modele = cadre:FindFirstChild("FR") and cadre.FR:FindFirstChild("Pictogramme")
	for code, i in NOUVEAUX do
		local b = cadre:FindFirstChild(code)
		if b and modele then
			local pic = b:FindFirstChild("Pictogramme") or modele:Clone()
			pic.Parent = b
			for _, k in { "UIPadding" } do
				local src = cadre.FR:FindFirstChildOfClass(k)
				if src and not b:FindFirstChildOfClass(k) then
					src:Clone().Parent = b
				end
			end
			pictogramme(pic, "d", i)
			poses += 1
		end
	end
end
if rec then CHS:FinishRecording(rec, Enum.FinishRecordingOperation.Commit) end
return ("%d icônes posées ; introuvables : %s"):format(poses, table.concat(manquants, ", "))
