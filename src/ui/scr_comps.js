// Écrans : calendrier, compétitions, fiche club, rapport de match.
import { G, ui, register, render, openModal, modalHead } from './app.js';
import { ICON, esc, crest, flag, money, ovrB, posB, rtB, stars, barColor, colorDist } from './util.js';
import { LEAGUE_COUNTRIES, POS_ORDER, contiName } from '../core/constants.js';
import { leagueTable, sortRows, compName, matchWinner } from '../core/competitions.js';
import { fmtDate, toDate, monthName } from '../core/dates.js';
import { pname, pshort, avgRating } from '../core/player.js';
import { NATIONS } from '../data/names.js';
import { teamResult } from './scr_main.js';

const ctype = (S, id) => S.comps[id]?.type;

// ---------- Calendrier ----------
function fixturesScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const club = S.clubs[S.user];
  const f = ui.f.fx || (ui.f.fx = 'all');
  let ms = Object.values(S.matches).filter((m) => m.h === club.id || m.a === club.id);
  if (f !== 'all') ms = ms.filter((m) => ctype(S, m.c) === f);
  ms.sort((a, b) => a.d - b.d);
  let lastMonth = '';
  const rows = ms.map((m) => {
    const t = toDate(m.d);
    const mk = `${t.y}-${t.m}`;
    const head = mk !== lastMonth ? `<div class="muted small" style="padding:12px 12px 4px;font-weight:700;text-transform:capitalize">${monthName(t.m)} ${t.y}</div>` : '';
    lastMonth = mk;
    const home = m.h === club.id;
    const opp = S.clubs[home ? m.a : m.h];
    const res = m.done ? teamResult(S, m, club.id) : null;
    return `${head}<button class="li" data-a="${m.done ? 'matchReport' : 'clubView'}" data-id="${m.done ? m.id : opp.id}"><span style="width:58px" class="small muted">${fmtDate(m.d, 'wdm')}</span>${crest(opp)}<span class="grow"><span class="nm">${home ? '' : '@ '}${esc(opp.name)}</span><span class="meta">${esc(compName(S, m.c))}${m.lb ? ' · ' + esc(m.lb) : ctype(S, m.c) === 'league' ? ' · J' + m.rd : ''}${m.neutral ? ' · terrain neutre' : home ? ' · domicile' : ' · extérieur'}</span></span>${m.done ? `<span class="form"><i class="${res}">${res}</i></span><b class="num" style="font-family:var(--cond);font-size:20px;width:58px;text-align:right">${home ? m.hg : m.ag}-${home ? m.ag : m.hg}${m.pen ? '*' : ''}</b>` : `<span class="small muted">${m.d === S.day ? "Aujourd'hui" : ''}</span>`}</button>`;
  }).join('');
  return `<div class="ph"><div><h1>Calendrier</h1><div class="sub">Saison ${S.season}-${(S.season + 1) % 100} · ${ms.filter((m) => m.done).length}/${ms.length} matchs joués</div></div></div>
    <div class="tabs">${[['all', 'Tous'], ['league', 'Championnat'], ['cup', 'Coupe'], ['conti', contiName(G.S)]].map(([k, l]) => `<button class="tab ${f === k ? 'on' : ''}" data-a="fxTab" data-k="${k}">${l}</button>`).join('')}</div>
    ${ms.length ? `<div class="list">${rows}</div><p class="small muted mt">* qualification aux tirs au but</p>` : '<div class="empty">Aucun match.</div>'}`;
}

