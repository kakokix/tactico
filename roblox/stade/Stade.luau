--[[
	Tactico (Roblox) : stade de football aux vraies dimensions.

	Échelle : 1 m = 3 studs, la taille d'un personnage Roblox (environ 1,80 m).
	Terrain de 105 x 68 m (315 x 204 studs), lignes, buts de 7,32 x 2,44 m avec filets,
	drapeaux de corner, panneaux, bancs, quatre tribunes, projecteurs et écran géant.

	La pièce invisible « Centre » marque le centre du terrain, au ras de la pelouse.
	Ses attributs Echelle, Longueur et Largeur servent de repère aux scripts du match.

	Utilisation : coller ce code dans la barre de commande de Studio (View > Command Bar),
	puis Entrée. Il remplace le modèle « Stade » de Workspace s'il existe déjà.
]]

local E = 3 -- studs par mètre
local G = 1.2 -- hauteur du dessus de la pelouse
local LW = 0.5 -- largeur des lignes (un peu plus que les 12 cm réglementaires, pour rester visibles de loin)
local DL, DW = 52.5 * E, 34 * E -- demi-longueur et demi-largeur du terrain
local RX, RZ = 7 * E, 8 * E -- pelouse au-delà des lignes de but et de touche

local function rgb(r, g, b)
	return Color3.fromRGB(r, g, b)
end

local C = {
	herbe1 = rgb(96, 163, 66),
	herbe2 = rgb(80, 143, 55),
	ligne = rgb(245, 245, 245),
	poteau = rgb(250, 250, 250),
	filet = rgb(236, 236, 236),
	cadre = rgb(196, 198, 204),
	drapeau = rgb(255, 196, 0),
	beton = rgb(150, 150, 156),
	marche = rgb(118, 120, 128),
	siege = rgb(28, 70, 160),
	mur = rgb(32, 37, 52),
	toit = rgb(214, 216, 220),
	bandeau = rgb(22, 30, 62),
	pylone = rgb(160, 162, 168),
	lampe = rgb(255, 248, 225),
	boitier = rgb(45, 47, 52),
	vitre = rgb(175, 205, 235),
	sol = rgb(72, 74, 80),
	bancDom = rgb(200, 35, 45),
	bancExt = rgb(30, 85, 200),
}

local M = Enum.Material
local CYL = Enum.PartType.Cylinder
local POLICE = Font.fromEnum(Enum.Font.GothamBlack)

local function piece(parent, nom, taille, cf, couleur, o)
	o = o or {}
	local p = Instance.new("Part")
	p.Name = nom
	if o.forme then
		p.Shape = o.forme
	end
	p.Anchored = true
	p.Size = taille
	p.CFrame = cf
	p.Color = couleur
	p.Material = o.matiere or M.SmoothPlastic
	p.TopSurface = Enum.SurfaceType.Smooth
	p.BottomSurface = Enum.SurfaceType.Smooth
	if o.transparence then
		p.Transparency = o.transparence
	end
	if o.deco then -- décor : ne gêne ni les joueurs ni le ballon
		p.CanCollide = false
		p.CanTouch = false
		p.CanQuery = false
		p.CastShadow = false
	end
	p.Parent = parent
	return p
end

-- Pièce allongée entre deux points : bloc, ou cylindre si o.forme = CYL
local function entre(parent, nom, a, b, ep, couleur, o)
	local dir = b - a
	local haut = if math.abs(dir.Unit.Y) > 0.99 then Vector3.xAxis else Vector3.yAxis
	local cf = CFrame.lookAt((a + b) / 2, b, haut)
	if o and o.forme == CYL then
		-- l'axe d'un cylindre est son X : on le couche dans la direction voulue
		return piece(parent, nom, Vector3.new(dir.Magnitude, ep, ep), cf * CFrame.Angles(0, math.pi / 2, 0), couleur, o)
	end
	return piece(parent, nom, Vector3.new(ep, ep, dir.Magnitude), cf, couleur, o)
end

