# Construit les planches d'icônes et de drapeaux à partir du pack Tactico Outline (assets/pack).
# Site : PNG 256 couleurs intégrés au CSS par build.mjs. Roblox : atlas PNG (1024 px au plus) importés dans Studio.
# Usage : python3 -I outils/assets.py   (depuis la racine du dépôt)
import json
import os
import re
import unicodedata

from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(RACINE, 'assets', 'pack', 'PNG')
SORTIE = os.path.join(RACINE, 'src', 'assets')

# Codes du jeu qui ne sont pas des codes ISO
ALIAS = {'EN': 'GB-ENG', 'SCO': 'GB-SCT', 'WAL': 'GB-WLS', 'NIR': 'GB-NIR'}


def cle(nom):
    s = unicodedata.normalize('NFKD', nom).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def icones():
    res = []
    for dossier in ('Navigation', 'Club', 'Commandes', 'Match'):
        for f in sorted(os.listdir(os.path.join(PACK, dossier))):
            if f.endswith('.png'):
                res.append((cle(f[:-4]), os.path.join(PACK, dossier, f)))
    return res


def drapeaux():
    res = []
    for dossier in ('Pays-et-territoires', 'Selections-et-regions', 'Interface'):
        d = os.path.join(PACK, 'Drapeaux', 'Monde', dossier)
        for f in sorted(os.listdir(d)):
            if not f.endswith('.png'):
                continue
            parts = f[:-4].split('-')
            code = parts[0]
            if len(parts) > 2 and re.fullmatch(r'[A-Z]{2,3}', parts[1]):
                code += '-' + parts[1]
            res.append((code, os.path.join(d, f)))
    return res


def rogne(im):
    return im.crop(im.getbbox())


def case(im, w, h):
    # Ajuste l'image dans une case w x h (proportions gardées, centrée)
    im = rogne(im)
    r = min(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width * r)), max(1, round(im.height * r))
    im = im.resize((nw, nh), Image.LANCZOS)
    c = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    c.alpha_composite(im, ((w - nw) // 2, (h - nh) // 2))
    return c


def reduit(p):
    # 256 couleurs : invisible sur ces dessins à aplats, et deux fois plus léger
    return p.quantize(256, method=Image.FASTOCTREE)


def planche(items, w, h, cols, marge=0):
    rows = (len(items) + cols - 1) // cols
    W, H = cols * (w + marge), rows * (h + marge)
    p = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    carte = {}
    for i, (k, f) in enumerate(items):
        x, y = (i % cols) * (w + marge), (i // cols) * (h + marge)
        p.alpha_composite(case(Image.open(f).convert('RGBA'), w, h), (x, y))
        carte[k] = i
    return p, carte, cols, rows


def main():
    os.makedirs(SORTIE, exist_ok=True)
    ic, dr = icones(), drapeaux()
    info = {'alias': ALIAS}

    # Site : icônes 72 px, drapeaux 44 x 32 px
    p, carte, cols, rows = planche(ic, 72, 72, 8)
    reduit(p).save(os.path.join(SORTIE, 'icones.png'), optimize=True)
    info['icones'] = {'w': 72, 'h': 72, 'cols': cols, 'rows': rows, 'i': carte}
    p, carte, cols, rows = planche(dr, 44, 32, 16)
    reduit(p).save(os.path.join(SORTIE, 'drapeaux.png'), optimize=True)
    info['drapeaux'] = {'w': 44, 'h': 32, 'cols': cols, 'rows': rows, 'i': carte}

    # Roblox : icônes 128 px (8 x 8 = 1024 px), drapeaux 64 x 46 px (16 colonnes)
    p, carte, cols, rows = planche(ic, 128, 128, 8)
    assert p.width <= 1024 and p.height <= 1024
    reduit(p).convert('RGBA').save(os.path.join(SORTIE, 'roblox-icones.png'), optimize=True)
    info['robloxIcones'] = {'w': 128, 'h': 128, 'cols': cols, 'rows': rows, 'i': carte}
    p, carte, cols, rows = planche(dr, 64, 46, 16)
    assert p.width <= 1024 and p.height <= 1024
    reduit(p).convert('RGBA').save(os.path.join(SORTIE, 'roblox-drapeaux.png'), optimize=True)
    info['robloxDrapeaux'] = {'w': 64, 'h': 46, 'cols': cols, 'rows': rows, 'i': carte}

    # Ballon de l'animation 2D du site (64 px)
    reduit(case(Image.open(os.path.join(PACK, 'Match', 'Ballon-de-match.png')).convert('RGBA'), 64, 64)).save(os.path.join(SORTIE, 'ballon.png'), optimize=True)

    with open(os.path.join(SORTIE, 'assets.json'), 'w', encoding='utf-8') as f:
        json.dump(info, f, ensure_ascii=False, separators=(',', ':'))
    for n in sorted(os.listdir(SORTIE)):
        print(n, os.path.getsize(os.path.join(SORTIE, n)))
    print(len(ic), 'icônes,', len(dr), 'drapeaux')


main()
