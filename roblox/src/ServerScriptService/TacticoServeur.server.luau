--[[
	Tactico (Roblox) : serveur.
	Charge le monde depuis le site, prépare les matchs amicaux demandés par les joueurs
	(simulation par l'API du site, habillage des joueurs en R6) et les envoie à tout le monde.
	Mode carrière : chaque joueur a sa carrière sur le serveur du site (/api/carriere),
	sous un jeton secret gardé ici dans un DataStore. Le jeu est en anglais.
]]
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local DataStoreService = game:GetService("DataStoreService")
local TextService = game:GetService("TextService")
local LocalizationService = game:GetService("LocalizationService")

local T = RS:WaitForChild("Tactico")
local Config = require(T:WaitForChild("Config"))
local Apparence = require(T:WaitForChild("Apparence"))
local Remotes = T:WaitForChild("Remotes")
local Acteurs = T:WaitForChild("Acteurs")

local monde, listeClubs = nil, nil
local clubs, joueurs = {}, {}
local pret = false

local function charger()
	for essai = 1, 6 do
		local ok, res = pcall(HttpService.GetAsync, HttpService, Config.SITE .. Config.MONDE)
		if ok then
			local ok2, data = pcall(HttpService.JSONDecode, HttpService, res)
			if ok2 and type(data) == "table" and data.clubs then
				monde = data
				listeClubs = {}
				for _, c in data.clubs do
					clubs[c.id] = c
					for _, j in c.j do
						joueurs[j[1]] = { id = j[1], nom = j[2], pos = j[3], note = j[4], age = j[5], num = j[6], coupe = j[7], barbe = j[8], peau = j[9], club = c.id }
					end
					table.insert(listeClubs, { id = c.id, n = c.n, c = c.c, a = c.a, pays = c.pays, div = c.div, coul = c.coul, kit = c.kit, rep = c.rep, stade = c.stade })
				end
				pret = true
				print(("Tactico : monde chargé (%d clubs)"):format(#data.clubs))
				return
			end
			res = "réponse illisible"
		end
		warn("Tactico : impossible de charger le monde (essai " .. essai .. ") :", res)
		task.wait(3 * essai)
	end
end
task.spawn(charger)

Remotes.Monde.OnServerInvoke = function()
	local t0 = os.clock()
	while not pret and os.clock() - t0 < 25 do
		task.wait(0.25)
	end
	if not pret then
		return nil
	end
	return { pays = monde.pays, clubs = listeClubs }
end

local function resume(c)
	return { id = c.id, n = c.n, c = c.c, a = c.a, coul = c.coul, stade = c.stade }
end

local function estGardien(pos)
	return pos == "GB" or pos == "GK"
end

-- Habille en R6 les titulaires et les remplaçants qui entreront en jeu.
-- look(pid) → { coupe, barbe, peau, num, nom, pos } ou nil
local function habillerDans(dossier, data, clubH, clubA, look)
	local kh, ka, gbH, gbA = Apparence.maillots(clubH, clubA)
	local besoin = {}
	for t = 1, 2 do
		for _, s in data.eq[t].xi do
			besoin[s[1]] = { t = t, gb = estGardien(s[2]) }
		end
	end
	for _, m in data.min do
		for _, e in m[4] do
			if e[1] == "sub" and e[3] ~= "" and not besoin[e[3]] then
				local j = look(e[3])
				besoin[e[3]] = { t = e[2] + 1, gb = j ~= nil and estGardien(j.pos) }
			end
		end
	end
	local restants = 0
	for pid, b in besoin do
		local j = look(pid)
		if j then
			restants += 1
			task.spawn(function()
				local kit = if b.t == 1 then (if b.gb then gbH else kh) else (if b.gb then gbA else ka)
				local ok, m = pcall(Apparence.creerJoueur, { coupe = j.coupe, barbe = j.barbe, peau = j.peau }, kit, j.num, j.nom)
				if ok then
					m.Name = pid
					m.Parent = dossier
				else
					warn("Tactico : joueur non créé", pid, m)
				end
				restants -= 1
			end)
		end
	end
	local t0 = os.clock()
	while restants > 0 and os.clock() - t0 < 30 do
		task.wait(0.1)
	end
	return { kh, ka, gbH, gbA }
end

local function infosJoueurs(data)
	local infos = {}
	for t = 1, 2 do
		for _, s in data.eq[t].xi do
			local j = joueurs[s[1]]
			if j then infos[s[1]] = { j.nom, j.num, j.pos } end
		end
		for _, pid in data.eq[t].banc do
			local j = joueurs[pid]
			if j then infos[pid] = { j.nom, j.num, j.pos } end
		end
	end
	return infos
end

-- Les spectateurs du match amical vont s'asseoir dans la tribune principale
local function auxTribunes()
	local stade = workspace:FindFirstChild("Stade")
	local centre = stade and stade:FindFirstChild("Centre")
	if not centre then return end
	for i, p in Players:GetPlayers() do
		local c = p.Character
		if c and c.PrimaryPart then
			local x = -40 + ((i * 11) % 80)
			c:PivotTo(centre.CFrame * CFrame.new(x, 20, 152.2))
		end
	end
end

-- ==================== Match amical (pour tout le serveur) ====================
local occupe = false
local dernier = {}

Remotes.Lancer.OnServerEvent:Connect(function(player, h, a)
	if not pret or typeof(h) ~= "string" or typeof(a) ~= "string" or not clubs[h] or not clubs[a] or h == a then
		return
	end
	local now = os.clock()
	if dernier[player] and now - dernier[player] < 4 then
		return
	end
	dernier[player] = now
	if occupe then
		Remotes.Etat:FireClient(player, "erreur", "A match is already being prepared, please wait a few seconds.")
		return
	end
	occupe = true
	Remotes.Etat:FireAllClients("preparation", { h = clubs[h].n, a = clubs[a].n, par = player.DisplayName })
	local ok, err = pcall(function()
		local graine = Random.new():NextInteger(1, 2147483646)
		local url = ("%s%s?h=%s&a=%s&s=%d"):format(Config.SITE, Config.API_MATCH, h, a, graine)
		local data = HttpService:JSONDecode(HttpService:GetAsync(url))
		if data.error then
			error(data.error)
		end
		-- les personnages du match amical restent à la racine de Acteurs (les dossiers sont ceux des carrières)
		for _, x in Acteurs:GetChildren() do
			if not x:IsA("Folder") then
				x:Destroy()
			end
		end
		local kits = habillerDans(Acteurs, data, clubs[h], clubs[a], function(pid)
			return joueurs[pid]
		end)
		local info = { h = resume(clubs[h]), a = resume(clubs[a]), kits = kits, joueurs = infosJoueurs(data), par = player.DisplayName }
		auxTribunes()
		Remotes.Match:FireAllClients(data, info)
	end)
	occupe = false
	if not ok then
		warn("Tactico : match non préparé :", err)
		Remotes.Etat:FireAllClients("erreur", "The match could not be prepared. Please try again in a moment.")
	end
end)

-- ==================== Carrière (le jeu complet du site) ====================
local okDS, magasin = pcall(function()
	return DataStoreService:GetDataStore("TacticoCarrieres")
end)
local jetons = {}

local function lireJeton(player)
	local v = jetons[player.UserId]
	if v ~= nil then
		return v or nil
	end
	local t = nil
	if okDS then
		local ok, res = pcall(magasin.GetAsync, magasin, "u_" .. player.UserId)
		if ok then
			t = res
		else
			warn("Tactico : DataStore indisponible (dans Studio, active « Enable Studio Access to API Services »)", res)
		end
	end
	jetons[player.UserId] = t or false
	return t
end

local function ecrireJeton(player, t)
	jetons[player.UserId] = t or false
	player:SetAttribute("Carriere", t ~= nil)
	if okDS then
		local ok, err = pcall(function()
			if t then
				magasin:SetAsync("u_" .. player.UserId, t, { player.UserId })
			else
				magasin:RemoveAsync("u_" .. player.UserId)
			end
		end)
		if not ok then
			warn("Tactico : carrière non enregistrée dans le DataStore", err)
		end
	end
end

local function accueillir(player)
	player:SetAttribute("Carriere", lireJeton(player) ~= nil)
end
Players.PlayerAdded:Connect(accueillir)
for _, p in Players:GetPlayers() do
	task.spawn(accueillir, p)
end

local function api(corps)
	local ok, res = pcall(HttpService.PostAsync, HttpService, Config.SITE .. "/api/carriere", HttpService:JSONEncode(corps), Enum.HttpContentType.ApplicationJson)
	if not ok then
		warn("Tactico : API de carrière injoignable :", res)
		return { error = "The game server is not answering. Please try again in a moment." }
	end
	local ok2, data = pcall(HttpService.JSONDecode, HttpService, res)
	if not ok2 or type(data) ~= "table" then
		return { error = "Unreadable answer from the game server." }
	end
	return data
end

-- Personnages du match de carrière : un dossier par joueur Roblox
local function preparerActeurs(player, match)
	local dossier = Acteurs:FindFirstChild(tostring(player.UserId))
	if not dossier then
		dossier = Instance.new("Folder")
		dossier.Name = tostring(player.UserId)
		dossier.Parent = Acteurs
	end
	dossier:ClearAllChildren()
	match.kits = habillerDans(dossier, match, match.clubs[1], match.clubs[2], function(pid)
		local j = match.joueurs[pid]
		return if j then { nom = j[1], num = j[2], pos = j[3], coupe = j[4], barbe = j[5], peau = j[6] } else nil
	end)
	match.dossier = dossier
end

local ACTIONS = {
	clubs = true, classement = true, nouvelle = true, vue = true, continuer = true, jouer = true, tactique = true,
	entrainement = true, lire = true, repondre = true, toutLire = true, offre = true, joueur = true, club = true,
	transferable = true, postuler = true, supprimer = true,
}

-- Garde seulement des valeurs simples (le site vérifie tout le reste)
local function nettoyer(q)
	local out, n = {}, 0
	for k, v in q do
		local tv = typeof(v)
		if typeof(k) == "string" and #k <= 20 and (tv == "string" or tv == "number" or tv == "boolean") then
			if tv == "string" then v = string.sub(v, 1, 40) end
			if tv == "number" and v ~= v then continue end
			out[k] = v
			n += 1
			if n >= 16 then break end
		end
	end
	return out
end

local function traiterCarriere(player, req)
	if not ACTIONS[req.a] then
		return { error = "Unknown action." }
	end
	local corps = { a = req.a }
	if typeof(req.e) == "string" then corps.e = string.sub(req.e, 1, 20) end
	if typeof(req.q) == "table" then corps.q = nettoyer(req.q) end
	if typeof(req.id) == "string" then corps.id = string.sub(req.id, 1, 20) end
	if req.a == "nouvelle" then
		local nom = string.sub(tostring(req.nom or ""), 1, 20)
		local ok, filtre = pcall(function()
			return TextService:FilterStringAsync(nom, player.UserId):GetNonChatStringForBroadcastAsync()
		end)
		corps.nom = if ok and filtre ~= "" and not filtre:find("#") then filtre else player.DisplayName
		corps.club = string.sub(tostring(req.club or ""), 1, 12)
		local okP, pays = pcall(LocalizationService.GetCountryRegionForPlayerAsync, LocalizationService, player)
		corps.nat = if okP and typeof(pays) == "string" then pays else ""
		-- l'ancienne carrière est effacée du site
		local ancien = lireJeton(player)
		if ancien then
			api({ a = "supprimer", t = ancien })
		end
	elseif req.a ~= "clubs" and req.a ~= "classement" then
		local t = lireJeton(player)
		if not t then
			return { error = "No career in progress.", perdue = true }
		end
		corps.t = t
	end
	if req.a == "jouer" then
		corps.s = Random.new():NextInteger(1, 2147483646)
	end
	local res = api(corps)
	if req.a == "nouvelle" and res.t then
		ecrireJeton(player, res.t)
	end
	if (req.a == "supprimer" and res.supprime) or res.perdue then
		ecrireJeton(player, nil)
	end
	res.t = nil -- le jeton ne quitte jamais le serveur
	if req.a == "jouer" and res.match then
		if req.rapide then
			-- résultat rapide : pas de match en 3D, seulement l'après-match
			res.match.min = nil
		else
			preparerActeurs(player, res.match)
		end
	end
	return res
end

local occupes = {}
Remotes:WaitForChild("Carriere").OnServerInvoke = function(player, req)
	if typeof(req) ~= "table" or typeof(req.a) ~= "string" then
		return { error = "Invalid request." }
	end
	if occupes[player] then
		return { error = "Please wait, an action is already in progress." }
	end
	occupes[player] = true
	local ok, res = pcall(traiterCarriere, player, req)
	occupes[player] = nil
	if not ok then
		warn("Tactico : erreur de carrière :", res)
		return { error = "Roblox server error." }
	end
	return res
end

Players.PlayerRemoving:Connect(function(p)
	dernier[p] = nil
	jetons[p.UserId] = nil
	occupes[p] = nil
	local d = Acteurs:FindFirstChild(tostring(p.UserId))
	if d then
		d:Destroy()
	end
end)
