# Build exe Windows standalone

Cartella dedicata all'exe (task `.ai/task/2026-08-11-standalone-exe-packaging.md`).
Il server è `../src` così com'è: qui ci sono solo launcher e config del packager.

## Build

Prerequisiti (solo sulla macchina di build): Node 22+, `npm install` già fatto nella root
e `npm run build` (rollup) se `rollupBundle/` non è aggiornato.

```
npm run package:win          # dalla root, equivale a:
cd packaging && npm install && npm run build
```

Output: `packaging/dist/DigitalVisualMixer.exe` (~100 MB, contiene Node 22).
Il primo build scarica il binario Node in `%USERPROFILE%\.pkg-cache`.

## Come funziona

- `launcher.js` (entry dell'exe): imposta `DATA_DIR` = `data\` accanto all'exe, controlla che la
  porta sia libera, importa `../src/app.js`, apre il browser su `http://localhost:8080/`.
- `@yao-pkg/pkg` in modalità **SEA** (`"sea": true`): necessaria perché `src/manager.js` usa
  top-level await insieme a `export`, che la modalità standard di pkg (e un bundle esbuild CJS)
  non sanno trasformare. Per lo stesso motivo esbuild non è usato.
- `pkg.assets` elenca i file letti con `fs`/`sendFile` (html/css/js/img, `rollupBundle/`,
  file serviti da `node_modules`, client Socket.IO, `../package.json` per `"type": "module"`).
  `src/resource/db.json` e `https-cert.json` di sviluppo **non** sono inclusi.
  Nuovo asset servito da `app.js` fuori da queste cartelle → aggiungerlo qui.
- Gli avvisi `Cannot find module ...` durante la build riguardano JS del browser
  (hydra-synth, addon CodeMirror) analizzati come se fossero di Node: innocui.

## Uso dell'exe

- Doppio clic: si apre una console con gli URL (mixer + live di rete) e il browser sul mixer.
  Chiudere la console ferma il server.
- Dati in `data\` accanto all'exe (`db.json`, `https-cert.json`): al primo avvio DB vuoto di default.
  Per portare canali/mappature: Export DB da `npm start`, Import DB nell'exe.
  Aggiornare l'exe = sostituire solo il file `.exe`, `data\` resta.
- Variabili d'ambiente: `PORT` (8080), `HTTPS_PORT` (8443), `DATA_DIR`, `NO_BROWSER=1`.
- Porta occupata (es. `npm start` già attivo): messaggio in console, l'exe non parte.
- **SmartScreen**: l'exe non è firmato → "Windows ha protetto il PC": *Ulteriori informazioni →
  Esegui comunque* (una volta).
- **Firewall**: al primo avvio consentire `DigitalVisualMixer.exe` sulle **reti private**,
  altrimenti la live da un altro PC non si collega.
