// Avant-match, match en direct (terrain 2D animé), après-match.
import { G, ui, register, render, go, openModal, closeModal, modalHead, toast, persist, replaceModal } from './app.js';
import { ICON, esc, crest, money, ovrB, posB, rtB, condBar, inkOn, colorDist, stars, barColor } from './util.js';
import { MENTALITY, PRESSING, STYLE, FORMATIONS, FORMATION_LIST, POS_GROUP } from '../core/constants.js';
import { createSim, finishUserMatch, validateUserLineup } from '../core/game.js';
import { compName, leagueTable } from '../core/competitions.js';
import { fmtDate } from '../core/dates.js';
import { pname, pshort, ovrAt } from '../core/player.js';
import { lineupStrength, clubStrength } from '../core/team.js';
import { R, clamp } from '../core/rng.js';
import { submitScore } from './lb.js';
import { anim } from './anim.js';

// ---------- Avant-match ----------
function matchScreen() {
  const S = G.S;
  const m = S.matches[ui.p.id];
  if (!m || m.done) return '<div class="empty">Ce match est déjà joué.</div>';
  const H = S.clubs[m.h], A = S.clubs[m.a];
  const me = S.clubs[S.user];
  const opp = m.h === S.user ? A : H;
  const notes = validateUserLineup(S, me);
  const slots = FORMATIONS[me.tactics.formation];
  const xi = me.lineup.map((id, i) => [S.players[id], slots[i].pos]);
  const tired = xi.filter(([p]) => p && p.cond < 75);
  const oppKey = opp.squad.map((id) => S.players[id]).filter((p) => p.inj <= 0).sort((a, b) => b.ovr - a.ovr).slice(0, 4);
  const comp = S.comps[m.c];
  const row = (c) => comp.type === 'league' ? (() => { const t = leagueTable(S, comp); const i = t.findIndex((r) => r.c === c.id); return `${i + 1}e · ${t[i].pts} pts · ${t[i].f || ''}`; })() : stars(c.rep);
  return `<div class="ph"><div><h1>Jour de match</h1><div class="sub">${esc(compName(S, m.c))}${m.lb ? ' · ' + esc(m.lb) : comp.type === 'league' ? ' · journée ' + m.rd : ''} · ${fmtDate(m.d)}</div></div></div>
  <section class="hero"><div class="vs"><div class="team">${crest(H, 'xl')}<b>${esc(H.name)}</b><span class="small muted">${row(H)}</span><span class="chip">Note ${Math.round(H.id === me.id ? lineupStrength(S, me.tactics.formation, me.lineup) : H.str)}</span></div>
    <div class="mid"><div class="big">VS</div><div class="small muted">${m.neutral ? 'Terrain neutre' : esc(H.stadium.name)}</div></div>
    <div class="team">${crest(A, 'xl')}<b>${esc(A.name)}</b><span class="small muted">${row(A)}</span><span class="chip">Note ${Math.round(A.id === me.id ? lineupStrength(S, me.tactics.formation, me.lineup) : A.str)}</span></div></div>
    <div class="row wrap" style="justify-content:center;margin-top:12px"><button class="btn gold" data-a="playLive" style="min-height:52px;font-size:16px">${ICON.play} Jouer en direct</button><button class="btn" data-a="playQuick">Résultat rapide</button><button class="btn" data-a="nav" data-s="tactics">${ICON.tactics} Tactique</button></div></section>
  ${notes.length ? `<div class="note warn mt">${notes.map(esc).join('<br>')}</div>` : ''}
  ${tired.length ? `<div class="note warn mt">Fatigués : ${tired.map(([p]) => `${esc(pshort(p))} (${Math.round(p.cond)}%)`).join(', ')}. Pense à faire tourner.</div>` : ''}
  <div class="grid2 mt">
    <div class="card"><div class="ttl"><h3>Ton onze · ${me.tactics.formation}</h3><span class="small muted">${MENTALITY[me.tactics.ment]} · pressing ${PRESSING[me.tactics.press].toLowerCase()}</span></div>
      <div class="list">${xi.map(([p, pos]) => p ? `<button class="li" data-a="player" data-id="${p.id}">${posB(pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${condBar(p.cond)}</span></span>${ovrB(ovrAt(p, pos))}</button>` : `<div class="li">${posB(pos)}<span class="grow muted">Poste vide</span></div>`).join('')}</div></div>
    <div class="card"><div class="ttl"><h3>Adversaire : ${esc(opp.name)}</h3></div>
      <p class="small muted">Entraîneur ${esc(opp.mgr.fn + ' ' + opp.mgr.ln)} · formation habituelle ${opp.tactics.formation} · style ${STYLE[opp.tactics.style].toLowerCase()}</p>
      <h3 class="mt mb">Joueurs clés</h3><div class="list">${oppKey.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${p.st.gls} buts · ${p.st.ast} passes cette saison</span></span>${ovrB(p.ovr)}</button>`).join('')}</div></div>
  </div>`;
}

// ---------- Match en direct ----------
const SPEEDS = [[1, 'x1', 950], [2, 'x2', 480], [4, 'x4', 200]];

function liveScreen() {
  const L = ui.live;
  if (!L) return '<div class="empty">Aucun match en cours.</div>';
  const S = G.S;
  const [H, A] = [L.sim.sides[0].club, L.sim.sides[1].club];
  return `<div class="main" style="padding-top:max(10px,env(safe-area-inset-top));max-width:1040px">
    <div class="score"><div class="t">${crest(H)}<b>${esc(H.name)}</b></div><div class="s"><span id="lv-score">${shownScore()}</span><span class="clk" id="lv-clock">${L.sim.clock()}'</span></div><div class="t a"><b>${esc(A.name)}</b>${crest(A)}</div></div>
    <div class="statrow" style="margin-top:6px"><b class="num" id="lv-p0">50%</b><div><div class="lbl">Possession</div><div class="dual"><i id="lv-pb0" style="width:50%;background:${barColor(L.colors[0])}"></i><i id="lv-pb1" style="width:50%;background:${barColor(L.colors[1])}"></i></div></div><b class="num right" id="lv-p1">50%</b></div>
    <div class="canvaswrap"><canvas id="lv-canvas"></canvas><div class="bug" id="lv-bug">${bugHTML()}</div><div class="flash" id="lv-flash"></div></div>
    <div class="ctrl" id="lv-ctrl">${controls()}</div>
    <div class="tabs mt" id="lv-tabs">${[['feed', 'Commentaires'], ['stats', 'Statistiques'], ['rat', 'Notes']].map(([k, l]) => `<button class="tab ${L.tab === k ? 'on' : ''}" data-a="lvTab" data-k="${k}">${l}</button>`).join('')}</div>
    <div class="card" id="lv-panel">${panel()}</div>
  </div>`;
}

// Score affiché : les buts apparaissent quand le ballon franchit la ligne à l'écran
function shownScore() {
  const L = ui.live;
  const g = L.shown || [L.sim.sides[0].goals, L.sim.sides[1].goals];
  return `${g[0]} - ${g[1]}${L.sim.pens && L.sim.done ? ` (${L.sim.pens[0]}-${L.sim.pens[1]})` : ''}`;
}
function bugHTML() {
  const L = ui.live;
  const sim = L.sim;
  const g = L.shown || [sim.sides[0].goals, sim.sides[1].goals];
  const tm = (t) => { const c = sim.sides[t].club; const col = L.colors[t]; return `<span class="tm" style="background:${col};color:${inkOn(col)}">${esc(c.abbr || c.short.slice(0, 3).toUpperCase())}</span>`; };
  return `${tm(0)}<b>${g[0]}-${g[1]}</b>${tm(1)}<i>${sim.done ? 'FIN' : sim.halftime && L.htPause ? 'MT' : sim.clock() + "'"}</i>`;
}

function controls() {
  const L = ui.live;
  if (L.sim.done) return `<button class="btn pri" data-a="lvDone" style="min-height:50px;flex:1">Terminer ${ICON.next}</button>`;
  const user = L.sim.sides[L.us];
  return `<button class="icon-btn" data-a="lvPlay" aria-label="${L.playing ? 'Pause' : 'Lecture'}">${L.playing ? ICON.pause : ICON.play}</button>
    <div class="seg">${SPEEDS.map(([v, l]) => `<button class="${L.speed === v ? 'on' : ''}" data-a="lvSpeed" data-v="${v}">${l}</button>`).join('')}</div>
    <button class="btn" data-a="lvTac">${ICON.tactics} Tactique · ${user.subs}/${user.maxSubs} chgts</button>
    <button class="btn ghost" data-a="lvEnd">Résultat final</button>`;
}

function panel() {
  const L = ui.live;
  const sim = L.sim;
  const S = G.S;
  if (L.tab === 'stats') {
    const st = sim.stats;
    const pos0 = Math.round(st.poss[0] / Math.max(1e-9, st.poss[0] + st.poss[1]) * 100);
    const bar = (l, a, b, fmt = (x) => x) => { const t = (a + b) || 1; return `<div class="statrow"><b class="num">${fmt(a)}</b><div><div class="lbl">${l}</div><div class="dual"><i style="width:${a / t * 100}%;background:${barColor(L.colors[0])}"></i><i style="width:${b / t * 100}%;background:${barColor(L.colors[1])}"></i></div></div><b class="num right">${fmt(b)}</b></div>`; };
    return bar('Possession %', pos0, 100 - pos0) + bar('Tirs', st.sh[0], st.sh[1]) + bar('Cadrés', st.on[0], st.on[1]) + bar('xG', st.xg[0], st.xg[1], (x) => x.toFixed(2)) + bar('Corners', st.cor[0], st.cor[1]) + bar('Fautes', st.fo[0], st.fo[1]) + bar('Hors-jeu', st.off[0], st.off[1]) + bar('Cartons jaunes', st.yc[0], st.yc[1]) + bar('Cartons rouges', st.rc[0], st.rc[1]);
  }
  if (L.tab === 'rat') {
    return `<div class="grid2">${[0, 1].map((t) => { const side = sim.sides[t]; const ids = Object.keys(side.rat); return `<div><h3 class="mb">${esc(side.club.short)}</h3><div class="list">${ids.map((pid) => { const p = S.players[pid]; const on = side.slots.some((s) => s.pid === pid); return `<div class="li"><span class="grow"><span class="nm" style="${on ? '' : 'opacity:.55'}">${esc(pshort(p))}</span><span class="meta">${side.posOf[pid]} · ${Math.round(side.cond[pid] ?? 0)}%${side.reds.has(pid) ? ' · 🟥' : side.yel[pid] ? ' · 🟨' : ''}</span></span>${rtB(Math.max(3, Math.min(10, side.rat[pid])))}</div>`; }).join('')}</div></div>`; }).join('')}</div>`;
  }
  const ev = L.feed.slice(-80).reverse();
  return `<div class="feed" id="lv-feed">${ev.map(feedLine).join('')}</div>`;
}

function feedLine(e) {
  const L = ui.live;
  const cls = e.type === 'goal' ? 'goal' : e.type === 'red' || e.type === 'vardis' ? 'red' : ['ht', 'ft', 'et', 'pen', 'penmiss', 'var', 'varok'].includes(e.type) ? 'big' : '';
  const ic = e.type === 'goal' ? '⚽ ' : e.type === 'yellow' ? '🟨 ' : e.type === 'red' ? '🟥 ' : e.type === 'sub' ? '🔁 ' : e.type === 'injury' ? '🚑 ' : e.type === 'save' ? '🧤 ' : e.type === 'var' || e.type === 'varok' || e.type === 'vardis' ? '📺 ' : '';
  const side = e.t === 0 || e.t === 1 ? `<i style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${barColor(L.colors[e.t])};margin-right:6px"></i>` : '';
  return `<div class="fe ${cls}"><span class="m">${e.min}'</span><span>${side}${ic}${esc(e.text || '')}</span></div>`;
}

