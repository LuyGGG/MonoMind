// MonoMind content router + Origin Trial injector
// Ensures Rewriter API availability for all pages

const ORIGIN_TRIAL_TOKEN = "AsTOdLAXt/0rthNXcwBWF67CysqljArFiGCLDIBgstKYFQ7AxuruD2//4xcH4LiF88SQPqVVW8gqqNfasNY1Nw0AAABueyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vZ2FoZ2NpZmtsaW1tYmthbXBnbmJjcG5ucGlvZ2JraXAiLCJmZWF0dXJlIjoiQUlSZXdyaXRlckFQSSIsImV4cGlyeSI6MTc2OTQ3MjAwMH0="; 

// 注入 Origin Trial token
(() => {
  try {
    const existing = document.querySelector('meta[http-equiv="origin-trial"]');
    if (!existing) {
      const meta = document.createElement("meta");
      meta.httpEquiv = "origin-trial";
      meta.content = ORIGIN_TRIAL_TOKEN;
      document.head?.appendChild(meta);
      console.log("Origin Trial token injected for Rewriter API.");
    }
  } catch (err) {
    console.warn("⚠️ Failed to inject origin trial token:", err);
  }
})();

// 消息路由：处理 popup 指令
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    try {
      const { action } = req || {};

      if (action.startsWith("tone:")) {
        if (!window.MonoMindTone) return sendResponse({ ok: false, error: "Tone module not loaded" });
        if (action === "tone:apply") return sendResponse(await window.MonoMindTone.apply());
        if (action === "tone:revert") return sendResponse(window.MonoMindTone.revert());
        if (action === "tone:state") return sendResponse({ ok: true, applied: window.MonoMindTone.isApplied() });
      }

      if (action === "simplify_page") {
        if (!window.MonoMindSimplify?.simplifyCurrentPage)
          return sendResponse({ ok: false, error: "Simplify not loaded" });
        const out = await window.MonoMindSimplify.simplifyCurrentPage();
        return sendResponse({ ok: true, data: out });
      }

      if (action === "calm_mode") {
        if (!window.MonoMindCalm?.toggleCalm)
          return sendResponse({ ok: false, error: "Calm not loaded" });
        const out = window.MonoMindCalm.toggleCalm();
        return sendResponse({ ok: true, data: out });
      }

      return sendResponse({ ok: false, error: "unknown_action" });
    } catch (err) {
      console.error("Content handler error:", err);
      return sendResponse({ ok: false, error: String(err) });
    }
  })();
  return true;
});
