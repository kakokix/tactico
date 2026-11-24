--[[
	Tactico (Roblox) : adapte l'interface (StarterGui.TacticoGui) à l'écran du joueur.
	L'interface est dessinée pour un écran d'au moins 1100 × 600 points. Sur un écran plus petit
	(téléphone), chaque cadre principal est réduit d'un bloc par un UIScale et agrandi d'autant :
	la mise en page reste celle de l'ordinateur, en plus petit, au lieu de se tasser.
	Les boutons de Roblox (en haut à gauche) sont aussi évités : écusson du club, bouton « Back »
	de la création, panneaux du match amical.
]]
local GuiService = game:GetService("GuiService")

local Ecran = {}

local LARGEUR, HAUTEUR = 1100, 600 -- plus petit écran prévu pour la mise en page
local PLEIN_ECRAN = { "Titre", "Creation", "Chargement", "Jeu", "Modale", "Hud" }
local PANNEAUX = { Amical = Vector2.new(0.94, 0.86), Fin = Vector2.new(0.7, 0.7) }

local gui = nil
local echelleActuelle = 1

local function uiScale(cadre, k)
	local s = cadre:FindFirstChild("EchelleEcran")
	if not s then
		s = Instance.new("UIScale")
		s.Name = "EchelleEcran"
		s.Parent = cadre
	end
	s.Scale = k
end

-- Largeur occupée par les boutons de Roblox à gauche de la barre du haut
local function largeurBoutonsRoblox()
	local ok, r = pcall(function()
		return GuiService.TopbarInset
	end)
	return if ok and r then math.max(r.Min.X, 0) else 0
end

function Ecran.adapter()
	if not gui then
		return
	end
	local cam = workspace.CurrentCamera
	local vp = if cam then cam.ViewportSize else Vector2.new(1280, 720)
	if vp.X < 50 or vp.Y < 50 then
		return
	end
	local k = math.clamp(math.min(vp.X / LARGEUR, vp.Y / HAUTEUR), 0.45, 1)
	echelleActuelle = k
	local haut = GuiService:GetGuiInset().Y -- hauteur de la barre de Roblox, en points d'écran
	local boutons = largeurBoutonsRoblox()
	for _, nom in PLEIN_ECRAN do
		local f = gui:FindFirstChild(nom)
		if f then
			f.Size = UDim2.fromScale(1 / k, 1 / k)
			uiScale(f, k)
		end
	end
	for nom, t in PANNEAUX do
		local f = gui:FindFirstChild(nom)
		if f then
			-- panneau centré sous la barre de Roblox
			local h = t.Y * (vp.Y - haut) / vp.Y
			f.AnchorPoint = Vector2.new(0.5, 0.5)
			f.Position = UDim2.new(0.5, 0, 0.5, haut / 2)
			f.Size = UDim2.fromScale(t.X / k, h / k)
			uiScale(f, k)
		end
	end
	local toast = gui:FindFirstChild("Toast")
	if toast then
		uiScale(toast, k)
	end
	-- écusson et nom du club à droite des boutons de Roblox
	local jeu = gui:FindFirstChild("Jeu")
	local barre = jeu and jeu:FindFirstChild("Haut")
	if barre then
		local m = barre:FindFirstChild("MargeRoblox")
		if not m then
			m = Instance.new("UIPadding")
			m.Name = "MargeRoblox"
			m.Parent = barre
		end
		m.PaddingLeft = UDim.new(0, math.max(0, boutons / k - 8))
	end
	-- haut de la page de création (bouton « Back ») sous la barre de Roblox
	local creation = gui:FindFirstChild("Creation")
	local page = creation and creation:FindFirstChild("Page")
	local pad = page and page:FindFirstChildOfClass("UIPadding")
	if pad then
		local base = pad:GetAttribute("HautBase")
		if typeof(base) ~= "number" then
			base = pad.PaddingTop.Offset
			pad:SetAttribute("HautBase", base)
		end
		pad.PaddingTop = UDim.new(0, base + haut / k)
	end
end

-- Échelle appliquée (1 sur ordinateur, moins sur téléphone)
function Ecran.echelle()
	return echelleActuelle
end

function Ecran.init(g)
	gui = g
	local liee = nil
	local function suivreCamera()
		if liee then
			liee:Disconnect()
			liee = nil
		end
		local cam = workspace.CurrentCamera
		if cam then
			liee = cam:GetPropertyChangedSignal("ViewportSize"):Connect(Ecran.adapter)
		end
		Ecran.adapter()
	end
	workspace:GetPropertyChangedSignal("CurrentCamera"):Connect(suivreCamera)
	pcall(function()
		GuiService:GetPropertyChangedSignal("TopbarInset"):Connect(Ecran.adapter)
	end)
	suivreCamera()
end

return Ecran