function refreshLive(full = false) {
  const L = ui.live;
  if (!L || ui.screen !== 'live') return;
  const sim = L.sim;
  const $ = (id) => document.getElementById(id);
  if (!$('lv-score')) return;
  if (sim.done) L.shown = null;
  $('lv-score').textContent = shownScore();
  if ($('lv-bug')) $('lv-bug').innerHTML = bugHTML();
  $('lv-clock').textContent = sim.done ? 'Terminé' : sim.halftime && L.htPause ? 'Mi-temps' : sim.clock() + "'";
  const st = sim.stats;
  const p0 = Math.round(st.poss[0] / Math.max(1e-9, st.poss[0] + st.poss[1]) * 100) || 50;
  $('lv-p0').textContent = p0 + '%'; $('lv-p1').textContent = 100 - p0 + '%';
  $('lv-pb0').style.width = p0 + '%'; $('lv-pb1').style.width = 100 - p0 + '%';
  if (full || L.tab !== 'feed' || sim.done) $('lv-panel').innerHTML = panel();
  else if (L.newEvents.length) {
    const feed = $('lv-feed');
    if (feed) feed.insertAdjacentHTML('afterbegin', L.newEvents.slice().reverse().map(feedLine).join(''));
  }
  L.newEvents = [];
  $('lv-ctrl').innerHTML = controls();
}

