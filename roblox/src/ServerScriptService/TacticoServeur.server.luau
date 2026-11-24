--[[
	Tactico (Roblox) : serveur.
	Charge le monde depuis le site, prépare les matchs demandés par les joueurs
	(simulation par l'API du site, habillage des joueurs en R6) et les envoie à tout le monde.
]]
local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")

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

-- Crée les personnages des titulaires et des remplaçants qui entreront en jeu
local function habiller(data, h, a)
	Acteurs:ClearAllChildren()
	local kh, ka, gbH, gbA = Apparence.maillots(clubs[h], clubs[a])
	local besoin = {}
	for t = 1, 2 do
		for _, s in data.eq[t].xi do
			besoin[s[1]] = { t = t, gb = s[2] == "GB" }
		end
	end
	for _, m in data.min do
		for _, e in m[4] do
			if e[1] == "sub" and e[3] ~= "" and not besoin[e[3]] then
				local j = joueurs[e[3]]
				besoin[e[3]] = { t = e[2] + 1, gb = j ~= nil and j.pos == "GB" }
			end
		end
	end
	local restants = 0
	for pid, b in besoin do
		local j = joueurs[pid]
		if j then
			restants += 1
			task.spawn(function()
				local kit = if b.t == 1 then (if b.gb then gbH else kh) else (if b.gb then gbA else ka)
				local ok, m = pcall(Apparence.creerJoueur, { coupe = j.coupe, barbe = j.barbe, peau = j.peau }, kit, j.num, j.nom)
				if ok then
					m.Name = pid
					m.Parent = Acteurs
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

-- Les spectateurs vont s'asseoir dans la tribune principale
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
		Remotes.Etat:FireClient(player, "erreur", "Un match est déjà en préparation, patiente quelques secondes.")
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
		local kits = habiller(data, h, a)
		local info = { h = resume(clubs[h]), a = resume(clubs[a]), kits = kits, joueurs = infosJoueurs(data), par = player.DisplayName }
		auxTribunes()
		Remotes.Match:FireAllClients(data, info)
	end)
	occupe = false
	if not ok then
		warn("Tactico : match non préparé :", err)
		Remotes.Etat:FireAllClients("erreur", "Le match n'a pas pu être préparé. Réessaie dans un instant.")
	end
end)

Players.PlayerRemoving:Connect(function(p)
	dernier[p] = nil
end)