// ---------- Compétitions ----------
function tableHTML(S, rows, opts = {}) {
  const n = rows.length;
  return `<div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Club</th><th class="n">J</th><th class="n">G</th><th class="n">N</th><th class="n">P</th><th class="n">BP</th><th class="n">BC</th><th class="n">Diff</th><th class="n">Pts</th><th>Forme</th></tr></thead><tbody>
  ${rows.map((r, i) => {
    const c = S.clubs[r.c];
    let z = '';
    if (opts.zones) {
      const C = opts.C || {};
      const down = C.down || 3, up = C.up || 3, eu = C.conti || 3;
      if (opts.level === 1 && i < eu) z = 'zone-c';
      else if (opts.level === 1 && i >= n - down) z = 'zone-r';
      else if (opts.level === 1 && C.po === 'barrage' && i === n - down - 1) z = 'zone-b';
      else if (opts.level === 2 && i < up) z = 'zone-p';
      else if (opts.level === 2 && ((C.po === 'playoff' && i < 6) || (C.po === 'barrage' && i === up))) z = 'zone-b';
    }
    if (opts.group && i < 2) z = 'zone-c';
    return `<tr class="click ${z} ${r.c === S.user ? 'me' : ''}" data-a="clubView" data-id="${c.id}"><td>${i + 1}</td><td><span class="clubc">${crest(c, 'sm')}<span>${esc(c.name)}</span></span></td><td class="n">${r.p}</td><td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td><td class="n">${r.gf}</td><td class="n">${r.ga}</td><td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><b>${r.pts}</b></td><td><span class="form">${r.f.split('').map((x) => `<i class="${x}">${x}</i>`).join('')}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function matchLine(S, m) {
  const H = S.clubs[m.h], A = S.clubs[m.a];
  const w = matchWinner(m);
  return `<button class="li" ${m.done ? `data-a="matchReport" data-id="${m.id}"` : ''} style="${m.h === S.user || m.a === S.user ? 'background:rgba(198,244,61,.07)' : ''}">
    <span class="grow row" style="justify-content:flex-end;text-align:right"><span class="nm" style="${w === H.id ? 'font-weight:800' : 'font-weight:500'}">${esc(H.name)}</span>${crest(H, 'sm')}</span>
    <b class="num center" style="width:66px;font-family:var(--cond);font-size:19px">${m.done ? `${m.hg} - ${m.ag}` : `<span class="small muted">${fmtDate(m.d, 'dm')}</span>`}</b>
    <span class="grow row">${crest(A, 'sm')}<span class="nm" style="${w === A.id ? 'font-weight:800' : 'font-weight:500'}">${esc(A.name)}</span></span>${m.pen ? `<span class="chip">${m.pen[0]}-${m.pen[1]} tab</span>` : ''}</button>`;
}

function compsScreen() {
  const S = G.S;
  const f = ui.f.cp || (ui.f.cp = { tab: 'league', cc: S.user ? S.clubs[S.user].country : 'FR', lvl: S.user ? S.comps[S.clubs[S.user].league].level : 1, rd: null, stat: 'gls' });
  const tabs = [['league', 'Championnats'], ['results', 'Résultats'], ['cup', 'Coupes'], ['conti', contiName(G.S)], ['stats', 'Statistiques'], ['hist', 'Palmarès']];
  const countrySel = `<div class="tabs pays">${LEAGUE_COUNTRIES.map((C) => `<button class="tab ${f.cc === C.code ? 'on' : ''}" data-a="cpCountry" data-c="${C.code}">${flag(C.code)} ${C.name}</button>`).join('')}</div>`;
  const lvlSel = `<div class="seg mb"><button class="${f.lvl === 1 ? 'on' : ''}" data-a="cpLvl" data-l="1">${esc(S.comps[f.cc + '1'].name)}</button><button class="${f.lvl === 2 ? 'on' : ''}" data-a="cpLvl" data-l="2">${esc(S.comps[f.cc + '2'].name)}</button></div>`;
  let body = '';
  if (f.tab === 'league') {
    const comp = S.comps[f.cc + f.lvl];
    const C = LEAGUE_COUNTRIES.find((x) => x.code === f.cc) || {};
    const legend = comp.level === 1
      ? `<span class="chip lime">■</span> ${esc(contiName(S))} (top ${C.conti || 3}${(C.conti || 3) * 5 < 16 ? ' + meilleur suivant' : ''})${C.po === 'barrage' ? ' · <span class="chip orange">■</span> Barrage contre le 3e de ' + esc(C.d2) : ''} · <span class="chip red">■</span> Relégation`
      : `<span class="chip blue">■</span> Montée directe${C.po === 'playoff' ? ' · <span class="chip orange">■</span> Barrages d\'accession (3e à 6e)' : C.po === 'barrage' ? ' · <span class="chip orange">■</span> Barrage contre le 16e de ' + esc(C.d1) : ''}`;
    body = `${countrySel}${lvlSel}<div class="card" style="padding:6px">${tableHTML(S, leagueTable(S, comp), { zones: true, level: comp.level, C })}</div>
      <p class="small muted mt">${legend}</p>`;
  } else if (f.tab === 'results') {
    const comp = S.comps[f.cc + f.lvl];
    const all = Object.values(S.matches).filter((m) => m.c === comp.id);
    const played = all.filter((m) => m.done).map((m) => m.rd);
    const cur = f.rd || (played.length ? Math.max(...played) : 1);
    const ms = all.filter((m) => m.rd === cur);
    body = `${countrySel}${lvlSel}<div class="row mb"><button class="icon-btn" data-a="cpRd" data-r="${Math.max(1, cur - 1)}">${ICON.back}</button><b class="grow center" style="font-family:var(--cond);font-size:20px">Journée ${cur} / ${comp.rounds}</b><button class="icon-btn" data-a="cpRd" data-r="${Math.min(comp.rounds, cur + 1)}" style="transform:scaleX(-1)">${ICON.back}</button></div>
      <div class="list">${ms.map((m) => matchLine(S, m)).join('')}</div>`;
  } else if (f.tab === 'cup') {
    const cup = S.comps[f.cc + 'C'];
    body = `${countrySel}<h2 class="mb">${esc(cup.name)}${cup.winner ? ` · ${ICON.trophy} ${esc(S.clubs[cup.winner].name)}` : ''}</h2>
      ${cup.stages.slice().reverse().filter((st) => st.mids.length).map((st) => `<div class="card"><div class="ttl"><h3>${st.label}</h3><span class="small muted">${fmtDate(st.day, 'wdm')}</span></div><div class="list">${st.mids.map((id) => matchLine(S, S.matches[id])).join('')}</div></div>`).join('') || '<div class="empty">Le tirage n\'a pas encore eu lieu.</div>'}`;
  } else if (f.tab === 'conti') {
    const c = S.comps.CONT;
    const ko = c.ko.slice().reverse().filter((st) => st.mids.length);
    body = `<h2 class="mb">${contiName(G.S)}${c.winner ? ` · ${ICON.trophy} ${esc(S.clubs[c.winner].name)}` : ''}</h2>
      ${ko.map((st) => `<div class="card"><div class="ttl"><h3>${st.label}</h3><span class="small muted">${fmtDate(st.day, 'wdm')}</span></div><div class="list">${st.mids.map((id) => matchLine(S, S.matches[id])).join('')}</div></div>`).join('')}
      <div class="grid2 mt">${c.groups.map((g) => `<div class="card" style="padding:6px"><h3 style="padding:8px">Groupe ${g.n}</h3>${tableHTML(S, sortRows(Object.values(g.table), S), { group: true })}</div>`).join('')}</div>`;
  } else if (f.tab === 'stats') {
    const scope = f.scope || (S.user ? S.clubs[S.user].league : 'all');
    const set = scope === 'all' ? null : new Set(S.comps[scope].clubs);
    const ps = Object.values(S.players).filter((p) => p.club && p.st.apps > 0 && (!set || set.has(p.club)));
    const lists = [
      ['Buteurs', ps.slice().sort((a, b) => b.st.gls - a.st.gls || a.st.apps - b.st.apps).slice(0, 15), (p) => `${p.st.gls} buts`],
      ['Passeurs', ps.slice().sort((a, b) => b.st.ast - a.st.ast).slice(0, 15), (p) => `${p.st.ast} passes`],
      ['Meilleures notes (8 matchs min.)', ps.filter((p) => p.st.apps >= 8).sort((a, b) => avgRating(b) - avgRating(a)).slice(0, 15), (p) => avgRating(p).toFixed(2)],
      ['Clean sheets', ps.filter((p) => p.pos === 'GB').sort((a, b) => b.st.cs - a.st.cs).slice(0, 10), (p) => `${p.st.cs}`],
    ];
    body = `<select class="input mb" style="max-width:360px" data-ch="cpScope"><option value="all" ${scope === 'all' ? 'selected' : ''}>Toutes compétitions, tous pays</option>${LEAGUE_COUNTRIES.flatMap((C) => [1, 2].map((l) => `<option value="${C.code + l}" ${scope === C.code + l ? 'selected' : ''}>${esc(S.comps[C.code + l].name)}</option>`)).join('')}</select>
      <p class="small muted mb">Statistiques toutes compétitions confondues, des joueurs des clubs sélectionnés.</p>
      <div class="grid2">${lists.map(([t, arr, v]) => `<div class="card"><h3 class="mb">${t}</h3><div class="list">${arr.map((p, i) => `<button class="li" data-a="player" data-id="${p.id}"><span class="muted" style="width:20px">${i + 1}</span>${crest(S.clubs[p.club], 'sm')}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${esc(S.clubs[p.club].name)} · ${p.st.apps} matchs</span></span><b class="num">${v(p)}</b></button>`).join('') || '<div class="empty">—</div>'}</div></div>`).join('')}</div>`;
  } else {
    body = S.history.length ? S.history.map((h) => `<div class="card"><div class="ttl"><h3>Saison ${h.s}-${(h.s + 1) % 100}</h3>${h.gold ? `<span class="chip gold">${ICON.star} Tactico d'Or : ${esc(h.gold.n)}</span>` : ''}</div>
      <div class="list">${h.leagues.map((l) => { const c = S.clubs[l.champ]; return `<button class="li" data-a="clubView" data-id="${c.id}">${crest(c, 'sm')}<span class="grow"><span class="nm">${esc(c.name)}</span><span class="meta">Champion · ${esc(l.name)}${l.awards[0] ? ` · buteur : ${esc(l.awards[0].n)} (${esc(l.awards[0].v)})` : ''}</span></span>${ICON.trophy}</button>`; }).join('')}
      ${h.cups.filter((c) => c.winner).map((c) => { const w = S.clubs[c.winner]; return `<button class="li" data-a="clubView" data-id="${w.id}">${crest(w, 'sm')}<span class="grow"><span class="nm">${esc(w.name)}</span><span class="meta">${esc(c.name)}</span></span></button>`; }).join('')}
      ${h.conti ? `<button class="li" data-a="clubView" data-id="${h.conti}">${crest(S.clubs[h.conti], 'sm')}<span class="grow"><span class="nm">${esc(S.clubs[h.conti].name)}</span><span class="meta">${contiName(G.S)}</span></span><span class="chip gold">${ICON.trophy}</span></button>` : ''}</div></div>`).join('') : '<div class="empty">Le palmarès se remplira à la fin de la première saison.</div>';
  }
  return `<div class="ph"><div><h1>Compétitions</h1></div></div><div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${f.tab === k ? 'on' : ''}" data-a="cpTab" data-k="${k}">${l}</button>`).join('')}</div>${body}`;
}

// ---------- Fiche club ----------
function clubViewModal(m) {
  const S = G.S;
  const c = S.clubs[m.id];
  const ps = c.squad.map((id) => S.players[id]).sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.ovr - a.ovr);
  const comp = S.comps[c.league];
  const pos = leagueTable(S, comp).findIndex((r) => r.c === c.id) + 1;
  return `${modalHead(esc(c.name), `${esc(comp.name)} · ${pos}e · ${esc(c.stadium.name)} (${c.stadium.cap.toLocaleString('fr-FR')} places)`)}
    <div class="row mb">${crest(c, 'xl')}<div class="kpis grow"><div class="kpi"><small>Réputation</small><b>${stars(c.rep)}</b></div><div class="kpi"><small>Note de l'équipe</small><b>${Math.round(c.str)}</b></div><div class="kpi"><small>Entraîneur</small><b style="font-size:17px">${c.vacant ? 'Poste vacant' : esc(`${c.mgr.fn} ${c.mgr.ln}`)}</b></div><div class="kpi"><small>Valeur de l'effectif</small><b>${money(ps.reduce((s, p) => s + p.value, 0))}</b></div></div></div>
    ${c.trophies.length ? `<div class="note mb">${ICON.trophy} ${c.trophies.slice(-8).reverse().map((t) => `${esc(t.n)} ${t.s}`).join(' · ')}</div>` : ''}
    ${c.hist.length ? `<p class="small muted mb">Historique : ${c.hist.slice(0, 6).map((h) => `${h.s} ${h.pos}e (${esc(h.ln)})`).join(' · ')}</p>` : ''}
    <div class="list">${ps.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${flag(p.nat)} ${esc(pname(p))}</span><span class="meta">${p.age} ans · ${money(p.value)}${p.listed ? ' · transférable' : ''}${p.inj > 0 ? ' · blessé' : ''}</span></span>${ovrB(p.ovr)}</button>`).join('')}</div>`;
}

// ---------- Rapport de match ----------
function reportModal(m) {
  const S = G.S;
  const mt = S.matches[m.id];
  if (!mt) return modalHead('Match') + '<p>Match introuvable.</p>';
  const H = S.clubs[mt.h], A = S.clubs[mt.a];
  const goals = (mt.sc || []).map(([min, pid, t, pen, ast]) => {
    const p = S.players[pid], a = ast ? S.players[ast] : null;
    return `<div class="fe ${t === 0 ? '' : ''}"><span class="m">${min}'</span><span>${t === 0 ? crest(H, 'sm') : crest(A, 'sm')} <b>${esc(p ? pshort(p) : 'Ancien joueur')}</b>${pen ? ' (pen.)' : ''}${a ? ` <span class="muted">· passe ${esc(pshort(a))}</span>` : ''}</span></div>`;
  }).join('');
  const st = mt.st;
  const bar = (l, a, b, fmt = (x) => x) => { const t = (a + b) || 1; return `<div class="statrow"><b class="num">${fmt(a)}</b><div><div class="lbl">${l}</div><div class="dual"><i style="width:${a / t * 100}%;background:${barColor(H.colors[0])}"></i><i style="width:${b / t * 100}%;background:${barColor(colorDist(A.colors[0], H.colors[0]) < 120 ? A.colors[1] : A.colors[0])}"></i></div></div><b class="num right">${fmt(b)}</b></div>`; };
  const motm = mt.motm ? S.players[mt.motm] : null;
  let ratings = '';
  if (mt.rat && mt.lu) {
    ratings = `<div class="grid2 mt">${[0, 1].map((t) => `<div><h3 class="mb">${esc((t ? A : H).name)}</h3><div class="list">${mt.lu[t].map((pid) => { const p = S.players[pid]; return `<div class="li"><span class="grow nm">${esc(p ? pshort(p) : '—')}</span>${rtB(mt.rat[pid])}</div>`; }).join('')}</div></div>`).join('')}</div>`;
  }
  return `${modalHead(`${esc(H.name)} ${mt.hg} - ${mt.ag} ${esc(A.name)}`, `${esc(compName(S, mt.c))}${mt.lb ? ' · ' + esc(mt.lb) : ''} · ${fmtDate(mt.d)}${mt.att ? ` · ${mt.att.toLocaleString('fr-FR')} spectateurs` : ''}`)}
    ${mt.pen ? `<div class="note mb">Tirs au but : ${mt.pen[0]} - ${mt.pen[1]}</div>` : mt.et ? '<div class="note mb">Après prolongation</div>' : ''}
    ${goals ? `<div class="feed mb" style="max-height:none">${goals}</div>` : '<p class="muted">Aucun but.</p>'}
    ${motm ? `<p>${ICON.star} Homme du match : <b>${esc(pname(motm))}</b></p>` : ''}
    ${st ? `<div class="card flat mt">${bar('Possession %', st.pos[0], st.pos[1])}${bar('Tirs', st.sh[0], st.sh[1])}${bar('Cadrés', st.on[0], st.on[1])}${bar('xG', st.xg[0], st.xg[1], (x) => x.toFixed(1))}${bar('Corners', st.cor[0], st.cor[1])}${bar('Fautes', st.fo[0], st.fo[1])}${bar('Cartons jaunes', st.yc[0], st.yc[1])}</div>` : ''}
    ${ratings}`;
}

register({
  screens: { fixtures: fixturesScreen, comps: compsScreen },
  modals: { clubview: clubViewModal, report: reportModal },
  actions: {
    fxTab: (d) => { ui.f.fx = d.k; render(); },
    cpTab: (d) => { ui.f.cp.tab = d.k; render(); },
    cpCountry: (d) => { ui.f.cp.cc = d.c; ui.f.cp.rd = null; render(); },
    cpLvl: (d) => { ui.f.cp.lvl = +d.l; ui.f.cp.rd = null; render(); },
    cpRd: (d) => { ui.f.cp.rd = +d.r; render(); },
    cpScope: (d, el) => { ui.f.cp.scope = el.value; render(); },
    clubView: (d) => openModal('clubview', { id: d.id }),
    matchReport: (d) => openModal('report', { id: d.id }),
  },
});
