--[[
	Tactico (Roblox) : script du joueur.
	Relie l'interface (StarterGui.TacticoGui), le serveur et le match en 3D.
]]
local RS = game:GetService("ReplicatedStorage")
local T = RS:WaitForChild("Tactico")
local Remotes = T:WaitForChild("Remotes")
local Interface = require(T:WaitForChild("Interface"))
local Spectacle = require(T:WaitForChild("Spectacle"))

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
})

Remotes.Etat.OnClientEvent:Connect(function(kind, x)
	Interface.etat(kind, x)
end)

Remotes.Match.OnClientEvent:Connect(function(data, info)
	Interface.debutMatch(info)
	Spectacle.jouer(data, info, Interface)
end)

task.spawn(function()
	local ok, data = pcall(function()
		return Remotes.Monde:InvokeServer()
	end)
	Interface.monde(if ok then data else nil)
end)
