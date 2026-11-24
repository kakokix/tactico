# Range dans le dépôt le résultat de roblox/outils/exporter.luau (code des scripts et interface TacticoGui).
# Usage : python3 roblox/outils/ranger.py <fichier du résultat>   (depuis la racine du dépôt)
import json
import os
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def lire(chemin):
    txt = open(chemin, encoding='utf-8').read().strip()
    i = txt.find('{')
    d = json.loads(txt[i:txt.rindex('}') + 1]) if i >= 0 else json.loads(txt)
    if isinstance(d, str):
        d = json.loads(d)
    return d


CONSTRUIRE = r'''
local function valeur(v)
	if type(v) ~= "table" then
		return v
	end
	local t = v[1]
	if t == "UDim2" then
		return UDim2.new(v[2], v[3], v[4], v[5])
	elseif t == "UDim" then
		return UDim.new(v[2], v[3])
	elseif t == "Vector2" then
		return Vector2.new(v[2], v[3])
	elseif t == "Vector3" then
		return Vector3.new(v[2], v[3], v[4])
	elseif t == "Color3" then
		return Color3.fromRGB(v[2], v[3], v[4])
	elseif t == "Enum" then
		return Enum[v[2]][v[3]]
	elseif t == "Font" then
		return Font.new(v[2], Enum.FontWeight[v[3]], Enum.FontStyle[v[4]])
	elseif t == "ColorSequence" then
		local k = {}
		for _, p in v[2] do
			table.insert(k, ColorSequenceKeypoint.new(p[1], Color3.fromRGB(p[2], p[3], p[4])))
		end
		return ColorSequence.new(k)
	elseif t == "NumberSequence" then
		local k = {}
		for _, p in v[2] do
			table.insert(k, NumberSequenceKeypoint.new(p[1], p[2], p[3]))
		end
		return NumberSequence.new(k)
	end
	return v
end

local function construire(n)
	local inst = Instance.new(n.classe)
	for k, v in n.props do
		if not (k == "Transparency" and inst:IsA("GuiObject")) then
			local ok, err = pcall(function()
				inst[k] = valeur(v)
			end)
			if not ok then
				warn("Propriété ignorée", n.classe, k, err)
			end
		end
	end
	if type(n.attributs) == "table" then
		for k, v in n.attributs do
			inst:SetAttribute(k, v)
		end
	end
	for _, e in n.enfants do
		construire(e).Parent = inst
	end
	return inst
end

local SG = game:GetService("StarterGui")
local gui = construire(HttpService:JSONDecode(DONNEES))
local ancien = SG:FindFirstChild(gui.Name)
if ancien then
	ancien:Destroy()
end
gui.Parent = SG
print("Interface Tactico recréée dans StarterGui")
'''


def main():
    d = lire(sys.argv[1])
    for chemin, src in (d.get('scripts') or {}).items():
        dest = os.path.join(RACINE, 'roblox', 'src', chemin)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, 'w', encoding='utf-8') as f:
            f.write(src)
        print('script', chemin, len(src))
    if d.get('gui'):
        js = json.dumps(d['gui'], ensure_ascii=False, separators=(',', ':'))
        assert ']==]' not in js
        with open(os.path.join(RACINE, 'roblox', 'interface', 'TacticoGui.json'), 'w', encoding='utf-8') as f:
            json.dump(d['gui'], f, ensure_ascii=False, indent=1)
        entete = ('--[[\n\tTactico (Roblox) : recrée l\'interface StarterGui.TacticoGui.\n'
                  '\tÀ coller dans la barre de commande de Studio (View > Command Bar). Remplace l\'interface existante.\n'
                  '\tGénéré automatiquement depuis Studio : roblox/interface/TacticoGui.json (outils/exporter.luau puis outils/ranger.py).\n]]\n'
                  'local HttpService = game:GetService("HttpService")\nlocal DONNEES = [==[' + js + ']==]\n')
        with open(os.path.join(RACINE, 'roblox', 'interface', 'TacticoGui.luau'), 'w', encoding='utf-8') as f:
            f.write(entete + CONSTRUIRE)
        def compte(n):
            return 1 + sum(compte(e) for e in n.get('enfants', []))
        print('interface', compte(d['gui']), 'objets')


main()
