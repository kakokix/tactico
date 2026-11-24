--[[
	Tactico (Roblox) : le mode carrière, côté joueur. Le jeu est en anglais.
	Branche les écrans rangés dans StarterGui.TacticoGui (Titre, Creation, Jeu, Modale, Toast, Chargement)
	sur l'API de carrière du site, par le serveur Roblox (RemoteFunction Carriere).
	Rien n'est créé de toutes pièces : les listes se remplissent en clonant les modèles cachés
	(« Modele » dans chaque liste, et le dossier Modeles pour les petites pièces).
]]
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")

local T = RS:WaitForChild("Tactico")
local Remotes = T:WaitForChild("Remotes")
local Spectacle = require(T:WaitForChild("Spectacle"))
local Interface = require(T:WaitForChild("Interface"))

local Carriere = {}
local joueur = Players.LocalPlayer

-- ---------- Couleurs du site ----------
local function hex(h)
	return Color3.fromHex(h)
end
local C = {
	bg = hex("#07110c"), bg2 = hex("#0b1811"), panel = hex("#0f1d16"), panel2 = hex("#13241b"), panel3 = hex("#183022"),
	line = hex("#1d3327"), line2 = hex("#2b4a39"), ink = hex("#eaf4ee"), mute = hex("#8fa99b"), dim = hex("#5f786b"),
	lime = hex("#c6f43d"), limeink = hex("#0a1505"), green = hex("#2fd27a"), gold = hex("#f5c542"), red = hex("#ff5f57"),
	orange = hex("#ff9f43"), blue = hex("#5aa8ff"),
}
local HEX = { lime = "#c6f43d", green = "#2fd27a", gold = "#f5c542", red = "#ff5f57", line2 = "#2b4a39" }
local DANGER = Color3.fromRGB(58, 20, 20)

-- ---------- Éléments de l'interface ----------
local gui, titre, creation, chargementF, jeu, haut, menuListe, contenu, modale, corps, toastF, modeles
local actionsExt = {}
local ecranCourant = nil
local params = {}
local derniere = {}
local hautData = nil
local enCours = false
local enMatch = false
local selectionTac = nil
local listePays = nil
local choixCreation = { pays = "FR", div = 1, club = nil, nomClub = "" }

-- ---------- Petits outils ----------
local function couleur(h)
	if typeof(h) ~= "string" then
		return C.panel3
	end
	local ok, c = pcall(Color3.fromHex, h)
	return if ok then c else C.panel3
end
local function encre(c)
	return if 0.299 * c.R + 0.587 * c.G + 0.114 * c.B > 0.6 then Color3.fromRGB(12, 14, 16) else Color3.new(1, 1, 1)
end
local function echap(s)
	s = tostring(s or "")
	s = s:gsub("&", "&amp;")
	s = s:gsub("<", "&lt;")
	s = s:gsub(">", "&gt;")
	return s
end
local function etoiles(n)
	n = math.clamp(math.floor(tonumber(n) or 0), 0, 5)
	return ('<font color="%s">%s</font><font color="%s">%s</font>'):format(HEX.lime, string.rep("★", n), HEX.line2, string.rep("★", 5 - n))
end
local function formeRiche(f)
	local out = {}
	for c in tostring(f or ""):gmatch(".") do
		local col = if c == "W" then HEX.green elseif c == "D" then HEX.gold elseif c == "L" then HEX.red else "#8fa99b"
		table.insert(out, ('<font color="%s">%s</font>'):format(col, c))
	end
	return table.concat(out, " ")
end

local function vider(parent)
	if not parent then
		return
	end
	for _, c in parent:GetChildren() do
		if c:GetAttribute("Clone") then
			c:Destroy()
		end
	end
end
local function cloner(modele, ordre, parent)
	local c = modele:Clone()
	c:SetAttribute("Clone", true)
	c.Name = modele.Name .. "_" .. tostring(ordre or 0)
	c.Visible = true
	c.LayoutOrder = ordre or 0
	c.Parent = parent or modele.Parent
	return c
end
local function piece(nom, parent, ordre)
	local c = modeles[nom]:Clone()
	c:SetAttribute("Clone", true)
	c.Visible = true
	c.LayoutOrder = ordre or 0
	c.Parent = parent
	return c
end

local function blason(b, coul, abr)
	if not b then
		return
	end
	local c1, c2 = couleur(coul and coul[1]), couleur(coul and coul[2])
	b.BackgroundColor3 = c1
	local int = b:FindFirstChild("Int")
	if int then
		int.BackgroundColor3 = c2
		local a = int:FindFirstChild("Abr")
		if a then
			a.Text = abr or ""
			a.TextColor3 = encre(c2)
		end
	end
end

local GROUPE_POS = { GK = "gk", RB = "def", CB = "def", LB = "def", DM = "mid", RM = "mid", CM = "mid", LM = "mid", AM = "mid", RW = "att", LW = "att", ST = "att" }
local COUL_POS = { gk = C.gold, def = C.blue, mid = C.green, att = C.red }
local function couleurPoste(pos)
	return COUL_POS[GROUPE_POS[pos] or ""] or C.panel3
end
local function couleurNote(n)
	n = tonumber(n) or 0
	return if n >= 80 then C.lime elseif n >= 70 then C.green elseif n >= 60 then C.gold else C.orange
end
local function couleurAttr(n)
	n = tonumber(n) or 0
	return if n >= 16 then C.lime elseif n >= 13 then C.green elseif n >= 10 then C.gold else C.orange
end
local function couleurMatch(r)
	r = tonumber(r) or 0
	return if r >= 7.5 then C.lime elseif r >= 6.6 then C.green elseif r >= 6 then C.gold else C.red
end

local function pastille(parent, txt, fond, encreT, largeur, ordre)
	local p = piece("Pastille", parent, ordre)
	p.Text = tostring(txt)
	p.BackgroundColor3 = fond or C.panel3
	p.TextColor3 = encreT or C.ink
	p.Size = UDim2.fromOffset(largeur or 46, 28)
	return p
end
local function pastillePoste(parent, pos, ordre)
	return pastille(parent, pos or "", couleurPoste(pos), C.limeink, 46, ordre)
end
local function pastilleNote(parent, n, ordre)
	return pastille(parent, n, couleurNote(n), C.limeink, 42, ordre)
end
local function pastilleRes(parent, r, ordre)
	local fond = if r == "W" then C.green elseif r == "D" then C.gold elseif r == "L" then C.red else C.panel3
	return pastille(parent, r, fond, C.limeink, 30, ordre)
end
local function valeur(parent, txt, col, ordre)
	local v = piece("Valeur", parent, ordre)
	v.Text = tostring(txt)
	v.TextColor3 = col or C.ink
	return v
end

local function activer(b, on)
	b:SetAttribute("Off", not on)
	b.AutoButtonColor = on
	b.TextTransparency = if on then 0 else 0.55
end
local function brancher(b, fn)
	b.Activated:Connect(function()
		if b:GetAttribute("Off") then
			return
		end
		fn()
	end)
end
local function bouton(parent, txt, style, fn, ordre)
	local nom = if style == "pri" then "BoutonPri" elseif style == "danger" then "BoutonDanger" else "Bouton"
	local b = piece(nom, parent, ordre)
	b.Text = txt
	if fn then
		brancher(b, fn)
	end
	return b
end

-- Onglets (fond plein) et choix segmentés (cadre avec bordure)
local function marquer(cadre, cle)
	local seg = cadre:FindFirstChildOfClass("UIStroke") ~= nil
	for _, b in cadre:GetChildren() do
		if b:IsA("GuiButton") and b:GetAttribute("Cle") ~= nil then
			local on = tostring(b:GetAttribute("Cle")) == tostring(cle)
			if seg then
				b.BackgroundColor3 = C.panel3
				b.BackgroundTransparency = if on then 0 else 1
				b.TextColor3 = if on then C.lime else C.mute
			else
				b.BackgroundColor3 = if on then C.lime else C.panel2
				b.TextColor3 = if on then C.limeink else C.ink
			end
		end
	end
end
local function brancherOnglets(cadre, fn)
	for _, b in cadre:GetChildren() do
		if b:IsA("GuiButton") and b:GetAttribute("Cle") ~= nil then
			b.Activated:Connect(function()
				fn(b:GetAttribute("Cle"))
			end)
		end
	end
end

-- Ligne d'une liste : { nom, meta, gauche = fn(cadre) → largeur, droite = fn(cadre), clic, riche, metaRiche, droiteL }
local function ligne(liste, ordre, o)
	local r = cloner(liste.Modele, ordre)
	r.Nom.RichText = o.riche == true
	r.Meta.RichText = o.metaRiche == true
	r.Nom.Text = o.nom or ""
	r.Meta.Text = o.meta or ""
	local largeur = if o.gauche then o.gauche(r.Gauche) or 0 else 0
	local droite = o.droiteL or 150
	local x = if largeur > 0 then 14 + largeur + 12 else 14
	local vide = (o.meta or "") == ""
	r.Nom.Position = if vide then UDim2.new(0, x, 0.5, -11) else UDim2.fromOffset(x, r.Nom.Position.Y.Offset)
	r.Meta.Position = UDim2.fromOffset(x, r.Meta.Position.Y.Offset)
	r.Nom.Size = UDim2.new(1, -(x + droite), 0, 22)
	r.Meta.Size = UDim2.new(1, -(x + droite), 0, 18)
	if o.droite then
		o.droite(r.Droite)
	end
	if o.clic then
		r.Activated:Connect(o.clic)
	else
		r.AutoButtonColor = false
	end
	return r
