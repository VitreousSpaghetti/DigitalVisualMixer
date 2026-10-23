/** LAUNCHER DELL'EXE (task 2026-08-11-standalone-exe-packaging, mandato 3/3)
 *
 * Unico posto dei comportamenti solo-exe: cartella dati accanto all'exe e apertura del browser.
 * Il server è src/app.js così com'è (nessuna copia): `npm start` resta identico.
 */
import { exec } from 'child_process';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

// Nell'exe process.execPath è l'exe; nella cartella portatile (ripiego) è node.exe, accanto al launcher.
// In entrambi i casi i dati stanno in data/ di fianco: sopravvivono alla sostituzione dell'exe.
const base = process.pkg ? path.dirname(process.execPath) : path.dirname(fileURLToPath(import.meta.url));
// Impostata prima dell'import: manager.js legge DATA_DIR al caricamento. DB vuoto → default (niente seed).
process.env.DATA_DIR = process.env.DATA_DIR || path.join(base, 'data');
const port = Number(process.env.PORT || 8080);

// Porta occupata (es. `npm start` già attivo): app.js andrebbe in crash con uno stack e la console
// dell'exe si chiuderebbe subito. Meglio un messaggio chiaro e la finestra aperta.
function portFree(p) {
    return new Promise((ok) => {
        const s = net.createServer().once('error', () => ok(false)).once('listening', () => s.close(() => ok(true)));
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

if (!(await portFree(port))) {
    console.error('Port ' + port + ' is already in use (another Digital Visual Mixer or `npm start`?).');
    console.error('Close it, or start with a different PORT. Press Ctrl+C to close this window.');
    setInterval(() => {}, 1 << 30);
} else {
    console.log('Data folder: ' + process.env.DATA_DIR);
    try {
        await import('../src/app.js');
        // Browser aperto solo quando il server risponde davvero (fine avvio), non appena importato:
        // su un PC lento il primo caricamento darebbe "pagina non raggiungibile".
        // NO_BROWSER: per i test automatici della build.
        if (process.platform === 'win32' && !process.env.NO_BROWSER) {
            await waitListening(port);
            exec('start "" "http://localhost:' + port + '/"');
        }
    } catch (e) {
        // Senza questo la console dell'exe si chiude e l'errore non si legge
        console.error(e);
        console.error('Startup failed. Press Ctrl+C to close this window.');
        setInterval(() => {}, 1 << 30);
    }
}