local function texte(part, face, ppm, txt, couleur, fond)
	local gui = Instance.new("SurfaceGui")
	gui.Face = face
	gui.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	gui.PixelsPerStud = ppm
	gui.LightInfluence = 0
	gui.Parent = part
	local t = Instance.new("TextLabel")
	t.Size = UDim2.fromScale(1, 1)
	t.BorderSizePixel = 0
	if fond then
		t.BackgroundColor3 = fond
	else
		t.BackgroundTransparency = 1
	end
	t.Text = txt
	t.TextColor3 = couleur
	t.TextScaled = true
	t.FontFace = POLICE
	t.Parent = gui
	return gui
end

local stade = Instance.new("Model")
stade.Name = "Stade"
stade.ModelStreamingMode = Enum.ModelStreamingMode.Persistent -- toujours chargé chez les joueurs

-- Les parties sont construites hors du jeu puis rangées une à une dans le stade
local sections = {}
local function section(nom, classe)
	local s = Instance.new(classe or "Folder")
	s.Name = nom
	table.insert(sections, s)
	return s
end

-- 1. Pelouse tondue en bandes : 21 bandes de 5 m, symétriques autour du rond central
local pelouse = section("Pelouse")
local bords = { -DL - RX }
for k = 0, 21 do
	table.insert(bords, -DL + k * 5 * E)
end
table.insert(bords, DL + RX)
for i = 1, #bords - 1 do
	local x0, x1 = bords[i], bords[i + 1]
	piece(pelouse, "Bande", Vector3.new(x1 - x0, G, 2 * (DW + RZ)), CFrame.new((x0 + x1) / 2, G / 2, 0),
		if i % 2 == 0 then C.herbe1 else C.herbe2, { matiere = M.Grass })
end

-- 2. Lignes
local lignes = section("Lignes")
local function trait(nom, ax, az, bx, bz, rallonge)
	local a, b = Vector3.new(ax, G + 0.02, az), Vector3.new(bx, G + 0.02, bz)
	local long = (b - a).Magnitude + 2 * (rallonge or LW / 2)
	return piece(lignes, nom, Vector3.new(LW, 0.06, long), CFrame.lookAt((a + b) / 2, b), C.ligne, { deco = true })
end
local function arc(nom, cx, cz, rayon, a0, a1, n)
	for i = 0, n - 1 do
		local t0, t1 = a0 + (a1 - a0) * i / n, a0 + (a1 - a0) * (i + 1) / n
		trait(nom, cx + rayon * math.cos(t0), cz + rayon * math.sin(t0), cx + rayon * math.cos(t1), cz + rayon * math.sin(t1), 0.06)
	end
end
local function point(nom, x, z)
	piece(lignes, nom, Vector3.new(0.07, 0.8, 0.8), CFrame.new(x, G + 0.025, z) * CFrame.Angles(0, 0, math.pi / 2), C.ligne,
		{ deco = true, forme = CYL })
end
local xL, zL = DL - LW / 2, DW - LW / 2 -- axes des lignes de but et de touche
trait("LigneDeTouche", -xL, -zL, xL, -zL)
trait("LigneDeTouche", -xL, zL, xL, zL)
trait("LigneDeBut", -xL, -zL, -xL, zL)
trait("LigneDeBut", xL, -zL, xL, zL)
trait("LigneMediane", 0, -zL, 0, zL)
arc("RondCentral", 0, 0, 9.15 * E, 0, 2 * math.pi, 48)
point("PointCentral", 0, 0)
for _, s in { -1, 1 } do
	local cote = if s < 0 then "Gauche" else "Droite"
	-- surface de réparation : 16,5 m de profondeur, 16,5 m de part et d'autre des montants
	local xf, zr = s * (DL - 16.5 * E), (3.66 + 16.5) * E
	trait("Surface" .. cote, xf, -zr, xf, zr)
	trait("Surface" .. cote, s * xL, -zr, xf, -zr)
	trait("Surface" .. cote, s * xL, zr, xf, zr)
	-- surface de but : 5,5 m
	local xg, zg = s * (DL - 5.5 * E), (3.66 + 5.5) * E
	trait("PetiteSurface" .. cote, xg, -zg, xg, zg)
	trait("PetiteSurface" .. cote, s * xL, -zg, xg, -zg)
	trait("PetiteSurface" .. cote, s * xL, zg, xg, zg)
	-- point de penalty à 11 m et arc de cercle de 9,15 m hors de la surface
	local xp = s * (DL - 11 * E)
	point("PointDePenalty" .. cote, xp, 0)
	local amax = math.acos(5.5 / 9.15)
	local base = if s < 0 then 0 else math.pi
	arc("ArcDeCercle" .. cote, xp, 0, 9.15 * E, base - amax, base + amax, 18)
