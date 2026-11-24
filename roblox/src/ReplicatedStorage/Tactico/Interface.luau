--[[
	Tactico (Roblox) : branche l'interface rangée dans StarterGui (TacticoGui).
	L'interface se modifie directement dans Studio ; ce module garde seulement les noms :
	Menu (Zone.Domicile / Zone.Exterieur avec Pays, Divisions, Liste.ModeleClub, Choix, Bande ;
	Bas.Statut, Bas.Hasard, Bas.Lancer), Hud (Tableau, Fil.ModeleLigne, Banniere, Commandes)
	et Fin (Score, ButsH, ButsA, Stats, Rejouer, Nouveau).
]]
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local Interface = {}

local ACCENT = Color3.fromRGB(46, 204, 113)
local CARTE = Color3.fromRGB(28, 34, 52)
local CARTE2 = Color3.fromRGB(40, 48, 72)
local CHOISI = Color3.fromRGB(36, 92, 64)
local FOND = Color3.fromRGB(14, 18, 30)
local GRIS = Color3.fromRGB(160, 170, 190)
local BLANC = Color3.new(1, 1, 1)

local gui, menu, hud, fin, statut, tab, fil, ban, cmd, modeleLigne
local actions = {}
local monde = nil
local selection = { nil, nil }
local colonnes = {}
local dernierChoix = nil

local function couleur(hex)
	local ok, c = pcall(Color3.fromHex, hex)
	return if ok then c else GRIS
end

local function majColonne(col)
	for _, e in col.liste:GetChildren() do
		if e:IsA("GuiButton") and e ~= col.modele then
			e:Destroy()
		end
	end
	for _, b in col.pays:GetChildren() do
		if b:IsA("GuiButton") then
			b.BackgroundColor3 = if b:GetAttribute("Pays") == col.code then ACCENT else CARTE2
		end
	end
	for _, b in col.divs:GetChildren() do
		if b:IsA("GuiButton") then
			b.BackgroundColor3 = if b:GetAttribute("Div") == col.div then ACCENT else CARTE2
		end
	end
	if not monde then
		return
	end
	local tries = {}
	for _, c in monde.clubs do
		if c.pays == col.code and c.div == col.div then
			table.insert(tries, c)
		end
	end
	table.sort(tries, function(a, b)
		return a.rep > b.rep
	end)
	for k, c in tries do
		local b = col.modele:Clone()
		b.Name = c.id
		b.Visible = true
		b.LayoutOrder = k
		b.Nom.Text = c.n
		b.Couleur1.BackgroundColor3 = couleur(c.coul[1])
		b.Couleur2.BackgroundColor3 = couleur(c.coul[2])
		b.BackgroundColor3 = if selection[col.i] == c.id then CHOISI else CARTE
		b.Activated:Connect(function()
			selection[col.i] = c.id
			col.choix.Text = c.n
			col.bande.BackgroundColor3 = couleur(c.coul[1])
			majColonne(col)
		end)
		b.Parent = col.liste
	end
	col.liste.CanvasPosition = Vector2.zero
end

local function brancherColonne(i, cadre)
	local col = {
		i = i, code = cadre:GetAttribute("PaysDepart") or "FR", div = 1,
		pays = cadre:WaitForChild("Pays"), divs = cadre:WaitForChild("Divisions"), liste = cadre:WaitForChild("Liste"),
		choix = cadre:WaitForChild("Choix"), bande = cadre:WaitForChild("Bande"),
	}
	col.modele = col.liste:WaitForChild("ModeleClub")
	col.modele.Visible = false
	for _, b in col.pays:GetChildren() do
		if b:IsA("GuiButton") then
			b.Activated:Connect(function()
				col.code = b:GetAttribute("Pays")
				majColonne(col)
			end)
		end
	end
	for _, b in col.divs:GetChildren() do
		if b:IsA("GuiButton") then
			b.Activated:Connect(function()
				col.div = b:GetAttribute("Div")
				majColonne(col)
			end)
		end
	end
	colonnes[i] = col
end

local function lancer(h, a)
	if not h or not a then
		statut.Text = "Choisis les deux équipes."
		return
	end
	if h == a then
		statut.Text = "Choisis deux équipes différentes."
		return
	end
	dernierChoix = { h, a }
	statut.Text = "Préparation du match…"
	actions.lancer(h, a)
end

