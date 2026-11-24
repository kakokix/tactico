// Écrans : titre / nouvelle carrière, accueil, messagerie.
import { G, ui, register, render, go, openModal, closeModal, modalHead, toast, persist, replaceModal } from './app.js';
import { ICON, esc, crest, flag, money, ovrB, posB, stars, rtB, natName } from './util.js';
import { NATIONS } from '../data/names.js';
import { LEAGUE_COUNTRIES, GAME_NAME } from '../core/constants.js';
import { generateWorld, generateRealWorld } from '../core/worldgen.js';
import { startCareer, nextUserMatch, userMatchToday } from '../core/game.js';
import { leagueTable, positionOf, compName, matchWinner } from '../core/competitions.js';
import { fmtDate } from '../core/dates.js';
import { pname, pshort } from '../core/player.js';
import { computeObjective, confLabel, takeJob } from '../core/board.js';
import { loadMeta, loadGame, deleteSave, importString } from '../core/save.js';
import { executeTransfer, wageDemand, fmtMoney } from '../core/transfers.js';
import { addNews } from '../core/messages.js';
import { R } from '../core/rng.js';
import { myScore } from './lb.js';
import { projectRevenue } from '../core/finance.js';

const STADIUM = `<svg class="stadium" viewBox="0 0 640 300" role="img" aria-label="Stade la nuit">
<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050b08"/><stop offset="1" stop-color="#0d2117"/></linearGradient>
<radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#f4ffd0" stop-opacity=".95"/><stop offset=".35" stop-color="#c6f43d" stop-opacity=".35"/><stop offset="1" stop-color="#c6f43d" stop-opacity="0"/></radialGradient>
<linearGradient id="grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c6a3a"/><stop offset="1" stop-color="#2d8a4f"/></linearGradient>
<linearGradient id="stand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#132a1e"/><stop offset="1" stop-color="#0a1711"/></linearGradient></defs>
<rect width="640" height="300" fill="url(#sky)"/>
<g fill="#c6f43d" opacity=".5">${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 640}" cy="${(i * 53) % 90 + 6}" r="${i % 3 ? 0.8 : 1.3}"/>`).join('')}</g>
<path d="M0 150 Q320 70 640 150 L640 210 L0 210Z" fill="url(#stand)"/>
<g fill="#1f3b2c">${Array.from({ length: 60 }, (_, i) => `<rect x="${i * 11}" y="${150 - Math.sin(i / 60 * Math.PI) * 70 + (i % 2) * 3}" width="7" height="5" rx="2"/>`).join('')}</g>
${[[60, 40], [190, 22], [450, 22], [580, 40]].map(([x, y]) => `<g><rect x="${x - 2}" y="${y + 10}" width="4" height="${150 - y}" fill="#0d1d15"/><rect x="${x - 16}" y="${y}" width="32" height="12" rx="2" fill="#e9ffd8"/><circle cx="${x}" cy="${y + 6}" r="70" fill="url(#glow)"/></g>`).join('')}
<path d="M-20 300 L120 196 L520 196 L660 300Z" fill="url(#grass)"/>
<g fill="none" stroke="#e8fff0" stroke-opacity=".75" stroke-width="2"><path d="M10 296 L130 200 L510 200 L630 296Z"/><path d="M320 200 V296"/><ellipse cx="320" cy="246" rx="58" ry="16"/><path d="M178 200 L150 232 L220 232 L234 200"/><path d="M462 200 L490 232 L420 232 L406 200"/></g>
<g><circle cx="352" cy="262" r="9" fill="#fff"/><path d="M347 258 l5 -2 4 3 -1 5 -6 0z" fill="#111"/><ellipse cx="352" cy="273" rx="10" ry="3" fill="#000" opacity=".35"/></g>
</svg>`;

// ---------- Titre ----------
function titleScreen() {
  const st = ui.p.step || 'home';
  if (st === 'mgr') return mgrStep();
  if (st === 'club') return clubStep();
  const meta = ui.meta;
  return `<div class="title-screen"><div class="tbox">
    <div><div class="logo">TACTI<span>CO</span></div><p class="muted" style="font-size:17px;margin-top:6px">Le jeu de manager de football. Prends un club, gère tout, grimpe au classement mondial.</p></div>
    ${STADIUM}
    ${meta ? `<button class="btn pri block" data-a="loadCareer" style="min-height:56px;font-size:16px">${ICON.play} Continuer : ${esc(meta.mgr)} · ${esc(meta.club || 'sans club')} · ${meta.season}-${(meta.season + 1) % 100}</button>` : ''}
    <button class="btn ${meta ? '' : 'pri'} block" data-a="newCareer" style="min-height:52px">${ICON.plus} Nouvelle carrière</button>
    <div class="grid2"><button class="btn block" data-a="importOpen">${ICON.save} Importer une sauvegarde</button><button class="btn block" data-a="titleBoard">${ICON.world} Classement mondial</button></div>
    <p class="dim small center">5 pays · 10 championnats · 198 vrais clubs 2026-27 (ou monde fictif)</p>
    <p class="dim small center disclaimer">Jeu non officiel, sans lien avec les clubs, les ligues ou les joueurs cités. Aucun logo officiel n'est utilisé.</p>
  </div></div>`;
}

function mgrStep() {
  const f = ui.f.mgr || (ui.f.mgr = { name: '', nat: 'FR' });
  return `<div class="title-screen"><div class="tbox">
    <button class="btn ghost sm" data-a="titleHome" style="align-self:flex-start">${ICON.back} Retour</button>
    <h1>Ton profil d'entraîneur</h1>
    <div class="card">
      <div class="field"><label for="mgrname">Pseudo (visible au classement mondial)</label><input id="mgrname" class="input" maxlength="20" value="${esc(f.name)}" placeholder="Ex : Kakokix" data-in="mgrName" autocomplete="off"></div>
      <div class="field"><label for="mgrnat">Nationalité</label><select id="mgrnat" class="input" data-ch="mgrNat">${Object.entries(NATIONS).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, v]) => `<option value="${k}" ${k === f.nat ? 'selected' : ''}>${v.flag} ${esc(v.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Monde</label><div class="worlds">
        <button class="world ${f.world !== 'fictif' ? 'on' : ''}" data-a="mgrWorld" data-w="real"><b>Monde réel 2026-27</b><span>Vrais clubs, vrais joueurs, vrais championnats (20 clubs en Premier League, 24 en Championship…)</span></button>
        <button class="world ${f.world === 'fictif' ? 'on' : ''}" data-a="mgrWorld" data-w="fictif"><b>Monde fictif</b><span>Clubs et joueurs inventés, 18 clubs par division</span></button>
      </div></div>
      <button class="btn pri block" data-a="toClubStep">Choisir mon club ${ICON.next}</button>
    </div></div></div>`;
}