end
for _, sx in { -1, 1 } do
	for _, sz in { -1, 1 } do
		local a0, a1 = math.atan2(0, -sx), math.atan2(-sz, 0)
		if a0 - a1 > math.pi then
			a1 += 2 * math.pi
		elseif a1 - a0 > math.pi then
			a1 -= 2 * math.pi
		end
		arc("ArcDeCorner", sx * xL, sz * zL, E, a0, a1, 6) -- quart de cercle de 1 m
	end
end

-- 3. Buts : montants posés sur la ligne, filet de 2 m de profondeur
local function but(s)
	local m = section(if s < 0 then "ButGauche" else "ButDroit", "Model")
	m:SetAttribute("Cote", s)
	local r = 0.2 -- rayon des montants
	local xp = s * (DL - r)
	local xb = s * (DL + 2 * E) -- fond du filet
	local zp = 7.32 * E / 2 + r -- 7,32 m entre les montants
	local hb = 2.44 * E -- 2,44 m sous la barre
	local yh = G + hb + r -- axe de la barre transversale
	for _, sz in { -1, 1 } do
		entre(m, "Poteau", Vector3.new(xp, G, sz * zp), Vector3.new(xp, yh + r, sz * zp), 2 * r, C.poteau, { forme = CYL })
	end
	entre(m, "Barre", Vector3.new(xp, yh, -zp - r), Vector3.new(xp, yh, zp + r), 2 * r, C.poteau, { forme = CYL })
	local t, armature = 0.15, { forme = CYL, matiere = M.Metal }
	for _, sz in { -1, 1 } do
		local z = sz * zp
		entre(m, "Armature", Vector3.new(xp, yh, z), Vector3.new(xb, yh, z), t, C.cadre, armature)
		entre(m, "Armature", Vector3.new(xb, G, z), Vector3.new(xb, yh, z), t, C.cadre, armature)
		entre(m, "Armature", Vector3.new(xp, G + t / 2, z), Vector3.new(xb, G + t / 2, z), t, C.cadre, armature)
	end
	entre(m, "Armature", Vector3.new(xb, yh, -zp), Vector3.new(xb, yh, zp), t, C.cadre, armature)
	entre(m, "Armature", Vector3.new(xb, G + t / 2, -zp), Vector3.new(xb, G + t / 2, zp), t, C.cadre, armature)
	-- filet : mailles d'environ 25 cm
	local filet = Instance.new("Folder")
	filet.Name = "Filet"
	filet.Parent = m
	local f, fo = 0.07, { deco = true, transparence = 0.15 }
	local nZ, nY, nX = math.round(2 * zp / 0.75), math.round((yh - G) / 0.75), math.round(math.abs(xb - xp) / 0.75)
	for k = 1, nZ - 1 do
		local z = -zp + 2 * zp * k / nZ
		entre(filet, "Maille", Vector3.new(xb, G, z), Vector3.new(xb, yh, z), f, C.filet, fo)
		entre(filet, "Maille", Vector3.new(xp, yh, z), Vector3.new(xb, yh, z), f, C.filet, fo)
	end
	for k = 1, nY - 1 do
		local y = G + (yh - G) * k / nY
		entre(filet, "Maille", Vector3.new(xb, y, -zp), Vector3.new(xb, y, zp), f, C.filet, fo)
		for _, sz in { -1, 1 } do
			entre(filet, "Maille", Vector3.new(xp, y, sz * zp), Vector3.new(xb, y, sz * zp), f, C.filet, fo)
		end
	end
	for k = 1, nX - 1 do
		local x = xp + (xb - xp) * k / nX
		entre(filet, "Maille", Vector3.new(x, yh, -zp), Vector3.new(x, yh, zp), f, C.filet, fo)
		for _, sz in { -1, 1 } do
			entre(filet, "Maille", Vector3.new(x, G, sz * zp), Vector3.new(x, yh, sz * zp), f, C.filet, fo)
		end
	end
	-- parois invisibles qui arrêtent le ballon dans le filet
	local inv = { transparence = 1 }
	local xm, prof, h = (xp + xb) / 2, math.abs(xb - xp), yh - G
	piece(m, "FiletCollision", Vector3.new(0.5, h, 2 * zp), CFrame.new(xb + s * 0.25, G + h / 2, 0), C.filet, inv)
	piece(m, "FiletCollision", Vector3.new(prof, 0.5, 2 * zp), CFrame.new(xm, yh + 0.25, 0), C.filet, inv)
	for _, sz in { -1, 1 } do
		piece(m, "FiletCollision", Vector3.new(prof, h, 0.5), CFrame.new(xm, G + h / 2, sz * (zp + 0.25)), C.filet, inv)
	end
	-- zone de but : le ballon y est entièrement quand il a franchi la ligne
	local zone = piece(m, "ZoneBut", Vector3.new(2 * E, hb, 7.32 * E), CFrame.new(s * (DL + E), G + hb / 2, 0), C.filet, inv)
	zone.CanCollide = false
