/** CONF_PORTS: porte da conf.properties (solo binari, letto dal launcher) */
import dotenv from 'dotenv';

export const CONF_DEFAULT = '# Digital Visual Mixer - restart the app after editing this file\nport=8080\nhttps.port=8443\n';
const DEFAULTS = { port: 8080, 'https.port': 8443 };

/**
 * @param {string} text - contenuto del file (chiave=valore, commenti #: formato di dotenv.parse, già installato)
 * @param {(msg: string) => void} warn
 * @returns {{port: number, httpsPort: number}} chiave mancante o non valida → default di quella chiave (RF2, RF4)
 */
export function portsFromConf(text, warn) {
    const raw = dotenv.parse(text);   // righe sconosciute ignorate (E2); `port = 9090` accettato (E6)
    const out = {};
    for (const key of Object.keys(DEFAULTS)) {
        const v = raw[key];
        // Solo cifre: Number('') = 0 e Number('8e3') = 8000 passerebbero un controllo più lasco
        if (v === undefined) out[key] = DEFAULTS[key];
        else if (/^\d+$/.test(v) && v >= 1 && v <= 65535) out[key] = Number(v);
        else { warn('WARNING: conf.properties: invalid ' + key + '=' + v + ', using ' + DEFAULTS[key] + '.'); out[key] = DEFAULTS[key]; }
    }
    // Stessa porta per HTTP e HTTPS: il secondo listen fallirebbe. Si rimette https.port al default;
    // se anche così coincidono (port=8443) torna al default pure port.
    if (out.port === out['https.port']) {
        warn('WARNING: conf.properties: port and https.port are both ' + out.port + ', using defaults.');
        out['https.port'] = DEFAULTS['https.port'];
        if (out.port === out['https.port']) out.port = DEFAULTS.port;
    }
    return { port: out.port, httpsPort: out['https.port'] };
}
