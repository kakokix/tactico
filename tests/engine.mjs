import { generateWorld } from '../src/core/worldgen.js';
import { MatchSim } from '../src/core/match.js';
import { autoLineup, aiTactics } from '../src/core/team.js';
import { recordResult, leagueTable } from '../src/core/competitions.js';
import { R } from '../src/core/rng.js';

const t0 = Date.now();
const S = generateWorld(12345);
console.log('world gen ms', Date.now() - t0, 'players', Object.keys(S.players).length, 'clubs', Object.keys(S.clubs).length, 'matches', Object.keys(S.matches).length);
// distribution of club strengths
for (const id of ['EN1','EN2','FR1','FR2']) {
  const c = S.comps[id];
  const strs = c.clubs.map(x => S.clubs[x].str).sort((a,b)=>b-a);
  console.log(id, strs.map(x=>x.toFixed(0)).join(' '));
}
const top = Object.values(S.players).sort((a,b)=>b.ovr-a.ovr).slice(0,10).map(p=>`${p.fn} ${p.ln} ${p.pos} ${p.ovr}/${p.pot} age ${p.age} val ${(p.value/1e6).toFixed(1)}M wage ${p.wage}`);
console.log(top.join('\n'));

let n=0, goals=0, hw=0, dr=0, aw=0, shots=0, on=0, xg=0, cor=0, fo=0, yc=0, rc=0, pens=0, inj=0, off=0;
const t1 = Date.now();
const leagueMatches = Object.values(S.matches).filter(m => S.comps[m.c].type==='league');
for (const m of leagueMatches) {
  const H = S.clubs[m.h], A = S.clubs[m.a];
  const th = aiTactics(S, H, A, true), ta = aiTactics(S, A, H, false);
  const lh = autoLineup(S, H, th.formation, {rotate:false}), la = autoLineup(S, A, ta.formation, {rotate:false});
  const sim = new MatchSim(S, m, { quiet: true, home: { tactics: th, lineup: lh.lineup, bench: lh.bench }, away: { tactics: ta, lineup: la.lineup, bench: la.bench } });
  sim.playToEnd();
  m.hg = sim.sides[0].goals; m.ag = sim.sides[1].goals; m.done = true;
  recordResult(S, m);
  n++; goals += m.hg + m.ag; if (m.hg>m.ag) hw++; else if (m.hg===m.ag) dr++; else aw++;
  const st = sim.stats; shots += st.sh[0]+st.sh[1]; on += st.on[0]+st.on[1]; xg += st.xg[0]+st.xg[1]; cor += st.cor[0]+st.cor[1]; fo += st.fo[0]+st.fo[1]; yc += st.yc[0]+st.yc[1]; rc += st.rc[0]+st.rc[1]; pens += st.pn; inj += Object.keys(sim.injuries).length; off += st.off[0]+st.off[1];
}
console.log('sim ms', Date.now()-t1, 'matches', n);
const f = (x) => (x/n).toFixed(2);
console.log(`goals/m ${f(goals)} home ${(hw/n*100).toFixed(0)}% draw ${(dr/n*100).toFixed(0)}% away ${(aw/n*100).toFixed(0)}%`);
console.log(`shots ${f(shots)} on ${f(on)} xg ${f(xg)} corners ${f(cor)} fouls ${f(fo)} yc ${f(yc)} rc ${f(rc)} pens ${f(pens)} inj ${f(inj)} off ${f(off)}`);
for (const id of ['EN1','FR1','EN2']) {
  const t = leagueTable(S, S.comps[id]);
  console.log(id, t.slice(0,3).map(r => `${S.clubs[r.c].name}(${S.clubs[r.c].str}) ${r.pts}`).join(' | '), ' ... last:', t.slice(-2).map(r => `${S.clubs[r.c].name}(${S.clubs[r.c].str}) ${r.pts}`).join(' | '));
}
