// ─────────────────────────────────────────────────────────────
//  ui/tabs.js — Tab bar switching logic
// ─────────────────────────────────────────────────────────────

const TabsModule = (() => {

  /**
   * Activate a tab by name.
   * @param {string} name  Matches a `.tab-panel` element with id `tab-{name}`
   * @param {Element} btn  The `.tab` button that was clicked
   */
  function switchTab(name, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${name}`);
    if (panel) panel.classList.add('active');
  }

  return { switchTab };
})();
