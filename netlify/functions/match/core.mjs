// Simulation d'un match pour Roblox, séparée de la fonction Netlify pour pouvoir la tester avec Node.
import { construireMonde, GRAINE } from '../../../roblox/outils/monde.mjs';
import { createSim } from '../../../src/core/game.js';
import { R } from '../../../src/core/rng.js';
import { setLang } from '../../../src/core/i18n.js';

setLang('en'); // le jeu Roblox est en anglais (commentaires du match)

let monde = null; // le monde est construit une fois par instance de la fonction
export function getMonde() {
  if (!monde) monde = construireMonde(GRAINE);
  return monde;
}

const FINS = [45, 90, 105, 120];

export function simulerMatch(h, a, graine) {
  const st = getMonde();
  if (typeof h !== 'string' || typeof a !== 'string' || !st.clubs[h] || !st.clubs[a] || h === a) {
    return { error: 'Invalid clubs.' };
  }
  let s = Number.parseInt(graine ?? '', 10);
  if (!Number.isFinite(s) || s <= 0) s = (Date.now() % 2147483647) + 1;
  s = s >>> 0;
  R.seed(s);
  const m = { id: 'amical', comp: 'amical', h, a, neutral: false, ko: false };
  const sim = createSim(st, m, { userAuto: true, quiet: false });
  const equipe = (side) => ({
    f: side.tactics.formation,
    xi: side.slots.map((sl) => [sl.pid, sl.pos, sl.x, sl.y]),
    banc: side.bench.slice(),
  });
  const eq = [equipe(sim.sides[0]), equipe(sim.sides[1])];
  const minutes = [];
  let garde = 0;
  while (!sim.done && garde++ < 400) {
    const per = sim.period, fin = FINS[per - 1];
    const label = sim.minute < fin ? String(sim.minute + 1) : `${fin}+${sim.extra + 1}`;
    const out = sim.step();
    if (!out) break;
    minutes.push([
      label, per,
      out.phases.map((ph) => [ph.t, ph.z, ph.k, ph.type || '', ph.ids || []]),
      out.events.map((e) => [e.type, e.t ?? -1, e.pid || '', e.pid2 || '', e.text || '', e.score || 0, e.ph ?? -1]),
    ]);
  }
  return {
    v: 1, s, h, a, eq, min: minutes,
    score: [sim.sides[0].goals, sim.sides[1].goals],
    stats: { tirs: sim.stats.sh, cadres: sim.stats.on, poss: possession(sim) },
  };
}

function possession(sim) {
  const t = sim.stats.poss[0] + sim.stats.poss[1] || 1;
  const p = Math.round((100 * sim.stats.poss[0]) / t);
  return [p, 100 - p];
}
