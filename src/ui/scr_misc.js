// Écrans : finances, entraînement, club, carrière, classement mondial, options, bilan de saison.
import { G, ui, register, render, go, openModal, closeModal, modalHead, toast, persist, storageMode } from './app.js';
import { ICON, esc, crest, flag, money, ovrB, posB, stars, natName } from './util.js';
import { TRAINING_FOCUS, TRAINING_INTENSITY, LEAGUE_COUNTRIES, SCORE_RULES, contiName } from '../core/constants.js';
import { wageBill, projectRevenue, ticketPrice, FAC_NAMES, facUpgradeCost, stadiumExpandCost, addFin, tvMoney, commercial } from '../core/finance.js';
import { pname } from '../core/player.js';
import { confLabel, vacancies, jobChance, applyForJob, sackUser } from '../core/board.js';
import { leagueTable } from '../core/competitions.js';
import { fmtDate } from '../core/dates.js';
import { careerScore, trophyCount } from '../core/score.js';
import { apiAvailable, fetchBoard, submitScore, SITE_URL, myScore, lienAppel } from './lb.js';
import { saveGame, exportString, importString, deleteSave } from '../core/save.js';
import { addMsg } from '../core/messages.js';
import { bootTitle } from './scr_main.js';

// ---------- Finances ----------
function financesScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const c = S.clubs[S.user];
  const bill = wageBill(S, c);
  const fin = c.fin;
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  const tin = sum(fin.in), tout = sum(fin.out);
  const maxv = Math.max(1, ...Object.values(fin.in), ...Object.values(fin.out));
  const bars = (o, col) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div style="margin:8px 0"><div class="spread small"><span>${esc(k)}</span><b class="num">${money(v)}</b></div><div class="bar lg"><i style="width:${v / maxv * 100}%;background:${col}"></i></div></div>`).join('') || '<p class="muted small">Rien pour le moment.</p>';
  const top = c.squad.map((id) => S.players[id]).sort((a, b) => b.wage - a.wage).slice(0, 8);
  return `<div class="ph"><div><h1>Finances</h1><div class="sub">Saison ${S.season}-${(S.season + 1) % 100} · revenus prévus ${money(projectRevenue(S, c))} / saison</div></div></div>
  <div class="kpis"><div class="kpi"><small>Solde</small><b style="color:${c.balance >= 0 ? 'var(--ink)' : 'var(--red)'}">${money(c.balance)}</b></div><div class="kpi"><small>Budget transferts</small><b>${money(c.tBudget)}</b></div><div class="kpi"><small>Salaires / sem.</small><b>${money(bill)}</b><small>max ${money(c.wBudget)}</small></div><div class="kpi"><small>Bilan de la saison</small><b style="color:${tin - tout >= 0 ? 'var(--green)' : 'var(--red)'}">${money(tin - tout)}</b></div></div>
  <div class="grid2 mt"><div class="card"><h3>${ICON.tickets}Recettes · ${money(tin)}</h3>${bars(fin.in, 'var(--green)')}</div><div class="card"><h3>${ICON.contract}Dépenses · ${money(tout)}</h3>${bars(fin.out, 'var(--red)')}</div></div>
  <div class="grid2 mt">
    <div class="card"><h3 class="mb">${ICON.money}Répartition des budgets</h3><p class="small muted">Échange une partie du budget transferts contre de la marge salariale, ou l'inverse (1 M€ ≈ ${money(1e6 / 52)} par semaine).</p>
      <div class="grid2 mt"><button class="btn" data-a="budgetShift" data-v="1" ${c.tBudget >= 1e6 ? '' : 'disabled'}>Transferts → Salaires</button><button class="btn" data-a="budgetShift" data-v="-1" ${c.wBudget - bill >= 1e6 / 52 ? '' : 'disabled'}>Salaires → Transferts</button></div>
      <h3 class="mt2 mb">Stade · ${esc(c.stadium.name)}</h3>
      <div class="kpis"><div class="kpi"><small>Capacité</small><b>${c.stadium.cap.toLocaleString('fr-FR')}</b></div><div class="kpi"><small>Prix du billet</small><b>${ticketPrice(S, c)} €</b></div></div>
      <button class="btn block mt" data-a="stadiumUp" ${c.balance >= stadiumExpandCost(2000) ? '' : 'disabled'}>Agrandir de 2 000 places (${money(stadiumExpandCost(2000))})</button>
      <p class="small muted mt">Droits TV ${money(tvMoney(S, c))} · sponsors ${money(commercial(c))} par saison.</p></div>
    <div class="card"><h3 class="mb">${ICON.stadium}Infrastructures</h3>${Object.entries(FAC_NAMES).map(([k, n]) => { const lvl = c.fac[k]; const cost = facUpgradeCost(lvl); return `<div class="toggle"><span><b>${n}</b><br><span class="stars">${'★'.repeat(lvl)}<span class="dim">${'★'.repeat(5 - lvl)}</span></span><br><span class="small muted">${{ train: 'Progression des joueurs', youth: 'Qualité des jeunes formés', med: 'Récupération et durée des blessures' }[k]}</span></span>${lvl < 5 ? `<button class="btn sm" data-a="facUp" data-k="${k}" ${c.balance >= cost ? '' : 'disabled'}>Améliorer · ${money(cost)}</button>` : '<span class="chip gold">Max</span>'}</div>`; }).join('')}
      <h3 class="mt2 mb">Plus gros salaires</h3><div class="list">${top.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow nm">${esc(pname(p))}</span><b class="num">${money(p.wage)}</b></button>`).join('')}</div></div>
  </div>`;
}

// ---------- Entraînement ----------
function trainingScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const c = S.clubs[S.user];
  const youth = c.youth.map((id) => S.players[id]).sort((a, b) => b.pot - a.pot);
  const prog = c.squad.map((id) => S.players[id]).filter((p) => p.o0 != null && p.ovr !== p.o0).sort((a, b) => (b.ovr - b.o0) - (a.ovr - a.o0)).slice(0, 8);
  const DESC = { eq: 'Développement harmonieux de tous les attributs.', att: 'Finition, tir, dribble et centres progressent plus vite.', def: 'Tacles, marquage, jeu de tête et placement.', tech: 'Passes, vision, dribble et coups de pied arrêtés.', phy: 'Vitesse, endurance et puissance.', tac: 'Placement, sang-froid, volume de jeu ; la cohésion monte plus vite.' };
  return `<div class="ph"><div><h1>Entraînement</h1><div class="sub">${esc(FAC_NAMES.train)} niveau ${c.fac.train}/5 · ${esc(FAC_NAMES.youth)} niveau ${c.fac.youth}/5</div></div></div>
  <div class="grid2">
    <div class="card"><h3 class="mb">${ICON.cone}Thème de la semaine</h3><div class="list">${TRAINING_FOCUS.map((f) => `<button class="li ${c.training.focus === f.id ? 'me' : ''}" data-a="trainFocus" data-k="${f.id}"><span class="grow"><span class="nm">${c.training.focus === f.id ? '✓ ' : ''}${f.name}</span><span class="meta" style="white-space:normal">${DESC[f.id]}</span></span></button>`).join('')}</div>
      <h3 class="mt2 mb">Intensité</h3><div class="seg">${TRAINING_INTENSITY.map((l, i) => `<button class="${c.training.int === i ? 'on' : ''}" data-a="trainInt" data-v="${i}">${l}</button>`).join('')}</div>
      <p class="small muted mt">Légère : meilleure récupération, progression plus lente. Intense : progression plus rapide, mais fatigue et petit risque de blessure.</p></div>
    <div class="card"><h3 class="mb">${ICON.progress}Progression cette saison</h3>${prog.length ? `<div class="list">${prog.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${esc(pname(p))}</span><span class="meta">${p.age} ans · ${p.o0} → ${p.ovr}</span></span><b class="num" style="color:${p.ovr >= p.o0 ? 'var(--green)' : 'var(--red)'}">${p.ovr >= p.o0 ? '+' : ''}${p.ovr - p.o0}</b></button>`).join('')}</div>` : '<p class="muted">Les progrès apparaîtront au fil des semaines. Les jeunes qui jouent progressent le plus.</p>'}</div>
  </div>
  <div class="card mt"><div class="ttl"><h3>${ICON.academy}Centre de formation (${youth.length})</h3><span class="small muted">Nouvelle génération chaque 15 mars</span></div>
    ${youth.length ? `<div class="list">${youth.map((p) => `<button class="li" data-a="player" data-id="${p.id}">${posB(p.pos)}<span class="grow"><span class="nm">${flag(p.nat)} ${esc(pname(p))}</span><span class="meta">${p.age} ans · potentiel ${p.pot}</span></span><span class="pot">Pot. ${p.pot}</span>${ovrB(p.ovr)}</button>`).join('')}</div>` : '<p class="muted">Aucun jeune pour le moment.</p>'}
    <p class="small muted mt">Promeus tes meilleurs jeunes en équipe première depuis leur fiche. À 19 ans, ils intègrent automatiquement l'effectif pro.</p></div>`;
}

