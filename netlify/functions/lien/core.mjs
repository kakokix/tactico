// Liaison site ↔ jeu Roblox : une carrière passe de l'un à l'autre avec un code à 6 caractères, valable 30 minutes.
// Le site dépose sa carrière (code à entrer dans Roblox) ou récupère celle que Roblox a déposée, et inversement.
// Les codes sont rangés dans le même magasin que les carrières Roblox (clés l/<CODE>).
import { randomInt } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { serialize, deserialize } from '../../../src/core/save.js';

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0 ni 1 (faciles à confondre)
export const DUREE_MIN = 30;
const MAX = 12e6; // taille maximale d'une carrière (texte JSON)

export const normaliserCode = (c) => String(c ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const codeValide = (c) => /^[A-HJ-NP-Z2-9]{6}$/.test(c);
const nouveauCode = () => Array.from({ length: 6 }, () => ALPHA[randomInt(ALPHA.length)]).join('');

// Texte d'export du site (« TACTICO1: » + gzip en base64, ou JSON brut) → état du jeu
export function lireTexte(txt) {
  if (typeof txt !== 'string' || !txt) throw new Error('vide');
  if (txt.length > MAX) throw new Error('trop grand');
  const json = txt.startsWith('TACTICO1:') ? gunzipSync(Buffer.from(txt.slice(9), 'base64'), { maxOutputLength: MAX }).toString('utf8') : txt;
  return deserialize(json);
}
export const ecrireTexte = (S) => 'TACTICO1:' + gzipSync(Buffer.from(serialize(S), 'utf8')).toString('base64');

// Dépose une carrière : src = 'site' (à récupérer dans Roblox) ou 'roblox' (à récupérer sur le site)
export async function deposer(store, src, S) {
  let code = nouveauCode();
  for (let i = 0; i < 4 && (await store.getMetadata('l/' + code)); i++) code = nouveauCode();
  const gz = gzipSync(Buffer.from(serialize(S), 'utf8'));
  await store.set('l/' + code, gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength), { metadata: { src, exp: Date.now() + DUREE_MIN * 60000 } });
  return code;
}

// Retire une carrière déposée par l'autre côté (le code ne sert qu'une fois)
export async function retirer(store, codeBrut, src) {
  const code = normaliserCode(codeBrut);
  if (!codeValide(code)) return { erreur: 'code' };
  const r = await store.getWithMetadata('l/' + code, { type: 'arrayBuffer' });
  if (!r || !r.data) return { erreur: 'inconnu' };
  const m = r.metadata || {};
  if (!m.exp || m.exp < Date.now()) {
    await store.delete('l/' + code);
    return { erreur: 'expire' };
  }
  if (m.src !== src) return { erreur: 'sens' };
  await store.delete('l/' + code);
  return { S: deserialize(gunzipSync(Buffer.from(r.data), { maxOutputLength: MAX }).toString('utf8')) };
}

// ---------- Côté site (textes en français) ----------
const ERREURS_FR = {
  code: 'Le code doit faire 6 caractères (lettres et chiffres).',
  inconnu: 'Code inconnu : vérifie-le, ou demande un nouveau code dans le jeu Roblox.',
  expire: 'Ce code a expiré (30 minutes) : demandes-en un nouveau dans le jeu Roblox.',
  sens: 'Ce code sert à envoyer une carrière du site vers Roblox : entre-le dans le jeu Roblox.',
};

export async function traiterSite(b, store) {
  const a = b && b.a;
  if (a === 'deposer') {
    let S;
    try {
      S = lireTexte(b.etat);
    } catch {
      return { error: 'Sauvegarde illisible.' };
    }
    if (!S.mgr) return { error: "Cette sauvegarde n'a pas de carrière en cours." };
    if (S.mode !== 'real') return { error: 'Seules les carrières du monde réel peuvent aller sur Roblox.' };
    const code = await deposer(store, 'site', S);
    return { code, minutes: DUREE_MIN };
  }
  if (a === 'recuperer') {
    const r = await retirer(store, b.code, 'roblox');
    if (r.erreur) return { error: ERREURS_FR[r.erreur] };
    return { etat: ecrireTexte(r.S) };
  }
  return { error: 'Action inconnue.' };
}
