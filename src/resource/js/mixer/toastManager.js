// toastManager.js — notifiche toast temporanee per operazioni save/run (TODO-1.2)

// Offset verticale per stack di più toast simultanei
var _toastOffset = 20;

/**
 * Mostra un toast per 2 secondi.
 * @param {string} message - testo del toast
 * @param {string} type - 'success' | 'error' | 'info'
 *
 * Nota: il toast è appeso direttamente a document.body con position:fixed sull'elemento
 * stesso — così non è mai influenzato dallo stacking context di #hydra-ui (position:fixed
 * su un ancestor crea un containing block locale che spostava i toast fuori viewport).
 */
export function showToast(message, type) {
    if (type === undefined) type = 'success';
    var bg = type === 'error' ? '#b02a37' : type === 'info' ? '#555' : '#146c43';

    var toast = document.createElement('div');
    toast.style.cssText = [
        'position:fixed',
        'bottom:' + _toastOffset + 'px',
        'right:20px',
        'z-index:99999',
        'display:flex',
        'align-items:center',
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
    toast.textContent = message;

    _toastOffset += 52; // stack verso l'alto se più toast aperti contemporaneamente
    document.body.appendChild(toast);

    setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() {
            toast.remove();
            _toastOffset = Math.max(20, _toastOffset - 52);
        }, 350);
    }, 2200);
}