// Durée d'une minute à l'écran : courte quand il ne se passe rien, plus longue pour les temps forts
const HL = { 1: 3400, 2: 1800, 4: 850 };
const CELEB = { 1: 2700, 2: 1400, 4: 700 };

// Un événement devient visible (fil du match, score, bandeau)
function showEvent(e) {
  const L = ui.live;
  if (!L) return;
  L.feed.push(e);
  L.newEvents.push(e);
  const S = G.S;
  const nm = (pid) => (pid && S.players[pid] ? pshort(S.players[pid]) : '');
  if (e.type === 'goal') {
    if (L.shown) L.shown[e.t]++;
    anim.banner(`${nm(e.pid)}${e.pid2 ? ' · passe ' + nm(e.pid2) : ''}`, L.colors[e.t], 2200 / L.speed);
  } else if (e.type === 'yellow') anim.banner(`CARTON JAUNE · ${nm(e.pid)}`, '#f5c542', 1600 / L.speed);
  else if (e.type === 'red') anim.banner(`CARTON ROUGE · ${nm(e.pid)}`, '#ff5f57', 2000 / L.speed, true);
  else if (e.type === 'var') anim.banner('VAR · VÉRIFICATION', '#7dd3fc', 1500 / L.speed, true);
  else if (e.type === 'varok') anim.banner('BUT VALIDÉ', '#c6f43d', 1400 / L.speed, true);
  else if (e.type === 'vardis') anim.banner('BUT REFUSÉ', '#ff5f57', 1800 / L.speed, true);
  else if (e.type === 'sub') anim.banner(e.text.replace(/^Changement [^:]*: /, '🔁 '), '#e8f5ec', 1500 / L.speed);
  else if (e.type === 'injury') { anim.banner(`🚑 ${nm(e.pid)}`, '#ffb4a8', 1500 / L.speed); if (e.t === L.us) toast(e.text); }
  else if (e.type === 'penmiss') anim.banner('PENALTY MANQUÉ', '#9ee6ff', 1400 / L.speed, true);
  else if (e.type === 'ht') anim.banner('MI-TEMPS', '#e8f5ec', 2000, true);
  else if (e.type === 'ft') anim.banner('FIN DU MATCH', '#e8f5ec', 3000, true);
  refreshLive();
}

