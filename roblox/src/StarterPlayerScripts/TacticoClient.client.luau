--[[
	Tactico (Roblox) : script du joueur.
	Relie l'interface (StarterGui.TacticoGui), le serveur et le match en 3D :
	écran titre et mode carrière (module Carriere), match amical (module Interface).
]]
local RS = game:GetService("ReplicatedStorage")
local T = RS:WaitForChild("Tactico")
local Remotes = T:WaitForChild("Remotes")
local Interface = require(T:WaitForChild("Interface"))
local Spectacle = require(T:WaitForChild("Spectacle"))
local Carriere = require(T:WaitForChild("Carriere"))

-- Le match amical est diffusé à tout le serveur : on ne le montre qu'aux joueurs qui sont dans le menu amical
local modeAmical = false

Interface.init({
	lancer = function(h, a)
		Remotes.Lancer:FireServer(h, a)
	end,
	vitesse = function(v)
		Spectacle.vitesse(v)
	end,
	quitter = function()
		Spectacle.arreter()
		Interface.menu()
	end,
	fermer = function()
		Spectacle.arreter()
	end,
	retour = function()
		modeAmical = false
		Spectacle.arreter()
		Carriere.titre()
	end,
})

Carriere.init({
	amical = function()
		modeAmical = true
		Interface.ouvrir()
	end,
})

Remotes.Etat.OnClientEvent:Connect(function(kind, x)
	if modeAmical then
		Interface.etat(kind, x)
	end
end)

Remotes.Match.OnClientEvent:Connect(function(data, info)
	if not modeAmical then
		return
	end
	Interface.debutMatch(info)
	Spectacle.jouer(data, info, Interface)
end)

task.spawn(function()
	local ok, data = pcall(function()
		return Remotes.Monde:InvokeServer()
	end)
	Interface.monde(if ok then data else nil)
end)
