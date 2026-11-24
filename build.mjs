// Construit dist/index.html (un seul fichier autonome).
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const r = await build({ entryPoints: ['src/main.js'], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none' });
let js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/ui/styles.css', 'utf8');
const tpl = readFileSync('src/index.html', 'utf8');
const html = tpl.replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
mkdirSync('dist', { recursive: true });
writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' Ko');