function tick() {
  const L = ui.live;
  if (!L || !L.playing || L.sim.done) return;
  const sim = L.sim;
  if (L.needKick != null) { anim.flush(); anim.kickoff(L.needKick); L.needKick = null; }
  const out = sim.step();
  if (!out) return;
  const sp = L.speed;
  const hot = out.phases.some((ph) => ['goal', 'vargoal', 'save', 'miss', 'post', 'block'].includes(ph.k) || ph.type === 'pen');
  const goals = out.phases.filter((ph) => ph.k === 'goal' || ph.k === 'vargoal').length;
  const D = hot ? HL[sp] : SPEEDS.find((x) => x[0] === sp)[2];
  anim.queue(out.phases, out.events, D, sp, showEvent);
  if (out.events.some((e) => e.type === 'ht' || e.type === 'et')) L.needKick = 1;
  refreshLive();
  if (sim.done) { setTimeout(() => endLive(), Math.min(D, 1800)); return; }
  if (sim.halftime && !L.htDone) {
    L.htDone = true; L.playing = false; L.htPause = true;
    setTimeout(() => { anim.flush(); refreshLive(true); openModal('halftime'); }, Math.min(D, 1500));
    return;
  }
  L.timer = setTimeout(tick, D + goals * CELEB[sp]);
}

