// Vérifie les données du monde réel (nationalités, postes, tailles des championnats).
import { REAL_DATA, REAL_COUNTRIES, parseClub } from '../src/data/real/index.js';
import { NATIONS } from '../src/data/names.js';
import { POS } from '../src/core/constants.js';
const want = { FR: [18, 18], EN: [20, 24], ES: [20, 22], IT: [20, 20], DE: [18, 18], PT: [18, 16], NL: [18, 14], BE: [18, 8], TR: [18, 18], SCO: [12, 10] };
let bad = 0, nPlayers = 0;
for (const C of REAL_COUNTRIES) {
  const d = REAL_DATA[C.code];
  for (const [i, key] of [[0, 'd1'], [1, 'd2']]) {
    const clubs = d[key].map(parseClub);
    if (clubs.length !== want[C.code][i]) { console.log(`${C.code} ${key}: ${clubs.length} clubs (attendu ${want[C.code][i]})`); bad++; }
    const abbr = new Set();
    for (const c of clubs) {
      if (abbr.has(c.abbr)) { console.log('abréviation en double', c.abbr); bad++; }
      abbr.add(c.abbr);
      if (!/^#[0-9A-F]{6}$/i.test(c.colors[0]) || !/^#[0-9A-F]{6}$/i.test(c.colors[1])) { console.log('couleur', c.name); bad++; }
      if (!(c.cap > 1000) || !(c.rep > 30 && c.rep <= 96)) { console.log('capacité/réputation', c.name, c.cap, c.rep); bad++; }
      if (!c.players.length && !c.lvl) { console.log('ni joueurs ni niveau', c.name); bad++; }
      for (const p of c.players) {
        nPlayers++;
        if (!NATIONS[p.nat]) { console.log('nationalité inconnue', p.nat, p.ln, c.name); bad++; }
        if (!POS.includes(p.pos) || p.alt.some((a) => !POS.includes(a))) { console.log('poste', p.pos, p.alt, p.ln); bad++; }
        if (!(p.ovr >= 55 && p.ovr <= 95) || !(p.age >= 15 && p.age <= 42)) { console.log('note/âge', p.ln, p.ovr, p.age); bad++; }
        if (p.pot && p.pot < p.ovr) { console.log('potentiel < note', p.ln); bad++; }
      }
    }
  }
}
console.log(`${nPlayers} joueurs réels, ${bad} problème(s)`);
process.exit(bad ? 1 : 0);