local function auHasard()
	if not monde then
		return
	end
	local d1 = {}
	for _, c in monde.clubs do
		if c.div == 1 and c.rep >= 70 then
			table.insert(d1, c.id)
		end
	end
	if #d1 < 2 then
		return
	end
	local rnd = Random.new()
	local h = d1[rnd:NextInteger(1, #d1)]
	local a
	repeat
		a = d1[rnd:NextInteger(1, #d1)]
	until a ~= h
	lancer(h, a)
end

local function vitesseChoisie(v)
	for _, x in cmd:GetChildren() do
		if x:IsA("GuiButton") and x:GetAttribute("Vitesse") then
			x.BackgroundColor3 = if x:GetAttribute("Vitesse") == v then ACCENT else CARTE2
		end
	end
end

function Interface.init(a)
	actions = a
	gui = Players.LocalPlayer:WaitForChild("PlayerGui"):WaitForChild("TacticoGui")
	menu, hud, fin = gui:WaitForChild("Menu"), gui:WaitForChild("Hud"), gui:WaitForChild("Fin")
	statut = menu:WaitForChild("Bas"):WaitForChild("Statut")
	tab, fil, ban, cmd = hud:WaitForChild("Tableau"), hud:WaitForChild("Fil"), hud:WaitForChild("Banniere"), hud:WaitForChild("Commandes")
	modeleLigne = fil:WaitForChild("ModeleLigne")
	modeleLigne.Visible = false
	local zone = menu:WaitForChild("Zone")
	brancherColonne(1, zone:WaitForChild("Domicile"))
	brancherColonne(2, zone:WaitForChild("Exterieur"))
	menu.Bas:WaitForChild("Lancer").Activated:Connect(function()
		lancer(selection[1], selection[2])
	end)
	menu.Bas:WaitForChild("Hasard").Activated:Connect(auHasard)
	for _, b in cmd:GetChildren() do
		if b:IsA("GuiButton") then
			local v = b:GetAttribute("Vitesse")
			if v then
				b.Activated:Connect(function()
					vitesseChoisie(v)
					actions.vitesse(v)
				end)
			elseif b.Name == "Menu" then
				b.Activated:Connect(function()
					actions.quitter()
				end)
			end
		end
	end
	fin:WaitForChild("Rejouer").Activated:Connect(function()
		actions.fermer()
		fin.Visible = false
		menu.Visible = true
		if dernierChoix then
			lancer(dernierChoix[1], dernierChoix[2])
		end
	end)
	fin:WaitForChild("Nouveau").Activated:Connect(function()
		actions.fermer()
		Interface.menu()
	end)
	menu.Visible, hud.Visible, fin.Visible, ban.Visible = true, false, false, false
	for _, col in colonnes do
		majColonne(col)
	end
end

function Interface.monde(data)
	if not data then
		statut.Text = "Impossible de charger les clubs. Vérifie que les requêtes HTTP sont autorisées."
		return
	end
	monde = data
	statut.Text = "Choisis deux équipes puis lance le match."
	for _, col in colonnes do
		majColonne(col)
	end
end

function Interface.etat(kind, x)
	if kind == "preparation" then
		statut.Text = ("Préparation : %s - %s (lancé par %s)…"):format(x.h, x.a, x.par)
	elseif kind == "erreur" then
		statut.Text = x
	end
end

function Interface.debutMatch(info)
	menu.Visible, fin.Visible, hud.Visible = false, false, true
	tab.H.Text = info.h.a
	tab.A.Text = info.a.a
	tab.CH.BackgroundColor3 = info.kits[1].maillot
	tab.CA.BackgroundColor3 = info.kits[2].maillot
	tab.Score.Text = "0 - 0"
	tab.Chrono.Text = "0'"
	for _, e in fil:GetChildren() do
		if e:IsA("TextLabel") and e ~= modeleLigne then
			e:Destroy()
		end
	end
	vitesseChoisie(1)
end

function Interface.score(h, a)
	tab.Score.Text = ("%d - %d"):format(h, a)
end

function Interface.chrono(txt)
	tab.Chrono.Text = txt .. "'"
end

local nFil = 0
function Interface.fil(txt, important)
	if not txt or txt == "" then
		return
	end
	nFil += 1
	local l = modeleLigne:Clone()
	l.Name = "Ligne"
	l.Text = txt
	l.LayoutOrder = nFil
	l.BackgroundColor3 = if important then CHOISI else FOND
	l.Visible = true
	l.Parent = fil
	local lignes = {}
	for _, e in fil:GetChildren() do
		if e:IsA("TextLabel") and e ~= modeleLigne then
			table.insert(lignes, e)
		end
	end
	table.sort(lignes, function(x, y)
		return x.LayoutOrder < y.LayoutOrder
	end)
	for k = 1, #lignes - 4 do
		lignes[k]:Destroy()
	end
end

local jetonBanniere = 0
function Interface.banniere(titre, sous, couleurTitre, duree)
	jetonBanniere += 1
	local j = jetonBanniere
	ban.Titre.Text = titre
	ban.Titre.TextColor3 = couleurTitre or BLANC
	ban.Sous.Text = sous or ""
	ban.Visible = true
	ban.Size = UDim2.fromScale(0.3, 0.08)
	TweenService:Create(ban, TweenInfo.new(0.25, Enum.EasingStyle.Back), { Size = UDim2.fromScale(0.5, 0.13) }):Play()
	task.delay(duree or 2.4, function()
		if j == jetonBanniere then
			ban.Visible = false
		end
	end)
end

function Interface.fin(r)
	hud.Visible = false
	fin.Visible = true
	fin.Score.Text = ("%s  %d - %d  %s"):format(r.h, r.score[1], r.score[2], r.a)
	fin.ButsH.Text = table.concat(r.buts[1], "\n")
	fin.ButsA.Text = table.concat(r.buts[2], "\n")
	fin.Stats.Text = r.stats or ""
end

function Interface.menu()
	hud.Visible, fin.Visible, menu.Visible = false, false, true
	statut.Text = "Choisis deux équipes puis lance le match."
end

return Interface
