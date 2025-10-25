// content.js
// MonoMind unified content router for Simplify + Tone + Calm
// Fully MV3-safe (no inline scripts, no CSP violations)

const ORIGIN_TRIAL_TOKEN =
  "AsTOdLAXt/0rthNXcwBWF67CysqljArFiGCLDIBgstKYFQ7AxuruD2//4xcH4LiF88SQPqVVW8gqqNfasNY1Nw0AAABueyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vZ2FoZ2NpZmtsaW1tYmthbXBnbmJjcG5ucGlvZ2JraXAiLCJmZWF0dXJlckFQSSIsImV4cGlyeSI6MTc2OTQ3MjAwMH0=";

// --- Origin Trial Token 注入 ---
(() => {
  try {
    const existing = document.querySelector('meta[http-equiv="origin-trial"]');
    if (!existing) {
      const meta = document.createElement("meta");
      meta.httpEquiv = "origin-trial";
      meta.content = ORIGIN_TRIAL_TOKEN;
      document.head?.appendChild(meta);
      console.log("✅ Origin Trial token injected for Rewriter/Summarizer API.");
    }
  } catch (err) {
    console.warn("⚠️ Failed to inject origin trial token:", err);
  }
})();

// --- Chrome AI Summarizer 可用性检查 ---
async function ensureAI() {
  if (!("Summarizer" in self))
    return { ok: false, status: "not_supported" };
  const status = await Summarizer.availability();
  const ok = status === "available" || status === "downloadable";
  return { ok, status };
}

// --- 消息路由 ---
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    try {
      const { action } = req || {};

      // ---- Tone ----
      if (action?.startsWith("tone:")) {
        if (!window.MonoMindTone)
          return sendResponse({ ok: false, error: "Tone module not loaded" });

        if (action === "tone:apply") {
          const result = await window.MonoMindTone.apply();
          return sendResponse({ ok: true, data: result });
        }
        if (action === "tone:revert") {
          const result = window.MonoMindTone.revert();
          return sendResponse({ ok: true, data: result });
        }
        if (action === "tone:state") {
          return sendResponse({
            ok: true,
            applied: window.MonoMindTone.isApplied?.() || false,
          });
        }
      }

      // ---- Simplify ----
      if (action === "simplify_page") {
        try {
          // 直接在页面上下文注入 simplify.js
          const script = document.createElement("script");
          script.src = chrome.runtime.getURL("features/simplify.js");
          script.onload = () => {
            if (window.MonoMindSimplify?.summarizeToAlert) {
              window.MonoMindSimplify.summarizeToAlert();
            } else {
              console.warn("Simplify not initialized");
            }
          };
          (document.head || document.documentElement).appendChild(script);
          script.remove();

          return sendResponse({
            ok: true,
            data: "Simplify executed in page context",
          });
        } catch (err) {
          console.error("Simplify error:", err);
          return sendResponse({ ok: false, error: err.message });
        }
      }

      // ---- Calm ----
      if (action === "calm_mode") {
        if (!window.MonoMindCalm?.toggleCalm)
          return sendResponse({ ok: false, error: "Calm not loaded" });
        const out = window.MonoMindCalm.toggleCalm();
        return sendResponse({ ok: true, data: out });
      }

      // ---- Unknown ----
      return sendResponse({ ok: false, error: "unknown_action" });
    } catch (err) {
      console.error("Content handler error:", err);
      return sendResponse({ ok: false, error: String(err) });
    }
  })();

  return true; // keep channel open
});
