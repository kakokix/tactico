--[[
	Tactico (Roblox) : exporte le code et l'interface depuis Studio, pour les ranger dans le dépôt.
	À lancer avec l'outil execute_luau du serveur MCP de Studio (contexte Edit, ou Server pendant un test).
	Le résultat (JSON) contient le code des scripts et l'arbre de StarterGui.TacticoGui ;
	un petit script Python le range ensuite dans roblox/src et roblox/interface.
]]
local HS = game:GetService("HttpService")
local out = { scripts = {}, gui = nil }
local function ajouter(chemin, inst)
	if inst then
		out.scripts[chemin] = inst.Source
	end
end
local RS = game:GetService("ReplicatedStorage").Tactico
for _, n in { "Config", "Apparence", "Interface", "Spectacle" } do
	ajouter("ReplicatedStorage/Tactico/" .. n .. ".luau", RS:FindFirstChild(n))
end
ajouter("ServerScriptService/TacticoServeur.server.luau", game:GetService("ServerScriptService"):FindFirstChild("TacticoServeur"))
ajouter("StarterPlayerScripts/TacticoClient.client.luau", game:GetService("StarterPlayer").StarterPlayerScripts:FindFirstChild("TacticoClient"))

local PROPS = { "Name", "Visible", "AnchorPoint", "Position", "Size", "BackgroundColor3", "BackgroundTransparency", "BorderSizePixel", "LayoutOrder",
	"Text", "TextColor3", "TextScaled", "TextSize", "TextWrapped", "TextXAlignment", "TextYAlignment", "AutoButtonColor", "ScrollBarThickness",
	"CanvasSize", "AutomaticCanvasSize", "CornerRadius", "Color", "Transparency", "Thickness", "ApplyStrokeMode", "FillDirection",
	"HorizontalAlignment", "VerticalAlignment", "Padding", "SortOrder", "MaxSize", "MaxTextSize", "MinTextSize", "PaddingLeft", "PaddingRight",
	"ResetOnSpawn", "IgnoreGuiInset", "ZIndexBehavior" }
local function val(v)
	local t = typeof(v)
	if t == "UDim2" then
		return { "UDim2", v.X.Scale, v.X.Offset, v.Y.Scale, v.Y.Offset }
	elseif t == "UDim" then
		return { "UDim", v.Scale, v.Offset }
	elseif t == "Vector2" then
		return { "Vector2", v.X, v.Y }
	elseif t == "Color3" then
		return { "Color3", math.round(v.R * 255), math.round(v.G * 255), math.round(v.B * 255) }
	elseif t == "EnumItem" then
		return { "Enum", tostring(v.EnumType), v.Name }
	elseif t == "Font" then
		return { "Font", v.Family, v.Weight.Name, v.Style.Name }
	end
	return v
end
local function arbre(inst)
	local n = { classe = inst.ClassName, props = {}, attributs = inst:GetAttributes(), enfants = {} }
	local defaut = Instance.new(inst.ClassName)
	for _, p in PROPS do
		local ok, v = pcall(function()
			return inst[p]
		end)
		if ok and v ~= nil then
			local ok2, d = pcall(function()
				return defaut[p]
			end)
			if not ok2 or d ~= v or p == "Name" then
				n.props[p] = val(v)
			end
		end
	end
	local okf, f = pcall(function()
		return inst.FontFace
	end)
	if okf and f then
		n.props.FontFace = val(f)
	end
	defaut:Destroy()
	for _, e in inst:GetChildren() do
		table.insert(n.enfants, arbre(e))
	end
	return n
end
local gui = game:GetService("StarterGui"):FindFirstChild("TacticoGui")
if gui then
	out.gui = arbre(gui)
end
return HS:JSONEncode(out)
