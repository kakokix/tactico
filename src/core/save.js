// Sauvegarde locale (IndexedDB, sinon localStorage, sinon mémoire).
import { rebuildIndexes } from './competitions.js';
import { applyWorld } from './constants.js';

const DB = 'tactico', STORE = 'saves', KEY = 'career';
let memory = null;
export let storageMode = 'unknown';

function idb() {
  return new Promise((resolve, reject) => {
    try {
      if (!globalThis.indexedDB) return reject(new Error('no idb'));
      const req = indexedDB.open(DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
}
async function idbPut(val) {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbGet() {
  const db = await idb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(KEY);
    r.onsuccess = () => resolve(r.result || null);
    r.onerror = () => reject(r.error);
  });
}
async function idbDel() {
  const db = await idb();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
  });
}

// Les décimales au-delà du millième ne servent à rien et alourdissent la sauvegarde
const round3 = (k, v) => (typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1000) / 1000 : v);
export function serialize(state) {
  const { byDay, ...rest } = state;
  return JSON.stringify(rest, round3);
}
export function deserialize(json) {
  const s = JSON.parse(json);
  if (!s || !s.clubs || !s.players) throw new Error('Sauvegarde invalide');
  rebuildIndexes(s);
  s.flags = s.flags || {};
  applyWorld(s);
  return s;
}

export function metaOf(state) {
  const club = state.user ? state.clubs[state.user] : null;
  return { mgr: state.mgr?.name, club: club?.name, cid: state.user, season: state.season, day: state.day, at: Date.now() };
}

export async function saveGame(state) {
  const data = serialize(state);
  const rec = { meta: metaOf(state), data };
  try { await idbPut(rec); storageMode = 'idb'; return true; } catch (e) { /* suite */ }
  try { localStorage.setItem('tactico_save', data); localStorage.setItem('tactico_meta', JSON.stringify(rec.meta)); storageMode = 'ls'; return true; } catch (e) { /* suite */ }
  memory = rec; storageMode = 'memory';
  return false;
}

export async function loadMeta() {
  try { const r = await idbGet(); if (r) { storageMode = 'idb'; return r.meta; } } catch (e) { /* suite */ }
  try { const m = localStorage.getItem('tactico_meta'); if (m) { storageMode = 'ls'; return JSON.parse(m); } } catch (e) { /* suite */ }
  return memory ? memory.meta : null;
}

export async function loadGame() {
  try { const r = await idbGet(); if (r) return deserialize(r.data); } catch (e) { if (e.message === 'Sauvegarde invalide') throw e; }
  try { const d = localStorage.getItem('tactico_save'); if (d) return deserialize(d); } catch (e) { /* suite */ }
  return memory ? deserialize(memory.data) : null;
}

export async function deleteSave() {
  try { await idbDel(); } catch (e) { /* rien */ }
  try { localStorage.removeItem('tactico_save'); localStorage.removeItem('tactico_meta'); } catch (e) { /* rien */ }
  memory = null;
}

// Export compressé (gzip + base64) si possible
export async function exportString(state) {
  const json = serialize(state);
  if (globalThis.CompressionStream) {
    const cs = new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'));
    const buf = new Uint8Array(await new Response(cs).arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    return 'TACTICO1:' + btoa(bin);
  }
  return json;
}
export async function importString(text) {
  text = text.trim();
  if (text.startsWith('TACTICO1:')) {
    const bin = atob(text.slice(9));
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const ds = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return deserialize(await new Response(ds).text());
  }
  return deserialize(text);
}
