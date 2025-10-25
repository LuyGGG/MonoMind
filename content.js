// Handles messages from popup, shows in-page toast, applies/undoes AI CSS.

(function () {
  function toast(msg = '', ms = 2200) {
    try {
      let el = document.getElementById('__calmpage_toast');
      if (!el) {
        el = document.createElement('div');
        el.id = '__calmpage_toast';
        document.documentElement.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = '1';
      clearTimeout(el.__t);
      el.__t = setTimeout(() => { el.style.opacity = '0'; }, ms);
    } catch (_) {}
  }

  const STYLE_ID = '__calmpage_ai_style__';

  function applyCss(cssText) {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      s.type = 'text/css';
      document.head.appendChild(s);
    }
    s.textContent = cssText || '';
    toast('✅ AI CSS applied');
    return true;
  }

  function undoCss() {
    const s = document.getElementById(STYLE_ID);
    if (s && s.parentNode) {
      s.parentNode.removeChild(s);
      toast('↩️ AI CSS undone');
      return true;
    }
    toast('ℹ️ No AI CSS to undo');
    return false;
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'CALM_TOGGLE_REMOVE') {
      const r = window.__CalmPageImageFeature?.toggleRemove();
      if (r?.mode === 'removed') toast(`🧹 Removed ${r.count} elements`);
      if (r?.mode === 'restored') toast(`🧩 Restored ${r.count} elements`);
      sendResponse?.({ ok: true, ...r });
      return true;
    }

    if (msg.type === 'CALM_APPLY_CSS') {
      const ok = applyCss(msg.css || '');
      sendResponse?.({ ok });
      return true;
    }

    if (msg.type === 'CALM_UNDO_CSS') {
      const ok = undoCss();
      sendResponse?.({ ok });
      return true;
    }
  });
})();