end
but(-1)
but(1)

-- 4. Drapeaux de corner (1,5 m)
local corners = section("Corners")
for _, sx in { -1, 1 } do
	for _, sz in { -1, 1 } do
		local x, z = sx * DL, sz * DW
		entre(corners, "Hampe", Vector3.new(x, G, z), Vector3.new(x, G + 1.5 * E, z), 0.2, C.poteau, { forme = CYL, deco = true })
		piece(corners, "Drapeau", Vector3.new(1.2, 0.9, 0.05), CFrame.new(x + sx * 0.7, G + 1.5 * E - 0.5, z), C.drapeau, { deco = true })
	end
end

-- 5. Panneaux autour du terrain (aucune vraie marque)
local panneaux = section("Panneaux")
local PUB = {
	{ "TACTICO", rgb(16, 32, 78) },
	{ "RESPECT", rgb(12, 96, 64) },
	{ "TACTICO", rgb(16, 32, 78) },
	{ "FAIR-PLAY", rgb(150, 28, 40) },
}
local nPub = 0
local function rangeePanneaux(a, b, versTerrain)
	local long = (b - a).Magnitude
	local n = math.max(1, math.round(long / 30))
	for i = 0, n - 1 do
		nPub += 1
		local pub = PUB[(nPub - 1) % #PUB + 1]
		local pos = a:Lerp(b, (i + 0.5) / n) + Vector3.new(0, G + 1.35, 0)
		local p = piece(panneaux, "Panneau", Vector3.new(long / n - 0.6, 2.7, 0.4), CFrame.lookAt(pos, pos + versTerrain), rgb(25, 25, 30))
		texte(p, Enum.NormalId.Front, 20, pub[1], rgb(255, 255, 255), pub[2])
	end
end
local zP, xP = DW + 3.5 * E, DL + 4 * E
rangeePanneaux(Vector3.new(-DL, 0, -zP), Vector3.new(DL, 0, -zP), Vector3.zAxis)
rangeePanneaux(Vector3.new(-DL, 0, zP), Vector3.new(-19 * E, 0, zP), -Vector3.zAxis) -- côté bancs, coupé devant eux
rangeePanneaux(Vector3.new(19 * E, 0, zP), Vector3.new(DL, 0, zP), -Vector3.zAxis)
rangeePanneaux(Vector3.new(-xP, 0, -30 * E), Vector3.new(-xP, 0, 30 * E), Vector3.xAxis)
rangeePanneaux(Vector3.new(xP, 0, -30 * E), Vector3.new(xP, 0, 30 * E), -Vector3.xAxis)

-- 6. Bancs de touche
local bancs = section("Bancs")
local function banc(nom, xc, couleur)
	local m = Instance.new("Model")
	m.Name = nom
	m.Parent = bancs
	local z0, z1 = DW + 4 * E, DW + 6.5 * E
	local zc = (z0 + z1) / 2
	local verre = { matiere = M.Glass, transparence = 0.45 }
	piece(m, "Sol", Vector3.new(36, 0.3, z1 - z0), CFrame.new(xc, G + 0.15, zc), C.sol, { matiere = M.Concrete })
	piece(m, "Fond", Vector3.new(36, 6, 0.5), CFrame.new(xc, G + 3.3, z1 - 0.25), C.mur)
	piece(m, "Toit", Vector3.new(36.6, 0.3, z1 - z0 + 0.7), CFrame.new(xc, G + 6.45, zc - 0.35), C.vitre, verre)
	for _, sx in { -1, 1 } do
		piece(m, "Vitre", Vector3.new(0.3, 6, z1 - z0), CFrame.new(xc + sx * 18.15, G + 3.3, zc), C.vitre, verre)
	end
	piece(m, "Assise", Vector3.new(34, 1.5, 2.2), CFrame.new(xc, G + 1.05, z1 - 1.6), couleur)
	piece(m, "Dossier", Vector3.new(34, 2, 0.5), CFrame.new(xc, G + 2.8, z1 - 0.75), couleur)
end
banc("BancDomicile", -12 * E, C.bancDom)
banc("BancExterieur", 12 * E, C.bancExt)

-- 7. Tribunes : 16 rangs de sièges, mur avant, mur arrière et toit
local tribunes = section("Tribunes")
local NR, PR, HR = 16, 2.4, 1.35 -- nombre, profondeur et hauteur des rangs
local HM, EM = 3.6, 1.5 -- mur avant : hauteur et épaisseur
local HT = 38 -- dessous du toit
local function tribune(nom, cf, long, nomStade)
	-- cf : bas du mur avant, regard tourné vers l'extérieur du stade
	local m = Instance.new("Model")
	m.Name = nom
	m.Parent = tribunes
	local function bloc(n, tx, ty, tz, y, d, couleur, o)
		return piece(m, n, Vector3.new(tx, ty, tz), cf * CFrame.new(0, y, -d), couleur, o)
	end
	local beton = { matiere = M.Concrete }
	bloc("MurAvant", long, HM, EM, HM / 2, EM / 2, C.mur)
	for i = 0, NR - 1 do
		local d0, h = EM + i * PR, HM + i * HR
		bloc("Gradin", long, h, PR, h / 2, d0 + PR / 2, C.marche, beton)
		bloc("Sieges", long, 1, 1, h + 0.5, d0 + PR - 0.5, C.siege)
	end
	local dFond = EM + NR * PR
	bloc("MurArriere", long, HT + 1.2, EM, (HT + 1.2) / 2, dFond + EM / 2, C.beton, beton)
	local prof = dFond + EM - 4
	bloc("Toit", long + 4, 1.2, prof, HT + 0.6, 4 + prof / 2, C.toit, { matiere = M.Metal })
	local bandeau = bloc("Bandeau", long + 4, 3.6, 0.8, HT + 0.6, 3.6, C.bandeau)
	if nomStade then
		texte(bandeau, Enum.NormalId.Back, 10, nomStade, rgb(255, 255, 255))
	end
end
local xT, zT = DL + RX, DW + RZ
tribune("TribunePrincipale", CFrame.lookAt(Vector3.new(0, 0, zT), Vector3.new(0, 0, zT + 1)), 2 * 56 * E)
tribune("TribuneFace", CFrame.lookAt(Vector3.new(0, 0, -zT), Vector3.new(0, 0, -zT - 1)), 2 * 56 * E, "STADE TACTICO")
tribune("TribuneGauche", CFrame.lookAt(Vector3.new(-xT, 0, 0), Vector3.new(-xT - 1, 0, 0)), 2 * 36 * E)
tribune("TribuneDroite", CFrame.lookAt(Vector3.new(xT, 0, 0), Vector3.new(xT + 1, 0, 0)), 2 * 36 * E)

-- 8. Pylônes d'éclairage dans les angles
local projecteurs = section("Projecteurs")
for _, sx in { -1, 1 } do
	for _, sz in { -1, 1 } do
		local m = Instance.new("Model")
		m.Name = "Projecteur"
		m.Parent = projecteurs
		local x, z, h = sx * 205, sz * 155, 110
		piece(m, "Pylone", Vector3.new(3, h, 3), CFrame.new(x, h / 2, z), C.pylone, { matiere = M.Metal })
		local cf = CFrame.lookAt(Vector3.new(x, h + 6, z), Vector3.new(0, G, 0))
		piece(m, "Boitier", Vector3.new(24, 15, 1.5), cf, C.boitier)
		for i = 0, 3 do
			for j = 0, 2 do
				piece(m, "Lampe", Vector3.new(5, 4, 0.6), cf * CFrame.new(-7.8 + i * 5.2, -4.6 + j * 4.6, -0.9), C.lampe,
					{ matiere = M.Neon, deco = true })
			end
		end
	end
end

-- 9. Écran géant sur le toit de la tribune gauche (les scripts du match changeront le texte)
local ecran = section("Ecran", "Model")
local posE = Vector3.new(-(xT + 26), 52, 0)
local cfE = CFrame.lookAt(posE, posE + Vector3.xAxis)
piece(ecran, "Cadre", Vector3.new(62, 22, 2), cfE, rgb(20, 20, 24))
local dalle = piece(ecran, "Dalle", Vector3.new(60, 20, 0.2), cfE * CFrame.new(0, 0, -1.05), rgb(4, 4, 8))
for _, dz in { -20, 20 } do
	piece(ecran, "Pied", Vector3.new(1.5, 2, 1.5), CFrame.new(posE.X, 40.2, dz), C.pylone, { matiere = M.Metal })
end
local affichage = Instance.new("SurfaceGui")
affichage.Name = "Affichage"
affichage.Face = Enum.NormalId.Front
affichage.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
affichage.PixelsPerStud = 20
affichage.LightInfluence = 0
affichage.Parent = dalle
for _, l in { { "Titre", "TACTICO", 0.06, 0.24, rgb(255, 200, 40) }, { "Score", "0 - 0", 0.32, 0.42, rgb(255, 255, 255) }, { "Chrono", "00:00", 0.76, 0.18, rgb(190, 190, 200) } } do
	local t = Instance.new("TextLabel")
	t.Name = l[1]
	t.Text = l[2]
	t.Position = UDim2.fromScale(0.05, l[3])
	t.Size = UDim2.fromScale(0.9, l[4])
	t.TextColor3 = l[5]
	t.BackgroundTransparency = 1
	t.TextScaled = true
	t.FontFace = POLICE
	t.Parent = affichage
end

-- 10. Repère du centre du terrain
local centre = piece(stade, "Centre", Vector3.new(1, 1, 1), CFrame.new(0, G, 0), C.ligne, { deco = true, transparence = 1 })
centre:SetAttribute("Echelle", E)
centre:SetAttribute("Longueur", 105)
centre:SetAttribute("Largeur", 68)
stade.PrimaryPart = centre

-- Mise en place (une section à la fois pour ne pas bloquer Studio ; annulable d'un seul Ctrl+Z)
local historique = game:GetService("ChangeHistoryService")
local okRec, rec = pcall(historique.TryBeginRecording, historique, "Stade Tactico")
local ancien = workspace:FindFirstChild("Stade")
if ancien then
	ancien:Destroy()
end
stade.Parent = workspace
for _, s in sections do
	s.Parent = stade
	task.wait()
end
if okRec and rec then
	historique:FinishRecording(rec, Enum.FinishRecordingOperation.Commit)
end
local n = 0
for _, d in stade:GetDescendants() do
	if d:IsA("BasePart") then
		n += 1
	end
end
print(("Stade Tactico construit : %d pièces"):format(n))
return ("%d pièces, enregistrement annulable : %s"):format(n, tostring(okRec and rec ~= nil))
