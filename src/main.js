// Point d'entrée de Tactico.
import { bindEvents, toast, G, ui, render, openModal, go } from './ui/app.js';
import { continueGame, createSim, finishUserMatch } from './core/game.js';
import './ui/scr_main.js';
import './ui/scr_team.js';
import './ui/scr_comps.js';
import './ui/scr_market.js';
import './ui/scr_misc.js';
import './ui/scr_match.js';
import { bootTitle } from './ui/scr_main.js';

window.addEventListener('error', (e) => { try { toast('Erreur : ' + (e.message || 'inconnue'), true); } catch (x) { /* rien */ } });
window.addEventListener('unhandledrejection', (e) => { try { console.error(e.reason); } catch (x) { /* rien */ } });
bindEvents();
bootTitle();
window.__T = { G, ui, render, continueGame, createSim, finishUserMatch, openModal, go };
