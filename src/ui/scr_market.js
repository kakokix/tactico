// Écran Mercato + négociations (transferts, contrats, prêts).
import { G, ui, register, render, openModal, closeModal, modalHead, toast, persist, replaceModal } from './app.js';
import { ICON, esc, crest, flag, money, ovrB, posB, avatar } from './util.js';
import { POS, POS_GROUP, LEAGUE_COUNTRIES } from '../core/constants.js';
import { pname, playerValue } from '../core/player.js';
import { askingPrice, evaluateBid, wageDemand, willJoin, contractResponse, canAfford, executeTransfer, loanTargets, loanFee, fmtMoney } from '../core/transfers.js';
import { windowOpen, fmtDate } from '../core/dates.js';
import { wageBill, addFin } from '../core/finance.js';
import { addNews } from '../core/messages.js';
import { potText } from './scr_team.js';
import { NATIONS } from '../data/names.js';

const PRICE_STEPS = [0, 250e3, 500e3, 1e6, 2e6, 5e6, 10e6, 20e6, 40e6, 80e6, 1e12];

function marketScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const club = S.clubs[S.user];
  const priceIdx = Math.max(1, PRICE_STEPS.findIndex((v) => v > club.tBudget * 1.3));
  const f = ui.f.mk || (ui.f.mk = { tab: 'search', pos: 'all', ageMax: 40, ovrMin: [40, 50, 55, 60, 65, 70, 75, 80, 85].filter((v) => v <= Math.round(club.str) - 4).pop() || 40, price: priceIdx, cc: 'all', listed: false, sort: 'ovr' });
  const open = windowOpen(S);
  const bill = wageBill(S, club);
  const head = `<div class="ph"><div><h1>Mercato</h1><div class="sub">${open ? `<span class="chip lime">Ouvert</span> jusqu'au ${fmtDate(S.day <= S.sd.summerClose ? S.sd.summerClose : S.sd.winterClose, 'dm')}` : `<span class="chip red">Fermé</span> · réouverture le ${fmtDate(S.day < S.sd.winterOpen ? S.sd.winterOpen : S.sd.start + 365, 'dm')} · les joueurs libres restent recrutables`}</div></div></div>
    <div class="kpis mb"><div class="kpi"><small>Budget transferts</small><b>${money(club.tBudget)}</b></div><div class="kpi"><small>Masse salariale / sem.</small><b>${money(bill)}</b><small>max ${money(club.wBudget)}</small></div><div class="kpi"><small>Marge salariale</small><b style="color:${club.wBudget - bill >= 0 ? 'var(--green)' : 'var(--red)'}">${money(club.wBudget - bill)}</b></div><div class="kpi"><small>Solde du club</small><b>${money(club.balance)}</b></div></div>`;
  const tabs = [['search', 'Rechercher'], ['short', 'Liste de suivi'], ['free', 'Joueurs libres'], ['mine', 'Mes mouvements'], ['news', 'Actualité']];
  let body = '';
  const row = (p) => {
    const c = p.club ? S.clubs[p.club] : null;
    return `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}${avatar(p, c, 34)}<span class="grow"><span class="nm">${flag(p.nat)} ${esc(pname(p))}</span><span class="meta">${p.age} ans · ${c ? esc(c.name) : 'Libre'} · ${money(p.value)}${p.listed ? ' · transférable' : ''}</span></span><span class="pot">Pot. ${potText(S, p)}</span>${ovrB(p.ovr)}</button>`;
  };
  if (f.tab === 'search') {
    let ps = Object.values(S.players).filter((p) => p.club && p.club !== S.user && !p.youth && !p.loan);
    if (f.pos !== 'all') ps = ps.filter((p) => (['GB', 'DEF', 'MIL', 'ATT'].includes(f.pos) ? POS_GROUP[p.pos] === f.pos : p.pos === f.pos || p.alt.includes(f.pos)));
    ps = ps.filter((p) => p.age <= f.ageMax && p.ovr >= f.ovrMin && p.value <= PRICE_STEPS[f.price]);
    if (f.cc !== 'all') ps = ps.filter((p) => S.clubs[p.club].country === f.cc);
    if (f.listed) ps = ps.filter((p) => p.listed);
    const sorts = { ovr: (a, b) => b.ovr - a.ovr, value: (a, b) => a.value - b.value, age: (a, b) => a.age - b.age, pot: (a, b) => b.pot - a.pot };
    ps.sort(sorts[f.sort]);
    const total = ps.length;
    ps = ps.slice(0, f.more ? 200 : 60);
    body = `<div class="filters">
      <select class="input" data-ch="mkF" data-k="pos"><option value="all">Tous les postes</option>${['GB', 'DEF', 'MIL', 'ATT'].map((g) => `<option value="${g}" ${f.pos === g ? 'selected' : ''}>${{ GB: 'Gardiens', DEF: 'Défenseurs', MIL: 'Milieux', ATT: 'Attaquants' }[g]}</option>`).join('')}${POS.map((p) => `<option value="${p}" ${f.pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
      <select class="input" data-ch="mkF" data-k="ovrMin">${[40, 50, 55, 60, 65, 70, 75, 80, 85].map((v) => `<option value="${v}" ${f.ovrMin === v ? 'selected' : ''}>Note ≥ ${v}</option>`).join('')}</select>
      <select class="input" data-ch="mkF" data-k="ageMax">${[19, 21, 23, 25, 28, 31, 40].map((v) => `<option value="${v}" ${f.ageMax === v ? 'selected' : ''}>${v === 40 ? 'Tous âges' : '≤ ' + v + ' ans'}</option>`).join('')}</select>
      <select class="input" data-ch="mkF" data-k="price">${PRICE_STEPS.slice(1).map((v, i) => `<option value="${i + 1}" ${f.price === i + 1 ? 'selected' : ''}>${v >= 1e12 ? 'Tous prix' : 'Valeur ≤ ' + money(v)}</option>`).join('')}</select>
      <select class="input" data-ch="mkF" data-k="cc"><option value="all">Tous les pays</option>${LEAGUE_COUNTRIES.map((C) => `<option value="${C.code}" ${f.cc === C.code ? 'selected' : ''}>${NATIONS[C.code].flag} ${C.name}</option>`).join('')}</select>
      <select class="input" data-ch="mkF" data-k="sort">${[['ovr', 'Tri : note'], ['pot', 'Tri : potentiel'], ['value', 'Tri : moins chers'], ['age', 'Tri : plus jeunes']].map(([k, l]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn ${f.listed ? 'pri' : ''}" data-a="mkListed">${f.listed ? '✓ ' : ''}Transférables</button></div>
      <p class="small muted mb">${total} joueur(s) trouvé(s)${total > ps.length ? `, ${ps.length} affichés` : ''}.</p>
      ${ps.length ? `<div class="list">${ps.map(row).join('')}</div>${total > ps.length && !f.more ? '<button class="btn block mt" data-a="mkMore">Afficher plus</button>' : ''}` : '<div class="empty">Aucun joueur ne correspond. Élargis les filtres.</div>'}`;
  } else if (f.tab === 'short') {
    const ps = (S.flags.short || []).map((id) => S.players[id]).filter(Boolean);
    body = ps.length ? `<div class="list">${ps.map(row).join('')}</div>` : '<div class="empty">Ajoute des joueurs à ta liste de suivi depuis leur fiche.</div>';
  } else if (f.tab === 'free') {
    const ps = S.free.map((id) => S.players[id]).filter(Boolean).sort((a, b) => b.ovr - a.ovr).slice(0, 120);
    body = `<p class="small muted mb">Les joueurs libres peuvent signer à tout moment, sans indemnité de transfert.</p><div class="list">${ps.map(row).join('')}</div>`;
  } else if (f.tab === 'mine') {
    const tr = S.transfers.filter((t) => t.from === S.user || t.to === S.user).slice(0, 60);
    const loans = Object.values(S.players).filter((p) => p.loan && (p.loan.from === S.user || p.club === S.user));
    body = `${loans.length ? `<h3 class="mb">${ICON.contract}Prêts en cours</h3><div class="list mb">${loans.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${p.loan.from === S.user ? `prêté à ${esc(S.clubs[p.club].name)}` : `prêté par ${esc(S.clubs[p.loan.from].name)}`} · retour fin de saison</span></span>${ovrB(p.ovr)}</button>`).join('')}</div>` : ''}
      <h3 class="mb">${ICON.transfer}Transferts</h3>${tr.length ? `<div class="list">${tr.map((t) => `<div class="li"><span class="chip ${t.to === S.user ? 'lime' : 'red'}">${t.to === S.user ? 'Arrivée' : 'Départ'}</span><span class="grow"><span class="nm">${esc(t.n)}</span><span class="meta">${fmtDate(t.d, 'dm')} · ${t.to === S.user ? 'de ' + esc(t.from ? S.clubs[t.from].name : 'libre') : 'vers ' + esc(S.clubs[t.to].name)}${t.loan ? ' · prêt' : ''}</span></span><b class="num">${t.fee ? money(t.fee) : '—'}</b></div>`).join('')}</div>` : '<div class="empty">Aucun mouvement pour le moment.</div>'}`;
  } else {
    const tr = S.transfers.slice(0, 80);
    body = `<div class="list">${tr.map((t) => `<div class="li"><span class="grow"><span class="nm">${esc(t.n)} <span class="muted">(${t.pos}, ${t.ovr})</span></span><span class="meta">${fmtDate(t.d, 'dm')} · ${esc(t.from ? S.clubs[t.from]?.name || '?' : 'Libre')} → ${esc(S.clubs[t.to]?.name || '?')}${t.loan ? ' (prêt)' : ''}</span></span><b class="num">${t.fee ? money(t.fee) : '—'}</b></div>`).join('') || '<div class="empty">Aucun transfert.</div>'}</div>`;
  }
  return `${head}<div class="tabs">${tabs.map(([k, l]) => `<button class="tab ${f.tab === k ? 'on' : ''}" data-a="mkTab" data-k="${k}">${l}</button>`).join('')}</div>${body}`;
}

// ---------- Négociation : offre au club ----------
function bidModal(m) {
  const S = G.S;
  const p = S.players[m.id];
  const club = S.clubs[p.club], me = S.clubs[S.user];
  const ask = askingPrice(S, p);
  if (m.fee == null) m.fee = Math.round(ask * 0.9 / 25000) * 25000;
  const open = windowOpen(S);
  return `${modalHead(`Offre pour ${esc(pname(p))}`, `${esc(club.name)} · ${p.pos} · ${p.age} ans · note ${p.ovr}`)}
    <div class="kpis mb"><div class="kpi"><small>Valeur</small><b>${money(p.value)}</b></div><div class="kpi"><small>Prix estimé</small><b>${money(ask)}</b></div><div class="kpi"><small>Ton budget</small><b>${money(me.tBudget)}</b></div></div>
    ${!open ? '<div class="note warn mb">Le mercato est fermé : impossible de recruter ce joueur maintenant.</div>' : ''}
    <div class="field"><label>Montant proposé</label><div class="row"><button class="icon-btn" data-a="bidStep" data-v="-1">−</button><input class="input center" style="font-family:var(--cond);font-size:22px" value="${money(m.fee)}" readonly aria-label="Montant"><button class="icon-btn" data-a="bidStep" data-v="1">+</button></div>
      <div class="row wrap gap6 mt">${[0.8, 0.9, 1, 1.1].map((k) => `<button class="btn sm" data-a="bidSet" data-v="${Math.round(ask * k / 25000) * 25000}">${Math.round(k * 100)} % (${money(ask * k)})</button>`).join('')}</div></div>
    ${m.msg ? `<div class="note ${m.ok ? '' : 'warn'} mb">${esc(m.msg)}</div>` : ''}
    ${m.counter ? `<button class="btn gold block mb" data-a="bidSet" data-v="${m.counter}" data-send="1">Accepter leur prix : ${money(m.counter)}</button>` : ''}
    <button class="btn pri block" data-a="bidSend" ${open ? '' : 'disabled'}>Envoyer l'offre</button>`;
}

// ---------- Négociation : contrat ----------
function contractModal(m) {
  const S = G.S;
  const p = S.players[m.id];
  const me = S.clubs[S.user];
  const demand = wageDemand(S, p, me);
  if (m.wage == null) m.wage = demand;
  if (m.years == null) m.years = p.age >= 32 ? 1 : p.age >= 29 ? 2 : 3;
  const renew = m.mode === 'renew';
  const bill = wageBill(S, me) - (renew ? p.wage : 0) + m.wage;
  const title = renew ? `Prolonger ${esc(pname(p))}` : `Contrat de ${esc(pname(p))}`;
  return `${modalHead(title, `${p.pos} · ${p.age} ans · note ${p.ovr} · pot. ${potText(S, p)}`)}
    ${m.mode === 'transfer' ? `<div class="note mb">Accord trouvé avec ${esc(S.clubs[p.club].name)} pour <b>${money(m.fee)}</b>. Il reste à convaincre le joueur.</div>` : ''}
    <div class="kpis mb"><div class="kpi"><small>Salaire actuel</small><b>${p.club ? money(p.wage) : '—'}</b></div><div class="kpi"><small>Demande du joueur</small><b>${money(demand)}</b></div><div class="kpi"><small>Masse salariale après</small><b style="color:${bill <= me.wBudget ? 'var(--green)' : 'var(--red)'}">${money(bill)}</b><small>max ${money(me.wBudget)}</small></div></div>
    <div class="field"><label>Salaire proposé (par semaine)</label><div class="row"><button class="icon-btn" data-a="wageStep" data-v="-1">−</button><input class="input center" style="font-family:var(--cond);font-size:22px" value="${money(m.wage)}" readonly aria-label="Salaire"><button class="icon-btn" data-a="wageStep" data-v="1">+</button></div>
      <div class="row wrap gap6 mt">${[0.85, 0.95, 1, 1.1].map((k) => `<button class="btn sm" data-a="wageSet" data-v="${Math.round(demand * k / 100) * 100}">${Math.round(k * 100)} %</button>`).join('')}</div></div>
    <div class="field"><label>Durée</label><div class="seg">${[1, 2, 3, 4, 5].map((y) => `<button class="${m.years === y ? 'on' : ''}" data-a="yearsSet" data-v="${y}">${y} an${y > 1 ? 's' : ''}</button>`).join('')}</div></div>
    ${m.msg ? `<div class="note ${m.ok ? '' : 'warn'} mb">${esc(m.msg)}</div>` : ''}
    <button class="btn pri block" data-a="contractSend" ${m.dead ? 'disabled' : ''}>${renew ? 'Proposer la prolongation' : 'Proposer le contrat'}</button>
    <p class="small muted mt">Un joueur accepte toujours si tu proposes au moins sa demande. Entre 90 et 100 %, c'est une chance sur deux. Il refuse au bout de 3 tentatives.</p>`;
}

function loanInModal(m) {
  const S = G.S;
  const p = S.players[m.id];
  const fee = loanFee(p);
  return `${modalHead(`Prêt de ${esc(pname(p))}`, `${esc(S.clubs[p.club].name)} · ${p.pos} · ${p.age} ans · note ${p.ovr}`)}
    <div class="kpis mb"><div class="kpi"><small>Indemnité de prêt</small><b>${money(fee)}</b></div><div class="kpi"><small>Salaire à ta charge</small><b>${money(p.wage)}/sem.</b></div><div class="kpi"><small>Durée</small><b>Jusqu'en juin</b></div></div>
    ${m.msg ? `<div class="note warn mb">${esc(m.msg)}</div>` : ''}
    <button class="btn pri block" data-a="loanInSend" ${windowOpen(S) ? '' : 'disabled'}>Proposer le prêt</button>`;
}

function loanOutModal(m) {
  const S = G.S;
  const p = S.players[m.id];
  const ts = loanTargets(S, p);
  return `${modalHead(`Prêter ${esc(pname(p))}`, 'Choisis un club qui le fera jouer : le temps de jeu accélère sa progression.')}
    ${ts.length ? `<div class="list">${ts.map((c) => `<button class="li" data-a="loanOutGo" data-id="${p.id}" data-c="${c.id}">${crest(c)}<span class="grow"><span class="nm">${esc(c.name)}</span><span class="meta">${esc(S.comps[c.league].name)} · note ${Math.round(c.str)}</span></span><span class="chip lime">Prêter</span></button>`).join('')}</div>` : '<div class="empty">Aucun club intéressé pour le moment.</div>'}`;
}

function signPlayer(S, p, fee, wage, years) {
  const me = S.clubs[S.user];
  const from = p.club ? S.clubs[p.club] : null;
  executeTransfer(S, p, me, fee, wage, years);
  addNews(S, `${pname(p)} (${p.ovr}) : ${from ? from.name : 'libre'} → ${me.name}${fee ? ` pour ${fmtMoney(fee)}` : ''}.`, 'transfer');
  me.bench = me.bench || [];
  if (me.bench.length < 9) me.bench.push(p.id);
}

register({
  screens: { transfers: marketScreen },
  modals: { bid: bidModal, contract: contractModal, loanIn: loanInModal, loanOut: loanOutModal },
  actions: {
    mkTab: (d) => { ui.f.mk.tab = d.k; ui.f.mk.more = false; render(); },
    mkF: (d, el) => { const v = el.value; ui.f.mk[d.k] = ['ovrMin', 'ageMax', 'price'].includes(d.k) ? +v : v; ui.f.mk.more = false; render(); },
    mkListed: () => { ui.f.mk.listed = !ui.f.mk.listed; render(); },
    mkMore: () => { ui.f.mk.more = true; render(); },
    shortlist: (d) => {
      const S = G.S; S.flags.short = S.flags.short || [];
      const i = S.flags.short.indexOf(d.id);
      if (i >= 0) S.flags.short.splice(i, 1); else S.flags.short.push(d.id);
      replaceModal('player', { id: d.id }); persist();
      toast(i >= 0 ? 'Retiré de la liste de suivi.' : 'Ajouté à la liste de suivi.');
    },
    bidOpen: (d) => openModal('bid', { id: d.id }),
    bidStep: (d) => {
      const m = ui.modals[ui.modals.length - 1];
      const step = m.fee >= 20e6 ? 1e6 : m.fee >= 2e6 ? 250e3 : 50e3;
      m.fee = Math.max(0, m.fee + step * +d.v); m.counter = null; replaceModal('bid', m);
    },
    bidSet: (d) => {
      const m = ui.modals[ui.modals.length - 1];
      m.fee = +d.v;
      if (d.send) { ui.modals.pop(); ui.modals.push(m); ACTIONS_bidSend(m); return; }
      m.counter = null; replaceModal('bid', m);
    },
    bidSend: () => ACTIONS_bidSend(ui.modals[ui.modals.length - 1]),
    renewOpen: (d) => openModal('contract', { id: d.id, mode: 'renew', tries: 0 }),
    freeOpen: (d) => {
      const S = G.S; const p = S.players[d.id];
      const wj = willJoin(S, p, S.clubs[S.user]);
      if (!wj.ok) { toast(wj.reason, true); return; }
      openModal('contract', { id: d.id, mode: 'free', fee: 0, tries: 0 });
    },
    wageStep: (d) => { const m = ui.modals[ui.modals.length - 1]; const step = m.wage >= 50000 ? 2500 : m.wage >= 10000 ? 500 : 100; m.wage = Math.max(250, m.wage + step * +d.v); replaceModal('contract', m); },
    wageSet: (d) => { const m = ui.modals[ui.modals.length - 1]; m.wage = +d.v; replaceModal('contract', m); },
    yearsSet: (d) => { const m = ui.modals[ui.modals.length - 1]; m.years = +d.v; replaceModal('contract', m); },
    contractSend: () => {
      const S = G.S; const m = ui.modals[ui.modals.length - 1];
      const p = S.players[m.id]; const me = S.clubs[S.user];
      if (m.mode !== 'renew' && !windowOpen(S) && m.mode !== 'free') { m.msg = 'Le mercato est fermé.'; replaceModal('contract', m); return; }
      const aff = canAfford(S, me, m.mode === 'transfer' ? m.fee : 0, m.wage, m.mode === 'renew' ? p.wage : 0);
      if (!aff.ok) { m.msg = aff.reason; m.ok = false; replaceModal('contract', m); return; }
      m.tries = (m.tries || 0) + 1;
      const r = contractResponse(S, p, me, m.wage, m.years);
      if (!r.ok) {
        m.ok = false;
        m.msg = r.reason + (m.tries >= 3 ? ' Le joueur met fin aux discussions.' : '');
        if (m.tries >= 3) m.dead = true;
        replaceModal('contract', m); return;
      }
      if (m.mode === 'renew') {
        p.wage = m.wage; p.until = S.season + m.years; p.noRenew = false;
        p.morale = Math.min(100, p.morale + 6);
        ui.modals = []; render(); persist();
        toast(`${pname(p)} prolonge jusqu'en ${p.until} !`);
        return;
      }
      if (m.mode === 'transfer') {
        const ev = evaluateBid(S, p, m.fee, me);
        if (ev.res !== 'accept') { m.msg = 'Le club a changé d\'avis.'; m.dead = true; replaceModal('contract', m); return; }
      }
      signPlayer(S, p, m.fee || 0, m.wage, m.years);
      ui.modals = []; render(); persist();
      toast(`${pname(p)} signe à ${me.name} !`);
    },
    loanInOpen: (d) => openModal('loanIn', { id: d.id }),
    loanInSend: () => {
      const S = G.S; const m = ui.modals[ui.modals.length - 1];
      const p = S.players[m.id]; const me = S.clubs[S.user]; const club = S.clubs[p.club];
      const rank = club.squad.map((id) => S.players[id]).sort((a, b) => b.ovr - a.ovr).indexOf(p);
      const fee = loanFee(p);
      if (club.squad.length <= 20) m.msg = `${club.name} n'a pas assez de joueurs pour prêter.`;
      else if (rank < 11 && p.age > 21) m.msg = `${club.name} refuse : c'est un titulaire.`;
      else if (fee > me.tBudget) m.msg = 'Budget transferts insuffisant pour l\'indemnité.';
      else if (!canAfford(S, me, 0, p.wage).ok) m.msg = 'Ta masse salariale ne permet pas ce prêt.';
      else if (!willJoin(S, p, me).ok) m.msg = `${pname(p)} ne souhaite pas venir.`;
      else {
        executeTransfer(S, p, me, 0, p.wage, 0, { loan: true });
        addFin(me, 'out', 'Prêts', fee); addFin(club, 'in', 'Prêts', fee); me.tBudget -= fee;
        ui.modals = []; render(); persist();
        toast(`${pname(p)} arrive en prêt jusqu'à la fin de la saison !`);
        return;
      }
      replaceModal('loanIn', m);
    },
    loanOutOpen: (d) => openModal('loanOut', { id: d.id }),
    loanOutGo: (d) => {
      const S = G.S; const p = S.players[d.id]; const to = S.clubs[d.c];
      executeTransfer(S, p, to, 0, p.wage, 0, { loan: true });
      ui.modals = []; render(); persist();
      toast(`${pname(p)} est prêté à ${to.name}.`);
    },
  },
});

function ACTIONS_bidSend(m) {
  const S = G.S;
  const p = S.players[m.id]; const me = S.clubs[S.user];
  if (!windowOpen(S)) { m.msg = 'Le mercato est fermé.'; replaceModal('bid', m); return; }
  if (m.fee > me.tBudget) { m.msg = `Budget insuffisant (${fmtMoney(me.tBudget)}).`; m.ok = false; replaceModal('bid', m); return; }
  const wj = willJoin(S, p, me);
  if (!wj.ok) { m.msg = wj.reason; m.ok = false; replaceModal('bid', m); return; }
  const ev = evaluateBid(S, p, m.fee, me);
  if (ev.res === 'accept') { ui.modals.pop(); openModal('contract', { id: p.id, mode: 'transfer', fee: m.fee, tries: 0 }); return; }
  m.ok = false;
  if (ev.res === 'counter') { m.counter = ev.counter; m.msg = `${S.clubs[p.club].name} demande ${fmtMoney(ev.counter)}.`; }
  else { m.counter = null; m.msg = ev.reason; }
  replaceModal('bid', m);
}

void playerValue;
