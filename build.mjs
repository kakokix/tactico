// Construit dist/index.html (un seul fichier autonome).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';

const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none', loader: { '.png': 'dataurl' } });
let js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

// Planches d'icônes et de drapeaux (pack Tactico Outline, construites par outils/assets.py)
const A = JSON.parse(readFileSync('src/assets/assets.json', 'utf8'));
const png = (f) => 'data:image/png;base64,' + readFileSync(f).toString('base64');
const pos = (i, g) => { const c = i % g.cols, l = Math.floor(i / g.cols); return `${+(c / (g.cols - 1) * 100).toFixed(3)}% ${+(l / (g.rows - 1) * 100).toFixed(3)}%`; };
let sprites = `.ic{display:inline-block;flex:none;width:1.3em;height:1.3em;vertical-align:-.3em;background:url(${png('src/assets/icones.png')}) no-repeat;background-size:${A.icones.cols * 100}% ${A.icones.rows * 100}%}`;
for (const [k, i] of Object.entries(A.icones.i)) sprites += `.ic-${k}{background-position:${pos(i, A.icones)}}`;
sprites += `.fl{display:inline-block;flex:none;width:1.375em;height:1em;vertical-align:-.16em;background:url(${png('src/assets/drapeaux.png')}) no-repeat;background-size:${A.drapeaux.cols * 100}% ${A.drapeaux.rows * 100}%}`;
for (const [k, i] of Object.entries(A.drapeaux.i)) sprites += `.fl-${k}{background-position:${pos(i, A.drapeaux)}}`;
for (const [k, v] of Object.entries(A.alias)) sprites += `.fl-${k}{background-position:${pos(A.drapeaux.i[v], A.drapeaux)}}`;
const css = sprites + '\n' + readFileSync('src/ui/styles.css', 'utf8');
const tpl = readFileSync('src/index.html', 'utf8');
const html = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' Ko');

// Monde pour le jeu Roblox (lu par ses serveurs au démarrage)
const { construireMonde, exporterMonde } = await import('./roblox/outils/monde.mjs');
const monde = JSON.stringify(exporterMonde(construireMonde()));
mkdirSync('dist/roblox', { recursive: true });
writeFileSync('dist/roblox/monde.json', monde);
// Atlas d'icônes et de drapeaux pour Roblox (importés une fois dans Studio)
copyFileSync('src/assets/roblox-icones.png', 'dist/roblox/icones.png');
copyFileSync('src/assets/roblox-drapeaux.png', 'dist/roblox/drapeaux.png');
writeFileSync('dist/roblox/assets.json', JSON.stringify({ alias: A.alias, icones: A.robloxIcones, drapeaux: A.robloxDrapeaux }));
console.log('dist/roblox/monde.json', (monde.length / 1024).toFixed(0) + ' Ko');