end
local function marquerLigne(r, col)
	r.BackgroundColor3 = C.panel3
	local s = r:FindFirstChildOfClass("UIStroke")
	if s then
		s.Color = col or C.lime
	end
end

-- Ligne d'un tableau : cellules nommées comme les colonnes
local function ligneTableau(tab, ordre, cellules, o)
	o = o or {}
	local r = cloner(tab.Lignes.Modele, ordre)
	for _, k in o.riche or {} do
		local c = r:FindFirstChild(k)
		if c then
			c.RichText = true
		end
	end
	for k, v in cellules do
		local c = r:FindFirstChild(k)
		if c then
			c.Text = tostring(v)
		end
	end
	if o.moi then
		r.BackgroundColor3 = C.panel3
	end
	if o.zone then
		r.Zone.Visible = true
		r.Zone.BackgroundColor3 = o.zone
	end
	if o.clic then
		r.Activated:Connect(o.clic)
	else
		r.AutoButtonColor = false
	end
	return r
end

-- ---------- Notifications et chargement ----------
local jetonToast = 0
local function toast(txt, genre)
	if not txt or txt == "" then
		return
	end
	jetonToast += 1
	local j = jetonToast
	toastF.Texte.Text = txt
	toastF.BackgroundColor3 = if genre == "err" then Color3.fromRGB(70, 22, 22) elseif genre == "warn" then Color3.fromRGB(62, 50, 14) else C.panel3
	toastF.Texte.TextColor3 = if genre == "err" then C.red elseif genre == "warn" then C.gold else C.ink
	toastF.Visible = true
	task.delay(if #txt > 60 then 4.5 else 3, function()
		if j == jetonToast then
			toastF.Visible = false
		end
	end)
end

local jetonCharge = 0
local function charge(on, txt)
	jetonCharge += 1
	local j = jetonCharge
	if on then
		task.delay(0.25, function()
			if j == jetonCharge then
				chargementF.Boite.Texte.Text = txt or "Loading…"
				chargementF.Visible = true
			end
		end)
	else
		chargementF.Visible = false
	end
end

local function appeler(req, txt)
	if enCours then
		return { error = "Please wait…" }
	end
	enCours = true
	charge(true, txt)
	local ok, res = pcall(function()
		return Remotes.Carriere:InvokeServer(req)
	end)
	charge(false)
	enCours = false
	if not ok or type(res) ~= "table" then
		return { error = "No answer from the server. Please try again." }
	end
	return res
end

-- ---------- Fenêtre (fiche, message, après-match, bilan, confirmation) ----------
local connexionsModale = {}
local function fermerModale()
	modale.Visible = false
	for _, c in connexionsModale do
		c:Disconnect()
	end
	connexionsModale = {}
end
local function ouvrirModale(t, sous)
	fermerModale()
	modale.Visible = true
	local b = modale.Boite
	b.Titre.Text = t or ""
	b.Titre.TextColor3 = C.ink
	b.Sous.Text = sous or ""
	corps.Texte.Text = ""
	corps.Texte.Visible = false
	corps.Texte.TextColor3 = C.ink
	corps.Score.Visible = false
	corps.Kpis.Visible = false
	vider(corps.Kpis)
	corps.Liste.Visible = false
	vider(corps.Liste)
	corps.Groupes.Visible = false
	vider(corps.Groupes)
	corps.Texte2.Text = ""
	corps.Texte2.Visible = false
	corps.Texte2.TextColor3 = C.ink
	corps.Liste2.Visible = false
	vider(corps.Liste2)
	corps.Retour.Text = ""
	corps.Retour.Visible = false
	corps.Actions.Montant.Visible = false
	for i = 1, 5 do
		corps.Actions["Action" .. i].Visible = false
	end
	corps.CanvasPosition = Vector2.zero
end
local function boutonModale(i, txt, style, fn)
	local a = corps.Actions["Action" .. i]
	a.Text = txt
	a.Visible = true
	a.BackgroundColor3 = if style == "pri" then C.lime elseif style == "danger" then DANGER else C.panel2
	a.TextColor3 = if style == "pri" then C.limeink elseif style == "danger" then C.red else C.ink
	table.insert(connexionsModale, a.Activated:Connect(fn))
	return a
end
local function texteModale(t, col)
	corps.Texte.Visible = true
	corps.Texte.RichText = false
	corps.Texte.Text = t or ""
	corps.Texte.TextColor3 = col or C.ink
end
local function confirmer(t, txt, oui, fn, danger)
	ouvrirModale(t, "")
	texteModale(txt)
	boutonModale(1, oui, if danger then "danger" else "pri", function()
		fermerModale()
		fn()
	end)
	boutonModale(2, "Cancel", "normal", fermerModale)
end

-- ---------- Navigation ----------
local PAGES = {}
local afficher, aller, action, ouvrirFiche, lireMessage

local function montrer(ecran)
	local nouveau = ecran ~= ecranCourant
	for _, p in contenu:GetChildren() do
		if p:IsA("GuiObject") then
			p.Visible = p.Name == ecran
		end
	end
	for _, b in menuListe:GetChildren() do
		local e = b:IsA("GuiButton") and b:GetAttribute("Ecran")
		if e then
			local on = e == ecran
			local actif = b:FindFirstChild("Actif")
			if actif then
				actif.Visible = on
			end
			local tx = b:FindFirstChild("Texte")
			if tx then
				tx.TextColor3 = if on then C.ink else C.mute
			end
			b.BackgroundColor3 = if on then C.panel2 else C.bg2
		end
	end
	ecranCourant = ecran
	local page = contenu:FindFirstChild(ecran)
	if nouveau and page and page:IsA("ScrollingFrame") then
		page.CanvasPosition = Vector2.zero
	end
end

local function majHaut(h)
	hautData = h
	blason(haut.Blason, h.coul, h.abr)
	haut.Club.Text = h.club
	haut.Info.Text = h.date .. (if h.argent ~= "" then "   ·   " .. h.argent else "")
	haut.Continuer.Text = if h.jourDeMatch then "Match day  ›" else "Continue  ›"
	haut.Continuer.BackgroundColor3 = if h.jourDeMatch then C.gold else C.lime
	local b = menuListe:FindFirstChild("messagerie")
	local p = b and b:FindFirstChild("Pastille")
	if p then
		p.Visible = (h.nonLus or 0) > 0
		p.Text = tostring(h.nonLus or 0)
	end
end

function Carriere.titre()
	fermerModale()
	if enMatch then
		enMatch = false
		Interface.quitterPerso = nil
		Spectacle.arreter()
	end
	Interface.cacher()
	jeu.Visible = false
	creation.Visible = false
	titre.Visible = true
	titre.Colonne.Boutons.Reprendre.Visible = joueur:GetAttribute("Carriere") == true
end

afficher = function(res)
	if res.perdue then
		toast(res.error or "Career not found.", "err")
		Carriere.titre()
		return
	end
	if res.haut then
		majHaut(res.haut)
	end
	if res.ferme then
		fermerModale()
	end
	if res.ecran == "joueur" then
		if res.d and not res.ferme then
			ouvrirFiche(nil, res.d)
		end
	elseif res.ecran and res.d and PAGES[res.ecran] then
		derniere[res.ecran] = res.d
		montrer(res.ecran)
		PAGES[res.ecran](res.d)
	end
	if res.error then
		toast(res.error, "err")
	elseif res.refus then
		toast(res.refus, "warn")
	elseif res.ok then
		toast(res.ok)
	end
end

aller = function(ecran, q)
	if q then
		params[ecran] = q
	end
	afficher(appeler({ a = "vue", e = ecran, q = params[ecran] or {} }))
end

-- action sur le serveur, puis on réaffiche l'écran (e) avec ses paramètres
action = function(a, o)
	o = o or {}
	local e = o.e or ecranCourant or "accueil"
	local q = o.q or params[e] or {}
	local res = appeler({ a = a, e = e, q = q, id = o.id }, o.texte)
	afficher(res)
	return res
end

