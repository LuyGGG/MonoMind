importScripts?.(); // 兼容性占位，无需改

async function ensureAI() {
  // Summarizer / Prompt 可选其一
  if (!self.ai || !ai.summarizer) return {ok:false, status:'no_ai'};
  const status = await ai.summarizer.availability(); // or ai.languageModel.availability()
  return {ok: status === 'available' || status === 'downloadable', status};
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    const {action, payload} = req;
    const {ok, status} = await ensureAI();
    if (!ok) { sendResponse({ok:false, error:`AI ${status}`}); return; }

    switch(action){
      case 'simplify_page':
        // 👉 调用你负责的模块
        const out1 = await window.MonoMindSimplify.simplifyCurrentPage();
        sendResponse({ok:true, data: out1}); break;

      case 'soften_tone':
        const out2 = await window.MonoMindTone.softenSelectedText();
        sendResponse({ok:true, data: out2}); break;

      case 'calm_mode':
        const out3 = await window.MonoMindCalm.toggleCalm();
        sendResponse({ok:true, data: out3}); break;

      default:
        sendResponse({ok:false, error:'unknown_action'});
    }
  })();
  return true; // keep channel for async
});