function clubStep() {
  const S = G.S;
  const cc = ui.f.cc || 'FR', lvl = ui.f.lvl || 1;
  const comp = S.comps[cc + lvl];
  const clubs = comp.clubs.map((id) => S.clubs[id]).sort((a, b) => b.rep - a.rep);
  return `<div class="main" style="max-width:1100px;padding-bottom:40px">
    <div class="ph"><div><button class="btn ghost sm" data-a="toMgrStep">${ICON.back} Retour</button><h1 class="mt">Choisis ton club</h1><div class="sub">Plus le club est petit, plus le défi (et les points) sont grands.</div></div></div>
    <div class="tabs">${LEAGUE_COUNTRIES.map((C) => `<button class="tab ${cc === C.code ? 'on' : ''}" data-a="pickCountry" data-c="${C.code}">${flag(C.code)} ${C.name}</button>`).join('')}</div>
    <div class="seg mb"><button class="${lvl === 1 ? 'on' : ''}" data-a="pickLvl" data-l="1">${esc(S.comps[cc + '1'].name)}</button><button class="${lvl === 2 ? 'on' : ''}" data-a="pickLvl" data-l="2">${esc(S.comps[cc + '2'].name)}</button></div>
    <div class="clubpick">${clubs.map((c) => `<button class="cp" data-a="clubInfo" data-id="${c.id}">${crest(c, 'lg')}<span class="grow"><b style="font-family:var(--cond);font-size:19px">${esc(c.name)}</b><br>${stars(c.rep)} <span class="muted small">Note ${Math.round(c.str)}</span><br><span class="muted small">${esc(computeObjective(S, c).label)}</span></span></button>`).join('')}</div>
  </div>`;
}

