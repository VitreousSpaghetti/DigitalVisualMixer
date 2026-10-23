// Self-check di processMacroVars (PERFORM RF1) — eseguire con: node test/macroLive.check.js
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('../src/resource/js/macroLive.js');
window.M.freq = 10; window.M.k = 4; window.M.x = 0.5;

const p = (code) => window.processMacroVars(code);

// Argomento diretto → funzione live, nessun warning
assert.equal(p('osc({{freq}}, 0.1).kaleid({{k}}).out()').code, 'osc(()=>M.freq, 0.1).kaleid(()=>M.k).out()');
assert.deepEqual(p('osc( {{freq}} )').warnings, []);
// Dentro un calcolo / array / assegnazione → riferimento a M + warning
let r = p('osc({{freq}}*2)');
assert.equal(r.code, 'osc(M.freq*2)');
assert.deepEqual(r.warnings, ['freq']);
assert.equal(p('osc([{{freq}}, 2])').code, 'osc([M.freq, 2])');
assert.equal(p('b = {{x}};').code, 'b = M.x;');
// Già dentro una funzione: diventa live da solo
assert.equal(p('osc(()=>{{freq}}*2)').code, 'osc(()=>M.freq*2)');
// Variabile non definita → placeholder invariato + missing
r = p('osc({{nope}})');
assert.equal(r.code, 'osc({{nope}})');
assert.deepEqual(r.missing, ['nope']);
// Il codice prodotto valuta davvero il valore corrente a ogni chiamata
const fn = new Function('M', 'return ' + p('[{{freq}}]').code.replace(/^\[|\]$/g, '') )(window.M);
assert.equal(fn, 10);
const live = new Function('M', 'return (' + p('f({{freq}})').code.slice(2, -1) + ')')(window.M);
window.M.freq = 42;
assert.equal(live(), 42);

console.log('macroLive.check: ok');
