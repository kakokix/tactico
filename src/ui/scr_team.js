// Écrans : effectif, fiche joueur, tactique.
import { G, ui, register, render, go, openModal, closeModal, modalHead, toast, persist, replaceModal } from './app.js';
import { ICON, esc, crest, flag, money, ovrB, posB, rtB, condBar, attrClass, natName, inkOn, stars } from './util.js';
import { ATTR_GROUPS, ATTR_NAMES, A, POS_NAMES, POS_GROUP, FORMATIONS, FORMATION_LIST, MENTALITY, PRESSING, STYLE, WIDTH, DLINE } from '../core/constants.js';
import { pname, pshort, ovrAt, avgRating, isAvailable } from '../core/player.js';
import { autoLineup, lineupStrength, condFactor } from '../core/team.js';
import { askingPrice, releaseCost, releasePlayer, fmtMoney } from '../core/transfers.js';
import { windowOpen } from '../core/dates.js';
import { addMsg } from '../core/messages.js';

const GROUPS = [['all', 'Tous'], ['GB', 'Gardiens'], ['DEF', 'Défenseurs'], ['MIL', 'Milieux'], ['ATT', 'Attaquants'], ['youth', 'Centre de formation'], ['loan', 'Prêtés']];
const SORTS = { ovr: ['Note', (p) => -p.ovr], pos: ['Poste', (p) => ['GB', 'DD', 'DC', 'DG', 'MDC', 'MD', 'MC', 'MG', 'MOC', 'AD', 'AG', 'BU'].indexOf(p.pos) * 100 - p.ovr], age: ['Âge', (p) => p.age], value: ['Valeur', (p) => -p.value], cond: ['Fraîcheur', (p) => p.cond], form: ['Forme', (p) => -p.form], wage: ['Salaire', (p) => -p.wage], pot: ['Potentiel', (p) => -p.pot] };

export function squadOfUser(S, filter) {
  const club = S.clubs[S.user];
  if (filter === 'youth') return club.youth.map((id) => S.players[id]);
  if (filter === 'loan') return Object.values(S.players).filter((p) => p.loan && p.loan.from === club.id);
  const ps = club.squad.map((id) => S.players[id]);
  return filter && filter !== 'all' ? ps.filter((p) => POS_GROUP[p.pos] === filter) : ps;
}

function statusChips(S, p) {
  const c = [];
  if (p.inj > 0) c.push(`<span class="chip red">${ICON.inj} ${p.inj} j</span>`);
  if (p.susp > 0) c.push(`<span class="chip orange">Susp. ${p.susp}</span>`);
  if (p.listed) c.push('<span class="chip blue">Transférable</span>');
  if (p.loan && p.loan.from !== p.club) c.push('<span class="chip blue">Prêté</span>');
  if (p.until <= S.season + 1 && !p.youth && !p.loan) c.push('<span class="chip gold">Fin de contrat</span>');
  return c.join(' ');
}

function squadScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const f = ui.f.sq || (ui.f.sq = { g: 'all', sort: 'pos' });
  const club = S.clubs[S.user];
  let ps = squadOfUser(S, f.g);
  const key = SORTS[f.sort]?.[1] || SORTS.ovr[1];
  ps = ps.slice().sort((a, b) => key(a) - key(b));
  const inXI = new Set(club.lineup);
  const rows = ps.map((p) => {
    const loanTxt = f.g === 'loan' ? ` · prêté à ${esc(S.clubs[p.club]?.name || '?')}` : '';
    return `<button class="li" data-a="player" data-id="${p.id}"><span class="center" style="width:24px;font-family:var(--cond);font-size:17px;color:var(--mute)">${p.youth ? '' : p.num}</span>${posB(p.pos)}<span class="grow"><span class="nm">${flag(p.nat)} ${esc(pname(p))} ${inXI.has(p.id) ? '<span class="chip lime" style="padding:1px 6px">XI</span>' : ''}</span><span class="meta">${p.age} ans · ${money(p.value)} · ${p.youth ? 'Pot. ' + p.pot : 'juin ' + p.until}${loanTxt}</span><span class="row gap6" style="margin-top:3px">${statusChips(S, p)}</span></span><span style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">${ovrB(p.ovr)}${p.youth ? '' : condBar(p.cond)}</span></button>`;
  }).join('');
  const table = `<div class="scroll card" style="padding:0"><table class="tbl"><thead><tr><th>N°</th><th>Poste</th><th>Joueur</th><th class="n">Âge</th><th class="n">Note</th><th class="n">Pot.</th><th>Fraîcheur</th><th class="n">Moral</th><th class="n">Forme</th><th class="n">MJ</th><th class="n">Buts</th><th class="n">Pd</th><th class="n">Moy.</th><th class="n">Valeur</th><th class="n">Salaire</th><th class="n">Contrat</th><th></th></tr></thead><tbody>
    ${ps.map((p) => `<tr class="click" data-a="player" data-id="${p.id}"><td>${p.youth ? '' : p.num}</td><td>${posB(p.pos)}</td><td>${flag(p.nat)} <b>${esc(pname(p))}</b>${inXI.has(p.id) ? ' <span class="chip lime" style="padding:1px 6px">XI</span>' : ''}</td><td class="n">${p.age}</td><td class="n">${ovrB(p.ovr)}</td><td class="n">${p.pot}</td><td>${p.youth ? '' : condBar(p.cond)}</td><td class="n">${Math.round(p.morale)}</td><td class="n">${p.form.toFixed(1)}</td><td class="n">${p.st.apps}</td><td class="n">${p.st.gls}</td><td class="n">${p.st.ast}</td><td class="n">${p.st.apps ? avgRating(p).toFixed(2) : '–'}</td><td class="n">${money(p.value)}</td><td class="n">${money(p.wage)}</td><td class="n">${p.until}</td><td>${statusChips(S, p)}</td></tr>`).join('')}
    </tbody></table></div>`;
  return `<div class="ph"><div><h1>Effectif</h1><div class="sub">${club.squad.length} joueurs · ${club.youth.length} au centre de formation · moyenne d'âge ${(club.squad.reduce((s, id) => s + S.players[id].age, 0) / Math.max(1, club.squad.length)).toFixed(1)} ans</div></div>
    <select class="input" style="width:auto" data-ch="sqSort" aria-label="Trier">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>Trier : ${l}</option>`).join('')}</select></div>
    <div class="tabs">${GROUPS.map(([k, l]) => `<button class="tab ${f.g === k ? 'on' : ''}" data-a="sqGroup" data-g="${k}">${l}</button>`).join('')}</div>
    ${ps.length ? `<div class="only-m"><div class="list">${rows}</div></div><div class="only-d">${table}</div>` : '<div class="empty">Aucun joueur ici.</div>'}`;
}

// ---------- Fiche joueur ----------
export function potText(S, p) {
  if (p.club === S.user || p.age >= 27 || p.pot <= p.ovr) return `${p.pot}`;
  const lo = Math.max(p.ovr, p.pot - 4), hi = Math.min(99, p.pot + 4);
  return lo === hi ? `${lo}` : `${lo}-${hi}`;
}

function playerModal(m) {
  const S = G.S;
  const p = S.players[m.id];
  if (!p) return modalHead('Joueur') + '<p>Ce joueur a pris sa retraite.</p>';
  const club = p.club ? S.clubs[p.club] : null;
  const mine = p.club === S.user && S.user;
  const owner = p.loan ? S.clubs[p.loan.from] : club;
  const groups = p.pos === 'GB' ? [ATTR_GROUPS[4], ...ATTR_GROUPS.slice(0, 4)] : ATTR_GROUPS.slice(0, 4);
  const attrs = groups.map(([g, keys]) => `<div><div class="muted small" style="margin:8px 0 2px;font-weight:700">${g}</div>${keys.map((k) => `<div class="attr"><span>${ATTR_NAMES[k]}</span><span class="av ${attrClass(p.attr[A[k]])}">${p.attr[A[k]]}</span></div>`).join('')}</div>`).join('');
  const hist = p.hist.slice(0, 8);
  let actions = '';
  if (mine) {
    if (p.youth) actions = `<div class="grid2"><button class="btn pri" data-a="promoteYouth" data-id="${p.id}">Promouvoir en équipe première</button><button class="btn danger" data-a="releaseAsk" data-id="${p.id}">Libérer</button></div>`;
    else actions = `<div class="grid2">
      <button class="btn" data-a="toggleList" data-id="${p.id}">${p.listed ? 'Retirer de la liste des transferts' : 'Mettre sur la liste des transferts'}</button>
      <button class="btn" data-a="renewOpen" data-id="${p.id}">Prolonger le contrat</button>
      <button class="btn" data-a="loanOutOpen" data-id="${p.id}" ${windowOpen(S) && !p.loan ? '' : 'disabled'}>Prêter</button>
      <button class="btn" data-a="setPen" data-id="${p.id}">${S.clubs[S.user].penTaker === p.id ? 'Tireur de penalty ✓' : 'Désigner tireur de penalty'}</button>
      <button class="btn danger" data-a="releaseAsk" data-id="${p.id}" ${p.loan ? 'disabled' : ''}>Libérer (${money(releaseCost(S, p))})</button>
      <button class="btn" data-a="noRenew" data-id="${p.id}">${p.noRenew ? 'Le directeur peut le prolonger' : 'Ne pas prolonger (directeur)'}</button></div>`;
  } else if (S.user && !p.youth) {
    actions = p.club
      ? `<div class="grid2"><button class="btn pri" data-a="bidOpen" data-id="${p.id}" ${p.loan ? 'disabled' : ''}>Faire une offre</button><button class="btn" data-a="loanInOpen" data-id="${p.id}" ${p.loan ? 'disabled' : ''}>Demander un prêt</button><button class="btn" data-a="shortlist" data-id="${p.id}">${(S.flags.short || []).includes(p.id) ? 'Retirer de la liste de suivi' : 'Ajouter à la liste de suivi'}</button></div>`
      : `<div class="grid2"><button class="btn pri" data-a="freeOpen" data-id="${p.id}">Proposer un contrat (joueur libre)</button><button class="btn" data-a="shortlist" data-id="${p.id}">${(S.flags.short || []).includes(p.id) ? 'Retirer de la liste de suivi' : 'Ajouter à la liste de suivi'}</button></div>`;
  }
  return `${modalHead(`${flag(p.nat)} ${esc(pname(p))}`, `${POS_NAMES[p.pos]}${p.alt.length ? ' · aussi ' + p.alt.join(', ') : ''} · ${p.age} ans · ${natName(p.nat)}`)}
    <div class="row mb">${club ? `<button class="row" data-a="clubView" data-id="${club.id}" style="background:none;border:0;cursor:pointer;color:inherit">${crest(club, 'lg')}<span style="text-align:left"><b>${esc(club.name)}</b><br><span class="muted small">${p.youth ? 'Centre de formation' : 'N° ' + p.num}${p.loan ? ` · prêté par ${esc(owner?.name || '')}` : ''}</span></span></button>` : '<span class="chip">Joueur libre</span>'}<span class="grow"></span>${ovrB(p.ovr)}<span class="pot">Pot. ${potText(S, p)}</span></div>
    <div class="row wrap gap6 mb">${statusChips(S, p)}${p.inj > 0 ? `<span class="chip red">${esc(p.injName)}</span>` : ''}</div>
    <div class="kpis"><div class="kpi"><small>Valeur</small><b>${money(p.value)}</b></div><div class="kpi"><small>Salaire / sem.</small><b>${money(p.wage)}</b></div><div class="kpi"><small>Contrat</small><b>${p.club ? 'juin ' + p.until : '—'}</b></div>${p.club && !mine && !p.loan ? `<div class="kpi"><small>Prix demandé</small><b>${money(askingPrice(S, p))}</b></div>` : ''}<div class="kpi"><small>Fraîcheur</small><b>${Math.round(p.cond)}%</b></div><div class="kpi"><small>Moral</small><b>${Math.round(p.morale)}/100</b></div><div class="kpi"><small>Forme</small><b>${p.form.toFixed(1)}</b></div></div>
    <div class="attrs mt">${attrs}</div>
    <div class="card flat mt"><div class="ttl"><h3>Saison ${S.season}-${(S.season + 1) % 100}</h3></div><div class="kpis"><div class="kpi"><small>Matchs</small><b>${p.st.apps}</b></div><div class="kpi"><small>Buts</small><b>${p.st.gls}</b></div><div class="kpi"><small>Passes déc.</small><b>${p.st.ast}</b></div><div class="kpi"><small>Note moy.</small><b>${p.st.apps ? avgRating(p).toFixed(2) : '–'}</b></div><div class="kpi"><small>Homme du match</small><b>${p.st.motm}</b></div><div class="kpi"><small>Cartons</small><b>${p.st.yc} J · ${p.st.rc} R</b></div></div>
      <p class="small muted mt">Carrière : ${p.car.apps} matchs · ${p.car.gls} buts · ${p.car.ast} passes décisives</p>
      ${hist.length ? `<div class="scroll"><table class="tbl mt"><thead><tr><th>Saison</th><th>Club</th><th class="n">MJ</th><th class="n">Buts</th><th class="n">Pd</th><th class="n">Moy.</th></tr></thead><tbody>${hist.map((h) => `<tr><td>${h.s}-${(h.s + 1) % 100}</td><td>${esc(h.c)}</td><td class="n">${h.apps}</td><td class="n">${h.gls}</td><td class="n">${h.ast}</td><td class="n">${h.r ? h.r.toFixed(2) : '–'}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </div>
    ${actions ? `<div class="mt">${actions}</div>` : ''}`;
}

// ---------- Tactique ----------
const PITCH_LINES = `<svg class="lines" viewBox="0 0 68 100" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,.55)" stroke-width=".4"><rect x="2" y="2" width="64" height="96"/><path d="M2 50h64"/><circle cx="34" cy="50" r="8"/><rect x="16" y="2" width="36" height="15"/><rect x="25" y="2" width="18" height="6"/><rect x="16" y="83" width="36" height="15"/><rect x="25" y="92" width="18" height="6"/></svg>`;

