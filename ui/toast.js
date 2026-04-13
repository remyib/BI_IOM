// ─────────────────────────────────────────────────────────────
//  ui/toast.js — Toast notifications and loading overlay
//  Depends on: config.js
// ─────────────────────────────────────────────────────────────

const ToastModule = (() => {

  /**
   * Show a toast notification.
   * @param {string} msg
   * @param {'success'|'warn'|'error'} type
   */
  function show(msg, type = 'success') {
    const wrap = document.getElementById('toastWrap');
    const el   = document.createElement('div');
    el.className = `toast${type === 'error' ? ' error' : type === 'warn' ? ' warn' : ''}`;
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), CONFIG.toastDuration);
  }

  /** Show the full-screen loading overlay with a message. */
  function showLoading(msg) {
    document.getElementById('overlayMsg').textContent = msg || 'Loading…';
    document.getElementById('loadOverlay').classList.add('show');
  }

  /** Hide the loading overlay. */
  function hideLoading() {
    document.getElementById('loadOverlay').classList.remove('show');
  }

  return { show, showLoading, hideLoading };
})();
