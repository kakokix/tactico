--[[
	Tactico (Roblox) : le match en 3D, côté joueur.
	Rejoue minute par minute les phases calculées par le moteur du site : placements selon la
	formation, passes, centres, tirs, arrêts, buts, célébrations, cartons et changements,
	avec une caméra façon télé. Tout se passe en local : chaque joueur voit le même match.
]]
local RunService = game:GetService("RunService")
local RS = game:GetService("ReplicatedStorage")

local T = RS:WaitForChild("Tactico")
local Config = require(T:WaitForChild("Config"))
local Acteurs = T:WaitForChild("Acteurs")

local Spectacle = {}

local E = Config.ECHELLE
local L, W = 105, 68
local ARRET = "__arret_tactico__"
local ANIM_COURSE, ANIM_REPOS = "rbxassetid://180426354", "rbxassetid://180435571"
local RAYON = 0.5
local rnd = Random.new()

local vitesse = 1
local accel = 1 -- les phases sans danger passent plus vite (rythme d'un vrai résumé)
local source = Acteurs -- personnages du match : Acteurs (amical) ou le dossier du joueur (carrière)
local jeton = 0
local connexion, dossier, ballon, ui, info
local centre = CFrame.new(0, 1.2, 0)
local acteurs, onze = {}, { {}, {} }
local periode, score, buts = 1, { 0, 0 }, { {}, {} }
local B = { x = 52.5, y = 34, h = 0, vol = nil, porteur = nil, rot = 0 }
local camX, camY, camFov, camCible = 52.5, 34, 40, nil
local attendre = function() end
local minuteCourante = "0"

local DEF = { DC = true, DD = true, DG = true }
local MIL = { MDC = true, MC = true, MD = true, MG = true, MOC = true }
local ATT = { AD = true, AG = true, BU = true }
local function u(a, b)
	return rnd:NextNumber(a, b)
end
local function cote()
	return if rnd:NextNumber() < 0.5 then -1 else 1
end

-- ---------- Repères ----------
local function monde(x, y, h)
	return centre:PointToWorldSpace(Vector3.new((x - 52.5) * E, (h or 0) * E, (y - 34) * E))
end
local function dirMonde(dx, dy)
	return centre:VectorToWorldSpace(Vector3.new(dx, 0, dy))
end
local function sens(t) -- 1 : l'équipe t attaque vers x = 105
	return if (t == 0) == (periode % 2 == 1) then 1 else -1
end
local function P(t, d, w) -- d : mètres depuis son propre but, w : mètres depuis sa gauche
	if sens(t) == 1 then
		return Vector2.new(d, w)
	end
	return Vector2.new(L - d, W - w)
end
local function largeur(t, v)
	return if sens(t) == 1 then v.Y else W - v.Y
end
local function ballonXY()
	return Vector2.new(B.x, B.y)
end

-- ---------- Acteurs ----------
local function charger(a)
	if a.course then
		return
	end
	local hum = a.m:FindFirstChildOfClass("Humanoid")
	local animator = hum:FindFirstChildOfClass("Animator") or Instance.new("Animator")
	animator.Parent = hum
	local function piste(id)
		local an = Instance.new("Animation")
		an.AnimationId = id
		local ok, tr = pcall(animator.LoadAnimation, animator, an)
		if ok then
			tr.Looped = true
			return tr
		end
		return nil
	end
	a.course = piste(ANIM_COURSE)
	a.repos = piste(ANIM_REPOS)
	if a.repos then
		a.repos:Play()
	end
end

local function creerActeur(pid, t, slot)
	local src = source:FindFirstChild(pid)
	if not src then
		return nil
	end
	local m = src:Clone()
	for _, p in m:GetDescendants() do
		if p:IsA("BasePart") then
			p.CanCollide = false
			p.CanQuery = false
			p.CanTouch = false
		elseif p:IsA("BaseScript") then
			p:Destroy()
		end
	end
	local hrp = m:FindFirstChild("HumanoidRootPart")
	local hum = m:FindFirstChildOfClass("Humanoid")
	if not hrp or not hum then
		m:Destroy()
		return nil
	end
	hrp.Anchored = true
	hum.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	local a = {
		pid = pid, t = t, slot = slot, m = m, hrp = hrp, pos = Vector2.new(52.5, W + 2), cible = Vector2.new(52.5, W + 2),
		face = Vector2.new(1, 0), vmax = 7, saut = 0, chute = 0, plonge = nil, enCourse = false, actif = false, visible = false, jx = 0, jy = 0,
	}
	acteurs[pid] = a
	return a
end

local function montrer(a)
	a.m.Parent = dossier
	a.visible = true
	a.actif = true
	charger(a)
end

local function cacher(a)
	a.visible = false
	a.actif = false
	a.m.Parent = nil
end

local function acteur(pid)
	local a = acteurs[pid]
	return if a and a.actif then a else nil
end

local function auHasard(t, filtre)
	local l = {}
	for _, a in onze[t + 1] do
		if a.actif and (not filtre or filtre(a)) then
			table.insert(l, a)
		end
	end
	if #l == 0 then
		return nil
	end
	return l[rnd:NextInteger(1, #l)]
end

local function champ(a)
	return a.slot.pos ~= "GB"
end

local function gardien(t)
	for _, a in onze[t + 1] do
		if a.actif and a.slot.pos == "GB" then
			return a
		end
	end
	return nil
end

local function plusProche(t, p, sauf)
	local best, bd = nil, math.huge
	for _, a in onze[t + 1] do
		if a.actif and a ~= sauf and a.slot.pos ~= "GB" then
			local d = (a.pos - p).Magnitude
			if d < bd then
				best, bd = a, d
			end
		end
	end
	return best
end

-- Place l'équipe t selon sa formation : pousse = mètres gagnés vers l'avant, serre = resserrement
local function placer(t, pousse, serre, vmax)
	local bw = largeur(t, ballonXY())
	for _, a in onze[t + 1] do
		if a.actif then
			local d, w
			if a.slot.pos == "GB" then
				d = 2.5 + math.clamp(pousse * 0.15, 0, 7)
				w = 34 + (bw - 34) * 0.12
			else
				d = 6 + a.slot.y * 0.5 + pousse + a.jx
				w = 34 + (a.slot.x / 100 * W - 34) * (serre or 0.85) + (bw - 34) * 0.22 + a.jy
			end
			a.cible = P(t, math.clamp(d, 1, 103), math.clamp(w, 2, 66))
			a.vmax = vmax or 7
		end
	end
end

-- ---------- Ballon ----------
local function donner(a)
	B.vol = nil
	B.porteur = a
end

local function vol(pt, h, duree, arc, fin)
	B.porteur = nil
	B.vol = { a = Vector3.new(B.x, B.h, B.y), b = Vector3.new(pt.X, h or 0, pt.Y), t = 0, d = math.max(duree, 0.05), arc = arc or 0, fin = fin }
end

-- Passe au receveur, qui va au-devant du ballon
local function passeA(rec, duree, arc)
	if not rec then
		return
	end
	local d = rec.cible - rec.pos
	local pt = if d.Magnitude > 0.1 then rec.pos + d.Unit * math.min(d.Magnitude, rec.vmax * duree * 0.8) else rec.pos
	rec.cible = pt
	vol(pt, 0, duree, arc, function()
		donner(rec)
	end)
	attendre(duree)
end

-- Passe dans la course : le receveur court jusqu'au point
local function passeVers(rec, pt, duree, arc, h)
	if not rec then
		return
	end
	rec.cible = pt
	rec.vmax = math.clamp((pt - rec.pos).Magnitude / duree * 1.05, 6, 11)
	vol(pt, h or 0, duree, arc, function()
		donner(rec)
	end)
	attendre(duree)
end

-- ---------- Écran géant du stade ----------
local function affichage()
	local s = workspace:FindFirstChild("Stade")
	local e = s and s:FindFirstChild("Ecran")
	local d = e and e:FindFirstChild("Dalle")
	return d and d:FindFirstChild("Affichage")
end
local function ecran(titre, sc, chrono)
	local a = affichage()
	if not a then
		return
	end
	if titre and a:FindFirstChild("Titre") then a.Titre.Text = titre end
	if sc and a:FindFirstChild("Score") then a.Score.Text = sc end
	if chrono and a:FindFirstChild("Chrono") then a.Chrono.Text = chrono end
end

-- ---------- Image par image ----------
local function maj(dt)
	local sdt = dt * vitesse
	for _, a in acteurs do
		if a.visible then
			local d = a.cible - a.pos
			local dist = d.Magnitude
			local v = 0
			if dist > 0.03 then
				local pas = math.min(dist, a.vmax * sdt)
				a.pos += d / dist * pas
				v = if sdt > 0 then pas / sdt else 0
			end
			local voulu
			if v > 2.5 and dist > 0.6 then
				voulu = d / dist
			else
				local vb = ballonXY() - a.pos
				voulu = if vb.Magnitude > 0.3 then vb.Unit else a.face
			end
			local f = a.face:Lerp(voulu, math.min(1, sdt * 6))
			if f.Magnitude > 1e-3 then
				a.face = f.Unit
			end
			local court = v > 1.2
			if court ~= a.enCourse and a.course and a.repos then
				a.enCourse = court
				if court then
					a.course:Play(0.15)
					a.repos:Stop(0.15)
				else
					a.course:Stop(0.2)
					a.repos:Play(0.2)
				end
			end
			if court and a.course then
				a.course:AdjustSpeed(math.clamp(v / 6, 0.6, 1.8) * vitesse)
			end
			local haut = 0
			if a.saut > 0 then
				a.saut = math.max(0, a.saut - sdt)
				haut = math.sin((1 - a.saut / 0.6) * math.pi) * 0.7
			end
			local p = monde(a.pos.X, a.pos.Y, haut) + Vector3.new(0, 3, 0)
			local cf = CFrame.lookAt(p, p + dirMonde(a.face.X, a.face.Y))
			if a.plonge then
				a.plonge.t += sdt
				local k = math.min(1, a.plonge.t / 0.3)
				cf = cf * CFrame.new(0, -1.7 * k, 0) * CFrame.Angles(0, 0, -a.plonge.cote * math.rad(80) * k)
				if a.plonge.t > 1.4 then
					a.plonge = nil
				end
			elseif a.chute > 0 then
				a.chute = math.max(0, a.chute - sdt)
				cf = cf * CFrame.new(0, -2.3, 0) * CFrame.Angles(math.rad(-85), 0, 0)
			end
			a.hrp.CFrame = cf
		end
	end
	-- ballon
	local ax, ay = B.x, B.y
	if B.vol then
		local vl = B.vol
		vl.t += sdt
		local k = math.min(1, vl.t / vl.d)
		local p = vl.a:Lerp(vl.b, k)
		B.x, B.y = p.X, p.Z
		B.h = p.Y + vl.arc * 4 * k * (1 - k)
		if k >= 1 then
			B.vol = nil
			if vl.fin then
				vl.fin()
			end
		end
	elseif B.porteur then
		local a = B.porteur
		B.x = a.pos.X + a.face.X * 0.7
		B.y = a.pos.Y + a.face.Y * 0.7
		B.h = 0
	end
	if ballon then
		local dep = Vector2.new(B.x - ax, B.y - ay).Magnitude
		B.rot += dep * E / RAYON
		ballon.CFrame = CFrame.new(monde(B.x, B.y, B.h) + Vector3.new(0, RAYON, 0)) * CFrame.Angles(B.rot, B.rot * 0.3, 0)
	end
	-- caméra télé, au-dessus de la tribune principale
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Scriptable
	local cible = camCible or ballonXY()
	camX += (math.clamp(cible.X, 24, 81) - camX) * math.min(1, dt * 1.6)
	camY += (cible.Y - camY) * math.min(1, dt * 1.6)
	local pos = if camCible then monde(camX, W + 6, 9) else monde(camX, W + 14, 23)
	cam.CFrame = CFrame.lookAt(pos, monde(camX, camY * 0.6 + 34 * 0.4 - 3, 0))
	cam.FieldOfView += (camFov - cam.FieldOfView) * math.min(1, dt * 2)
end

-- ---------- Séquences de jeu ----------
local function coupEnvoi(t, instant)
	B.vol = nil
	B.porteur = nil
	B.x, B.y, B.h = 52.5, 34, 0
	for tt = 0, 1 do
		for _, a in onze[tt + 1] do
			if a.actif then
				local d, w
				if a.slot.pos == "GB" then
					d, w = 3, 34
				else
					d = math.min(47, 4 + a.slot.y * 0.55)
					w = a.slot.x / 100 * W
				end
				a.cible = P(tt, d, w)
				a.vmax = 12
				a.plonge, a.chute, a.saut = nil, 0, 0
				if instant then
					a.pos = a.cible
					a.face = Vector2.new(sens(tt), 0)
				end
			end
		end
	end
	local a1 = auHasard(t, function(a) return ATT[a.slot.pos] end) or auHasard(t, champ)
	if a1 then
		a1.cible = P(t, 52, 34.5)
	end
	attendre(if instant then 1 else 2)
	if a1 then
		donner(a1)
	end
	attendre(0.5)
	local mil = auHasard(t, function(a) return MIL[a.slot.pos] end) or auHasard(t, champ)
	if mil then
		mil.cible = P(t, 44, u(28, 40))
		passeVers(mil, mil.cible, 0.8, 0)
	end
end

local function recuperer(t)
	local p = B.porteur
	if p and p.t == t then
		return p
	end
	local r = plusProche(t, ballonXY())
	if r then
		r.cible = ballonXY()
		r.vmax = 8
		vol(r.pos:Lerp(ballonXY(), 0.4), 0, 0.5, 0.3, function()
			donner(r)
		end)
		attendre(0.5)
	end
	return r
end

local function construction(t, ids, z)
	placer(t, 8 + z * 7)
	placer(1 - t, 12, 0.75)
	recuperer(t)
	local h = acteur(ids[1]) or auHasard(t, function(a) return MIL[a.slot.pos] end)
	local relais = auHasard(t, function(a) return a ~= h and a ~= B.porteur and champ(a) end)
	attendre(u(0.15, 0.35))
	if relais then passeA(relais, u(0.6, 0.85), 0.2) end
	attendre(u(0.1, 0.3))
	if h and h ~= B.porteur then passeA(h, u(0.6, 0.85), 0.2) end
	attendre(u(0.2, 0.4))
end

local function perte(t, ids, z)
	construction(t, ids, z)
	local int = plusProche(1 - t, ballonXY())
	if int then
		local pt = ballonXY():Lerp(int.pos, 0.55)
		int.cible = pt
		int.vmax = 8
		vol(pt, 0, 0.55, 0.2, function()
			donner(int)
		end)
		attendre(0.6)
	end
end

local function dernierTiers(t, ids)
	placer(t, 30, 0.9, 7.5)
	placer(1 - t, 3, 0.7, 7)
	recuperer(t)
	local h = acteur(ids[1])
	if h and h ~= B.porteur then passeA(h, 0.65, 0.3) end
	local att = acteur(ids[2]) or auHasard(t, function(a) return ATT[a.slot.pos] end)
	if att and att ~= B.porteur then
		passeVers(att, P(t, u(73, 83), u(12, 56)), u(0.75, 0.95), 0.6)
	end
	attendre(0.2)
end

local function horsJeu(t, s)
	s = s or auHasard(t, function(a) return ATT[a.slot.pos] end)
	recuperer(t)
	if s then
		passeVers(s, P(t, u(90, 96), u(22, 46)), 0.9, 1.2)
	end
	attendre(0.5)
	local gk = gardien(1 - t)
	if gk then
		vol(gk.pos, 0, 0.9, 2, function()
			donner(gk)
		end)
		attendre(0.9)
	end
end

local function defendu(t, ids)
	dernierTiers(t, ids)
	local d = plusProche(1 - t, ballonXY())
	if d then
		d.cible = ballonXY()
		d.vmax = 9
		attendre(0.45)
		local pt = P(1 - t, u(48, 64), u(8, 60))
		local rec = plusProche(rnd:NextInteger(0, 1), pt)
		if rec then
			rec.cible = pt
		end
		vol(pt, 0, 1.1, u(4, 9), function()
			if rec then donner(rec) end
		end)
		attendre(1.1)
	end
end

local function contre(t, ids)
	recuperer(t)
	placer(t, 26, 0.85, 9)
	placer(1 - t, 20, 0.8, 7.5)
	local att = acteur(ids[1]) or auHasard(t, function(a) return ATT[a.slot.pos] end)
	if att then
		passeVers(att, P(t, u(70, 80), u(16, 52)), 1.0, 1.4)
	end
end

local function faute(t, ids, z)
	local f = acteur(ids[1])
	placer(t, if z == 2 then 28 else 16)
	placer(1 - t, if z == 2 then 4 else 12)
	local v = recuperer(t)
	if v and f then
		v.cible = P(t, if z == 2 then u(76, 84) else u(40, 55), u(14, 54))
		v.vmax = 7
		attendre(0.4)
		f.cible = v.cible
		f.vmax = 9.5
		attendre(0.6)
		v.chute = 1.1
		attendre(1.0)
	end
end

local function corner(t, suite)
	local w = if rnd:NextNumber() < 0.5 then 0.8 else W - 0.8
	vol(P(t, 104.5, w), 0, 0.6, 1)
	attendre(0.6)
	local tireur = auHasard(t, function(a) return champ(a) and not DEF[a.slot.pos] end) or auHasard(t, champ)
	local n = 0
	for _, a in onze[t + 1] do
		if a.actif then
			if a == tireur then
				a.cible = P(t, 104.6, w)
			elseif champ(a) and n < 5 and a.slot.y > 15 then
				n += 1
				a.cible = P(t, u(93, 100), u(26, 42))
			elseif champ(a) then
				a.cible = P(t, u(60, 80), u(14, 54))
			end
			a.vmax = 8
		end
	end
	for _, a in onze[2 - t] do
		if a.actif then
			a.cible = if a.slot.pos == "GB" then P(t, 104.3, 34) else P(t, u(90, 102), u(24, 44))
			a.vmax = 8
		end
	end
	attendre(1.5)
	if tireur then
		donner(tireur)
	end
	attendre(0.4)
	if suite and suite[4] == "header_sp" then
		return -- le centre est joué par le tir de la tête qui suit
	end
	local d = plusProche(1 - t, P(t, 97, 34))
	local pt = P(t, u(95, 100), u(28, 40))
	if d then
		d.cible = pt
	end
	vol(pt, 1.6, 1.0, 3)
	attendre(1.0)
	if d then
		d.saut = 0.6
	end
	local loin = P(t, u(74, 86), u(10, 58))
	local rec = plusProche(rnd:NextInteger(0, 1), loin)
	if rec then
		rec.cible = loin
	end
	vol(loin, 0, 0.9, 3, function()
		if rec then donner(rec) end
	end)
	attendre(0.9)
end

-- Tirs : mise en place selon le type, puis frappe vers le but selon l'issue
local function tir(t, typ, issue, ids)
	local s = acteur(ids[#ids]) or auHasard(t, function(a) return ATT[a.slot.pos] end) or auHasard(t, champ)
	if not s then
		return
	end
	local p = if #ids >= 2 then acteur(ids[1]) else nil
	if p == s then
		p = nil
	end
	local gk = gardien(1 - t)
	if issue == "offside" then
		horsJeu(t, s)
		return
	end
	placer(t, 32, 0.9, 7.5)
	placer(1 - t, 2, 0.65, 7.5)
	if gk then
		gk.cible = P(t, 103.8, 34)
	end
	local hTir, arc, duree = 0.4, 0.5, 0.5
	if typ == "pen" then
		ui.banniere("PENALTY!", "", Color3.fromRGB(255, 210, 60), 2)
		for _, a in acteurs do
			if a.actif and a ~= s and a ~= gk then
				a.cible = P(t, u(80, 87), u(12, 56))
			end
		end
		s.cible = P(t, 91.5, 34)
		if gk then gk.cible = P(t, 104.6, 34) end
		attendre(1.8)
		B.porteur, B.vol = nil, nil
		local spot = P(t, 94, 34)
		B.x, B.y, B.h = spot.X, spot.Y, 0
		attendre(0.4)
		s.cible = P(t, 93.3, 34)
		s.vmax = 5
		attendre(0.5)
		hTir, arc, duree = 0.2, 0.3, 0.45
	elseif typ == "fk" then
		local w = u(20, 48)
		local balle = P(t, u(80, 84), w)
		B.porteur, B.vol = nil, nil
		B.x, B.y, B.h = balle.X, balle.Y, 0
		s.cible = P(t, 78, w)
		local vers = (P(t, 105, 34) - balle).Unit
		local n = 0
		for _, a in onze[2 - t] do
			if a.actif and champ(a) and n < 4 then
				n += 1
				a.cible = balle + vers * 9.15 + Vector2.new(-vers.Y, vers.X) * ((n - 2.5) * 0.9)
			end
		end
		attendre(1.6)
		s.cible = balle
		s.vmax = 6
		attendre(0.4)
		hTir, arc, duree = 0.8, 1.6, 0.9
	elseif typ == "header_sp" or typ == "cross" then
		local w = if rnd:NextNumber() < 0.5 then 4 else 64
		local depart = if typ == "header_sp" and rnd:NextNumber() < 0.6 then P(t, 104.6, if w < 34 then 0.8 else W - 0.8) else P(t, u(92, 98), w)
		if p then
			if typ == "cross" then
				passeVers(p, depart, 0.9, 0.4)
			else
				p.cible = depart
				attendre(0.9)
				donner(p)
			end
		else
			B.porteur, B.vol = nil, nil
			B.x, B.y, B.h = depart.X, depart.Y, 0
		end
		local zone = P(t, u(94, 99), u(29, 39))
		s.cible = zone
		s.vmax = 8
		attendre(0.3)
		vol(zone, 1.7, 1.0, 3)
		attendre(0.85)
		s.saut = 0.6
		attendre(0.15)
		hTir, arc, duree = 1.7, 0.2, 0.42
	elseif typ == "cutback" then
		local depart = P(t, u(99, 102), if rnd:NextNumber() < 0.5 then u(18, 24) else u(44, 50))
		if p then passeVers(p, depart, 0.9, 0.3) end
		s.cible = P(t, u(90, 94), u(28, 40))
		attendre(0.3)
		passeVers(s, s.cible, 0.55, 0)
		hTir, arc, duree = 0.3, 0.4, 0.45
	elseif typ == "through" then
		if p then
			p.cible = P(t, u(68, 74), u(24, 44))
			if B.porteur ~= p then passeA(p, 0.6, 0.3) end
		end
		passeVers(s, P(t, u(91, 95), u(26, 42)), 0.95, 0.4)
		hTir, arc, duree = 0.4, 0.4, 0.45
	elseif typ == "long" then
		local pt = P(t, u(78, 82), u(22, 46))
		if B.porteur ~= s then passeVers(s, pt, 0.8, 0.3) else s.cible = pt attendre(0.6) end
		hTir, arc, duree = 0.5, 1.6, 0.95
	elseif typ == "dribble" then
		local w = u(22, 46)
		if B.porteur ~= s then passeVers(s, P(t, 83, w), 0.8, 0.2) end
		local d = plusProche(1 - t, s.pos)
		if d then
			d.cible = s.pos
			d.vmax = 8
		end
		s.cible = P(t, u(91, 95), w + u(-6, 6))
		s.vmax = 8
		attendre(0.8)
		if d then d.cible = d.pos + Vector2.new(0, cote() * 3) end
		attendre(0.4)
		hTir, arc, duree = 0.3, 0.4, 0.45
	else -- cafouillage
		for _ = 1, 2 do
			local pt = P(t, u(97, 101), u(28, 40))
			local r = plusProche(rnd:NextInteger(0, 1), pt)
			if r then r.cible = pt end
			vol(pt, 0, 0.4, 0.6)
			attendre(0.45)
		end
		s.cible = ballonXY()
		attendre(0.3)
		hTir, arc, duree = 0.3, 0.3, 0.35
	end
	-- la frappe
	local cible, hauteur
	local ty = 34 + cote() * u(0.8, 3.2)
	if issue == "goal" or issue == "vargoal" then
		cible, hauteur = P(t, 106.6, ty), u(0.2, 2.0)
	elseif issue == "save" then
		cible, hauteur = P(t, 104.2, 34 + u(-2.6, 2.6)), u(0.3, 1.8)
	elseif issue == "post" then
		cible, hauteur = P(t, 105, 34 + cote() * 3.66), u(0.4, 2.3)
	elseif issue == "miss" then
		cible, hauteur = P(t, 108, 34 + cote() * u(4.4, 9)), u(0.3, 4)
	else -- contré
		local d = plusProche(1 - t, s.pos)
		local devant = s.pos:Lerp(P(t, 105, 34), 0.12)
		if d then d.cible = devant d.vmax = 10 end
		cible, hauteur = devant, 0.6
	end
	B.porteur = nil
	B.h = math.max(B.h, hTir * 0.5)
	if gk and issue ~= "block" then
		local gauche = Vector2.new(sens(t) * 0, 0)
		local droite = Vector2.new(0, -sens(t)) -- la droite du gardien, qui regarde le tireur
		local lat = (cible - gk.pos):Dot(droite)
		gk.plonge = { t = 0, cote = if lat >= 0 then 1 else -1 }
		local reach = if issue == "save" then 1 else 0.45
		gk.cible = gk.pos + droite * lat * reach
		gk.vmax = 9
	end
	vol(cible, hauteur, duree, arc)
	attendre(duree)
	if issue == "save" then
		if gk then donner(gk) end
		attendre(1.0)
	elseif issue == "post" then
		local loin = P(t, u(96, 102), 34 + cote() * u(8, 16))
		local rec = plusProche(rnd:NextInteger(0, 1), loin)
		vol(loin, 0, 0.6, 1.2, function()
			if rec then donner(rec) end
		end)
		if rec then rec.cible = loin end
		attendre(0.8)
	elseif issue == "miss" then
		attendre(0.8)
		if gk then
			local six = P(t, 100, 34 + cote() * 5)
			B.porteur, B.vol = nil, nil
			B.x, B.y, B.h = six.X, six.Y, 0
			gk.cible = six
			attendre(0.6)
			donner(gk)
		end
	elseif issue == "block" then
		local loin = P(t, u(80, 92), u(12, 56))
		local rec = plusProche(rnd:NextInteger(0, 1), loin)
		if rec then rec.cible = loin end
		vol(loin, 0, 0.6, 1.5, function()
			if rec then donner(rec) end
		end)
		attendre(0.7)
	else
		attendre(0.3) -- but : le ballon reste au fond des filets
	end
end

local function celebrer(t, buteur)
	if not buteur then
		attendre(2)
		return
	end
	local coin = P(t, 100, if buteur.pos.Y < 34 then 4 else 64)
	buteur.cible = coin
	buteur.vmax = 8.5
	for _, a in onze[t + 1] do
		if a.actif and a ~= buteur and champ(a) and rnd:NextNumber() < 0.75 then
			a.cible = coin + Vector2.new(u(-4, 4), u(-4, 4))
			a.vmax = 8
		end
	end
	for _, a in onze[2 - t] do
		if a.actif then
			a.vmax = 2.5
		end
	end
	camCible = coin
	camFov = 30
	attendre(3.2)
	camCible = nil
	camFov = 40
end

local function sortir(a)
	if not a then
		return
	end
	a.actif = false
	if B.porteur == a then
		B.porteur = nil
	end
	a.cible = Vector2.new(a.pos.X, W + 3)
	a.vmax = 5
	task.delay(3 / vitesse, function()
		if acteurs[a.pid] == a and not a.actif then
			cacher(a)
		end
	end)
end

local function remplacer(t, inId, outId)
	local out = acteurs[outId]
	local nouveau = acteurs[inId]
	if not nouveau then
		return
	end
	local slot = if out then out.slot else { pos = "MC", x = 50, y = 48 }
	if out then
		sortir(out)
		local liste = onze[t + 1]
		local i = table.find(liste, out)
		if i then table.remove(liste, i) end
	end
	nouveau.slot = slot
	nouveau.t = t
	nouveau.pos = Vector2.new(52.5 + u(-4, 4), W + 2)
	nouveau.cible = P(t, 6 + slot.y * 0.5 + 10, slot.x / 100 * W)
	montrer(nouveau)
	table.insert(onze[t + 1], nouveau)
end

local function nomDe(pid)
	local i = info.joueurs[pid]
	return if i then i[1] else ""
end

local fini = false
local function evenement(e)
	local typ, et, pid, txt, sc = e[1], e[2], e[3], e[5], e[6]
	if typ == "goal" then
		if typeof(sc) == "table" then
			score = { sc[1], sc[2] }
		end
		ui.score(score[1], score[2])
		ecran(nil, ("%d - %d"):format(score[1], score[2]))
		ui.fil(txt, true)
		local club = if et == 0 then info.h else info.a
		ui.banniere("GOAL!", nomDe(pid) .. " · " .. club.n, Color3.fromRGB(46, 204, 113), 3)
		table.insert(buts[et + 1], ("%s' %s"):format(minuteCourante, nomDe(pid)))
		celebrer(et, acteurs[pid])
		coupEnvoi(1 - et)
	elseif typ == "var" then
		ui.fil(txt)
		ui.banniere("VAR", "Checking the goal…", Color3.fromRGB(80, 170, 255), 2.2)
		attendre(2.2)
	elseif typ == "vardis" then
		ui.fil(txt, true)
		ui.banniere("GOAL DISALLOWED", "VAR decision", Color3.fromRGB(255, 90, 90), 2.2)
		attendre(1.6)
		local gk = gardien(1 - et)
		if gk then
			B.x, B.y, B.h = gk.pos.X, gk.pos.Y, 0
			donner(gk)
		end
	elseif typ == "yellow" then
		ui.fil(txt)
		ui.banniere("YELLOW CARD", nomDe(pid), Color3.fromRGB(255, 210, 40), 1.8)
		attendre(0.8)
	elseif typ == "red" then
		ui.fil(txt, true)
		ui.banniere("RED CARD", nomDe(pid), Color3.fromRGB(255, 70, 70), 2.2)
		local a = acteurs[pid]
		if a then
			sortir(a)
			local liste = onze[et + 1]
			local i = table.find(liste, a)
			if i then table.remove(liste, i) end
		end
		attendre(1.2)
	elseif typ == "sub" then
		ui.fil(txt)
		remplacer(et, pid, e[4])
	elseif typ == "penmiss" then
		ui.fil(txt, true)
		ui.banniere("PENALTY MISSED", nomDe(pid), Color3.fromRGB(255, 160, 60), 2)
	elseif typ == "ht" then
		ui.fil(txt, true)
		ui.banniere("HALF-TIME", ("%s %d - %d %s"):format(info.h.a, score[1], score[2], info.a.a), nil, 2.6)
		attendre(2.6)
		periode = 2
		coupEnvoi(1, true)
	elseif typ == "et" then
		ui.fil(txt, true)
		periode = 3
		coupEnvoi(0, true)
	elseif typ == "ft" then
		ui.fil(txt, true)
		ui.banniere("FULL TIME", ("%s %d - %d %s"):format(info.h.a, score[1], score[2], info.a.a), nil, 3)
		attendre(3)
		fini = true
	else
		ui.fil(txt, typ == "pen" or typ == "post")
	end
end

local function jouerPhase(ph, suite)
	local t, z, k, typ, ids = ph[1], ph[2], ph[3], ph[4], ph[5]
	-- construction, perte de balle et défense : on accélère ; occasions, tirs et coups de pied arrêtés : vitesse normale
	accel = if k == "build" or k == "lost" or k == "defended" or (k == "final" and typ == "") then 1.8 else 1
	for _, eq in onze do
		for _, a in eq do
			a.jx, a.jy = u(-2, 2), u(-2.5, 2.5)
		end
	end
	if k == "build" then
		construction(t, ids, z)
	elseif k == "lost" then
		perte(t, ids, z)
	elseif k == "final" then
		dernierTiers(t, ids)
	elseif k == "offside" and typ == "" then
		dernierTiers(t, ids)
		horsJeu(t, acteur(ids[2]))
	elseif k == "defended" then
		defendu(t, ids)
	elseif k == "counter" then
		contre(t, ids)
	elseif k == "foul" then
		faute(t, ids, z)
	elseif k == "corner" then
		corner(t, suite)
	elseif typ ~= "" and k ~= "shot" then
		tir(t, typ, k, ids)
	else
		attendre(0.6)
	end
end

local function deroulement(data)
	ui.chrono("0")
	ecran(info.h.a .. " - " .. info.a.a, "0 - 0", "0'")
	coupEnvoi(0, true)
	for _, m in data.min do
		local label, per, phases, evts = m[1], m[2], m[3], m[4]
		if per > periode then
			periode = per
		end
		minuteCourante = label
		ui.chrono(label)
		ecran(nil, nil, label .. "'")
		for _, e in evts do
			if e[7] == -1 then
				evenement(e)
			end
		end
		for i, ph in phases do
			jouerPhase(ph, phases[i + 1])
			accel = 1
			for _, e in evts do
				if e[7] == i - 1 then
					evenement(e)
				end
			end
		end
		if #phases == 0 then
			attendre(0.5)
		end
	end
	if not fini then
		attendre(1)
	end
	local st = data.stats
	ui.fin({
		h = info.h.n, a = info.a.n, score = score, buts = buts,
		stats = ("Possession %d%% - %d%%   ·   Shots %d - %d   ·   On target %d - %d"):format(st.poss[1], st.poss[2], st.tirs[1], st.tirs[2], st.cadres[1], st.cadres[2]),
	})
end

-- ---------- Fonctions publiques ----------
function Spectacle.vitesse(v)
	vitesse = math.clamp(v, 0.5, 8)
end

function Spectacle.arreter()
	jeton += 1
	if connexion then
		connexion:Disconnect()
		connexion = nil
	end
	if dossier then
		dossier:Destroy()
		dossier = nil
	end
	acteurs, onze = {}, { {}, {} }
	ballon = nil
	camCible = nil
	local cam = workspace.CurrentCamera
	cam.CameraType = Enum.CameraType.Custom
	cam.FieldOfView = 70
	ecran("TACTICO", "0 - 0", "00:00")
end

function Spectacle.jouer(data, inf, interface)
	Spectacle.arreter()
	local monJeton = jeton
	ui, info = interface, inf
	source = if inf.dossier and inf.dossier.Parent then inf.dossier else Acteurs
	vitesse, accel = 1, 1
	periode, score, buts, fini = 1, { 0, 0 }, { {}, {} }, false
	local stade = workspace:FindFirstChild("Stade")
	local c = stade and stade:FindFirstChild("Centre")
	centre = if c then c.CFrame else CFrame.new(0, 1.2, 0)
	dossier = Instance.new("Folder")
	dossier.Name = "MatchLocal"
	dossier.Parent = workspace
	for t = 0, 1 do
		for _, s in data.eq[t + 1].xi do
			local a = creerActeur(s[1], t, { pos = s[2], x = s[3], y = s[4] })
			if a then
				table.insert(onze[t + 1], a)
				montrer(a)
			end
		end
	end
	for _, mdl in source:GetChildren() do
		if mdl:IsA("Model") and not acteurs[mdl.Name] then
			creerActeur(mdl.Name, nil, nil)
		end
	end
	ballon = Instance.new("Part")
	ballon.Name = "Ballon"
	ballon.Shape = Enum.PartType.Ball
	ballon.Size = Vector3.one * (RAYON * 2)
	ballon.Color = Color3.fromRGB(250, 250, 250)
	ballon.Material = Enum.Material.SmoothPlastic
	ballon.Anchored = true
	ballon.CanCollide = false
	ballon.CanQuery = false
	ballon.CanTouch = false
	ballon.Parent = dossier
	B = { x = 52.5, y = 34, h = 0, vol = nil, porteur = nil, rot = 0 }
	camX, camY, camFov, camCible = 52.5, 34, 40, nil
	attendre = function(s)
		local t = 0
		repeat
			local dt = RunService.Heartbeat:Wait()
			if monJeton ~= jeton then
				error(ARRET, 0)
			end
			t += dt * vitesse * accel
		until t >= s
	end
	connexion = RunService.RenderStepped:Connect(maj)
	task.spawn(function()
		local ok, err = pcall(deroulement, data)
		if not ok and err ~= ARRET then
			warn("Tactico : erreur pendant le match :", err)
		end
	end)
end

return Spectacle