function shirt(club) {
  const c = club.colors[0];
  return `background:${c};color:${inkOn(c)}`;
}

function tacticsScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const club = S.clubs[S.user];
  const t = club.tactics;
  const slots = FORMATIONS[t.formation];
  if (!club.lineup || club.lineup.length !== 11) club.lineup = new Array(11).fill(null);
  const sel = ui.f.slot;
  const str = lineupStrength(S, t.formation, club.lineup);
  const tokens = slots.map((s, i) => {
    const p = S.players[club.lineup[i]];
    const bad = p && (!isAvailable(p) || p.club !== club.id);
    const rating = p ? ovrAt(p, s.pos) : 0;
    return `<button class="tok ${sel === i ? 'sel' : ''} ${p ? '' : 'empty'} ${bad ? 'bad' : ''}" style="left:${s.x}%;top:${100 - s.y}%" data-a="slotSel" data-i="${i}"><span class="sh" style="${shirt(club)}">${p ? p.num : '+'}</span><span class="nm">${p ? esc(pshort(p)) : s.pos}</span><span class="sub">${p ? `${s.pos} · ${rating}${bad ? ' ⚠' : ''}` : ''}</span></button>`;
  }).join('');
  const seg = (key, labels) => `<div class="seg">${labels.map((l, i) => `<button class="${t[key] === i ? 'on' : ''}" data-a="tacSet" data-k="${key}" data-v="${i}">${l}</button>`).join('')}</div>`;
  let picker = '';
  if (sel != null) {
    const pos = slots[sel].pos;
    const cands = club.squad.map((id) => S.players[id]).sort((a, b) => ovrAt(b, pos) * condFactor(b.cond) - ovrAt(a, pos) * condFactor(a.cond));
    picker = `<div class="card mt"><div class="ttl"><h3>Poste ${pos} · ${POS_NAMES[pos]}</h3><button class="btn sm" data-a="slotSel" data-i="-1">Fermer</button></div>
      <div class="list">${cands.map((p) => { const where = club.lineup.indexOf(p.id); const bench = club.bench.includes(p.id); return `<button class="li" data-a="slotPick" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))} ${where >= 0 ? `<span class="chip lime" style="padding:1px 6px">${slots[where].pos}</span>` : bench ? '<span class="chip" style="padding:1px 6px">Banc</span>' : ''}</span><span class="meta">${p.inj > 0 ? 'Blessé · ' : p.susp > 0 ? 'Suspendu · ' : ''}Note au poste ${ovrAt(p, pos)} · forme ${p.form.toFixed(1)}</span></span>${condBar(p.cond)}${ovrB(ovrAt(p, pos))}</button>`; }).join('')}</div></div>`;
  }
  const bench = club.bench.map((id) => S.players[id]).filter(Boolean);
  return `<div class="ph"><div><h1>Tactique</h1><div class="sub">Note de l'onze : <b>${str.toFixed(1)}</b> · Cohésion ${Math.round(club.coh)}%</div></div>
    <div class="row wrap"><button class="btn" data-a="autoXI">${ICON.squad} Compo auto</button><button class="btn ${S.mgr.autoPick ? 'pri' : ''}" data-a="toggleAutoPick">${S.mgr.autoPick ? '✓ ' : ''}L'adjoint choisit l'équipe</button></div></div>
    <div class="grid2" style="align-items:start">
      <div>
        <div class="tabs">${FORMATION_LIST.map((f) => `<button class="tab ${t.formation === f ? 'on' : ''}" data-a="formation" data-f="${f}">${f}</button>`).join('')}</div>
        <div class="pitchwrap"><div class="pitch">${PITCH_LINES}${tokens}</div></div>
        <p class="small muted center mt">Touche un joueur pour le remplacer. ⚠ = indisponible.</p>
        ${picker}
      </div>
      <div>
        <div class="card"><h3 class="mb">Consignes</h3>
          <div class="field"><label>Mentalité</label>${seg('ment', MENTALITY)}</div>
          <div class="field"><label>Pressing</label>${seg('press', PRESSING)}</div>
          <div class="field"><label>Style de jeu</label>${seg('style', STYLE)}</div>
          <div class="field"><label>Largeur</label>${seg('width', WIDTH)}</div>
          <div class="field"><label>Ligne défensive</label>${seg('line', DLINE)}</div>
          <div class="field"><label>Tireur de penalty</label><select class="input" data-ch="penTaker"><option value="">Automatique</option>${club.squad.map((id) => S.players[id]).filter((p) => p.pos !== 'GB').sort((a, b) => (b.attr[A.fin] + b.attr[A.sgf] + b.attr[A.cpa]) - (a.attr[A.fin] + a.attr[A.sgf] + a.attr[A.cpa])).map((p) => `<option value="${p.id}" ${club.penTaker === p.id ? 'selected' : ''}>${esc(pname(p))} (${p.attr[A.fin]}/${p.attr[A.sgf]})</option>`).join('')}</select></div>
          <p class="small muted">Pressing haut = plus de récupérations mais plus de fatigue. Ligne haute = hors-jeu provoqués mais risque face aux attaquants rapides.</p>
        </div>
        <div class="card"><div class="ttl"><h3>Remplaçants (${bench.length}/9)</h3></div>
          ${bench.length ? `<div class="list">${bench.map((p) => `<div class="li">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${condBar(p.cond)}</span></span>${ovrB(p.ovr)}<button class="icon-btn" data-a="benchRemove" data-id="${p.id}" aria-label="Retirer">${ICON.x}</button></div>`).join('')}</div>` : '<p class="muted">Aucun remplaçant.</p>'}
          <select class="input mt" data-ch="benchAdd" aria-label="Ajouter un remplaçant"><option value="">+ Ajouter un remplaçant…</option>${club.squad.map((id) => S.players[id]).filter((p) => !club.lineup.includes(p.id) && !club.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr).map((p) => `<option value="${p.id}">${p.pos} · ${esc(pname(p))} (${p.ovr})${!isAvailable(p) ? ' — indisponible' : ''}</option>`).join('')}</select>
        </div>
      </div>
    </div>`;
}