// ---------- Club ----------
function clubScreen() {
  const S = G.S;
  if (!S.user) return '<div class="empty">Tu n\'as pas de club.</div>';
  const c = S.clubs[S.user];
  const comp = S.comps[c.league];
  const pos = leagueTable(S, comp).findIndex((r) => r.c === c.id) + 1;
  const conf = S.mgr.conf;
  const del = S.mgr.delegate || (S.mgr.delegate = { renew: true, fill: true });
  return `<div class="ph"><div class="row">${crest(c, 'xl')}<div><h1>${esc(c.name)}</h1><div class="sub">${esc(comp.name)} · ${stars(c.rep)} · ${esc(c.stadium.name)}</div></div></div></div>
  <div class="grid2">
    <div class="card"><h3 class="mb">${ICON.club}Le président</h3>
      <div class="kpis"><div class="kpi"><small>Confiance</small><b>${Math.round(conf)}% · ${confLabel(conf)}</b><div class="bar" style="margin-top:6px"><i style="width:${conf}%;background:${conf >= 60 ? 'var(--green)' : conf >= 35 ? 'var(--orange)' : 'var(--red)'}"></i></div></div><div class="kpi"><small>Position actuelle</small><b>${comp.table[c.id].p ? pos + 'e' : '—'}</b></div></div>
      <div class="note mt"><b>Objectif :</b> ${esc(c.obj.label)}</div>
      <p class="small muted mt">La confiance monte avec les victoires et les trophées, baisse avec les défaites et les finances dans le rouge. Sous 12 %, tu es licencié.</p>
    </div>
    <div class="card"><h3 class="mb">${ICON.scout}Délégation au directeur sportif</h3>
      <div class="toggle"><span><b>Prolongations automatiques</b><br><span class="small muted">Le 1er avril, il prolonge les joueurs importants qui arrivent en fin de contrat.</span></span><button class="switch ${del.renew ? 'on' : ''}" data-a="delegate" data-k="renew" aria-label="Prolongations automatiques"></button></div>
      <div class="toggle"><span><b>Compléter l'effectif</b><br><span class="small muted">Pendant le mercato, il recrute des joueurs libres si tu as moins de 20 joueurs.</span></span><button class="switch ${del.fill ? 'on' : ''}" data-a="delegate" data-k="fill" aria-label="Compléter l'effectif"></button></div>
      <div class="toggle"><span><b>L'adjoint choisit l'équipe</b><br><span class="small muted">Composition automatique avant chaque match (selon la fraîcheur).</span></span><button class="switch ${S.mgr.autoPick ? 'on' : ''}" data-a="toggleAutoPick" aria-label="Composition automatique"></button></div>
    </div>
  </div>
  <div class="grid2 mt">
    <div class="card"><h3 class="mb">${ICON.trophy}Palmarès du club</h3>${c.trophies.length ? c.trophies.slice().reverse().map((t) => `<div class="trophy">${ICON.trophy}<span class="grow"><b>${esc(t.n)}</b><br><span class="small muted">${t.s}-${(t.s + 1) % 100}</span></span></div>`).join('') : '<p class="muted">Aucun trophée… pour l\'instant.</p>'}</div>
    <div class="card"><h3 class="mb">${ICON.table}Historique</h3>${c.hist.length ? `<table class="tbl"><thead><tr><th>Saison</th><th>Championnat</th><th class="n">Pos.</th><th class="n">Pts</th></tr></thead><tbody>${c.hist.slice(0, 12).map((h) => `<tr><td>${h.s}-${(h.s + 1) % 100}</td><td>${esc(h.ln)}</td><td class="n">${h.pos}</td><td class="n">${h.pts}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Première saison.</p>'}</div>
  </div>`;
}

// ---------- Carrière ----------
function careerScreen() {
  const S = G.S;
  const m = S.mgr;
  const c = m.career;
  const games = c.w + c.d + c.l;
  const score = careerScore(c);
  const vac = vacancies(S).sort((a, b) => b.rep - a.rep);
  const apps = m.apps || [];
  const club = S.user ? S.clubs[S.user] : null;
  const R_ = SCORE_RULES;
  const parts = [['Victoires', c.w * R_.win], ['Nuls', c.d * R_.draw], ['Titres D1', c.titles1 * R_.title1], ['Titres D2', c.titles2 * R_.title2], ['Coupes', c.cups * R_.cup], [contiName(G.S), c.conti * R_.conti], ['Montées', c.promos * R_.promo], ['Objectifs atteints', c.objMet * R_.objMet], ['Objectifs dépassés', c.objEx * R_.objEx]].filter(([, v]) => v);
  return `<div class="ph"><div><h1>${flag(m.nat)} ${esc(m.name)}</h1><div class="sub">${club ? `Entraîneur de ${esc(club.name)}` : 'Sans club'} · réputation ${Math.round(m.rep)}/100 · ${c.seasons} saison(s) terminée(s)</div></div>${club ? `<button class="btn danger sm" data-a="resignAsk">Démissionner</button>` : ''}</div>
  <div class="kpis"><div class="kpi"><small>Score mondial</small><b style="color:var(--lime)">${score.toLocaleString('fr-FR')}</b></div><div class="kpi"><small>Matchs</small><b>${games}</b></div><div class="kpi"><small>Bilan</small><b>${c.w}V ${c.d}N ${c.l}D</b></div><div class="kpi"><small>% victoires</small><b>${games ? Math.round(c.w / games * 100) : 0}%</b></div><div class="kpi"><small>Trophées</small><b>${trophyCount(c)}</b></div><div class="kpi"><small>Licenciements</small><b>${c.sacked}</b></div></div>
  <div class="grid2 mt">
    <div class="card"><h3 class="mb">${ICON.info}Calcul du score</h3>${parts.length ? parts.map(([k, v]) => `<div class="spread small" style="padding:5px 0;border-bottom:1px solid var(--line)"><span>${k}</span><b class="num">+${v.toLocaleString('fr-FR')}</b></div>`).join('') : '<p class="muted">Gagne des matchs pour marquer des points.</p>'}
      <p class="small muted mt">Victoire ${R_.win} · nul ${R_.draw} · titre D1 ${R_.title1} · titre D2 ${R_.title2} · coupe ${R_.cup} · ${esc(contiName(G.S))} ${R_.conti} · montée ${R_.promo} · objectif atteint ${R_.objMet} (+${R_.objEx} s'il est dépassé).</p>
      <button class="btn block mt" data-a="nav" data-s="world">${ICON.world} Voir le classement mondial</button></div>
    <div class="card"><h3 class="mb">${ICON.medal}Trophées</h3>${m.trophies.length ? m.trophies.slice().reverse().map((t) => `<div class="trophy">${ICON.trophy}<span class="grow"><b>${esc(t.n)}</b><br><span class="small muted">${esc(t.c)} · ${t.s}-${(t.s + 1) % 100}</span></span></div>`).join('') : '<p class="muted">Pas encore de trophée.</p>'}</div>
  </div>
  <div class="card mt"><div class="ttl"><h3>${ICON.contract}Postes vacants (${vac.length})</h3><span class="small muted">Plus ta réputation est haute, plus tes chances sont bonnes</span></div>
    ${vac.length ? `<div class="list">${vac.map((v) => { const ch = Math.round(jobChance(S, v) * 100); const pending = apps.some((a) => a.club === v.id); return `<div class="li">${crest(v)}<span class="grow"><span class="nm">${esc(v.name)}</span><span class="meta">${esc(S.comps[v.league].name)} · réputation ${v.rep} · chances ${ch}%</span></span>${pending ? '<span class="chip">Candidature envoyée</span>' : `<button class="btn sm" data-a="applyJob" data-id="${v.id}">Postuler</button>`}</div>`; }).join('')}</div>` : '<p class="muted">Aucun poste vacant en ce moment. Les clubs limogent souvent leur entraîneur en cours de saison.</p>'}</div>
  <div class="grid2 mt">
    <div class="card"><h3 class="mb">${ICON.progress}Parcours</h3>${m.clubs.length ? `<table class="tbl"><thead><tr><th>Club</th><th>Période</th><th class="n">V</th><th class="n">N</th><th class="n">D</th></tr></thead><tbody>${m.clubs.slice().reverse().map((x) => `<tr><td>${esc(x.name)}</td><td>${x.from}${x.to ? '-' + x.to : '-…'}</td><td class="n">${x.w}</td><td class="n">${x.d}</td><td class="n">${x.l}</td></tr>`).join('')}</tbody></table>` : ''}</div>
    <div class="card"><h3 class="mb">${ICON.cal}Saisons</h3>${m.log.length ? `<table class="tbl"><thead><tr><th>Saison</th><th>Club</th><th class="n">Pos.</th><th>Objectif</th></tr></thead><tbody>${m.log.map((l) => `<tr><td>${l.s}</td><td>${esc(l.club)}</td><td class="n">${l.pos}</td><td>${l.met ? '<span class="chip lime">✓</span>' : '<span class="chip red">✗</span>'}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Ta première saison est en cours.</p>'}</div>
  </div>`;
}

// ---------- Classement mondial ----------
function boardBody(data, S, compact = false) {
  if (!apiAvailable()) return `<div class="card"><h3>${ICON.world}Classement mondial en ligne</h3><p class="muted">Ici, le jeu tourne hors ligne. Le classement mondial fonctionne sur le site du jeu :</p><p><a href="${SITE_URL}" target="_blank" rel="noopener">${SITE_URL}</a></p><p class="small muted">${SITE_URL.replace('https://', '')}</p></div>`;
  if (!data) return '<div class="empty"><div class="spin" style="margin:0 auto"></div><p>Chargement du classement…</p></div>';
  if (data.error) return `<div class="card warn note">Classement indisponible : ${esc(data.error)}. Réessaie plus tard.</div>`;
  const me = S?.mgr?.id;
  const rows = data.top || [];
  return `${data.me ? `<div class="card lbmine mb"><div class="row"><span class="bigrank">#${data.me.rank}</span><span class="grow"><b>${esc(data.me.name)}</b><br><span class="small muted">${data.me.score.toLocaleString('fr-FR')} pts · sur ${data.total} managers</span></span></div></div>` : ''}
    <div class="card" style="padding:6px"><div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>Manager</th>${compact ? '' : '<th>Club</th>'}<th class="n">Score</th><th class="n">${ICON.trophy}</th><th class="n">Saisons</th>${compact ? '' : '<th class="n">% V</th>'}</tr></thead><tbody>
    ${rows.map((r, i) => { const g = r.w + r.d + r.l; return `<tr class="${r.id === me ? 'me' : ''}"><td><b>${r.rank || i + 1}</b></td><td>${flag(r.nat)} <b>${esc(r.name)}</b>${compact ? `<br><span class="small muted">${esc(r.club || '—')}</span>` : ''}</td>${compact ? '' : `<td>${r.cc ? `<span class="pill" style="background:${esc(r.cc[0])};width:10px;height:10px;padding:0;display:inline-block;border-radius:3px;margin-right:6px"></span>` : ''}${esc(r.club || '—')}</td>`}<td class="n"><b>${r.score.toLocaleString('fr-FR')}</b></td><td class="n">${r.trophies}</td><td class="n">${r.seasons}</td>${compact ? '' : `<td class="n">${g ? Math.round(r.w / g * 100) : 0}%</td>`}</tr>`; }).join('') || '<tr><td colspan="7" class="center muted">Personne pour le moment : sois le premier !</td></tr>'}
    </tbody></table></div></div>`;
}

function worldScreen() {
  const S = G.S;
  const sort = ui.f.lbSort || 'score';
  if (apiAvailable() && !ui.lb && !ui.lbLoading) {
    ui.lbLoading = true;
    submitScore(S, !!S.flags.lbDirty).finally(() => fetchBoard(S.mgr.id, sort).then((d) => { ui.lb = d; ui.lbLoading = false; if (ui.screen === 'world') render(); }));
  }
  return `<div class="ph"><div><h1>Classement mondial</h1><div class="sub">Tous les managers de Tactico. Ton score : <b>${myScore(S).toLocaleString('fr-FR')}</b> pts</div></div>${apiAvailable() ? '<button class="btn sm" data-a="lbRefresh">Actualiser</button>' : ''}</div>
    ${apiAvailable() ? `<div class="seg mb"><button class="${sort === 'score' ? 'on' : ''}" data-a="lbSort" data-k="score">Score</button><button class="${sort === 'trophies' ? 'on' : ''}" data-a="lbSort" data-k="trophies">Trophées</button></div>` : ''}
    ${boardBody(ui.lb, S)}
    <p class="small muted mt">Ton score est envoyé automatiquement après tes matchs. Pseudo et club sont visibles par tous.</p>`;
}

// ---------- Options ----------
function optionsScreen() {
  const S = G.S;
  return `<div class="ph"><div><h1>Options</h1><div class="sub">Sauvegarde : ${storageMode === 'idb' ? 'automatique dans ce navigateur' : storageMode === 'ls' ? 'automatique (stockage local)' : 'indisponible ici, pense à exporter'}</div></div></div>
  <div class="grid2">
    <div class="card"><h3 class="mb">${ICON.save}Sauvegarde</h3>
      <button class="btn block" data-a="saveNow">${ICON.save} Sauvegarder maintenant</button>
      <button class="btn block mt" data-a="exportSave">Exporter ma carrière (fichier)</button>
      <button class="btn block mt" data-a="copySave">Copier la sauvegarde (texte)</button>
      <button class="btn block mt" data-a="importOpen">Importer une sauvegarde</button>
      <p class="small muted mt">L'export permet de continuer ta carrière sur un autre appareil.</p></div>
    <div class="card"><h3 class="mb">${ICON.sponsor}Jeu Roblox</h3>
      ${apiAvailable() ? `<p class="small muted mb">Continue ta carrière dans le jeu Roblox Tactico (en anglais, avec des noms modifiés pour les vrais joueurs), puis reviens ici quand tu veux.</p>
      <button class="btn pri block" data-a="rbxSend" ${S.mode === 'real' ? '' : 'disabled'}>${ICON.next} Envoyer ma carrière vers Roblox</button>
      <button class="btn block mt" data-a="rbxGetOpen">${ICON.back} Récupérer ma carrière Roblox</button>
      ${S.mode === 'real' ? '' : '<p class="small muted mt">Seules les carrières du monde réel peuvent aller sur Roblox.</p>'}` : `<p class="small muted">Le passage entre le site et le jeu Roblox se fait sur <a href="${SITE_URL}" target="_blank" rel="noopener">${SITE_URL.replace('https://', '')}</a>.</p>`}</div>
    <div class="card"><h3 class="mb">${ICON.cog}Partie</h3>
      <button class="btn block" data-a="toTitle">Retour à l'écran titre</button>
      <button class="btn danger block mt" data-a="deleteAsk">Supprimer la carrière</button>
      <h3 class="mt2 mb">Comment jouer</h3>
      <p class="small muted">Continuer fait avancer le temps jusqu'au prochain événement. Avant chaque match, règle ta tactique puis joue en direct ou en résultat rapide. Fais tourner l'effectif (fraîcheur), recrute au mercato, forme des jeunes et remplis les objectifs du président. Chaque victoire, trophée et objectif rapporte des points au classement mondial.</p></div>
  </div>`;
}

function rbxCodeModal(m) {
  return `${modalHead('Envoyer vers Roblox')}
    <div class="center mb"><div class="small muted">Ton code</div><div class="bigcode">${esc(m.code)}</div></div>
    <ol class="small steps"><li>Lance le jeu Roblox <b>Tactico</b>.</li><li>Sur l'écran titre, choisis <b>Import from website</b>.</li><li>Entre ce code : il est valable ${esc(m.minutes)} minutes, une seule fois.</li></ol>
    <p class="small muted mt">Ta carrière reste aussi sur ce navigateur. Dans le jeu, elle remplace ta carrière Roblox.</p>`;
}
function rbxGetModal() {
  return `${modalHead('Récupérer ma carrière Roblox')}
    <ol class="small steps"><li>Dans le jeu Roblox, ouvre <b>Options</b> puis <b>Send to website</b>.</li><li>Entre ici le code affiché (valable 30 minutes).</li></ol>
    <div class="field mt"><label for="rbxCode">Code du jeu Roblox</label><input class="input codein" id="rbxCode" maxlength="8" autocomplete="off" spellcheck="false" placeholder="ABC123"></div>
    ${G.S && G.S.mgr ? '<div class="note warn mb">Ta carrière actuelle sur ce navigateur sera remplacée. Exporte-la avant si tu veux la garder.</div>' : ''}
    <button class="btn pri block" data-a="rbxGetGo">${ICON.check} Récupérer</button>`;
}

function importModal() {
  return `${modalHead('Importer une sauvegarde')}${apiAvailable() ? `<button class="btn block mb" data-a="rbxGetOpen">${ICON.sponsor} Récupérer ma carrière du jeu Roblox (code)</button>` : ''}<div class="field"><label>Fichier de sauvegarde</label><input class="input" type="file" accept=".txt,.json,.tactico" data-ch="importFile"></div>
    <div class="field"><label>… ou colle le texte de la sauvegarde</label><textarea class="input" id="importText" rows="5" style="font-size:12px" placeholder="TACTICO1:…"></textarea></div>
    <button class="btn pri block" data-a="importGo">Importer</button>`;
}

function seasonModal(m) {
  const S = G.S;
  const r = m.report;
  const u = r.user;
  const d1 = r.leagues.filter((l) => l.level === 1);
  return `${modalHead(`Bilan de la saison ${r.s}-${(r.s + 1) % 100}`)}
    ${u ? `<div class="card flat mb"><div class="row"><span class="bigrank">${u.pos}<sup style="font-size:20px">e</sup></span><span class="grow"><b>${esc(u.club)}</b> · ${esc(u.league)}<br><span class="small muted">Objectif : ${esc(u.obj)}</span></span></div>
      <div class="note mt ${u.met ? '' : 'warn'}"><b>${esc(u.res)}</b>${u.promoted ? ' · Montée en première division ! 🎉' : ''}${u.relegated ? ' · Relégation…' : ''}</div>
      <p class="small muted mt">Confiance du président : ${u.conf}% · réputation : ${u.rep}/100</p>${u.sacked ? '<div class="note warn mt">Le président a décidé de te licencier.</div>' : ''}</div>` : ''}
    ${r.gold ? `<div class="note mb">${ICON.star} <b>Tactico d'Or :</b> ${esc(r.gold.n)} (${esc(S.clubs[r.gold.c]?.name || '')})</div>` : ''}
    <h3 class="mb">${ICON.trophy}Champions</h3><div class="list mb">${d1.map((l) => { const c = S.clubs[l.champ]; return `<div class="li">${crest(c, 'sm')}<span class="grow"><span class="nm">${esc(c.name)}</span><span class="meta">${esc(l.name)}${l.awards[0] ? ` · meilleur buteur ${esc(l.awards[0].n)} (${esc(l.awards[0].v)})` : ''}</span></span>${ICON.trophy}</div>`; }).join('')}
    ${r.conti ? `<div class="li">${crest(S.clubs[r.conti], 'sm')}<span class="grow"><span class="nm">${esc(S.clubs[r.conti].name)}</span><span class="meta">${esc(contiName(S))}</span></span>${ICON.trophy}</div>` : ''}</div>
    ${r.po && r.po.length ? `<h3 class="mb">${ICON.whistle}Barrages</h3><div class="list mb">${r.po.map((t) => `<div class="li"><span class="grow small">${esc(t)}</span></div>`).join('')}</div>` : ''}
    <button class="btn pri block" data-a="close">Commencer la saison ${r.s + 1}-${(r.s + 2) % 100}</button>`;
}

function worldBoardModal() {
  if (apiAvailable() && !ui.lbT && !ui.lbTLoading) {
    ui.lbTLoading = true;
    fetchBoard('', 'score').then((d) => { ui.lbT = d; ui.lbTLoading = false; if (ui.modals.some((x) => x.type === 'worldboard')) { closeModal(); openModal('worldboard'); } });
  }
  return `${modalHead('Classement mondial')}${boardBody(ui.lbT, G.S, true)}`;
}

function download(name, text) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    return true;
  } catch (e) { return false; }
}

register({
  screens: { finances: financesScreen, training: trainingScreen, club: clubScreen, career: careerScreen, world: worldScreen, options: optionsScreen },
  modals: { import: importModal, season: seasonModal, worldboard: worldBoardModal, rbxCode: rbxCodeModal, rbxGet: rbxGetModal },
  actions: {
    budgetShift: (d) => {
      const c = G.S.clubs[G.S.user];
      if (+d.v > 0) { c.tBudget -= 1e6; c.wBudget += Math.round(1e6 / 52); }
      else { c.tBudget += 1e6; c.wBudget -= Math.round(1e6 / 52); }
      render(); persist();
    },
    stadiumUp: () => { const c = G.S.clubs[G.S.user]; const cost = stadiumExpandCost(2000); addFin(c, 'out', 'Travaux', cost); c.stadium.cap += 2000; render(); persist(); toast('Le stade gagne 2 000 places !'); },
    facUp: (d) => { const c = G.S.clubs[G.S.user]; const cost = facUpgradeCost(c.fac[d.k]); addFin(c, 'out', 'Travaux', cost); c.fac[d.k]++; render(); persist(); toast(`${FAC_NAMES[d.k]} amélioré (niveau ${c.fac[d.k]}) !`); },
    trainFocus: (d) => { G.S.clubs[G.S.user].training.focus = d.k; render(); persist(); },
    trainInt: (d) => { G.S.clubs[G.S.user].training.int = +d.v; render(); persist(); },
    delegate: (d) => { const del = G.S.mgr.delegate; del[d.k] = !del[d.k]; render(); persist(); },
    applyJob: (d) => { if (applyForJob(G.S, d.id)) { toast('Candidature envoyée. Réponse dans quelques jours.'); render(); persist(); } },
    resignAsk: () => openModal('confirm', { title: 'Démissionner ?', body: 'Tu quitteras ton club et devras trouver un nouveau poste. Ta réputation baissera un peu.', yes: 'Démissionner', danger: true, act: 'resignGo' }),
    resignGo: () => { const S = G.S; sackUser(S, 'Vous avez présenté votre démission.'); S.mgr.career.sacked = Math.max(0, S.mgr.career.sacked - 1); S.mgr.rep = Math.min(100, S.mgr.rep + 4); ui.modals = []; persist(); go('career'); },
    lbRefresh: () => { ui.lb = null; ui.lbLoading = false; render(); },
    lbSort: (d) => { ui.f.lbSort = d.k; ui.lb = null; ui.lbLoading = false; render(); },
    saveNow: async () => { const ok = await saveGame(G.S); toast(ok ? 'Partie sauvegardée.' : 'Sauvegarde impossible ici : utilise l\'export.', !ok); },
    exportSave: async () => {
      const txt = await exportString(G.S);
      const name = `tactico-${G.S.mgr.name.replace(/[^\p{L}\p{N}_-]+/gu, '_')}-${G.S.season}.txt`;
      let dl = null;
      try { if (window.claude && window.claude.use) dl = await Promise.race([window.claude.use('downloads'), new Promise((r) => setTimeout(() => r(null), 2500))]); } catch (e) { dl = null; }
      if (dl) {
        try { await dl.save({ filename: name, data: new Blob([txt], { type: 'text/plain' }) }); toast('Sauvegarde exportée.'); } catch (e) { toast(e && e.code === 'declined' ? 'Export annulé.' : 'Export impossible ici : utilise « Copier la sauvegarde ».', true); }
        return;
      }
      if (!download(name, txt)) toast('Téléchargement bloqué : utilise « Copier la sauvegarde ».', true);
    },
    copySave: async () => {
      try { await navigator.clipboard.writeText(await exportString(G.S)); toast('Sauvegarde copiée dans le presse-papiers.'); } catch (e) { toast('Copie impossible ici.', true); }
    },
    importOpen: () => openModal('import'),
    rbxSend: async () => {
      const S = G.S;
      if (!S || !S.mgr) return;
      toast('Envoi de ta carrière…');
      try {
        await saveGame(S);
        const d = await lienAppel({ a: 'deposer', etat: await exportString(S) });
        openModal('rbxCode', { code: d.code, minutes: d.minutes });
      } catch (e) { toast(e.message, true); }
    },
    rbxGetOpen: () => openModal('rbxGet'),
    rbxGetGo: async () => {
      const code = (document.getElementById('rbxCode')?.value || '').trim();
      if (!code) { toast('Entre le code affiché dans le jeu Roblox.', true); return; }
      try {
        const d = await lienAppel({ a: 'recuperer', code });
        const S = await importString(d.etat);
        G.S = S; ui.modals = [];
        await saveGame(S);
        go(S.mgr ? 'home' : 'title');
        toast('Carrière Roblox récupérée !');
      } catch (e) { toast(e.message, true); }
    },
    importFile: async (d, el) => {
      const f = el.files?.[0]; if (!f) return;
      document.getElementById('importText').value = await f.text();
    },
    importGo: async () => {
      const txt = document.getElementById('importText')?.value || '';
      try {
        const S = await importString(txt);
        G.S = S; ui.modals = [];
        await saveGame(S);
        go(S.mgr ? 'home' : 'title');
        toast('Carrière importée !');
      } catch (e) { toast('Import impossible : ' + e.message, true); }
    },
    toTitle: () => { bootTitle(); },
    deleteAsk: () => openModal('confirm', { title: 'Supprimer la carrière ?', body: 'Ta sauvegarde sera effacée de cet appareil. Ton score reste au classement mondial.', yes: 'Supprimer', danger: true, act: 'deleteGo' }),
    deleteGo: async () => { await deleteSave(); G.S = null; ui.modals = []; bootTitle(); },
  },
});

void LEAGUE_COUNTRIES; void natName; void fmtDate; void addMsg;