-- ---------- Écrans ----------
PAGES.accueil = function(d)
	local p = contenu.accueil
	p.Entete.Textes.Titre.Text = d.titre or ""
	p.Entete.Textes.Sous.Text = d.sous or ""
	local hero = p.Hero
	local pr = d.prochain
	hero.Visible = pr ~= nil
	if pr then
		hero.Ligne1.Comp.Text = pr.comp
		hero.Ligne1.Quand.Text = pr.quand
		for _, cote in { { hero.VS.Dom, pr.dom }, { hero.VS.Ext, pr.ext } } do
			local f, c = cote[1], cote[2]
			blason(f.Blason, c.coul, c.a)
			f.Nom.Text = c.n
			f.Etoiles.RichText = true
			f.Etoiles.Text = etoiles(c.et)
		end
		hero.VS.Milieu.Stade.Text = pr.stade
		hero.Boutons.Avancer.Visible = not pr.aujourdhui
		hero.Boutons.Preparer.Visible = pr.aujourdhui == true
	end
	local sans = d.sansClub == true
	p.Kpis.Visible = not sans
	p.Grille1.Visible = not sans
	if not sans then
		local k = p.Kpis
		k.Classement.Valeur.Text = d.kpis.classement
		k.Classement.Petit.RichText = true
		k.Classement.Petit.Text = if (d.forme or "") ~= "" then "Form  " .. formeRiche(d.forme) else ""
		k.Objectif.Valeur.Text = d.kpis.objectif
		k.Objectif.Valeur.TextSize = 20
		k.Confiance.Valeur.Text = d.kpis.confiance .. "%"
		local conf = d.kpis.confiance
		k.Confiance.Barre.Rempli.Size = UDim2.fromScale(math.clamp(conf / 100, 0.02, 1), 1)
		k.Confiance.Barre.Rempli.BackgroundColor3 = if conf >= 60 then C.green elseif conf >= 35 then C.orange else C.red
		k.Score.Valeur.Text = d.kpis.score .. " pts"
		k.Score.Valeur.TextColor3 = C.lime
		local lg = p.Grille1.A.Ligue
		lg.Ttl.Titre.Text = d.ligue
		vider(lg.Tableau.Lignes)
		for i, r in d.table do
			ligneTableau(lg.Tableau, i, { Pos = r.pos, Club = r.n, J = r.j, Diff = r.diff, Pts = r.pts }, { moi = r.moi == 1, zone = if r.moi == 1 then C.lime else nil })
		end
		local rs = p.Grille1.B.Resultats.Liste
		vider(rs)
		for i, r in d.resultats do
			ligne(rs, i, { nom = r.txt, meta = r.meta, gauche = function(g)
				pastilleRes(g, r.r)
				return 30
			end, droiteL = 20 })
		end
		if #d.resultats == 0 then
			ligne(rs, 1, { nom = "No match played yet.", droiteL = 20 })
		end
	end
	local m = p.Grille2.A.Messages
	vider(m.Liste)
	for i, x in d.messages or {} do
		ligne(m.Liste, i, { nom = x.titre, meta = x.meta, droiteL = 20, clic = function()
			lireMessage(x.id)
		end })
	end
	m.Vide.Visible = #(d.messages or {}) == 0
	vider(m.Absents)
	local abs = d.absents or {}
	m.AbsentsTitre.Visible = #abs > 0
	for i, x in abs do
		ligne(m.Absents, i, {
			nom = x.nom, meta = x.meta, droiteL = 110,
			gauche = function(g)
				pastillePoste(g, x.pos)
				return 46
			end,
			droite = function(dr)
				local v = valeur(dr, x.etat, if x.etat == "Injured" then C.red else C.gold)
				v.TextSize = 14
			end,
			clic = function()
				ouvrirFiche(x.id)
			end,
		})
	end
	local a = p.Grille2.B.Actus.Liste
	vider(a)
	for i, n in d.actus or {} do
		local l = cloner(a.Modele, i)
		l.Date.Text = n.d
		l.Texte.Text = n.t
	end
end

PAGES.messagerie = function(d)
	local p = contenu.messagerie
	p.Entete.Textes.Sous.Text = d.sous or ""
	vider(p.Liste)
	for i, m in d.messages or {} do
		local r = ligne(p.Liste, i, {
			nom = m.titre, meta = m.meta, droiteL = if m.action == 1 then 100 else 20,
			droite = function(dr)
				if m.action == 1 then
					pastille(dr, "Action", C.gold, C.limeink, 70)
				end
			end,
			clic = function()
				lireMessage(m.id)
			end,
		})
		if m.lu == 0 then
			r.BackgroundColor3 = C.panel3
			r.Nom.TextColor3 = C.lime
		end
	end
	p.Vide.Visible = #(d.messages or {}) == 0
end

PAGES.effectif = function(d)
	local p = contenu.effectif
	p.Entete.Textes.Sous.Text = d.sous or d.vide or ""
	marquer(p.Groupes, d.g or "all")
	marquer(p.Tri, d.tri or "pos")
	local tab = p.Carte.Tableau
	vider(tab.Lignes)
	for i, j in d.joueurs or {} do
		local nom = echap(j.nom)
		if j.statut ~= "" then
			local col = if j.statut:find("Injured") or j.statut:find("Suspended") then HEX.red else HEX.gold
			nom ..= ('  <font color="%s">%s</font>'):format(col, echap(j.statut))
		end
		local r = ligneTableau(tab, i, {
			Num = j.num, Pos = j.pos, Nom = nom, Age = j.age, Note = j.note, Pot = j.pot, Fr = j.fr .. "%", Mo = j.mo, Fo = j.fo,
			MJ = j.mj, B = j.b, Pd = j.pd, Moy = j.moy, Val = j.val, Sal = j.sal, Ctr = j.ctr,
		}, { riche = { "Nom" }, zone = if j.xi == 1 then C.lime else nil, clic = function()
			ouvrirFiche(j.id)
		end })
		r.Pos.TextColor3 = couleurPoste(j.pos)
		r.Pos.FontFace = Font.new(r.Pos.FontFace.Family, Enum.FontWeight.Bold)
		r.Note.TextColor3 = couleurNote(j.note)
		r.Fr.TextColor3 = if j.fr >= 85 then C.green elseif j.fr >= 70 then C.gold else C.red
	end
	if #(d.joueurs or {}) == 0 then
		ligneTableau(tab, 1, { Nom = "No players here." })
	end
end

local function choisirTac(pid)
	if not pid or pid == "" then
		return
	end
	if selectionTac == nil then
		selectionTac = pid
		PAGES.tactique(derniere.tactique)
		toast("Now tap the player to swap with.")
	elseif selectionTac == pid then
		selectionTac = nil
		PAGES.tactique(derniere.tactique)
	else
		local a = selectionTac
		selectionTac = nil
		action("tactique", { e = "tactique", q = { a = a, b = pid } })
	end
end

PAGES.tactique = function(d)
	local p = contenu.tactique
	if d.vide then
		p.Entete.Textes.Sous.Text = d.vide
		return
	end
	p.Entete.Textes.Sous.Text = d.sous
	marquer(p.Formations, d.f)
	local del = p.Entete.Actions.Delegue
	del.Text = (if d.delegue == 1 then "✓ " else "") .. "Assistant picks the team"
	del.BackgroundColor3 = if d.delegue == 1 then C.lime else C.panel2
	del.TextColor3 = if d.delegue == 1 then C.limeink else C.ink
	local ter = p.Grille.A.Terrain
	vider(ter)
	local c1 = couleur(hautData and hautData.coul and hautData.coul[1])
	for i, s in d.xi do
		local j = cloner(ter.Modele, i)
		j.Name = "Joueur" .. i
		j.AnchorPoint = Vector2.new(0.5, 0.5)
		j.Position = UDim2.fromScale(s.x / 100, 1 - s.y / 100 * 0.92 - 0.02)
		j.Maillot.BackgroundColor3 = c1
		j.Maillot.Num.Text = tostring(s.num)
		j.Maillot.Num.TextColor3 = encre(c1)
		j.Nom.Text = s.nom
		j.Info.Text = s.pos .. " · " .. s.note
		j.Info.TextColor3 = if s.dispo == 0 then C.red elseif s.fr < 75 then C.gold else C.mute
		local choix = j.Maillot:FindFirstChild("Choix")
		if choix then
			local choisi = selectionTac == s.pid and s.pid ~= ""
			choix.Enabled = choisi
			choix.Color = C.lime
			choix.Thickness = 4
		end
		j.Activated:Connect(function()
			choisirTac(s.pid)
		end)
	end
	local cs = p.Grille.B.Consignes
	for _, k in { "ment", "press", "style", "width", "line" } do
		local seg = cs[k]
		for _, b in seg:GetChildren() do
			if b:IsA("GuiButton") and b:GetAttribute("Cle") ~= nil then
				local i = tonumber(b:GetAttribute("Cle")) or 0
				b.Text = d.choix[k][i + 1] or "…"
			end
		end
		marquer(seg, d.consignes[k])
	end
	local tireur = "Automatic"
	for _, t in d.tireurs do
		if t.pid == d.penalty then
			tireur = t.nom
		end
	end
	cs.Penalty.Text = tireur .. "  ›"
	for _, x in { { p.Grille.B.Banc.Liste, d.banc }, { p.Grille.B.Reserve.Liste, d.reste } } do
		vider(x[1])
		for i, j in x[2] do
			local r = ligne(x[1], i, {
				nom = j.nom, meta = ("Rating %d · fitness %d%%%s"):format(j.note, j.fr, if j.dispo == 0 then " · unavailable" else ""), droiteL = 60,
				gauche = function(g)
					pastillePoste(g, j.pos)
					return 46
				end,
				droite = function(dr)
					pastilleNote(dr, j.note)
				end,
				clic = function()
					choisirTac(j.pid)
				end,
			})
			if selectionTac == j.pid then
				marquerLigne(r, C.lime)
			end
			if j.dispo == 0 then
				r.Nom.TextColor3 = C.red
			end
		end
	end
end

local function choisirTireur()
	local d = derniere.tactique
	if not d then
		return
	end
	ouvrirModale("Penalty taker", "Who takes the penalties?")
	corps.Liste.Visible = true
	local options = { { pid = "", nom = "Automatic (best taker on the pitch)" } }
	for _, t in d.tireurs do
		table.insert(options, t)
	end
	for i, t in options do
		local r = ligne(corps.Liste, i, { nom = t.nom, droiteL = 20, clic = function()
			fermerModale()
			action("tactique", { e = "tactique", q = { penalty = t.pid } })
		end })
		if t.pid == d.penalty then
			marquerLigne(r, C.lime)
		end
	end