function endLive() {
  const L = ui.live;
  if (L.ended) return;
  L.ended = true;
  clearTimeout(L.timer);
  anim.flush();
  L.shown = null;
  const S = G.S;
  finishUserMatch(S, L.m, L.sim);
  persist(true);
  submitScore(S);
  L.playing = false;
  refreshLive(true);
  setTimeout(() => openModal('postmatch'), 400);
}

function startLive(quick) {
  const S = G.S;
  const m = S.matches[ui.p.id];
  if (!m || m.done) return;
  const sim = createSim(S, m, { userAuto: !!quick, quiet: !!quick });
  if (quick) {
    sim.playToEnd();
    finishUserMatch(S, m, sim);
    persist(true);
    submitScore(S);
    ui.live = { sim, m, us: m.h === S.user ? 0 : 1, feed: sim.events, newEvents: [], colors: teamColors(sim), quick: true, ended: true };
    openModal('postmatch');
    go('home');
    return;
  }
  const colors = teamColors(sim);
  ui.live = { sim, m, us: m.h === S.user ? 0 : 1, speed: 1, playing: true, feed: sim.events.slice(), newEvents: [], tab: 'feed', colors, htDone: false, shown: [0, 0] };
  go('live');
  anim.init(sim, { colors, trims: trimColors(sim, colors), player: (pid) => S.players[pid] });
  anim.banner("COUP D'ENVOI", '#e8f5ec', 1400, true);
  ui.live.timer = setTimeout(tick, 1100);
}

// Liseré des maillots : couleur secondaire du club si elle se distingue de la couleur principale
function trimColors(sim, colors) {
  return [0, 1].map((t) => {
    const cc = sim.sides[t].club.colors;
    const alt = cc.find((c) => c !== colors[t] && colorDist(c, colors[t]) > 90);
    return alt || (inkOn(colors[t]) === '#ffffff' ? '#ffffff' : '#111827');
  });
}

function teamColors(sim) {
  const a = sim.sides[0].club.colors, b = sim.sides[1].club.colors;
  let c1 = b[0];
  if (colorDist(a[0], c1) < 120) c1 = colorDist(a[0], b[1]) > 120 ? b[1] : (colorDist(a[0], '#ffffff') > 150 ? '#ffffff' : '#111827');
  return [a[0], c1];
}

