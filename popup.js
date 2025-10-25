// Popup controller: wiring buttons, progress feedback, badge, and CSS apply/undo.

(async function () {
  const $ = (s) => document.querySelector(s);
  const logEl = $('#log');
  const detailsEl = $('#details');

  let lastCss = '';

  function log(msg, append = true) {
    if (!append) logEl.textContent = '';
    logEl.textContent += (logEl.textContent ? '\n' : '') + msg;
    detailsEl.open = true;
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  async function sendToContent(type, payload = {}) {
    const tab = await getActiveTab();
    if (!tab?.id) throw new Error('Cannot locate active tab');
    return await chrome.tabs.sendMessage(tab.id, { type, ...payload });
  }

  // Remove toggle
  $('#btnRemoveToggle').addEventListener('click', async () => {
    $('#btnRemoveToggle').disabled = true;
    try {
      const res = await sendToContent('CALM_TOGGLE_REMOVE');
      const txt = res?.mode === 'removed'
        ? `🧹 Removed ${res.count} elements (click again to restore)`
        : `🧩 Restored ${res.count} elements`;
      log(txt);

      // Set toolbar badge directly (no background worker needed)
      const tab = await getActiveTab();
      await chrome.action.setBadgeText({ text: res?.mode === 'removed' ? 'ON' : '', tabId: tab.id });
      await chrome.action.setBadgeBackgroundColor({ color: '#0ea5e9', tabId: tab.id });
    } catch (e) {
      log('Operation failed: ' + (e?.message || e), false);
    } finally {
      $('#btnRemoveToggle').disabled = false;
    }
  });

  // Optimize
  $('#btnOptimize').addEventListener('click', async () => {
    $('#btnOptimize').disabled = true;
    $('#btnApplyCss').disabled = true;
    $('#btnUndoCss').disabled = true;
    log('🔎 Capturing and calling Prompt API…', false);
    try {
      const out = await window.__CalmOptimize.runOptimizeOnActiveTab();
      lastCss = out.css || '';
      log('✨ AI CSS suggestion ready (not applied):\n' + (out.explanation || ''));
      if (out.hints?.length) log('Hints:\n- ' + out.hints.join('\n- '));
      if (lastCss.trim().length >= 8) $('#btnApplyCss').disabled = false;
    } catch (e) {
      log(String(e?.message || e).includes('unavailable')
        ? '❌ Prompt API unavailable. Enable Web AI/Prompt API in a recent Chrome build or wait for model download.'
        : '💥 Optimization failed: ' + (e?.message || e));
    } finally {
      $('#btnOptimize').disabled = false;
    }
  });

  // Apply / Undo AI CSS
  $('#btnApplyCss').addEventListener('click', async () => {
    if (!lastCss) return;
    $('#btnApplyCss').disabled = true;
    try {
      await sendToContent('CALM_APPLY_CSS', { css: lastCss });
      $('#btnUndoCss').disabled = false;
      log('✅ AI CSS applied');
    } catch (e) {
      $('#btnApplyCss').disabled = false;
      log('Apply failed: ' + (e?.message || e));
    }
  });

  $('#btnUndoCss').addEventListener('click', async () => {
    $('#btnUndoCss').disabled = true;
    try {
      await sendToContent('CALM_UNDO_CSS');
      $('#btnApplyCss').disabled = !lastCss;
      log('↩️ AI CSS undone');
    } catch (e) {
      $('#btnUndoCss').disabled = false;
      log('Undo failed: ' + (e?.message || e));
    }
  });

  log('Ready: use “Remove image” or “Optimize (AI)”.', false);
})();
