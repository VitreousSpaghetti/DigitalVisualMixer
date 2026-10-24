// toastManager.js — notifiche toast temporanee per operazioni save/run (TODO-1.2)

// Offset verticale per stack di più toast simultanei
var _toastOffset = 20;
// Messaggi dei toast ancora a schermo
var _visible = {};

/**
 * Mostra un toast per 2 secondi.
 * @param {string} message - testo del toast
 * @param {string} type - 'success' | 'error' | 'info'
 * @param {{text:string, href:string}} [link] - UPDATE_CHECK RF4: link cliccabile; il toast resta
 *        10 s (il tempo di leggerlo e cliccare) e si chiude anche a mano con un clic
 *
 * Nota: il toast è appeso direttamente a document.body con position:fixed sull'elemento
 * stesso — così non è mai influenzato dallo stacking context di #hydra-ui (position:fixed
 * su un ancestor crea un containing block locale che spostava i toast fuori viewport).
 */
export function showToast(message, type, link) {
    if (type === undefined) type = 'success';
    // PRESET E4: nota MIDI ripetuta su un preset mancante → un solo toast visibile per messaggio
    if (_visible[message]) return;
    _visible[message] = true;
    var bg = type === 'error' ? '#b02a37' : type === 'info' ? '#555' : '#146c43';

    var toast = document.createElement('div');
    toast.style.cssText = [
        'position:fixed',
        'bottom:' + _toastOffset + 'px',
        'right:20px',
        'z-index:99999',
        'display:flex',
        'align-items:center',
        'gap:8px',
        'padding:10px 18px',
        'border-radius:6px',
        'color:#fff',
        'background:' + bg,
        'font-size:0.875rem',
        'font-family:inherit',
        'box-shadow:0 3px 10px rgba(0,0,0,0.5)',
        'opacity:1',
        'transition:opacity 0.35s',
        'pointer-events:none',
        'white-space:nowrap',
        'max-width:420px'
    ].join(';');
    // UX_GUIDA RF-A1: l'icona dipende dal tipo, i messaggi non contengono simboli ✓ ⚠ ℹ
    var ico = type === 'error' ? 'triangle-exclamation' : type === 'info' ? 'circle-info' : 'check';
    toast.innerHTML = '<i class="fa-solid fa-' + ico + '" aria-hidden="true"></i>';
    toast.appendChild(document.createTextNode(message)); // testo: sicuro vs XSS
    if (link) {
        toast.style.pointerEvents = 'auto'; // altrimenti il link non è cliccabile
        toast.style.cursor = 'pointer';
        var a = document.createElement('a');
        a.href = link.href; a.target = '_blank'; a.rel = 'noopener';
        a.textContent = link.text;
        a.style.cssText = 'color:#fff;font-weight:bold;text-decoration:underline';
        toast.appendChild(a);
        toast.addEventListener('click', close);
    }

    _toastOffset += 52; // stack verso l'alto se più toast aperti contemporaneamente
    document.body.appendChild(toast);

    var closed = false;
    function close() {
        if (closed) return; // clic + timeout non devono scalare l'offset due volte
        closed = true;
        delete _visible[message];
        toast.style.opacity = '0';
        setTimeout(function() {
            toast.remove();
            _toastOffset = Math.max(20, _toastOffset - 52);
        }, 350);
    }
    setTimeout(close, link ? 10000 : 2200);
}
