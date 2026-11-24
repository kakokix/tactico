// Coquille de l'application : écrans, actions, modales, sauvegarde, avancée du temps.
import { ICON, esc, crest, money } from './util.js';
import { fmtDate } from '../core/dates.js';
import { continueGame, userMatchToday } from '../core/game.js';
import { saveGame, storageMode } from '../core/save.js';
import { unreadCount } from '../core/messages.js';
import { submitScore } from './lb.js';

export const G = { S: null };
export const ui = { screen: 'title', p: {}, modals: [], busy: false, live: null, f: {} };
const SCREENS = {}, ACTIONS = {}, MODALS = {}, AFTER = {};

export function register({ screens = {}, actions = {}, modals = {}, after = {} }) {
  Object.assign(SCREENS, screens); Object.assign(ACTIONS, actions); Object.assign(MODALS, modals); Object.assign(AFTER, after);
}

const NAV = [
  ['home', 'Accueil', 'home'], ['inbox', 'Messagerie', 'inbox'], ['squad', 'Effectif', 'squad'], ['tactics', 'Tactique', 'tactics'],
  ['fixtures', 'Calendrier', 'cal'], ['comps', 'Compétitions', 'table'], ['transfers', 'Mercato', 'transfer'], ['training', 'Entraînement', 'train'],
  ['finances', 'Finances', 'money'], ['club', 'Club', 'club'], ['career', 'Carrière', 'career'], ['world', 'Classement mondial', 'world'], ['options', 'Options', 'cog'],
];
const BNAV = [['home', 'Accueil', 'home'], ['squad', 'Effectif', 'squad'], ['tactics', 'Tactique', 'tactics'], ['transfers', 'Mercato', 'transfer'], ['more', 'Menu', 'more']];

export function go(screen, p = {}) {
  ui.screen = screen;
  ui.p = p;
  render();
  window.scrollTo(0, 0);
}

function topbar() {
  const S = G.S;
  const club = S.user ? S.clubs[S.user] : null;
  const um = userMatchToday(S);
  const btn = um
    ? `<button class="go match" data-a="continue">${ICON.ball} Jour de match</button>`
    : `<button class="go" data-a="continue" ${ui.busy ? 'disabled' : ''}>Continuer ${ICON.next}</button>`;
  return `<header class="top">
    <button class="club" data-a="nav" data-s="${club ? 'club' : 'career'}">${club ? crest(club) : ICON.career}
      <span><b>${esc(club ? club.name : 'Sans club')}</b><small>${fmtDate(S.day, 'wdm')} ${S.day > 0 ? '· ' + new Date(S.day * 864e5).getUTCFullYear() : ''}${club ? ' · ' + money(club.balance) : ''}</small></span>
    </button>${btn}</header>`;
}

function sidebar() {
  const S = G.S;
  const n = unreadCount(S);
  return `<nav class="side">${NAV.map(([id, label, ic], i) => `${i === 4 || i === 10 ? '<div class="sep"></div>' : ''}<button class="${ui.screen === id ? 'on' : ''}" data-a="nav" data-s="${id}">${ICON[ic]}<span>${label}</span>${id === 'inbox' && n ? `<span class="dot">${n}</span>` : ''}</button>`).join('')}</nav>`;
}

function bottomnav() {
  const S = G.S;
  const n = unreadCount(S);
  const inMore = !BNAV.some(([id]) => id === ui.screen);
  return `<nav class="bnav">${BNAV.map(([id, label, ic]) => `<button class="${ui.screen === id || (id === 'more' && inMore) ? 'on' : ''}" data-a="nav" data-s="${id}">${ICON[ic]}<span>${label}</span>${id === 'more' && n ? `<span class="dot">${n}</span>` : ''}</button>`).join('')}</nav>`;
}

export function moreScreen() {
  const S = G.S;
  const n = unreadCount(S);
  const items = NAV.filter(([id]) => !['home', 'squad', 'tactics', 'transfers'].includes(id));
  return `<div class="ph"><h1>Menu</h1></div><div class="list">${items.map(([id, label, ic]) => `<button class="li" data-a="nav" data-s="${id}"><span style="width:22px;color:var(--lime)">${ICON[ic]}</span><span class="grow nm">${label}</span>${id === 'inbox' && n ? `<span class="chip red">${n}</span>` : ''}</button>`).join('')}</div>`;
}