end

PAGES.match = function(d)
	local p = contenu.match
	if d.vide then
		p.Entete.Textes.Sous.Text = d.vide
		p.Hero.Visible = false
		p.Onze.Visible = false
		return
	end
	p.Hero.Visible = true
	p.Onze.Visible = true
	p.Entete.Textes.Titre.Text = d.titre
	p.Entete.Textes.Sous.Text = d.sous
	local hero = p.Hero
	hero.Ligne1.Comp.Text = d.sous
	hero.Ligne1.Quand.Text = d.stade
	for _, cote in { { hero.VS.Dom, d.dom }, { hero.VS.Ext, d.ext } } do
		local f, c = cote[1], cote[2]
		blason(f.Blason, c.coul, c.a)
		f.Nom.Text = c.n
		f.Etoiles.RichText = true
		f.Etoiles.Text = etoiles(c.et) .. (if (c.meta or "") ~= "" then "  " .. echap(c.meta) else "")
	end
	hero.VS.Milieu.Stade.Text = d.stade
	p.Onze.Ttl.Titre.Text = d.onze
	p.Onze.Ttl.Consignes.Text = d.consignes
	vider(p.Onze.Liste)
	for i, j in d.joueurs do
		local r = ligne(p.Onze.Liste, i, {
			nom = j.nom, meta = ("Fitness %d%%"):format(j.fr), droiteL = 60,
			gauche = function(g)
				pastillePoste(g, j.pos)
				return 46
			end,
			droite = function(dr)
				pastilleNote(dr, j.note)
			end,
		})
		if j.dispo == 0 then
			r.Nom.TextColor3 = C.red
			r.Meta.Text = "Unavailable · the assistant will replace him"
		end
	end
end

PAGES.calendrier = function(d)
	local p = contenu.calendrier
	p.Entete.Textes.Sous.Text = d.sous or d.vide or ""
	marquer(p.Filtres, d.f or "all")
	local conti = p.Filtres:FindFirstChild("conti")
	if conti and d.conti then
		conti.Text = d.conti
	end
	local liste = p.Liste
	vider(liste)
	local ordre, mois = 0, nil
	for _, m in d.matchs or {} do
		if m.mois ~= mois then
			mois = m.mois
			ordre += 1
			cloner(liste.ModeleMois, ordre).Text = mois
		end
		ordre += 1
		local r = cloner(liste.Modele, ordre)
		r.Date.Text = m.date
		blason(r.Blason, m.coul, m.abr)
		r.Nom.Text = (if m.dom == 1 then "" else "@ ") .. m.adv
		r.Meta.Text = m.meta
		r.Res.Visible = m.r ~= ""
		if m.r ~= "" then
			r.Res.Text = m.r
			r.Res.BackgroundColor3 = if m.r == "W" then C.green elseif m.r == "D" then C.gold else C.red
		end
		r.Score.Text = m.score
		if m.auj == 1 then
			marquerLigne(r, C.gold)
		end
		r.AutoButtonColor = false
	end
end

PAGES.competitions = function(d)
	local p = contenu.competitions
	p.Entete.Textes.Sous.Text = d.sous or ""
	marquer(p.Onglets, d.o)
	marquer(p.Pays, d.pays)
	for _, l in d.ligues or {} do
		if l.code == d.pays then
			p.Divisions["1"].Text = l.d1
			p.Divisions["2"].Text = l.d2
		end
	end
	marquer(p.Divisions, d.div)
	local o = d.o
	p.Pays.Visible = o ~= "europe"
	p.Divisions.Visible = o == "table" or o == "resultats" or o == "stats"
	p.Classement.Visible = o == "table"
	p.Liste.Visible = o ~= "table"
	p.Liste2.Visible = o == "stats"
	p.Titre1.Visible = o ~= "table" and o ~= "palmares"
	p.Titre2.Visible = o == "stats"
	p.Legende.Visible = o == "table"
	vider(p.Liste)
	vider(p.Liste2)
	if o == "table" then
		local tab = p.Classement.Tableau
		vider(tab.Lignes)
		local Z = { c = C.lime, r = C.red, b = C.gold, p = C.green }
		for i, r in d.lignes or {} do
			ligneTableau(tab, i, {
				Pos = r.pos, Club = ('<font color="%s">■</font>  %s'):format(r.coul and r.coul[1] or "#888888", echap(r.n)), J = r.j, G = r.g, N = r.nu, P = r.p,
				BP = r.bp, BC = r.bc, Diff = r.diff, Pts = r.pts, Forme = formeRiche(r.forme),
			}, { moi = r.moi == 1, zone = Z[r.z], riche = { "Club", "Forme" } })
		end
		p.Legende.Text = d.legende or ""
	elseif o == "resultats" or o == "coupes" or o == "europe" then
		p.Titre1.Text = d.titre or ""
		for i, m in d.matchs or {} do
			local r = ligne(p.Liste, i, { nom = m.txt, meta = m.date, droiteL = 20 })
			if m.moi == 1 then
				marquerLigne(r, C.lime)
				r.Nom.TextColor3 = C.lime
			end
		end
		if #(d.matchs or {}) == 0 then
			ligne(p.Liste, 1, { nom = "No matches yet.", droiteL = 20 })
		end
	elseif o == "stats" then
		p.Titre1.Text = "Top scorers · " .. (d.titre or "")
		p.Titre2.Text = "Top assists · " .. (d.titre or "")
		for k, x in { { p.Liste, d.buteurs }, { p.Liste2, d.passeurs } } do
			for i, j in x[2] or {} do
				ligne(x[1], i, { nom = i .. ".  " .. j.nom, meta = j.club, droiteL = 70, droite = function(dr)
					valeur(dr, j.v, C.lime)
				end })
			end
			if #(x[2] or {}) == 0 then
				ligne(x[1], 1, { nom = "Nothing yet.", droiteL = 20 })
			end
		end
	elseif o == "palmares" then
		for i, h in d.palmares or {} do
			ligne(p.Liste, i, { nom = h.s, meta = table.concat(h.lignes, "  ·  "), droiteL = 20 })
		end
		if #(d.palmares or {}) == 0 then
			ligne(p.Liste, 1, { nom = "No completed season yet.", droiteL = 20 })
		end
	end
end

local FILTRES = {
	pos = { { "all", "All positions" }, { "GB", "Goalkeepers" }, { "DEF", "Defenders" }, { "MIL", "Midfielders" }, { "ATT", "Forwards" } },
	note = { { 50, "Rating 50+" }, { 60, "Rating 60+" }, { 65, "Rating 65+" }, { 70, "Rating 70+" }, { 75, "Rating 75+" }, { 80, "Rating 80+" } },
	age = { { 40, "Any age" }, { 21, "Age 21 or less" }, { 24, "Age 24 or less" }, { 28, "Age 28 or less" }, { 32, "Age 32 or less" } },
	prix = { { 9, "Any price" }, { 1, "Up to €500K" }, { 2, "Up to €1M" }, { 4, "Up to €5M" }, { 5, "Up to €10M" }, { 6, "Up to €20M" }, { 7, "Up to €40M" }, { 8, "Up to €80M" } },
}

PAGES.mercato = function(d)
	local p = contenu.mercato
	if d.vide then
		p.Entete.Textes.Sous.Text = d.vide
		return
	end
	p.Entete.Textes.Sous.Text = d.sous
	local k = d.kpis
	p.Kpis.Budget.Valeur.Text = k.budget
	p.Kpis.Masse.Valeur.Text = k.masse
	p.Kpis.Masse.Petit.Text = "max " .. k.max
	p.Kpis.Marge.Valeur.Text = k.marge
	p.Kpis.Marge.Valeur.TextColor3 = if k.margeOk == 1 then C.green else C.red
	p.Kpis.Solde.Valeur.Text = k.solde
	marquer(p.Onglets, d.o)
	p.Filtres.Visible = d.o == "search"
	if d.filtres then
		for nom, liste in FILTRES do
			for _, f in liste do
				if tostring(f[1]) == tostring(d.filtres[nom]) then
					p.Filtres[nom].Text = f[2] .. "  ›"
				end
			end
		end
	end
	p.Total.Text = if d.total then (d.total .. " player(s)" .. (if d.total > 60 and d.o == "search" then " · showing the best 60" else "")) else ""
	vider(p.Liste)
	if d.joueurs then
		for i, j in d.joueurs do
			ligne(p.Liste, i, {
				nom = j.nom .. (if j.tr == 1 then "  · listed" else ""), meta = ("%s · age %d · value %s · potential %d"):format(j.club, j.age, j.val, j.pot), droiteL = 60,
				gauche = function(g)
					pastillePoste(g, j.pos)
					return 46
				end,
				droite = function(dr)
					pastilleNote(dr, j.note)
				end,
				clic = function()
					ouvrirFiche(j.id)
				end,
			})
		end
		if #d.joueurs == 0 then
			ligne(p.Liste, 1, { nom = "No player matches these filters.", droiteL = 20 })
		end
	else
		for i, m in d.mouvements or {} do
			ligne(p.Liste, i, { nom = m.n, meta = m.meta, droiteL = 110, droite = function(dr)
				valeur(dr, m.fee, if m.arrivee == 1 then C.green elseif m.arrivee == 0 then C.red else C.ink)
			end })
		end
		if #(d.mouvements or {}) == 0 then
			ligne(p.Liste, 1, { nom = "No transfers yet.", droiteL = 20 })
		end
	end
