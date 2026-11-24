--[[
	Tactico (Roblox) : apparence des joueurs, en personnages R6.

	Coupes et barbes : accessoires du catalogue Roblox, posés avec une HumanoidDescription.
	Maillot : couleurs du corps (torse et bras = maillot, jambes = short),
	numéro dans le dos et petit numéro sur la poitrine.

	Les stars peuvent avoir une coupe et un teint qui les rappellent, mais seulement
	avec un nom modifié (choix de l'utilisateur). Les autres joueurs ont un look au hasard :
	on ne devine jamais l'apparence d'un joueur d'après son nom ou sa nationalité.
]]

local Players = game:GetService("Players")

local Apparence = {}

local function rgb(r, g, b)
	return Color3.fromRGB(r, g, b)
end

-- Accessoires de cheveux du catalogue (identifiants vérifiés sur des R6 dans le stade)
Apparence.COUPES = {
	buzz = "15280362951", -- coupe très courte noire
	buzz2 = "17889486032", -- coupe très courte noire, un peu plus épaisse
	noirFrange = "105034447346251", -- noirs courts avec frange
	brunCourt = "97780519870266", -- bruns courts ondulés
	brunCoiffe = "62234425", -- bruns coiffés sur le côté (Roblox)
	brunStyle = "212961935", -- banane brune (Roblox)
	brunMeche = "376548738", -- coupe de charme brune (Roblox)
	brunLisse = "100295147090116", -- bruns en arrière, un peu en bataille
	bouclesNoires = "103856453215647", -- boucles noires hautes
	ondulesNoirs = "123681410245868", -- noirs ondulés courts
	twists = "18816586113", -- twists noirs
	locks = "79836318021907", -- petites locks noires
	afro = "112630307863413",
	longsBoucles = "18183246479", -- longues boucles brunes
	blondCourt = "125229663615188",
	chignonBlond = "82379135235965",
	desordre = "26658141", -- bruns en désordre (Roblox)
}

Apparence.BARBES = {
	barbe = "15310417264",
	courte = "4995497755", -- barbe de quelques jours
}

-- Teints, du plus clair au plus foncé
Apparence.PEAUX = {
	rgb(245, 205, 175),
	rgb(234, 184, 146),
	rgb(204, 142, 105),
	rgb(160, 105, 72),
	rgb(124, 82, 56),
	rgb(92, 60, 42),
}

local POLICE = Font.fromEnum(Enum.Font.GothamBlack)

-- look = { coupe = "buzz", barbe = "courte" (facultatif), peau = 1 à 6 }
-- kit = { maillot = Color3, short = Color3, numero = Color3 }
function Apparence.creerJoueur(look, kit, numero: number)
	local d = Instance.new("HumanoidDescription")
	d.HairAccessory = Apparence.COUPES[look.coupe] or ""
	d.FaceAccessory = if look.barbe then Apparence.BARBES[look.barbe] or "" else ""
	d.HeadColor = Apparence.PEAUX[look.peau] or Apparence.PEAUX[3]
	d.TorsoColor = kit.maillot
	d.LeftArmColor = kit.maillot
	d.RightArmColor = kit.maillot
	d.LeftLegColor = kit.short
	d.RightLegColor = kit.short
	local m = Players:CreateHumanoidModelFromDescription(d, Enum.HumanoidRigType.R6)
	m.PrimaryPart = m.HumanoidRootPart -- sinon le pivot est la tête
	m.Humanoid.DisplayDistanceType = Enum.HumanoidDisplayDistanceType.None
	for _, f in { { Enum.NormalId.Back, 0.8, 0.7, 0.1, 0.15 }, { Enum.NormalId.Front, 0.3, 0.32, 0.6, 0.06 } } do
		local g = Instance.new("SurfaceGui")
		g.Face = f[1]
		g.SizingMode = Enum.SurfaceGuiSizingMode.PixelsPerStud
		g.PixelsPerStud = 50
		g.Parent = m.Torso
		local t = Instance.new("TextLabel")
		t.BackgroundTransparency = 1
		t.Size = UDim2.fromScale(f[2], f[3])
		t.Position = UDim2.fromScale(f[4], f[5])
		t.Text = tostring(numero)
		t.TextColor3 = kit.numero
		t.TextScaled = true
		t.FontFace = POLICE
		t.Parent = g
	end
	return m
end

return Apparence
