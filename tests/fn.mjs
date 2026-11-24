// Test de la fonction classement avec un serveur Blobs local.
import { BlobsServer } from '@netlify/blobs/server';
import { setEnvironmentContext, getStore } from '@netlify/blobs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import fn from '../netlify/functions/leaderboard/leaderboard.mjs';

const dir = mkdtempSync(join(tmpdir(), 'blobs-'));
const server = new BlobsServer({ directory: dir, token: 'tok', port: 0 });
const { port } = await server.start();
setEnvironmentContext({ siteID: 'site', token: 'tok', edgeURL: `http://localhost:${port}`, uncachedEdgeURL: `http://localhost:${port}`, primaryRegion: 'us-east-2' });

const base = 'http://x/api/leaderboard';
const post = (b) => fn(new Request(base, { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json' } }));
const get = (q = '') => fn(new Request(base + q));
const hex = (n) => [...Array(n)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
const entry = (o = {}) => ({ id: hex(16), secret: hex(32), name: 'Kakokix', nat: 'FR', club: 'FC Test', cc: ['#ff0000', '#ffffff'], rep: 40, seasons: 1, season: 2027, w: 20, d: 8, l: 10, titles1: 0, titles2: 0, cups: 1, conti: 0, promos: 0, objMet: 1, objEx: 0, v: 1, ...o });

let r = await get();
console.log('GET empty', r.status, await r.json());
const a = entry();
r = await post(a); console.log('POST a', r.status, await r.json());
const b = entry({ name: 'Zizou_99', w: 40, seasons: 2, season: 2028, titles1: 1, objMet: 2, objEx: 1 });
r = await post(b); console.log('POST b', r.status, await r.json());
r = await post({ ...a, secret: hex(32) }); console.log('POST a mauvais secret', r.status, await r.json());
r = await post(entry({ name: 'gros connard' })); console.log('POST insulte', r.status, await r.json());
r = await post(entry({ name: '<script>' })); console.log('POST html', r.status, await r.json());
r = await post(entry({ w: 999 })); console.log('POST triche', r.status, await r.json());
r = await post(entry({ titles1: 5 })); console.log('POST triche titres', r.status, await r.json());
r = await post({ ...a, w: 25 }); console.log('POST a maj', r.status, await r.json());
r = await get('?id=' + a.id); const j = await r.json(); console.log('GET', r.status, j.total, j.me, j.top.map((x) => `${x.rank}. ${x.name} ${x.score}`));
r = await get('?sort=trophies'); console.log('GET trophies', (await r.json()).top.map((x) => `${x.name} ${x.trophies}`));
// charge : 60 managers
await Promise.all([...Array(60)].map((_, i) => post(entry({ name: 'Bot ' + i, w: i }))));
r = await get(); const k = await r.json(); console.log('after 60', k.total, k.top.slice(0, 3).map((x) => x.name + ' ' + x.score));
const st = getStore({ name: 'leaderboard', consistency: 'strong' });
const c = await st.get('cache/v1', { type: 'json' });
console.log('cache size', c.list.length);
await server.stop();
