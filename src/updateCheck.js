// updateCheck.js — UPDATE_CHECK: confronta la versione installata con l'ultima GitHub Release.
// Solo notifica: niente download/auto-update (AF §6).

import fs from 'fs';

const LATEST_URL = 'https://api.github.com/repos/VitreousSpaghetti/DigitalVisualMixer/releases/latest';

/** "v1.2.3" | "1.2.3" → [1,2,3]; null se non semver (E2). */
export function parseVersion(v) {
    var m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '').trim());
    return m ? [+m[1], +m[2], +m[3]] : null;
}

/** true se a è più recente di b (confronto numerico, non stringa: "1.10.0" > "1.9.0"). */
export function isNewer(a, b) {
    for (var i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
    return false;
}

/**
 * Crea il controllore. La versione arriva dal package.json passato (quello incluso nel binario),
 * mai da una costante duplicata (AF §3).
 */
export function createUpdateChecker(packageJsonPath, onResult) {
    var installed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).version;
    // Esito in memoria: un controllo per avvio, condiviso da tutte le finestre (RF3)
    var state = { installed: installed, status: 'checking' };
    var inFlight = null;

    async function run() {
        var next = { installed: installed, checkedAt: new Date().toISOString() };
        try {
            // RNF1: timeout breve, offline non deve restare appeso. RNF3: solo User-Agent (richiesto da GitHub)
            var res = await fetch(LATEST_URL, {
                headers: { 'User-Agent': 'DigitalVisualMixer', 'Accept': 'application/vnd.github+json' },
                signal: AbortSignal.timeout(5000)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status); // 404 nessuna release (E3), 403/429 rate limit (RNF4)
            var rel = await res.json();
            var latest = parseVersion(rel.tag_name), mine = parseVersion(installed);
            if (!latest || !mine) throw new Error('version not semver: ' + rel.tag_name);
            next.latest = latest.join('.');
            next.url = rel.html_url;
            next.publishedAt = rel.published_at;
            // E1: build più recente della release → "aggiornata"
            next.status = isNewer(latest, mine) ? 'available' : 'up-to-date';
        } catch (e) {
            next.status = 'error';
            next.error = e.message;
        }
        state = next;
        if (onResult) onResult(state);
        return state;
    }

    return {
        get: function() { return state; },
        // E7: clic ripetuti durante un controllo in corso riusano la stessa richiesta
        check: function() {
            if (!inFlight) inFlight = run().finally(function() { inFlight = null; });
            return inFlight;
        }
    };
}
