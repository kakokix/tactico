--[[
	Tactico (Roblox) : construit le ballon (ReplicatedStorage.Tactico.Ballon) par géométrie solide :
	une sphère blanche et les 12 pentagones noirs d'un ballon classique (icosaèdre tronqué).
	À lancer une fois avec execute_luau (contexte Edit). Spectacle le clone pour les matchs en 3D,
	le serveur pour le ballon libre de la pelouse (taille changée à l'usage).
]]
local GS = game:GetService("GeometryService")
local R = 4
local origine = Vector3.new(0, 300, 0)
local phi = (1 + math.sqrt(5)) / 2
local sommets = {}
for _, a in { -1, 1 } do
	for _, b in { -1, 1 } do
		table.insert(sommets, Vector3.new(0, a, b * phi).Unit)
		table.insert(sommets, Vector3.new(a, b * phi, 0).Unit)
		table.insert(sommets, Vector3.new(b * phi, 0, a).Unit)
	end
end
local tmp = Instance.new("Folder")
tmp.Name = "_TmpBallon"
tmp.Parent = workspace
local function piece(forme, taille, cf, couleur)
	local p = Instance.new("Part")
	p.Shape = forme
	p.Size = taille
	p.CFrame = cf
	p.Color = couleur
	p.Material = Enum.Material.SmoothPlastic
	p.Anchored = true
	p.Parent = tmp
	return p
end
local NOIR = Color3.fromRGB(24, 24, 28)
local blanc = piece(Enum.PartType.Ball, Vector3.one * 2 * R, CFrame.new(origine), Color3.fromRGB(248, 248, 248))
local pentagones = {}
local apotheme = R * math.sin(math.rad(16.5))
local L = 4 * R
for _, v in sommets do
	-- un sommet du pentagone pointe vers le sommet voisin le plus proche
	local proche, d = nil, math.huge
	for _, w in sommets do
		local e = (w - v).Magnitude
		if e > 1e-3 and e < d then
			proche, d = w, e
		end
	end
	local d0 = (proche - v * proche:Dot(v)).Unit
	local cf = CFrame.fromMatrix(origine, d0, v:Cross(d0), v)
	local cur = piece(Enum.PartType.Ball, Vector3.one * 2 * R * 1.015, CFrame.new(origine), NOIR)
	local coupes = {}
	for k = 0, 4 do
		local th = math.rad(72 * k + 36)
		local u = Vector3.new(math.cos(th), math.sin(th), 0)
		table.insert(coupes, piece(Enum.PartType.Block, Vector3.one * L, cf * CFrame.new(u * (apotheme - L / 2)) * CFrame.Angles(0, 0, th), NOIR))
	end
	table.insert(coupes, piece(Enum.PartType.Block, Vector3.one * L, cf * CFrame.new(0, 0, R * 0.3 + L / 2), NOIR))
	-- intersections une à une (une seule intersection avec plusieurs pièces garde leur union)
	for _, c in coupes do
		local res = GS:IntersectAsync(cur, { c }, { SplitApart = false })[1]
		res.Parent = tmp
		cur:Destroy()
		c:Destroy()
		cur = res
	end
	table.insert(pentagones, cur)
	task.wait()
end
local ballon = GS:UnionAsync(blanc, pentagones, { SplitApart = false, RenderFidelity = Enum.RenderFidelity.Precise })[1]
ballon.Name = "Ballon"
ballon.UsePartColor = false
ballon.Anchored = true
ballon.CanCollide = false
ballon.CanQuery = false
ballon.CanTouch = false
ballon.Material = Enum.Material.SmoothPlastic
ballon.CFrame = CFrame.new()
local ancien = game.ReplicatedStorage.Tactico:FindFirstChild("Ballon")
if ancien then
	ancien:Destroy()
end
ballon.Parent = game.ReplicatedStorage.Tactico
tmp:Destroy()
return "Ballon prêt"
