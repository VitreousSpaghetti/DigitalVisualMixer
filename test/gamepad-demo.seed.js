// Seed demo gamepad (PERFORM RF6) — eseguire a server FERMO con: node test/gamepad-demo.seed.js
// Il server tiene il DB in memoria (eager) e lo riscriverebbe sopra le modifiche: per questo
// si scrive db.json direttamente invece di passare dai socket.
// Idempotente: rimuove e reinserisce le macro "gp_*" e il canale "DEMO GAMEPAD".
// Layout "standard" del Gamepad API (Xbox/PS su Chrome/Edge).
import { readFileSync, writeFileSync } from 'fs';

const DB_PATH = './src/resource/db.json';
const CHANNEL_NAME = 'DEMO GAMEPAD';
const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'));
const E = db.entities;
E.macro = (E.macro || []).filter(m => !m.name.startsWith('gp_'));
E.channel = (E.channel || []).filter(c => c.name !== CHANNEL_NAME);

const channelId = Math.max(-1, ...E.channel.map(c => c.id)) + 1;
E.channel.push({
    id: channelId,
    name: CHANNEL_NAME,
    sortOrder: Math.max(-1, ...E.channel.map(c => c.sortOrder ?? 0)) + 1,
    thumbnail: null,
    // Ogni {{gp_*}} è un argomento diretto → letto a ogni frame (RF1)
    code: `// DEMO GAMEPAD — mappe in test/gamepad-demo.seed.js
osc({{gp_freq}}, 0.1, 1.2)
  .kaleid({{gp_kal}})
  .repeat({{gp_rep}}, {{gp_rep}})
  .modulate(noise(3), {{gp_mod}})
  .scroll({{gp_x}}, {{gp_y}})
  .colorama({{gp_col}})
  .invert({{gp_inv}})
  .brightness({{gp_flash}})
  .out()`
});

const axis = i => ({ type: 'axis', pad: 0, i });
const btn = i => ({ type: 'button', pad: 0, i });
const vars = [
    // [key, sorgente, params]
    ['gp_x',     axis(0), { mode: 'abs', min: -0.5, max: 0.5, value: 0 }],                      // levetta SX ↔
    ['gp_y',     axis(1), { mode: 'abs', min: -0.5, max: 0.5, value: 0, invert: true }],        // levetta SX ↕
    ['gp_freq',  axis(2), { mode: 'inc', min: 2, max: 60, value: 10, step: 0.3 }],              // levetta DX ↔ (incremento)
    ['gp_kal',   axis(3), { mode: 'inc', min: 1, max: 12, value: 4, step: 0.05, invert: true }],// levetta DX ↕ (incremento)
    ['gp_mod',   btn(7),  { mode: 'abs', min: 0, max: 1, value: 0 }],                           // RT analogico
    ['gp_flash', btn(6),  { mode: 'impulse', min: 0, max: 0.6, value: 0, decay: 400, curve: 'exp' }], // LT impulso
    ['gp_inv',   btn(0),  { mode: 'gate', min: 0, max: 1, value: 0 }],                          // A tenuto
    ['gp_col',   btn(1),  { mode: 'toggle', min: 0, max: 0.5, value: 0 }],                      // B on/off
    ['gp_rep',   btn(3),  { mode: 'inc', min: 1, max: 6, value: 1, step: 1, srcDec: btn(2) }],  // Y +, X −
];
let id = Math.max(-1, ...E.macro.map(m => m.id)) + 1;
vars.forEach(([key, src, p], n) => E.macro.push({
    id: id++, name: key, type: 'variable',
    params: JSON.stringify({ key, ...p }), trigger: JSON.stringify(src), sortOrder: 100 + n
}));

const actions = [
    ['gp_go_demo', btn(9),  [{ type: 'setChannel', channelId }]], // Start → canale demo
    ['gp_prev',    btn(14), [{ type: 'prevRunLive' }]],           // D-pad ←  (→ è la macro "next" esistente)
    ['gp_run',     btn(5),  [{ type: 'run' }]],                   // RB → manda il canale in live
];
actions.forEach(([name, src, list], n) => E.macro.push({
    id: id++, name, type: 'action',
    params: JSON.stringify({ actions: list }), trigger: JSON.stringify(src), sortOrder: 200 + n
}));

writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
console.log(`ok: canale "${CHANNEL_NAME}" id=${channelId}, ${vars.length + actions.length} mappature gp_*`);