register({
  screens: { squad: squadScreen, tactics: tacticsScreen },
  modals: { player: playerModal },
  actions: {
    sqGroup: (d) => { ui.f.sq.g = d.g; render(); },
    sqSort: (d, el) => { ui.f.sq.sort = el.value; render(); },
    player: (d) => openModal('player', { id: d.id }),
    toggleList: (d) => { const p = G.S.players[d.id]; p.listed = !p.listed; replaceModal('player', { id: p.id }); render(); toast(p.listed ? 'Joueur placé sur la liste des transferts.' : 'Joueur retiré de la liste.'); persist(); },
    setPen: (d) => { const club = G.S.clubs[G.S.user]; club.penTaker = club.penTaker === d.id ? null : d.id; replaceModal('player', { id: d.id }); persist(); },
    noRenew: (d) => { const p = G.S.players[d.id]; p.noRenew = !p.noRenew; replaceModal('player', { id: d.id }); persist(); },
    promoteYouth: (d) => {
      const S = G.S; const club = S.clubs[S.user]; const p = S.players[d.id];
      club.youth.splice(club.youth.indexOf(p.id), 1); club.squad.push(p.id); p.youth = false; p.until = Math.max(p.until, S.season + 3);
      p.num = 0;
      const used = new Set(club.squad.map((id) => S.players[id].num));
      let n = 30; while (used.has(n)) n++; p.num = n;
      replaceModal('player', { id: p.id }); render(); persist(); toast(`${pname(p)} rejoint l'équipe première !`);
    },
    releaseAsk: (d) => {
      const S = G.S; const p = S.players[d.id];
      openModal('confirm', { title: `Libérer ${pname(p)} ?`, body: p.youth ? 'Le jeune quittera le club.' : `Indemnité de départ : ${fmtMoney(releaseCost(S, p))} (50 % du salaire restant). Le joueur devient libre.`, yes: 'Libérer', danger: true, act: 'releaseGo', data: { id: p.id } });
    },
    releaseGo: (d) => {
      const S = G.S; const { id } = JSON.parse(d.x); const p = S.players[id];
      if (p.youth) { const club = S.clubs[S.user]; club.youth.splice(club.youth.indexOf(id), 1); delete S.players[id]; }
      else releasePlayer(S, p);
      ui.modals = []; render(); persist(); toast('Joueur libéré.');
    },
    // Tactique
    formation: (d) => {
      const S = G.S; const club = S.clubs[S.user];
      const oldXI = club.lineup.map((id) => S.players[id]).filter((p) => p && p.club === club.id);
      club.tactics.formation = d.f;
      const slots = FORMATIONS[d.f];
      const pairs = [];
      slots.forEach((s, i) => oldXI.forEach((p) => pairs.push([ovrAt(p, s.pos), i, p.id])));
      pairs.sort((a, b) => b[0] - a[0]);
      const lineup = new Array(slots.length).fill(null), used = new Set();
      for (const [, i, id] of pairs) { if (lineup[i] || used.has(id)) continue; lineup[i] = id; used.add(id); }
      club.lineup = lineup;
      ui.f.slot = null; render(); persist();
      toast(`Formation ${d.f} : tes joueurs ont été replacés au mieux.`);
    },
    tacSet: (d) => { const club = G.S.clubs[G.S.user]; club.tactics[d.k] = +d.v; render(); persist(); },
    penTaker: (d, el) => { G.S.clubs[G.S.user].penTaker = el.value || null; persist(); },
    autoXI: () => { const S = G.S; const club = S.clubs[S.user]; const r = autoLineup(S, club, club.tactics.formation, { rotate: true }); club.lineup = r.lineup; club.bench = r.bench; ui.f.slot = null; render(); persist(); toast('Meilleure composition sélectionnée (fraîcheur prise en compte).'); },
    toggleAutoPick: () => { G.S.mgr.autoPick = !G.S.mgr.autoPick; render(); persist(); toast(G.S.mgr.autoPick ? "L'adjoint choisira l'équipe avant chaque match." : 'Tu choisis ton équipe toi-même.'); },
    slotSel: (d) => { const i = +d.i; ui.f.slot = i < 0 || ui.f.slot === i ? null : i; render(); },
    slotPick: (d) => {
      const S = G.S; const club = S.clubs[S.user]; const i = ui.f.slot; if (i == null) return;
      const cur = club.lineup[i]; const where = club.lineup.indexOf(d.id);
      if (where >= 0) { club.lineup[where] = cur; club.lineup[i] = d.id; }
      else {
        const bi = club.bench.indexOf(d.id);
        if (bi >= 0) { if (cur) club.bench[bi] = cur; else club.bench.splice(bi, 1); }
        else if (cur && club.bench.length < 9) club.bench.push(cur);
        club.lineup[i] = d.id;
      }
      S.mgr.autoPick = false;
      ui.f.slot = null; render(); persist();
    },
    benchRemove: (d) => { const club = G.S.clubs[G.S.user]; club.bench = club.bench.filter((x) => x !== d.id); render(); persist(); },
    benchAdd: (d, el) => { const club = G.S.clubs[G.S.user]; if (el.value && club.bench.length < 9) club.bench.push(el.value); else if (club.bench.length >= 9) toast('Le banc est complet (9).', true); render(); persist(); },
  },
});