export function render() {
  const root = document.getElementById('app');
  const S = G.S;
  if (!S || !S.mgr || ui.screen === 'title') {
    root.innerHTML = SCREENS.title ? SCREENS.title() : '';
  } else if (ui.screen === 'live') {
    root.innerHTML = SCREENS.live();
  } else {
    const fn = ui.screen === 'more' ? moreScreen : SCREENS[ui.screen] || SCREENS.home;
    let body;
    try { body = fn(); } catch (e) { console.error(e); body = `<div class="card warn">Erreur d'affichage : ${esc(e.message)}</div>`; }
    root.innerHTML = `${topbar()}<div class="layout">${sidebar()}<main class="main">${body}<p class="footer-note">Tactico · jeu de manager de football · clubs et joueurs fictifs</p></main></div>${bottomnav()}`;
  }
  renderModals();
  AFTER[ui.screen]?.();
}

export function renderModals() {
  const el = document.getElementById('modals');
  if (!ui.modals.length) { el.innerHTML = ''; return; }
  const m = ui.modals[ui.modals.length - 1];
  let html;
  try { html = MODALS[m.type](m); } catch (e) { console.error(e); html = `<p>Erreur : ${esc(e.message)}</p>`; }
  el.innerHTML = `<div class="modal" data-a="modalBg"><div class="sheet" role="dialog" aria-modal="true">${html}</div></div>`;
  AFTER['modal_' + m.type]?.(m);
}

export function openModal(type, params = {}) { ui.modals.push({ type, ...params }); renderModals(); }
export function closeModal() { ui.modals.pop(); renderModals(); }
export function replaceModal(type, params = {}) { ui.modals.pop(); openModal(type, params); }
export const modalHead = (title, sub = '') => `<div class="x"><div><h2>${title}</h2>${sub ? `<div class="muted small">${sub}</div>` : ''}</div><button class="icon-btn" data-a="close" aria-label="Fermer">${ICON.x}</button></div>`;

export function toast(msg, err = false) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

function busy(on) {
  let el = document.getElementById('busy');
  if (on && !el) { el = document.createElement('div'); el.id = 'busy'; el.className = 'busy'; el.innerHTML = '<div class="spin"></div>'; document.body.appendChild(el); }
  if (!on && el) el.remove();
}

let saveTimer = null;
export async function persist(now = false) {
  clearTimeout(saveTimer);
  const run = async () => {
    const ok = await saveGame(G.S);
    if (!ok && !ui.warnedSave) { ui.warnedSave = true; toast('Sauvegarde automatique indisponible ici : exporte ta partie dans Options.', true); }
  };
  if (now) return run();
  saveTimer = setTimeout(run, 400);
}

const raf = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

export async function doContinue() {
  const S = G.S;
  if (ui.busy) return;
  const um = userMatchToday(S);
  if (um) { go('match', { id: um.id }); return; }
  ui.busy = true;
  busy(true);
  await raf();
  let r;
  try { r = continueGame(S); } catch (e) { console.error(e); toast('Erreur : ' + e.message, true); }
  ui.busy = false;
  busy(false);
  persist();
  if (!r) { render(); return; }
  if (r.stop === 'match' || r.stop === 'matchday') go('match', { id: r.match.id });
  else if (r.stop === 'season') { render(); openModal('season', { report: r.report }); }
  else if (r.stop === 'inbox') {
    const msg = S.inbox.find((m) => !m.read && m.prio >= 2) || S.inbox.find((m) => !m.read);
    render();
    if (msg) openModal('msg', { id: msg.id });
  } else render();
  submitScore(S);
}

ACTIONS.nav = (d) => go(d.s, d.p ? JSON.parse(d.p) : {});
ACTIONS.close = () => closeModal();
ACTIONS.modalBg = (d, el, e) => { if (e.target === el) closeModal(); };
ACTIONS.continue = () => doContinue();
ACTIONS.modal = (d) => openModal(d.m, d.p ? JSON.parse(d.p) : {});

export function bindEvents() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-a]');
    if (!el) return;
    const fn = ACTIONS[el.dataset.a];
    if (!fn) return;
    if (el.dataset.a !== 'modalBg') e.preventDefault();
    try { fn(el.dataset, el, e); } catch (err) { console.error(err); toast('Erreur : ' + err.message, true); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target.closest('[data-ch]');
    if (el) try { ACTIONS[el.dataset.ch]?.(el.dataset, el, e); } catch (err) { console.error(err); toast('Erreur : ' + err.message, true); }
  });
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-in]');
    if (el) try { ACTIONS[el.dataset.in]?.(el.dataset, el, e); } catch (err) { console.error(err); }
  });
  document.addEventListener('submit', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.modals.length) closeModal();
  });
}

export { storageMode };
