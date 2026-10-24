/** LAUNCHER DELL'EXE (Windows) E DEI BINARI macOS / Linux
 *
 * Unico posto dei comportamenti solo-binario: cartella dati e apertura del browser.
 * Il server è src/app.js così com'è (nessuna copia): `npm start` resta identico.
 */
import { exec } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { portsFromConf, CONF_DEFAULT } from './conf.js';

// Nell'exe process.execPath è l'exe; nella cartella portatile (ripiego) è node.exe, accanto al launcher.
// In entrambi i casi i dati stanno in data/ di fianco: sopravvivono alla sostituzione dell'exe.
// Linux: idem (data/ accanto al binario, scelta utente in LINUX_BUILD: niente ~/.local/share).
const base = process.pkg ? path.dirname(process.execPath) : path.dirname(fileURLToPath(import.meta.url));
// macOS: non accanto al binario. Un file scaricato con quarantena può essere eseguito da una copia
// temporanea in sola lettura (App Translocation): data/ lì si perderebbe o non sarebbe scrivibile.
const defaultData = process.pkg && process.platform === 'darwin'
    ? path.join(os.homedir(), 'Library', 'Application Support', 'DigitalVisualMixer')
    : path.join(base, 'data');
// Impostata prima dell'import: manager.js legge DATA_DIR al caricamento. DB vuoto → default (niente seed).
process.env.DATA_DIR = process.env.DATA_DIR || defaultData;

// CONF_PORTS: le porte dei binari in un file modificabile a mano, accanto ai dati (chi usa il doppio
// clic non sa impostare variabili d'ambiente). Creato con i default solo se manca: mai riscritto (E2).
const confPath = path.join(process.env.DATA_DIR, 'conf.properties');
let conf = '';
try {
    fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
    if (!fs.existsSync(confPath)) fs.writeFileSync(confPath, CONF_DEFAULT);
    conf = fs.readFileSync(confPath, 'utf8');
} catch (e) {
    // E1: cartella non scrivibile → default; l'errore chiaro arriva da manager.js (catch più sotto)
}
const ports = portsFromConf(conf, console.warn);
// RF3: env > file > default. Scritte in env perché app.js legge già PORT / HTTPS_PORT: nessuna modifica lì.
process.env.PORT = process.env.PORT || String(ports.port);
process.env.HTTPS_PORT = process.env.HTTPS_PORT || String(ports.httpsPort);
const port = Number(process.env.PORT);

// Porta occupata (es. `npm start` già attivo): app.js andrebbe in crash con uno stack e la console
// dell'exe si chiuderebbe subito. Meglio un messaggio chiaro e la finestra aperta.
// Risolve null se libera, altrimenti il codice d'errore (EADDRINUSE, EACCES per porta < 1024 senza root).
function portFree(p) {
    return new Promise((ok) => {
        const s = net.createServer().once('error', (e) => ok(e.code)).once('listening', () => s.close(() => ok(null)));
        s.listen(p);
    });
}

// Riprova la connessione ogni 200 ms finché app.js non accetta connessioni sulla porta
function waitListening(p) {
    return new Promise((ok) => {
        const tryOnce = () => net.connect(p, 'localhost').once('connect', function () { this.end(); ok(); })
            .once('error', () => setTimeout(tryOnce, 200));
        tryOnce();
    });
}

const portError = await portFree(port);
if (portError) {
    // E3: su Linux/macOS le porte < 1024 richiedono root; altrimenti è occupata (RF5: dove cambiarla)
    if (portError === 'EACCES') console.error('Port ' + port + ' needs administrator rights: use a port of 1024 or more.');
    else console.error('Port ' + port + ' is already in use (another Digital Visual Mixer or `npm start`?).');
    console.error('Close the other app, or change port= in ' + confPath + ' and restart.');
    console.error('Press Ctrl+C to close this window.');
    setInterval(() => {}, 1 << 30);
} else {
    console.log('Data folder: ' + process.env.DATA_DIR);
    console.log('Ports: edit ' + confPath);
    try {
        await import('../src/app.js');
        // Browser aperto solo quando il server risponde davvero (fine avvio), non appena importato:
        // su un PC lento il primo caricamento darebbe "pagina non raggiungibile".
        // NO_BROWSER: per i test automatici della build.
        const url = 'http://localhost:' + port + '/';
        if (process.platform === 'win32' && !process.env.NO_BROWSER) {
            await waitListening(port);
            exec('start "" "' + url + '"');
        } else if (process.platform === 'darwin' && !process.env.NO_BROWSER) {
            await waitListening(port);
            // Chrome se c'è: Safari (spesso il predefinito) non ha Web MIDI. Se manca, `open -a` esce
            // con errore → browser predefinito e avviso, così le mappature MIDI mute hanno una spiegazione.
            exec('open -a "Google Chrome" "' + url + '"', (err) => {
                if (!err) return;
                exec('open "' + url + '"');
                console.log('MIDI requires Chrome or Edge: open ' + url + ' there to use MIDI controllers.');
            });
        } else if (process.platform === 'linux' && !process.env.NO_BROWSER) {
            await waitListening(port);
            // Firefox (spesso il predefinito su Linux) non ha Web MIDI: avviso sempre, il browser
            // predefinito non si conosce senza dipendere dal desktop environment.
            console.log('MIDI requires Chrome or Chromium: open ' + url + ' there to use MIDI controllers.');
            // Senza desktop (server, container) xdg-open manca o fallisce: l'app resta su, URL a mano
            exec('xdg-open "' + url + '"', (err) => {
                if (err) console.log('Could not open a browser: open ' + url + ' by hand.');
            });
        }
    } catch (e) {
        // Senza questo la console dell'exe si chiude e l'errore non si legge
        console.error(e);
        // Binario in una cartella non scrivibile (/opt, /usr/local/bin, supporto in sola lettura):
        // mkdirSync di manager.js fallisce e lo stack da solo non dice cosa fare.
        if (['EACCES', 'EPERM', 'EROFS'].includes(e.code)) {
            console.error('Cannot write the data folder ' + process.env.DATA_DIR + '.');
            console.error('Move the app to a folder you own, or start it with DATA_DIR=/path/to/folder.');
        }
        console.error('Startup failed. Press Ctrl+C to close this window.');
        setInterval(() => {}, 1 << 30);
    }
}