function clubInfoModal(m) {
  const S = G.S;
  const c = S.clubs[m.id];
  const ps = c.squad.map((id) => S.players[id]).sort((a, b) => b.ovr - a.ovr);
  const obj = computeObjective(S, c);
  return `${modalHead(esc(c.name), `${esc(S.comps[c.league].name)} · ${esc(c.stadium.name)} (${c.stadium.cap.toLocaleString('fr-FR')} places)`)}
    <div class="row mb">${crest(c, 'xl')}<div class="kpis grow"><div class="kpi"><small>Réputation</small><b>${stars(c.rep)}</b></div><div class="kpi"><small>Note de l'équipe</small><b>${Math.round(c.str)}</b></div><div class="kpi"><small>Budget transferts</small><b>${money(c.tBudget)}</b></div><div class="kpi"><small>Revenus / saison</small><b>${money(projectRevenue(S, c))}</b></div></div></div>
    <div class="note mb"><b>Objectif du président :</b> ${esc(obj.label)}</div>
    <h3 class="mb">${ICON.star}Meilleurs joueurs</h3>
    <div class="list mb">${ps.slice(0, 6).map((p) => `<div class="li">${posB(p.pos)}<span class="grow"><span class="nm">${flag(p.nat)} ${esc(pname(p))}</span><span class="meta">${p.age} ans · ${money(p.value)}</span></span>${ovrB(p.ovr)}</div>`).join('')}</div>
    <button class="btn pri block" data-a="signClub" data-id="${c.id}" style="min-height:52px">Signer à ${esc(c.name)}</button>`;
}