// ---------- Modales en direct ----------
function liveTacModal() {
  const L = ui.live;
  const S = G.S;
  const side = L.sim.sides[L.us];
  const t = side.tactics;
  const seg = (key, labels) => `<div class="seg">${labels.map((l, i) => `<button class="${t[key] === i ? 'on' : ''}" data-a="lvTacSet" data-k="${key}" data-v="${i}">${l}</button>`).join('')}</div>`;
  const out = L.subOut;
  const canSub = side.subs < side.maxSubs && side.bench.length;
  return `${modalHead('Consignes en direct', `${side.subs}/${side.maxSubs} changements effectués`)}
    <div class="field"><label>Formation</label><select class="input" data-ch="lvForm">${FORMATION_LIST.map((f) => `<option ${t.formation === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
    <div class="field"><label>Mentalité</label>${seg('ment', MENTALITY)}</div>
    <div class="field"><label>Pressing</label>${seg('press', PRESSING)}</div>
    <div class="field"><label>Style</label>${seg('style', STYLE)}</div>
    <h3 class="mt mb">${out ? `Qui remplace ${esc(pshort(S.players[out]))} ?` : 'Remplacement : choisis le joueur qui sort'}</h3>
    ${!canSub ? '<p class="muted">Plus de changement possible.</p>' : out
      ? `<div class="list">${side.bench.map((id) => { const p = S.players[id]; const sl = side.slots.find((s) => s.pid === out); return `<button class="li" data-a="lvSubIn" data-id="${id}">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">Note au poste ${ovrAt(p, sl.pos)} · ${Math.round(side.cond[id] ?? p.cond)}%</span></span>${ovrB(p.ovr)}</button>`; }).join('')}</div><button class="btn block mt" data-a="lvSubCancel">Annuler</button>`
      : `<div class="list">${side.slots.filter((s) => s.pid).map((s) => { const p = S.players[s.pid]; return `<button class="li" data-a="lvSubOut" data-id="${s.pid}">${posB(s.pos)}<span class="grow"><span class="nm">${esc(pshort(p))}</span><span class="meta">${condBar(side.cond[s.pid] ?? 0)}</span></span>${rtB(Math.max(3, Math.min(10, side.rat[s.pid])))}</button>`; }).join('')}</div>`}
    <button class="btn pri block mt" data-a="lvResume">Reprendre le match</button>`;
}

function halftimeModal() {
  const L = ui.live;
  const sim = L.sim;
  const g = [sim.sides[0].goals, sim.sides[1].goals];
  return `${modalHead('Mi-temps', `${esc(sim.sides[0].club.name)} ${g[0]} - ${g[1]} ${esc(sim.sides[1].club.name)}`)}
    <p>Que dis-tu à tes joueurs dans le vestiaire ?</p>
    <div class="grid3 mt"><button class="btn" data-a="htTalk" data-k="calm">Rester calme</button><button class="btn" data-a="htTalk" data-k="push">Encourager</button><button class="btn" data-a="htTalk" data-k="angry">Hausser le ton</button></div>
    <p class="small muted mt">Hausser le ton peut réveiller une équipe qui perd… ou crisper une équipe qui gagne.</p>
    <button class="btn block mt" data-a="lvTac">${ICON.tactics} Changer la tactique / remplacements</button>`;
}

function postMatchModal() {
  const L = ui.live;
  const S = G.S;
  const sim = L.sim;
  const m = S.matches[L.m.id];
  const us = L.us;
  const H = sim.sides[0].club, A = sim.sides[1].club;
  const won = sim.winner === us, lost = sim.winner === 1 - us;
  const motm = sim.motm ? S.players[sim.motm] : null;
  const mine = sim.sides[us];
  const goals = sim.goals.map((g) => `<div class="fe"><span class="m">${g.min}'</span><span>${g.t === 0 ? crest(H, 'sm') : crest(A, 'sm')} <b>${esc(pshort(S.players[g.s]))}</b>${g.type === 'pen' ? ' (pen.)' : ''}${g.a ? ` <span class="muted">· ${esc(pshort(S.players[g.a]))}</span>` : ''}</span></div>`).join('');
  return `${modalHead(won ? 'Victoire !' : lost ? 'Défaite' : 'Match nul', esc(compName(S, m.c)))}
    <div class="score"><div class="t">${crest(H)}<b>${esc(H.short)}</b></div><div class="s">${m.hg} - ${m.ag}${m.pen ? `<span class="clk">${m.pen[0]}-${m.pen[1]} t.a.b.</span>` : ''}</div><div class="t a"><b>${esc(A.short)}</b>${crest(A)}</div></div>
    ${goals ? `<div class="feed mt" style="max-height:none">${goals}</div>` : '<p class="muted mt">Aucun but.</p>'}
    ${motm ? `<p class="mt">⭐ Homme du match : <b>${esc(pname(motm))}</b> (${(sim.sides[0].rat[motm.id] ?? sim.sides[1].rat[motm.id]).toFixed(1)})</p>` : ''}
    <h3 class="mt mb">Tes joueurs</h3><div class="list">${Object.keys(mine.rat).map((pid) => { const p = S.players[pid]; return `<div class="li">${posB(mine.posOf[pid])}<span class="grow nm">${esc(pshort(p))}${S.players[pid]?.inj > 0 ? ' 🚑' : ''}</span>${rtB(mine.rat[pid])}</div>`; }).join('')}</div>
    <p class="small muted mt">Confiance du président : ${Math.round(S.mgr.conf)}%</p>
    <button class="btn pri block mt" data-a="postDone">Continuer</button>`;
}

register({
  screens: { match: matchScreen, live: liveScreen },
  modals: { livetac: liveTacModal, halftime: halftimeModal, postmatch: postMatchModal },
  after: { live: () => { if (ui.live && !ui.live.ended) refreshLive(true); else if (ui.live) refreshLive(true); } },
  actions: {
    playLive: () => startLive(false),
    playQuick: () => startLive(true),
    lvPlay: () => { const L = ui.live; L.playing = !L.playing; L.htPause = false; if (L.playing) { clearTimeout(L.timer); L.timer = setTimeout(tick, 100); } refreshLive(); },
    lvSpeed: (d) => { ui.live.speed = +d.v; anim.speed = +d.v; refreshLive(); },
    lvTab: (d) => { ui.live.tab = d.k; document.querySelectorAll('#lv-tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.k === d.k)); refreshLive(true); },
    lvTac: () => { const L = ui.live; L.playing = false; clearTimeout(L.timer); L.subOut = null; if (ui.modals.length && ui.modals[ui.modals.length - 1].type === 'halftime') replaceModal('livetac'); else openModal('livetac'); refreshLive(); },
    lvTacSet: (d) => { const L = ui.live; L.sim.setTactics(L.us, { [d.k]: +d.v }); replaceModal('livetac'); },
    lvForm: (d, el) => { const L = ui.live; L.sim.setTactics(L.us, { formation: el.value }); anim.over = {}; replaceModal('livetac'); toast(`Passage en ${el.value}.`); },
    lvSubOut: (d) => { ui.live.subOut = d.id; replaceModal('livetac'); },
    lvSubCancel: () => { ui.live.subOut = null; replaceModal('livetac'); },
    lvSubIn: (d) => { const L = ui.live; if (L.sim.substitute(L.us, L.subOut, d.id)) { L.feed.push(L.sim.events[L.sim.events.length - 1]); L.newEvents.push(L.sim.events[L.sim.events.length - 1]); } L.subOut = null; replaceModal('livetac'); refreshLive(true); },
    lvResume: () => { const L = ui.live; closeModal(); L.playing = true; L.htPause = false; clearTimeout(L.timer); L.timer = setTimeout(tick, 300); refreshLive(); },
    htTalk: (d) => {
      const L = ui.live; const S = G.S; const side = L.sim.sides[L.us];
      const gd = side.goals - L.sim.sides[1 - L.us].goals;
      let delta = 0, msg = '';
      if (d.k === 'calm') { delta = gd >= 0 ? 4 : 1; msg = 'Les joueurs restent concentrés.'; }
      else if (d.k === 'push') { delta = 6; msg = 'Les joueurs repartent motivés !'; }
      else { delta = gd < 0 ? 10 : gd === 0 ? 3 : -6; msg = gd < 0 ? 'Le vestiaire est piqué au vif !' : gd > 0 ? 'Les joueurs semblent crispés…' : 'Message reçu.'; }
      for (const sl of side.slots) if (sl.pid) { const p = S.players[sl.pid]; p.morale = clamp(p.morale + delta, 5, 100); }
      L.sim.recalc(L.us);
      toast(msg);
      closeModal();
      L.playing = true; L.htPause = false; clearTimeout(L.timer); L.timer = setTimeout(tick, 300); refreshLive();
    },
    lvEnd: () => {
      const L = ui.live; clearTimeout(L.timer); L.playing = false;
      anim.flush();
      L.sim.sides[L.us].auto = true;
      L.sim.quiet = true;
      while (!L.sim.done) { const out = L.sim.step(); if (out) L.feed.push(...out.events.filter((e) => e.text)); }
      endLive();
    },
    lvDone: () => openModal('postmatch'),
    postDone: () => { anim.stop(); ui.modals = []; ui.live = null; go('home'); },
  },
});
