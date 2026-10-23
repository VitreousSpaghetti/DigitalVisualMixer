# Digital Visual Mixer — Vitreous

Web mixer live per performance visive basato su [Hydra-synth](https://hydra.ojack.xyz/).  
Autore: [Emiliano Brazzoli @vitreous_spaghetti](https://www.instagram.com/vitreous_spaghetti/)

---

## Stack

| Layer | Tecnologia |
|-------|-----------|
| Server | Node.js + Express.js (ESM, porta 8080) |
| Realtime | Socket.IO v4.7.2 |
| Editor | CodeMirror 6 (bundled con Rollup) |
| Visual engine | hydra-synth v1.3.22 (8 sorgenti, 8 output, 1920×1080) |
| UI | Bootstrap 5.0.2 |
| DB | db.json via VitreousDataBase |

## Avvio

```bash
git clone --recurse-submodules https://github.com/emilianobrazzoli/DigitalVisualMixer.git
npm install
npm run build   # bundle CodeMirror con Rollup
npm start       # avvia su localhost:8080
```

## Route

| URL | Descrizione |
|-----|-------------|
| `http://localhost:8080/` | Pannello mixer |
| `http://localhost:8080/live` | Output proiettore (fullscreen) |
| `http://localhost:8080/live?fit=cover` | Output senza bande nere |
| `http://localhost:8080/about` | Info + shortcut |

## Shortcut da tastiera

| Shortcut | Azione |
|----------|--------|
| `Ctrl + Enter` | Preview locale (non in live) |
| `Ctrl + ↑` | Salva il canale corrente |
| `Ctrl + ↓` | Salva e manda in live |
| `Ctrl + ←` | Canale live precedente |
| `Ctrl + →` | Canale live successivo |

## Architettura

```
Browser (Mixer :8080/)          Browser (/live)
  CodeMirror editor           Hydra canvas fullscreen
  Channel grid                    |
        |                         |
        └──── Socket.IO ──────────┘
                  |
            Node.js + Express :8080
            src/app.js
                  |
            src/manager.js
            src/resource/db.json (VitreousDataBase)
```

## Configurazione

Variabili d'ambiente (`.env`):

| Variabile | Default | Descrizione |
|-----------|---------|-------------|
| `PORT` | `8080` | Porta server |
| `MAX_CHANNELS` | `36` | Canali massimi (documentativo) |

## Struttura file principali

```
src/app.js                      — Server Express + Socket.IO handlers
src/manager.js                  — CRUD su db.json
src/resource/html/mixer.html    — Interfaccia mixer
src/resource/html/live.html     — Output live
src/resource/html/about.html    — Info
src/resource/css/basic.css      — Stili globali
src/resource/js/mixer/
  deckManager.js                — Entry point client
  mixerManager.js               — Stato canali, save/run/load
  mixerEmitter.js               — Bridge Socket.IO
  hydraManager.js               — Init Hydra, esecuzione codice, error handling
  toastManager.js               — Notifiche toast
  menuFunctionManager.js        — Menu funzioni Hydra
  codeMirrorManager.js          — CodeMirror 6
  macroManager.js               — Shortcut tastiera
```

## Risorse Hydra

- [Documentazione](https://hydra.ojack.xyz/docs/#/)
- [API Reference](https://hydra.ojack.xyz/api/)

![@vitreous_spaghetti](/src/resource/img/alpha.png?raw=true)