register({
  screens: { title: titleScreen },
  modals: { clubinfo: clubInfoModal },
  after: {
    title: () => {
      if (ui.p.step === 'mgr') document.getElementById('mgrname')?.focus();
    },
  },
  actions: {
    titleHome: () => { ui.p = {}; render(); },
    newCareer: () => {
      if (ui.meta && !ui.p.confirm) {
        openModal('confirm', { title: 'Nouvelle carrière ?', body: 'Ta carrière actuelle sera remplacée (pense à l\'exporter dans Options si tu veux la garder).', yes: 'Commencer une nouvelle carrière', act: 'newCareerGo' });
        return;
      }
      ui.p = { step: 'mgr' }; render();
    },
    newCareerGo: () => { closeModal(); ui.p = { step: 'mgr' }; render(); },
    mgrName: (d, el) => { ui.f.mgr.name = el.value; },
    mgrNat: (d, el) => { ui.f.mgr.nat = el.value; },
    mgrWorld: (d) => { ui.f.mgr.world = d.w; render(); },
    toMgrStep: () => { ui.p = { step: 'mgr' }; render(); },
    toClubStep: () => {
      const name = (ui.f.mgr.name || '').trim();
      if (name.length < 2) { toast('Choisis un pseudo (2 caractères minimum).', true); return; }
      if (!/^[\p{L}\p{N} _.\-']+$/u.test(name)) { toast('Pseudo : lettres, chiffres, espaces et - _ . seulement.', true); return; }
      ui.f.cc = ui.f.mgr.nat && LEAGUE_COUNTRIES.some((c) => c.code === ui.f.mgr.nat) ? ui.f.mgr.nat : 'FR';
      ui.f.lvl = 1;
      const real = ui.f.mgr.world !== 'fictif';
      if (!G.S || G.S.mgr || (G.S.mode === 'real') !== real) G.S = (real ? generateRealWorld : generateWorld)((Date.now() ^ (Math.random() * 1e9)) >>> 0);
      ui.p = { step: 'club' }; render(); window.scrollTo(0, 0);
    },
    pickCountry: (d) => { ui.f.cc = d.c; render(); },
    pickLvl: (d) => { ui.f.lvl = +d.l; render(); },
    clubInfo: (d) => openModal('clubinfo', { id: d.id }),
    signClub: async (d) => {
      const S = G.S;
      startCareer(S, { name: ui.f.mgr.name.trim(), nat: ui.f.mgr.nat, clubId: d.id });
      ui.modals = [];
      ui.meta = null;
      await persist(true);
      go('home');
      toast(`Bienvenue à ${S.clubs[d.id].name} !`);
    },
    loadCareer: async () => {
      try {
        const S = await loadGame();
        if (!S) { toast('Aucune sauvegarde trouvée.', true); return; }
        G.S = S; go('home');
      } catch (e) { toast('Sauvegarde illisible : ' + e.message, true); }
    },
    importOpen: () => openModal('import'),
    titleBoard: () => openModal('worldboard'),
  },
});

export async function bootTitle() {
  try { ui.meta = await loadMeta(); } catch (e) { ui.meta = null; }
  ui.screen = 'title'; ui.p = {}; render();
}

// ---------- Accueil ----------
function teamResult(S, m, cid) {
  const us = m.h === cid ? 0 : 1;
  const gf = us === 0 ? m.hg : m.ag, ga = us === 0 ? m.ag : m.hg;
  const w = matchWinner(m);
  return w === cid ? 'V' : w && w !== cid ? 'D' : gf === ga ? 'N' : gf > ga ? 'V' : 'D';
}

function homeScreen() {
  const S = G.S;
  if (!S.user) return unemployedHome();
  const club = S.clubs[S.user];
  const nm = nextUserMatch(S);
  const today = userMatchToday(S);
  const comp = S.comps[club.league];
  const table = leagueTable(S, comp);
  const pos = table.findIndex((r) => r.c === club.id) + 1;
  const row = comp.table[club.id];
  const results = Object.values(S.matches).filter((m) => m.done && (m.h === club.id || m.a === club.id)).sort((a, b) => b.d - a.d).slice(0, 5);
  const conf = S.mgr.conf;
  let hero;
  if (nm) {
    const H = S.clubs[nm.h], A = S.clubs[nm.a];
    const days = nm.d - S.day;
    hero = `<section class="hero"><div class="spread"><span class="chip ${today ? 'gold' : 'lime'}">${esc(compName(S, nm.c))}${nm.lb ? ' · ' + esc(nm.lb) : ''}</span><span class="small muted">${fmtDate(nm.d, 'wdm')}${days > 0 ? ` · dans ${days} j` : " · aujourd'hui"}</span></div>
      <div class="vs"><div class="team">${crest(H, 'lg')}<b>${esc(H.name)}</b><span class="small muted">${stars(H.rep)}</span></div><div class="mid"><div class="big">VS</div><div class="small muted">${nm.neutral ? 'Terrain neutre' : esc(H.stadium.name)}</div></div><div class="team">${crest(A, 'lg')}<b>${esc(A.name)}</b><span class="small muted">${stars(A.rep)}</span></div></div>
      <div class="row wrap" style="justify-content:center;margin-top:10px">${today ? `<button class="btn gold" data-a="nav" data-s="match" data-p='${JSON.stringify({ id: nm.id })}'>${ICON.ball} Préparer le match</button>` : `<button class="btn pri" data-a="continue">Avancer jusqu'au match ${ICON.next}</button>`}<button class="btn" data-a="nav" data-s="tactics">${ICON.tactics} Tactique</button></div></section>`;
  } else hero = `<section class="hero"><h2>Aucun match à venir</h2><p class="muted">La saison est terminée. Clique sur Continuer pour passer à la suite.</p></section>`;
  const around = table.slice(Math.max(0, Math.min(pos - 3, table.length - 5)), Math.max(5, Math.min(pos + 2, table.length)));
  const news = S.news.slice(0, 8);
  const unread = S.inbox.filter((m) => !m.read).slice(0, 3);
  const absent = club.squad.map((id) => S.players[id]).filter((p) => p.inj > 0 || p.susp > 0);
  return `<div class="ph"><div><h1>${esc(club.name)}</h1><div class="sub">${esc(comp.name)} · Saison ${S.season}-${(S.season + 1) % 100} · Entraîneur ${esc(S.mgr.name)}</div></div></div>
  ${hero}
  <div class="kpis mt">
    <div class="kpi"><small>Classement</small><b>${row && row.p ? `${pos}<sup>e</sup> · ${row.pts} pts` : '—'}</b></div>
    <div class="kpi"><small>Objectif</small><b style="font-size:16px;white-space:normal">${esc(club.obj.label)}</b></div>
    <div class="kpi"><small>Confiance du président</small><b>${Math.round(conf)}%</b><div class="bar mt" style="margin-top:6px"><i style="width:${conf}%;background:${conf >= 60 ? 'var(--green)' : conf >= 35 ? 'var(--orange)' : 'var(--red)'}"></i></div></div>
    <div class="kpi"><small>Score mondial</small><b>${myScore(S).toLocaleString('fr-FR')} pts</b></div>
  </div>
  <div class="grid2 mt">
    <div class="card"><div class="ttl"><h3>${esc(comp.name)}</h3><button class="btn sm" data-a="nav" data-s="comps">Tout voir</button></div>
      <table class="tbl"><thead><tr><th>#</th><th>Club</th><th class="n">J</th><th class="n">Diff</th><th class="n">Pts</th></tr></thead><tbody>
      ${around.map((r) => { const i = table.indexOf(r) + 1; const c = S.clubs[r.c]; return `<tr class="${r.c === club.id ? 'me' : ''} click" data-a="clubView" data-id="${c.id}"><td>${i}</td><td><span class="clubc">${crest(c, 'sm')}<span>${esc(c.name)}</span></span></td><td class="n">${r.p}</td><td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><b>${r.pts}</b></td></tr>`; }).join('')}
      </tbody></table></div>
    <div class="card"><div class="ttl"><h3>${ICON.table}Derniers résultats</h3><span class="form">${(row?.f || '').split('').map((x) => `<i class="${x}">${x}</i>`).join('')}</span></div>
      ${results.length ? `<div class="list">${results.map((m) => { const H = S.clubs[m.h], A = S.clubs[m.a]; const r = teamResult(S, m, club.id); return `<button class="li" data-a="matchReport" data-id="${m.id}"><span class="form"><i class="${r}">${r}</i></span><span class="grow"><span class="nm">${esc(H.short)} ${m.hg}-${m.ag} ${esc(A.short)}${m.pen ? ` (${m.pen[0]}-${m.pen[1]} tab)` : ''}</span><span class="meta">${esc(compName(S, m.c))} · ${fmtDate(m.d, 'dm')}</span></span></button>`; }).join('')}</div>` : '<p class="muted">Pas encore de match joué.</p>'}
    </div>
  </div>
  <div class="grid2 mt">
    <div class="card"><div class="ttl"><h3>${ICON.inbox}Messagerie</h3><button class="btn sm" data-a="nav" data-s="inbox">Ouvrir</button></div>
      ${unread.length ? `<div class="list">${unread.map((m) => `<button class="li unread" data-a="openMsg" data-id="${m.id}"><span class="grow"><span class="nm">${esc(m.title)}</span><span class="meta">${esc(m.from)} · ${fmtDate(m.day, 'dm')}</span></span></button>`).join('')}</div>` : '<p class="muted">Aucun nouveau message.</p>'}
      ${absent.length ? `<h3 class="mt">Absents</h3><div class="list mt">${absent.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${p.inj > 0 ? `${esc(p.injName)} · ${p.inj} j` : `Suspendu · ${p.susp} match(s)`}</span></span><span class="chip ${p.inj > 0 ? 'red' : 'orange'}">${p.inj > 0 ? 'Blessé' : 'Suspendu'}</span></button>`).join('')}</div>` : ''}
    </div>
    <div class="card"><div class="ttl"><h3>${ICON.bell}Actualités</h3></div>${news.length ? news.map((n) => `<div class="newsi"><time>${fmtDate(n.d, 'dm')}</time><span>${esc(n.t)}</span></div>`).join('') : '<p class="muted">Rien de neuf pour le moment.</p>'}</div>
  </div>`;
}

function unemployedHome() {
  const S = G.S;
  return `<div class="ph"><div><h1>Sans club</h1><div class="sub">${esc(S.mgr.name)} · réputation ${Math.round(S.mgr.rep)}/100</div></div></div>
  <div class="card"><h3>${ICON.contract}Retrouve un poste</h3><p class="muted">Consulte les postes vacants dans Carrière et postule. Les clubs peuvent aussi te contacter : clique sur Continuer pour avancer dans le temps.</p>
  <div class="row wrap mt"><button class="btn pri" data-a="nav" data-s="career">${ICON.career} Offres d'emploi</button><button class="btn" data-a="continue">Avancer ${ICON.next}</button></div></div>
  <div class="card"><div class="ttl"><h3>${ICON.bell}Actualités</h3></div>${S.news.slice(0, 10).map((n) => `<div class="newsi"><time>${fmtDate(n.d, 'dm')}</time><span>${esc(n.t)}</span></div>`).join('')}</div>`;
}

// ---------- Messagerie ----------
function inboxScreen() {
  const S = G.S;
  const list = S.inbox;
  return `<div class="ph"><div><h1>Messagerie</h1><div class="sub">${list.filter((m) => !m.read).length} non lu(s)</div></div><button class="btn sm" data-a="readAll">Tout marquer comme lu</button></div>
  ${list.length ? `<div class="list">${list.map((m) => `<button class="li ${m.read ? '' : 'unread'}" data-a="openMsg" data-id="${m.id}"><span class="grow"><span class="nm">${m.act && !m.done ? '● ' : ''}${esc(m.title)}</span><span class="meta">${esc(m.from)} · ${fmtDate(m.day, 'dm')}</span></span>${m.act && !m.done ? '<span class="chip gold">Action</span>' : ''}</button>`).join('')}</div>` : '<div class="empty">Aucun message.</div>'}`;
}

function msgModal(m) {
  const S = G.S;
  const msg = S.inbox.find((x) => x.id === m.id);
  if (!msg) return modalHead('Message') + '<p>Message introuvable.</p>';
  if (!msg.read) { msg.read = true; setTimeout(() => { if (ui.screen === 'inbox' || ui.screen === 'home' || ui.screen === 'more') render(); }, 0); }
  let actions = '';
  if (msg.act && !msg.done) {
    if (msg.act.type === 'bid') {
      const p = S.players[msg.act.pid];
      actions = p && p.club === S.user ? `<div class="note mt">Offre : <b>${money(msg.act.fee)}</b> · valeur ${money(p.value)} · expire le ${fmtDate(msg.act.exp, 'dm')}</div>
        <div class="grid3 mt"><button class="btn pri" data-a="bidAccept" data-id="${msg.id}">Accepter</button><button class="btn" data-a="bidCounter" data-id="${msg.id}">Demander +20 %</button><button class="btn danger" data-a="bidReject" data-id="${msg.id}">Refuser</button></div>` : '';
    } else if (msg.act.type === 'job') {
      const c = S.clubs[msg.act.club];
      actions = `<div class="row mt">${crest(c, 'lg')}<div><b>${esc(c.name)}</b><div class="muted small">${esc(S.comps[c.league].name)} · ${stars(c.rep)}</div></div></div>
        <div class="grid2 mt"><button class="btn pri" data-a="jobAccept" data-id="${msg.id}">Accepter le poste</button><button class="btn" data-a="jobDecline" data-id="${msg.id}">Refuser</button></div>`;
    }
  } else if (msg.act && msg.done) actions = `<div class="note mt">${msg.expired ? 'Offre expirée.' : 'Traité.'}</div>`;
  const link = msg.pid && S.players[msg.pid] ? `<button class="btn sm mt" data-a="player" data-id="${msg.pid}">Voir la fiche du joueur</button>` : '';
  return `${modalHead(esc(msg.title), `${esc(msg.from)} · ${fmtDate(msg.day)}`)}<div class="msgbody">${esc(msg.body)}</div>${link}${actions}`;
}

register({
  screens: { home: homeScreen, inbox: inboxScreen },
  modals: {
    msg: msgModal,
    confirm: (m) => `${modalHead(esc(m.title))}<p class="msgbody">${esc(m.body)}</p><div class="grid2 mt"><button class="btn" data-a="close">Annuler</button><button class="btn ${m.danger ? 'danger' : 'pri'}" data-a="${m.act}" ${m.data ? `data-x='${esc(JSON.stringify(m.data))}'` : ''}>${esc(m.yes)}</button></div>`,
  },
  actions: {
    openMsg: (d) => openModal('msg', { id: d.id }),
    readAll: () => { for (const m of G.S.inbox) m.read = true; render(); },
    bidAccept: (d) => {
      const S = G.S;
      const msg = S.inbox.find((x) => x.id === d.id);
      const p = S.players[msg.act.pid], buyer = S.clubs[msg.act.club];
      if (!p || p.club !== S.user) { msg.done = true; closeModal(); return; }
      executeTransfer(S, p, buyer, msg.act.fee, wageDemand(S, p, buyer), R.int(2, 5));
      addNews(S, `${pname(p)} : ${S.clubs[S.user].name} → ${buyer.name} pour ${fmtMoney(msg.act.fee)}.`, 'transfer');
      msg.done = true;
      closeModal(); persist(); render();
      toast(`${pname(p)} vendu pour ${money(msg.act.fee)} !`);
    },
    bidReject: (d) => { const msg = G.S.inbox.find((x) => x.id === d.id); msg.done = true; closeModal(); render(); toast('Offre refusée.'); },
    bidCounter: (d) => {
      const S = G.S;
      const msg = S.inbox.find((x) => x.id === d.id);
      if (msg.countered) { toast('Le club a déjà fait sa dernière offre.', true); return; }
      msg.countered = true;
      if (R.chance(0.55)) {
        msg.act.fee = Math.round(msg.act.fee * 1.2 / 25000) * 25000;
        msg.body += `\n\n${S.clubs[msg.act.club].name} accepte de monter à ${fmtMoney(msg.act.fee)}.`;
        replaceModal('msg', { id: msg.id });
        toast('Le club monte son offre !');
      } else {
        msg.done = true;
        msg.body += `\n\n${S.clubs[msg.act.club].name} a retiré son offre.`;
        replaceModal('msg', { id: msg.id });
        toast('Le club retire son offre.', true);
      }
    },
    jobAccept: (d) => {
      const S = G.S;
      const msg = S.inbox.find((x) => x.id === d.id);
      takeJob(S, msg.act.club);
      msg.done = true;
      ui.modals = []; persist(); go('home');
      toast(`Nouveau défi : ${S.clubs[S.user].name} !`);
    },
    jobDecline: (d) => {
      const S = G.S;
      const msg = S.inbox.find((x) => x.id === d.id);
      msg.done = true;
      closeModal(); render();
    },
  },
});

export { teamResult };
