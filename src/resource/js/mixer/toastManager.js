// toastManager.js — notifiche toast temporanee per operazioni save/run (TODO-1.2)

/**
 * Mostra un toast Bootstrap per 2 secondi.
 * @param {string} message - testo del toast
 * @param {string} type - 'success' | 'error' | 'info'
 */
export function showToast(message, type = 'success') {
    var container = document.getElementById('toastContainer');
    if (!container) return;
    var bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-secondary';
    var toast = document.createElement('div');
    toast.className = 'toast align-items-center text-white ' + bgClass + ' border-0 show mb-2';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.innerHTML = '<div class="d-flex"><div class="toast-body">' + message + '</div></div>';
    container.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 2000);
}
