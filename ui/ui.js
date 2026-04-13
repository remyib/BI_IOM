// ─────────────────────────────────────────────────────────────
//  ui/ui.js — Thin UIModule facade
//  Provides a single UIModule.toast() reference used by Loader
//  and other modules so they don't need to know about ToastModule.
//  Depends on: ui/toast.js
// ─────────────────────────────────────────────────────────────

const UIModule = (() => {
  const toast       = (msg, type) => ToastModule.show(msg, type);
  const showLoading = (msg)       => ToastModule.showLoading(msg);
  const hideLoading = ()          => ToastModule.hideLoading();

  return { toast, showLoading, hideLoading };
})();
