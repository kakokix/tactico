import { generateWorld } from '../src/core/worldgen.js';
import { startCareer, continueGame, createSim, finishUserMatch } from '../src/core/game.js';
import { leagueTable } from '../src/core/competitions.js';
import { fmtDate } from '../src/core/dates.js';
import { takeJob, vacancies } from '../src/core/board.js';
import { LEAGUE_COUNTRIES } from '../src/core/constants.js';

const seasonsWanted = +(process.argv[2] || 3);
const S = generateWorld(+(process.argv[3] || 777));
const fr1 = S.comps.FR1.clubs.map(id => S.clubs[id]).sort((a,b)=>b.rep-a.rep);
const pick = fr1[8];
startCareer(S, { name: 'Testeur', nat: 'FR', clubId: pick.id });
S.mgr.autoPick = true;
console.log('Club:', pick.name, 'rep', pick.rep, 'obj', pick.obj.label, 'budget', pick.tBudget, 'wB', pick.wBudget);
let seasons = 0, stops = {}, t0 = Date.now(), userMatches = 0;
const stat = () => {
  const ps = Object.values(S.players);
  const top = ps.slice().sort((a,b)=>b.ovr-a.ovr).slice(0,100);
  const avgTop = top.reduce((s,p)=>s+p.ovr,0)/100;
  const bal = Object.values(S.clubs).map(c=>c.balance).sort((a,b)=>a-b);
  const sq = Object.values(S.clubs).map(c=>c.squad.length).sort((a,b)=>a-b);
  const strs = LEAGUE_COUNTRIES.map(C => { const c = S.comps[C.code+'1'].clubs.map(id=>S.clubs[id].str); return C.code+':'+(c.reduce((a,b)=>a+b,0)/c.length).toFixed(1); }).join(' ');
  return `players ${ps.length} free ${S.free.length} top100 ${avgTop.toFixed(1)} best ${top[0].ovr} | squads ${sq[0]}-${sq[sq.length-1]} | balance min ${(bal[0]/1e6).toFixed(0)}M med ${(bal[90]/1e6).toFixed(0)}M max ${(bal[bal.length-1]/1e6).toFixed(0)}M | D1 str ${strs}`;
};
console.log('START', stat());
for (let i = 0; i < 4000; i++) {
  const r = continueGame(S);
  stops[r.stop] = (stops[r.stop]||0)+1;
  if (r.stop === 'match' || r.stop === 'matchday') {
    const m = r.match;
    const sim = createSim(S, m, { userAuto: true });
    sim.playToEnd();
    finishUserMatch(S, m, sim);
    userMatches++;
  } else if (r.stop === 'season') {
    seasons++;
    const rep = r.report;
    console.log(`\n=== Fin saison ${rep.s} (${((Date.now()-t0)/1000).toFixed(1)}s, user matches ${userMatches}) ===`);
    for (const l of rep.leagues.filter(l=>l.level===1)) console.log(' ', l.name, '→', S.clubs[l.champ].name, '|', l.awards.map(a=>`${a.k}: ${a.n} (${a.v})`).join('; '));
    console.log('  Coupes:', rep.cups.map(c=>c.name+': '+(c.winner?S.clubs[c.winner].name:'?')).join(' | '), '| Conti:', rep.conti ? S.clubs[rep.conti].name : '?');
    console.log('  Gold:', rep.gold?.n, '| User:', JSON.stringify(rep.user));
    console.log('  transfers:', S.transfers.length, '|', stat());
    console.log('  mgr', JSON.stringify(S.mgr.career), 'rep', S.mgr.rep, 'conf', S.mgr.conf, 'club', S.user && S.clubs[S.user].name);
    if (seasons >= seasonsWanted) break;
  }
  // gérer les actions en attente
  for (const msg of S.inbox) {
    if (msg.act && !msg.done) {
      if (msg.act.type === 'bid') { msg.done = true; }
      if (msg.act.type === 'job' && !S.user) { takeJob(S, msg.act.club); msg.done = true; console.log('  -> new job', S.clubs[S.user].name, fmtDate(S.day)); }
    }
  }
  if (!S.user && i % 50 === 0) { const v = vacancies(S); }
}
console.log('stops', stops, 'time', ((Date.now()-t0)/1000).toFixed(1)+'s');
const js = JSON.stringify(S);
console.log('save size', (js.length/1e6).toFixed(2), 'MB');
