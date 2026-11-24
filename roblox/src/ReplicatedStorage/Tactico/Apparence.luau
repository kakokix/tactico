--[[
	Tactico (Roblox) : apparence des joueurs, en personnages R6.
	Coupes et barbes : accessoires du catalogue Roblox, posés avec une HumanoidDescription.
	Maillot : couleurs du corps (torse et bras = maillot, jambes = short), nom et numéro dans le dos.
	Les stars ont une coupe et un teint qui les rappellent, toujours sous un nom modifié ;
	les autres joueurs ont un look tiré au hasard, différent pour chacun dans une équipe.
]]
local Players = game:GetService("Players")

local Apparence = {}

local function rgb(r, g, b)
	return Color3.fromRGB(r, g, b)
end

Apparence.COUPES = {
	buzz = "15280362951", buzz2 = "17889486032", buzzBrun = "18182556294", buzzBlond = "14022912991",
	noirFrange = "105034447346251", brunCourt = "97780519870266", brunCoiffe = "62234425", brunStyle = "212961935",
	brunMeche = "376548738", brunLisse = "100295147090116", bouclesNoires = "103856453215647", bouclesBrunes = "11918000453",
	ondulesNoirs = "123681410245868", twists = "18816586113", locks = "79836318021907", afro = "112630307863413",
	longsBoucles = "18183246479", longsBruns = "11338140083", blondCourt = "125229663615188", blondEpi = "376524487",
	chignonBlond = "82379135235965", chignonNoir = "107130020643137", noirArriere = "120869766235585",
	roux = "14356135179", auburn = "92185355626181", desordre = "26658141", chauve = "",
}
Apparence.BARBES = { barbe = "15310417264", courte = "4995497755" }
Apparence.PEAUX = { rgb(245, 205, 175), rgb(234, 184, 146), rgb(204, 142, 105), rgb(160, 105, 72), rgb(124, 82, 56), rgb(92, 60, 42) }

local POLICE = Font.fromEnum(Enum.Font.GothamBlack)

local function ecart(a, b)
	return math.abs(a.R - b.R) + math.abs(a.G - b.G) + math.abs(a.B - b.B)
end
local function lum(c)
	return 0.299 * c.R + 0.587 * c.G + 0.114 * c.B
end
local function kitDe(c, m, s, n)
	return { maillot = Color3.fromHex(m), short = Color3.fromHex(s), numero = Color3.fromHex(n) }
end

-- Tenues des deux équipes et des deux gardiens ; l'équipe extérieure change si les couleurs se ressemblent
function Apparence.maillots(clubH, clubA)
	local kh = kitDe(clubH, clubH.kit.m, clubH.kit.s, clubH.kit.n)
	local ka = kitDe(clubA, clubA.kit.m, clubA.kit.s, clubA.kit.n)
	if ecart(kh.maillot, ka.maillot) < 0.6 then
		local c2 = Color3.fromHex(clubA.coul[2])
		local alt = if ecart(c2, kh.maillot) >= 0.6 then c2 elseif lum(kh.maillot) < 0.5 then rgb(240, 240, 240) else rgb(25, 25, 32)
		ka = { maillot = alt, short = alt, numero = if lum(alt) > 0.55 then rgb(20, 20, 24) else rgb(255, 255, 255) }
	end
	local function gardien(choix)
		for _, c in choix do
			if ecart(c, kh.maillot) >= 0.5 and ecart(c, ka.maillot) >= 0.5 then
				return { maillot = c, short = c, numero = if lum(c) > 0.55 then rgb(20, 20, 24) else rgb(255, 255, 255) }
			end
		end
		return { maillot = choix[1], short = choix[1], numero = rgb(255, 255, 255) }
	end
	local gbH = gardien({ rgb(30, 32, 38), rgb(240, 120, 20), rgb(120, 40, 160) })
	local gbA = gardien({ rgb(46, 170, 90), rgb(230, 200, 30), rgb(0, 170, 200) })
	return kh, ka, gbH, gbA
end

-- Crée un joueur R6 (serveur seulement : CreateHumanoidModelFromDescription)
function Apparence.creerJoueur(look, kit, numero, nom)
	local d = Instance.new("HumanoidDescription")
	d.HairAccessory = Apparence.COUPES[look.coupe] or ""
	d.FaceAccessory = if look.barbe and look.barbe ~= "" then Apparence.BARBES[look.barbe] or "" else ""
	d.HeadColor = Apparence.PEAUX[look.peau] or Apparence.PEAUX[3]
	d.TorsoColor = kit.maillot
	d.LeftArmColor = kit.maillot
	d.RightArmColor = kit.maillot
	d.LeftLegColor = kit.short
	d.RightLegColor = kit.short
	local m = Players:CreateHumanoidModelFromDescription(d, Enum.HumanoidRigType.R6)
	m.PrimaryPart = m.HumanoidRootPart -- sinon le pivot est la tête
	m.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	-- La coupe et la barbe sont soudées à la tête, mais la soudure ne les place qu'une fois dans le Workspace :
	-- on les place tout de suite (sinon elles flottent loin de la tête sur le portrait de la fiche, ancré hors du Workspace)
	for _, acc in m:GetChildren() do
		local h = acc:IsA("Accessory") and acc:FindFirstChild("Handle")
		local w = h and h:FindFirstChildWhichIsA("JointInstance")
		if w and w.Part0 == h and w.Part1 then
			h.CFrame = w.Part1.CFrame * w.C1 * w.C0:Inverse()
		end
	end
	for _, s in m:GetDescendants() do
		if s:IsA("BaseScript") then
			s:Destroy()
		end
	end
	local dos = Instance.new("SurfaceGui")
	dos.Face = Enum.NormalId.Back
	dos.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	dos.PixelsPerStud = 60
	dos.Parent = m.Torso
	local function texte(parent, txt, x, y, w, h)
		local t = Instance.new("TextLabel")
		t.BackgroundTransparency = 1
		t.Position = UDim2.fromScale(x, y)
		t.Size = UDim2.fromScale(w, h)
		t.Text = txt
		t.TextColor3 = kit.numero
		t.TextScaled = true
		t.FontFace = POLICE
		t.Parent = parent
	end
	local court = string.upper(string.match(nom or "", "([^%s%.]+)$") or "")
	texte(dos, court, 0.08, 0.04, 0.84, 0.18)
	texte(dos, tostring(numero), 0.12, 0.24, 0.76, 0.66)
	local face = Instance.new("SurfaceGui")
	face.Face = Enum.NormalId.Front
	face.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
	face.PixelsPerStud = 60
	face.Parent = m.Torso
	texte(face, tostring(numero), 0.6, 0.06, 0.3, 0.32)
	return m
end

return Apparence
