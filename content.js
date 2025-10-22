// 简单日志工具
const log = (...a) => console.log('[Monomind/content]', ...a);

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    const { action, payload } = req;

    // 可选：调 AI 可用性（如果某个功能必须 AI 才启用）
    if (action !== 'calm_mode_rules_only') {
      const { ok, status } = await self.MonoMindAI.lmAvailability();
      log('AI availability:', ok, status);
      if (!ok) { sendResponse({ ok:false, error:`AI ${status}` }); return; }
    }

    try {
      if (action === 'simplify_page') {
        const data = await self.MonoMindSimplify.simplifyCurrentPage();
        sendResponse({ ok:true, data });
      } else if (action === 'soften_tone') {
        const data = await self.MonoMindTone.softenSelectedText(payload?.tone || 'neutral');
        sendResponse({ ok:true, data });
      } else if (action === 'calm_mode') {
        const data = await self.MonoMindCalm.toggleCalm();
        sendResponse({ ok:true, data });
      } else {
        sendResponse({ ok:false, error:'unknown_action' });
      }
    } catch (e) {
      sendResponse({ ok:false, error: String(e?.message || e) });
    }
  })();
  return true; // 允许异步 sendResponse
});