end

PAGES.entrainement = function(d)
	local p = contenu.entrainement
	p.Entete.Textes.Sous.Text = d.sous or d.vide or ""
	if d.vide then
		return
	end
	local th = p.Grille.A.Themes
	vider(th.Liste)
	for i, t in d.themes do
		local r = ligne(th.Liste, i, { nom = (if t.on == 1 then "✓  " else "") .. t.nom, meta = t.desc, droiteL = 20, clic = function()
			action("entrainement", { e = "entrainement", q = { focus = t.id } })
		end })
		if t.on == 1 then
			marquerLigne(r, C.lime)
			r.Nom.TextColor3 = C.lime
		end
	end
	for _, b in th.Intensite:GetChildren() do
		if b:IsA("GuiButton") and b:GetAttribute("Cle") ~= nil then
			local i = tonumber(b:GetAttribute("Cle")) or 0
			b.Text = d.intensites[i + 1] or b.Text
		end
	end
	marquer(th.Intensite, d.intensite)
	local pr = p.Grille.B.Progres
	vider(pr.Liste)
	for i, x in d.progres do
		ligne(pr.Liste, i, {
			nom = x.nom, meta = x.meta, droiteL = 60,
			gauche = function(g)
				pastillePoste(g, x.pos)
				return 46
			end,
			droite = function(dr)
				valeur(dr, x.d, if x.plus == 1 then C.green else C.red)
			end,
			clic = function()
				ouvrirFiche(x.id)
			end,
		})
	end
	pr.Vide.Visible = #d.progres == 0
	local je = p.Jeunes
	je.Ttl.Titre.Text = ("Youth academy (%d)"):format(#d.jeunes)
	vider(je.Liste)
	for i, x in d.jeunes do
		ligne(je.Liste, i, {
			nom = x.nom, meta = x.meta, droiteL = 60,
			gauche = function(g)
				pastillePoste(g, x.pos)
				return 46
			end,
			droite = function(dr)
				pastilleNote(dr, x.note)
			end,
			clic = function()
				ouvrirFiche(x.id)
			end,
		})
	end
	if #d.jeunes == 0 then
		ligne(je.Liste, 1, { nom = "No youngsters at the moment. A new intake arrives every 15 March.", droiteL = 20 })
	end
end

PAGES.finances = function(d)
	local p = contenu.finances
	p.Entete.Textes.Sous.Text = d.sous or d.vide or ""
	if d.vide then
		return
	end
	local k = d.kpis
	p.Kpis.Solde.Valeur.Text = k.solde
	p.Kpis.Solde.Valeur.TextColor3 = if k.soldeOk == 1 then C.ink else C.red
	p.Kpis.Budget.Valeur.Text = k.budget
	p.Kpis.Salaires.Valeur.Text = k.salaires
	p.Kpis.Salaires.Petit.Text = "max " .. k.max
	p.Kpis.Bilan.Valeur.Text = k.bilan
	p.Kpis.Bilan.Valeur.TextColor3 = if k.bilanOk == 1 then C.green else C.red
	for _, x in { { p.Grille.A.Recettes, d.recettes, C.green, "Income" }, { p.Grille.B.Depenses, d.depenses, C.red, "Expenses" } } do
		local carte, data, col = x[1], x[2], x[3]
		carte.Ttl.Titre.Text = x[4] .. " · " .. data.total
		vider(carte.Liste)
		for i, l in data.lignes do
			local m = cloner(carte.Liste.Modele, i)
			m.K.Text = l.k
			m.V.Text = l.v
			m.Fond.Rempli.Size = UDim2.fromScale(math.clamp(l.part, 0.01, 1), 1)
			m.Fond.Rempli.BackgroundColor3 = col
		end
	end
	local st = p.Grille2.A.Stade
	st.AideBudget.Text = ("Swap part of the transfer budget for wage room, or the other way round (€1M ≈ %s per week)."):format(d.budgets.taux)
	activer(st.Budgets.VersSalaires, d.budgets.versSalaires == 1)
	activer(st.Budgets.VersTransferts, d.budgets.versTransferts == 1)
	st.StadeTitre.Text = "Stadium · " .. d.stade.nom
	st.StadeKpis.Capacite.Valeur.Text = d.stade.cap
	st.StadeKpis.Billet.Valeur.Text = d.stade.billet
	st.Agrandir.Text = ("Add 2,000 seats (%s)"):format(d.stade.cout)
	activer(st.Agrandir, d.stade.possible == 1)
	st.TvTexte.Text = ("TV rights %s · sponsors %s per season."):format(d.stade.tv, d.stade.sponsors)
	local inf = p.Grille2.B.Infra
	vider(inf.Liste)
	for i, f in d.infra do
		ligne(inf.Liste, i, {
			nom = f.n, meta = etoiles(f.niv) .. "  " .. echap(f.desc), metaRiche = true, droiteL = 200,
			droite = function(dr)
				if f.cout ~= "" then
					local b = bouton(dr, "Upgrade · " .. f.cout, "normal", function()
						confirmer("Upgrade " .. f.n .. "?", ("Cost: %s, paid from the club's balance."):format(f.cout), "Upgrade", function()
							action("club", { e = "finances", q = { f = "infra", k = f.k } })
						end)
					end)
					activer(b, f.possible == 1)
				else
					valeur(dr, "Max", C.gold)
				end
			end,
		})
	end
	local sal = p.Salaires
	vider(sal.Liste)
	for i, x in d.salaires do
		ligne(sal.Liste, i, {
			nom = x.nom, droiteL = 110,
			gauche = function(g)
				pastillePoste(g, x.pos)
				return 46
			end,
			droite = function(dr)
				valeur(dr, x.v)
			end,
			clic = function()
				ouvrirFiche(x.id)
			end,
		})
	end
end

PAGES.club = function(d)
	local p = contenu.club
	p.Entete.Textes.Titre.Text = d.titre or "Club"
	p.Entete.Textes.Sous.Text = d.sous or d.vide or ""
	p.Grille.Visible = d.vide == nil
	p.Grille2.Visible = d.vide == nil
	if d.vide then
		return
	end
	local pr = p.Grille.A.President
	local conf = d.president.confiance
	pr.Kpis.Confiance.Valeur.Text = conf .. "% · " .. d.president.label
	pr.Kpis.Confiance.Barre.Rempli.Size = UDim2.fromScale(math.clamp(conf / 100, 0.02, 1), 1)
	pr.Kpis.Confiance.Barre.Rempli.BackgroundColor3 = if conf >= 60 then C.green elseif conf >= 35 then C.orange else C.red
	pr.Kpis:FindFirstChild("Position").Valeur.Text = d.president.position
	pr.Objectif.RichText = true
	pr.Objectif.Text = "<b>Objective:</b> " .. echap(d.president.objectif)
	pr.Aide.Text = d.president.aide
	local dl = p.Grille.B.Delegation
	for _, k in { "renew", "fill", "auto" } do
		local b = dl[k].Interrupteur
		local on = d.delegation[k] == 1
		b.Text = if on then "ON" else "OFF"
		b.BackgroundColor3 = if on then C.lime else C.panel3
		b.TextColor3 = if on then C.limeink else C.mute
	end
	local tr = p.Grille2.A.Trophees
	vider(tr.Liste)
	for i, t in d.trophees do
		ligne(tr.Liste, i, { nom = t.n, meta = t.s, droiteL = 20 })
	end
	tr.Vide.Visible = #d.trophees == 0
	local hi = p.Grille2.B.Historique
	vider(hi.Liste)
	for i, h in d.historique do
		ligne(hi.Liste, i, { nom = h.s, meta = h.txt, droiteL = 20 })
	end
	hi.Vide.Visible = #d.historique == 0
end

PAGES.carriere = function(d)
	local p = contenu.carriere
	p.Entete.Textes.Titre.Text = d.titre
	p.Entete.Textes.Sous.Text = d.sous
	p.Entete.Actions.Demission.Visible = d.club == 1
	local k = d.kpis
	p.Kpis.Score.Valeur.Text = k.score
	p.Kpis.Score.Valeur.TextColor3 = C.lime
	p.Kpis.Matchs.Valeur.Text = tostring(k.matchs)
	p.Kpis.Bilan.Valeur.Text = k.bilan
	p.Kpis.Pct.Valeur.Text = k.pct
	p.Kpis.Trophees.Valeur.Text = tostring(k.trophees)
	p.Kpis.Licenciements.Valeur.Text = tostring(k.licenciements)
	local calc = p.Grille.A.Calcul
	vider(calc.Liste)
	for i, x in d.calcul do
		ligne(calc.Liste, i, { nom = x.k, droiteL = 110, droite = function(dr)
			valeur(dr, x.v, C.lime)
		end })
	end
	if #d.calcul == 0 then
		ligne(calc.Liste, 1, { nom = "Win matches to score points.", droiteL = 20 })
	end
	calc.Regle.Text = d.regle or calc.Regle.Text
	local tr = p.Grille.B.Trophees
	vider(tr.Liste)
	for i, t in d.trophees do
		ligne(tr.Liste, i, { nom = t.n, meta = t.meta, droiteL = 20 })
	end
	if #d.trophees == 0 then
		ligne(tr.Liste, 1, { nom = "No trophies yet.", droiteL = 20 })
	end
	local po = p.Postes
	po.Ttl.Titre.Text = ("Vacant jobs (%d)"):format(#d.postes)
	vider(po.Liste)
	for i, v in d.postes do
		ligne(po.Liste, i, {
			nom = v.n, meta = v.meta, droiteL = 130,
			gauche = function(g)
				blason(piece("Blason", g), v.coul, v.abr)
				return 34
			end,
			droite = function(dr)
				if v.envoye == 1 then
					valeur(dr, "Applied", C.mute).TextSize = 15
				else
					bouton(dr, "Apply", "pri", function()
						action("postuler", { e = "carriere", id = v.id })
					end)
				end
			end,
		})
	end
	if #d.postes == 0 then
		ligne(po.Liste, 1, { nom = "No vacant jobs right now. Clubs often sack their manager during the season.", droiteL = 20 })
	end
	local sa = p.Saisons
	vider(sa.Liste)
	for i, s in d.saisons or {} do
		ligne(sa.Liste, i, { nom = s.s, meta = s.txt, droiteL = 60, droite = function(dr)
			pastille(dr, if s.ok == 1 then "✓" else "✗", if s.ok == 1 then C.green else C.red, C.limeink, 32)
		end })
	end
	sa.Vide.Visible = #(d.saisons or {}) == 0
end

PAGES.mondial = function(d)
	local p = contenu.mondial
	p.Entete.Textes.Sous.Text = ("Every Tactico manager, on the website and on Roblox. Your score: %s pts"):format(d.score or "0")
	p.Moi.Text = if (d.moi or "") ~= "" then "Your rank: " .. d.moi else ""
	p.Moi.Visible = (d.moi or "") ~= ""
	local tab = p.Carte.Tableau
	vider(tab.Lignes)
	if d.erreur then
		ligneTableau(tab, 1, { Manager = d.erreur })
		return
	end
	for i, r in d.lignes or {} do
		ligneTableau(tab, i, {
			Rang = r.rang, Manager = r.nom, Club = (if r.coul then ('<font color="%s">■</font>  '):format(r.coul[1]) else "") .. echap(r.club),
			Score = r.score, Trophees = r.tr, Saisons = r.saisons, Pct = r.pct,
		}, { moi = r.moi == 1, zone = if r.moi == 1 then C.lime else nil, riche = { "Club" } })
	end
	if #(d.lignes or {}) == 0 then
		ligneTableau(tab, 1, { Manager = "Nobody yet: be the first!" })
	end
end

PAGES.options = function(d)
	local p = contenu.options
	p.Entete.Textes.Sous.Text = "Your career is saved automatically on the Tactico server."
	p.Carte.Texte.Text = ("Manager %s · %s · season %s.\n\nContinue moves time forward to the next event. Before each match, set your tactics, then play it live in 3D or get a quick result. Rotate your squad, sign players, develop youngsters and meet the chairman's objectives. Every win, trophy and objective adds points to your world ranking score."):format(d.manager, d.club, d.saison)
	p.Carte.Confirmer.Text = ""
end

-- ---------- Fiche d'un joueur ----------
ouvrirFiche = function(id, d)
	if not d then
		local res = appeler({ a = "vue", e = "joueur", q = { id = id } })
		if res.error then
			toast(res.error, "err")
			return
		end
		if res.haut then
			majHaut(res.haut)
		end
		d = res.d
	end
	if not d then
		return
	end
	ouvrirModale(d.nom or "Player", d.sous or "")
	if d.vide then
		texteModale(d.vide, C.mute)
		return
	end
	local lignes = {}
	if (d.statut or "") ~= "" then
		table.insert(lignes, d.statut)
	end
	if (d.blessure or "") ~= "" then
		table.insert(lignes, d.blessure)
	end
	if #lignes > 0 then
		texteModale(table.concat(lignes, " · "), if (d.blessure or "") ~= "" then C.red else C.gold)
	end
	corps.Kpis.Visible = true
	for i, k in d.kpis or {} do
		local c = cloner(corps.Kpis.Modele, i)
		c.Libelle.Text = k[1]
		c.Valeur.Text = k[2]
		if k[1] == "Overall" or k[1] == "Potential" then
			c.Valeur.TextColor3 = couleurNote(k[2])
		end
	end
	if d.prix and d.prix ~= "" then
		local c = cloner(corps.Kpis.Modele, 99)
		c.Libelle.Text = "Asking price"
		c.Valeur.Text = d.prix
		c.Valeur.TextColor3 = C.gold
	end
	corps.Groupes.Visible = true
	for i, g in d.groupes or {} do
		local cg = cloner(corps.Groupes.Modele, i)
		cg.Titre.Text = g.n
		for j, a in g.attrs do
			local l = cloner(cg.Ligne, j)
			l.Nom.Text = a.n
			l.Valeur.Text = tostring(a.v)
			l.Valeur.TextColor3 = couleurAttr(a.v)
		end
	end
	corps.Texte2.Visible = true
	corps.Texte2.Text = d.stats or ""
	corps.Texte2.TextColor3 = C.mute
	local id2 = d.id
	local function act(f, e)
		action("joueur", { e = e or "joueur", q = { id = id2, f = f } })
	end
	if d.monJoueur == 1 then
		if d.jeune == 1 then
			boutonModale(1, "Promote to the first team", "pri", function()
				act("promouvoir")
			end)
			boutonModale(3, "Release", "danger", function()
				confirmer("Release " .. d.nom .. "?", "The youngster will leave the club.", "Release", function()
					act("liberer", "effectif")
				end, true)
			end)
		else
			boutonModale(1, if d.transferable == 1 then "Remove from transfer list" else "Put on transfer list", "normal", function()
				act("liste")
			end)
			if d.pret ~= 1 then
				boutonModale(2, "Extend contract (" .. (d.demande or "?") .. "/wk)", "pri", function()
					act("prolonger")
				end)
			end
			boutonModale(3, if d.tireur == 1 then "✓ Penalty taker" else "Make penalty taker", "normal", function()
				act("penalty")
			end)
			if d.pret ~= 1 then
				boutonModale(4, "Release (" .. (d.liberation or "?") .. ")", "danger", function()
					confirmer("Release " .. d.nom .. "?", ("Severance pay: %s (half of the remaining wages). The player becomes a free agent."):format(d.liberation or "?"), "Release", function()
						act("liberer", "effectif")
					end, true)
				end)
			end
		end
	elseif d.libre == 1 then
		boutonModale(1, "Offer a contract (free agent)", "pri", function()
			action("offre", { e = "joueur", q = { id = id2, fee = 0 } })
		end)
	elseif d.libre == 0 and d.pret ~= 1 then
		local box = corps.Actions.Montant
		box.Visible = true
		box.PlaceholderText = "Amount (€M)"
		box.Text = ("%.1f"):format((d.prixBrut or 0) / 1e6):gsub("%.0$", "")
		boutonModale(1, "Make an offer", "pri", function()
			local m = tonumber((box.Text:gsub(",", "."):gsub("[^%d%.]", "")))
			if not m or m < 0 then
				toast("Enter an amount in millions of euros, e.g. 12.5", "warn")
				return
			end
			local res = action("offre", { e = "joueur", q = { id = id2, fee = math.floor(m * 1e6 + 0.5) } })
			if res.contre then
				box.Text = ("%.2f"):format(res.contre / 1e6):gsub("0+$", ""):gsub("%.$", "")
			end
		end)
		if d.ouvert ~= 1 then
			corps.Retour.Visible = true
			corps.Retour.Text = "The transfer window is closed: offers will be possible when it reopens."
		end
	end
end

-- ---------- Messages ----------
local function repondre(id, r)
	local res = appeler({ a = "repondre", id = id, q = { r = r }, e = ecranCourant or "messagerie" })
	afficher(res)
	if r == "plus" and res.ok then
		lireMessage(id)
	elseif not res.error then
		fermerModale()
	end
end

lireMessage = function(id)
	local e = ecranCourant or "messagerie"
	local res = appeler({ a = "lire", id = id, e = e, q = params[e] or {} })
	local m = res.message
	res.message = nil
	afficher(res)
	if not m or m.error then
		toast(m and m.error or res.error or "Message not found.", "err")
		return
	end
	ouvrirModale(m.titre, (m.de or "") .. " · " .. (m.date or ""))
	texteModale(m.corps)
	if m.act then
		corps.Texte2.Visible = true
		corps.Texte2.Text = m.act.texte
		corps.Texte2.TextColor3 = C.gold
		if m.act.type == "bid" then
			boutonModale(1, "Accept", "pri", function()
				repondre(m.id, "accepter")
			end)
			if m.act.plus == 1 then
				boutonModale(2, "Ask for 20% more", "normal", function()
					repondre(m.id, "plus")
				end)
			end
			boutonModale(3, "Reject", "danger", function()
				repondre(m.id, "refuser")
			end)
		elseif m.act.type == "job" then
			boutonModale(1, "Accept the job", "pri", function()
				repondre(m.id, "accepter")
			end)
			boutonModale(2, "Decline", "normal", function()
				repondre(m.id, "refuser")
			end)
		end
	elseif m.traite then
		corps.Retour.Visible = true
		corps.Retour.Text = m.traite
	end
	if (m.pid or "") ~= "" then
		boutonModale(4, "View player", "normal", function()
			ouvrirFiche(m.pid)
		end)
	end
end

-- ---------- Match ----------
local function ouvrirApresMatch(m)
	local a = m.apres
	aller("accueil")
	ouvrirModale(a.titre, a.comp)
	modale.Boite.Titre.TextColor3 = if a.res == "W" then C.lime elseif a.res == "L" then C.red else C.gold
	corps.Score.Visible = true
	corps.Score.Dom.Text = a.dom
	corps.Score.Resultat.Text = a.score
	corps.Score.Ext.Text = a.ext
	texteModale(("Man of the match: %s\n%s"):format(a.hdm ~= "" and a.hdm or "—", a.stats or ""))
	if #a.buts > 0 then
		corps.Liste.Visible = true
		for i, b in a.buts do
			ligne(corps.Liste, i, { nom = ("%s'  %s"):format(tostring(b.min), b.txt), meta = if b.t == 0 then a.dom else a.ext, droiteL = 20 })
		end
	end
	corps.Texte2.Visible = true
	corps.Texte2.Text = "Your players' ratings"
	corps.Texte2.TextColor3 = C.mute
	corps.Liste2.Visible = true
	for i, n in a.notes do
		ligne(corps.Liste2, i, {
			nom = n.nom, droiteL = 60,
			gauche = function(g)
				pastillePoste(g, n.pos)
				return 46
			end,
			droite = function(dr)
				pastille(dr, n.r, couleurMatch(n.r), C.limeink, 44)
			end,
		})
	end
	boutonModale(1, "Continue", "pri", fermerModale)
end

local function finMatch(m)
	if not enMatch then
		return
	end
	enMatch = false
	Interface.quitterPerso = nil
	Interface.hud(false)
	local bm = gui.Hud.Commandes:FindFirstChild("Menu")
	if bm then
		bm.Text = "MENU"
	end
	task.defer(Spectacle.arreter)
	jeu.Visible = true
	ouvrirApresMatch(m)
end

local function auxTribunes()
	local c = joueur.Character
	local stade = workspace:FindFirstChild("Stade")
	local centre = stade and stade:FindFirstChild("Centre")
	if c and c.PrimaryPart and centre then
		pcall(function()
			c:PivotTo(centre.CFrame * CFrame.new(Random.new():NextNumber(-40, 40), 20, 152.2))
		end)
	end
end

local function jouerDirect()
	local res = appeler({ a = "jouer", e = "match" }, "Preparing the match: the players are getting changed…")
	if res.error then
		toast(res.error, "err")
		if res.perdue then
			Carriere.titre()
		end
		return
	end
	if res.haut then
		majHaut(res.haut)
	end
	local m = res.match
	if not m then
		return
	end
	local dossier = m.dossier
	if typeof(dossier) ~= "Instance" then
		dossier = T:WaitForChild("Acteurs"):FindFirstChild(tostring(joueur.UserId))
	end
	local info = {
		h = { n = m.clubs[1].n, a = m.clubs[1].a }, a = { n = m.clubs[2].n, a = m.clubs[2].a },
		kits = m.kits, joueurs = m.joueurs, dossier = dossier,
	}
	fermerModale()
	enMatch = true
	jeu.Visible = false
	auxTribunes()
	Interface.debutMatch(info)
	local bm = gui.Hud.Commandes:FindFirstChild("Menu")
	if bm then
		bm.Text = "SKIP"
	end
	Interface.quitterPerso = function()
		finMatch(m)
	end
	local adaptateur = setmetatable({
		fin = function()
			finMatch(m)
		end,
	}, { __index = Interface })
	Spectacle.jouer(m, info, adaptateur)
end

local function jouerRapide()
	local res = appeler({ a = "jouer", e = "match", rapide = true }, "Simulating the match…")
	if res.error then
		toast(res.error, "err")
		if res.perdue then
			Carriere.titre()
		end
		return
	end
	if res.haut then
		majHaut(res.haut)
	end
	if res.match then
		ouvrirApresMatch(res.match)
	end
end

local function continuer()
	if hautData and hautData.jourDeMatch then
		aller("match")
		return
	end
	local res = appeler({ a = "continuer" }, "Advancing…")
	afficher(res)
	if res.rapport then
		ouvrirModale(res.rapport.titre, "")
		texteModale(res.rapport.texte)
		boutonModale(1, res.rapport.bouton or "Continue", "pri", fermerModale)
	end
end

-- ---------- Écran titre et création ----------
local function majCreation()
	local pg = creation.Page
	marquer(pg.Pays, choixCreation.pays)
	local P = nil
	for _, x in listePays or {} do
		if x.code == choixCreation.pays then
			P = x
		end
	end
	if not P then
		return
	end
	pg.Divisions["1"].Text = P.d1
	pg.Divisions["2"].Text = P.d2
	marquer(pg.Divisions, choixCreation.div)
	vider(pg.Clubs)
	for i, c in P.clubs[choixCreation.div] or {} do
		local b = cloner(pg.Clubs.Modele, i)
		b.Name = c.id
		blason(b.Blason, c.coul, c.a)
		b.Nom.Text = c.n
		b.Etoiles.RichText = true
		b.Etoiles.Text = etoiles(c.et)
		b.Note.Text = "Rating " .. c.note
		b.Objectif.Text = c.obj
		if choixCreation.club == c.id then
			marquerLigne(b, C.lime)
		end
		b.Activated:Connect(function()
			choixCreation.club = c.id
			choixCreation.nomClub = c.n
			majCreation()
		end)
	end
	creation.Barre.Choix.Text = if choixCreation.club then ("%s · ready to take charge?"):format(choixCreation.nomClub) else "Pick a club from the list."
	activer(creation.Barre.Valider, choixCreation.club ~= nil)
end

local function ouvrirCreation()
	titre.Visible = false
	creation.Visible = true
	local nom = creation.Page.Manager.Nom
	if nom.Text == "" then
		nom.Text = joueur.DisplayName
	end
	if not listePays then
		local res = appeler({ a = "clubs" }, "Loading clubs…")
		if res.error or not res.pays then
			toast(res.error or "Could not load the clubs.", "err")
			Carriere.titre()
			return
		end
		listePays = res.pays
	end
	majCreation()
end

local function valider()
	if not choixCreation.club then
		toast("Pick a club first.", "warn")
		return
	end
	local nom = creation.Page.Manager.Nom.Text
	local res = appeler({ a = "nouvelle", nom = nom, club = choixCreation.club }, "Creating your career…")
	if res.error then
		toast(res.error, "err")
		return
	end
	creation.Visible = false
	jeu.Visible = true
	ecranCourant = nil
	params = {}
	afficher(res)
	toast("Welcome to " .. choixCreation.nomClub .. "! Read your inbox, then press Continue.")
end

local function classementModale()
	local res = appeler({ a = "classement" }, "Loading the world ranking…")
	ouvrirModale("World ranking", "Every Tactico manager, on the website and on Roblox")
	local d = res.classement
	if not d or d.erreur then
		texteModale((d and d.erreur) or res.error or "The world ranking is unavailable right now.", C.mute)
		return
	end
	corps.Liste.Visible = true
	for i, r in d.lignes or {} do
		ligne(corps.Liste, i, {
			nom = ("#%d  %s"):format(r.rang, r.nom), meta = ("%s · %s season(s) · %s wins"):format(r.club, r.saisons, r.pct), droiteL = 130,
			droite = function(dr)
				valeur(dr, r.score .. " pts", C.lime)
			end,
		})
	end
	if #(d.lignes or {}) == 0 then
		texteModale("Nobody yet: be the first!", C.mute)
	end
end

-- ---------- Liaison avec le site (code à 6 caractères) ----------
local function importerDuSite()
	ouvrirModale("Import from website", "Play your website career here")
	texteModale("1. On tactico123.netlify.app, open Options, then « Envoyer ma carrière vers Roblox ».\n2. Enter the 6-character code below. It works once, for 30 minutes.\n\nReal players get changed names here, and the game is in English.", C.mute)
	if joueur:GetAttribute("Carriere") then
		corps.Retour.Visible = true
		corps.Retour.Text = "This replaces your current Roblox career."
	end
	local box = corps.Actions.Montant
	box.Visible = true
	box.Text = ""
	box.PlaceholderText = "Code, e.g. ABC123"
	boutonModale(1, "Import", "pri", function()
		local code = string.upper((box.Text:gsub("[^%w]", "")))
		if #code ~= 6 then
			toast("Enter the 6-character code shown on the website.", "warn")
			return
		end
		local res = appeler({ a = "importer", code = code }, "Importing your career…")
		if res.error then
			toast(res.error, "err")
			return
		end
		fermerModale()
		titre.Visible = false
		creation.Visible = false
		jeu.Visible = true
		ecranCourant = nil
		afficher(res)
	end)
	boutonModale(2, "Cancel", "normal", fermerModale)
end

local function envoyerAuSite()
	local res = appeler({ a = "exporter" }, "Preparing your code…")
	if res.error then
		toast(res.error, "err")
		return
	end
	ouvrirModale("Send to website", "Continue this career on the website")
	texteModale(("<font size=\"46\" color=\"#c6f43d\"><b>%s</b></font>\n\n1. Open tactico123.netlify.app.\n2. Go to Options, then « Récupérer ma carrière Roblox ».\n3. Enter this code. It works once, for %d minutes.\n\nYour career also stays here on Roblox."):format(echap(res.code or ""), res.minutes or 30))
	corps.Texte.RichText = true
	boutonModale(1, "OK", "pri", fermerModale)
end

-- ---------- Branchements ----------
local function brancherTout()
	local B = titre.Colonne.Boutons
	B.Nouvelle.Activated:Connect(function()
		if joueur:GetAttribute("Carriere") then
			confirmer("Start a new career?", "Your current career will be deleted for good.", "New career", ouvrirCreation, true)
		else
			ouvrirCreation()
		end
	end)
	B.Reprendre.Activated:Connect(function()
		titre.Visible = false
		jeu.Visible = true
		ecranCourant = nil
		aller("accueil")
	end)
	B.Amical.Activated:Connect(function()
		titre.Visible = false
		if actionsExt.amical then
			actionsExt.amical()
		end
	end)
	B.Mondial.Activated:Connect(classementModale)
	B.Site.Activated:Connect(importerDuSite)
	joueur:GetAttributeChangedSignal("Carriere"):Connect(function()
		B.Reprendre.Visible = joueur:GetAttribute("Carriere") == true
	end)

	local pg = creation.Page
	pg.Retour.Activated:Connect(Carriere.titre)
	brancherOnglets(pg.Pays, function(cle)
		choixCreation.pays = cle
		majCreation()
	end)
	brancherOnglets(pg.Divisions, function(cle)
		choixCreation.div = tonumber(cle) or 1
		majCreation()
	end)
	brancher(creation.Barre.Valider, valider)

	brancher(haut.Continuer, continuer)
	for _, b in menuListe:GetChildren() do
		local e = b:IsA("GuiButton") and b:GetAttribute("Ecran")
		if e then
			b.Activated:Connect(function()
				aller(e)
			end)
		end
	end
	modale.Boite.Fermer.Activated:Connect(fermerModale)
	local fond = modale:FindFirstChild("Fond")
	if fond then
		fond.Activated:Connect(fermerModale)
	end

	-- accueil
	local acc = contenu.accueil
	acc.Hero.Boutons.Avancer.Activated:Connect(continuer)
	acc.Hero.Boutons.Preparer.Activated:Connect(function()
		aller("match")
	end)
	acc.Hero.Boutons.Tactique.Activated:Connect(function()
		aller("tactique")
	end)
	acc.Grille1.A.Ligue.Ttl.Bouton.Activated:Connect(function()
		aller("competitions", { o = "table" })
	end)
	acc.Grille2.A.Messages.Ttl.Bouton.Activated:Connect(function()
		aller("messagerie")
	end)
	-- messagerie
	contenu.messagerie.Entete.Actions.ToutLire.Activated:Connect(function()
		action("toutLire", { e = "messagerie" })
	end)
	-- effectif
	local eff = contenu.effectif
	brancherOnglets(eff.Groupes, function(cle)
		params.effectif = params.effectif or {}
		params.effectif.g = cle
		aller("effectif")
	end)
	brancherOnglets(eff.Tri, function(cle)
		params.effectif = params.effectif or {}
		params.effectif.tri = cle
		aller("effectif")
	end)
	-- tactique
	local tac = contenu.tactique
	brancherOnglets(tac.Formations, function(cle)
		selectionTac = nil
		action("tactique", { e = "tactique", q = { f = cle } })
	end)
	tac.Entete.Actions.Auto.Activated:Connect(function()
		selectionTac = nil
		action("tactique", { e = "tactique", q = { auto = true } })
	end)
	tac.Entete.Actions.Delegue.Activated:Connect(function()
		local d = derniere.tactique
		action("tactique", { e = "tactique", q = { delegue = not (d and d.delegue == 1) } })
	end)
	for _, k in { "ment", "press", "style", "width", "line" } do
		brancherOnglets(tac.Grille.B.Consignes[k], function(cle)
			action("tactique", { e = "tactique", q = { [k] = tonumber(cle) } })
		end)
	end
	tac.Grille.B.Consignes.Penalty.Activated:Connect(choisirTireur)
	-- jour de match
	local mt = contenu.match
	mt.Hero.Boutons.Direct.Activated:Connect(jouerDirect)
	mt.Hero.Boutons.Rapide.Activated:Connect(jouerRapide)
	mt.Hero.Boutons.Tactique.Activated:Connect(function()
		aller("tactique")
	end)
	-- calendrier
	brancherOnglets(contenu.calendrier.Filtres, function(cle)
		aller("calendrier", { f = cle })
	end)
	-- compétitions
	local co = contenu.competitions
	local function comp(o)
		params.competitions = params.competitions or {}
		for k, v in o do
			params.competitions[k] = v
		end
		aller("competitions")
	end
	brancherOnglets(co.Onglets, function(cle)
		comp({ o = cle })
	end)
	brancherOnglets(co.Pays, function(cle)
		comp({ pays = cle, div = 1 })
	end)
	brancherOnglets(co.Divisions, function(cle)
		comp({ div = tonumber(cle) or 1 })
	end)
	-- mercato
	local me = contenu.mercato
	brancherOnglets(me.Onglets, function(cle)
		params.mercato = params.mercato or {}
		params.mercato.o = cle
		aller("mercato")
	end)
	for nom, liste in FILTRES do
		local b = me.Filtres:FindFirstChild(nom)
		if b then
			b.Activated:Connect(function()
				params.mercato = params.mercato or {}
				local f = (derniere.mercato and derniere.mercato.filtres) or {}
				local actuel = params.mercato[nom] or f[nom] or liste[1][1]
				local i = 1
				for k, x in liste do
					if tostring(x[1]) == tostring(actuel) then
						i = k
					end
				end
				params.mercato[nom] = liste[i % #liste + 1][1]
				params.mercato.o = "search"
				aller("mercato")
			end)
		end
	end
	-- entraînement
	brancherOnglets(contenu.entrainement.Grille.A.Themes.Intensite, function(cle)
		action("entrainement", { e = "entrainement", q = { int = tonumber(cle) } })
	end)
	-- finances
	local st = contenu.finances.Grille2.A.Stade
	brancher(st.Budgets.VersSalaires, function()
		action("club", { e = "finances", q = { f = "budget", v = 1 } })
	end)
	brancher(st.Budgets.VersTransferts, function()
		action("club", { e = "finances", q = { f = "budget", v = -1 } })
	end)
	brancher(st.Agrandir, function()
		confirmer("Expand the stadium?", st.Agrandir.Text .. ". The cost is paid from the club's balance.", "Expand", function()
			action("club", { e = "finances", q = { f = "stade" } })
		end)
	end)
	-- club
	local dl = contenu.club.Grille.B.Delegation
	for _, k in { "renew", "fill", "auto" } do
		dl[k].Interrupteur.Activated:Connect(function()
			action("club", { e = "club", q = { f = "delegation", k = k } })
		end)
	end
	-- carrière
	local car = contenu.carriere
	car.Entete.Actions.Demission.Activated:Connect(function()
		confirmer("Resign?", "You will leave your club and will have to find a new job. Your reputation will drop a little.", "Resign", function()
			action("club", { e = "carriere", q = { f = "demission" } })
		end, true)
	end)
	car.Grille.A.Calcul.Ttl.Bouton.Activated:Connect(function()
		aller("mondial")
	end)
	-- classement mondial
	contenu.mondial.Entete.Actions.Actualiser.Activated:Connect(function()
		aller("mondial")
	end)
	-- options
	local op = contenu.options.Carte.Boutons
	op.Titre.Activated:Connect(Carriere.titre)
	local site = contenu.options.Site.Boutons
	site.Envoyer.Activated:Connect(envoyerAuSite)
	site.Importer.Activated:Connect(importerDuSite)
	op.Abandonner.Activated:Connect(function()
		confirmer("Abandon your career?", "Your career will be deleted for good. Your world ranking score stays on the leaderboard.", "Abandon career", function()
			local res = appeler({ a = "supprimer" })
			if res.error then
				toast(res.error, "err")
				return
			end
			toast("Career deleted.")
			Carriere.titre()
		end, true)
	end)
end

-- ---------- Démarrage ----------
function Carriere.init(a)
	actionsExt = a or {}
	gui = joueur:WaitForChild("PlayerGui"):WaitForChild("TacticoGui")
	titre = gui:WaitForChild("Titre")
	creation = gui:WaitForChild("Creation")
	chargementF = gui:WaitForChild("Chargement")
	jeu = gui:WaitForChild("Jeu")
	modale = gui:WaitForChild("Modale")
	toastF = gui:WaitForChild("Toast")
	modeles = gui:WaitForChild("Modeles")
	haut = jeu:WaitForChild("Haut")
	local corpsJeu = jeu:WaitForChild("Corps")
	menuListe = corpsJeu:WaitForChild("Menu"):WaitForChild("Liste")
	contenu = corpsJeu:WaitForChild("Contenu")
	corps = modale:WaitForChild("Boite"):WaitForChild("Corps")
	-- le chargement passe au-dessus de tout
	chargementF.ZIndex = 60
	for _, x in chargementF:GetDescendants() do
		if x:IsA("GuiObject") then
			x.ZIndex = 61
		end
	end
	toastF.Visible = false
	chargementF.Visible = false
	brancherTout()
	Carriere.titre()
end

return Carriere
