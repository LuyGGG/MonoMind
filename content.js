// content.js
// MonoMind unified content router for Simplify + Tone + Calm + AI CSS
// Fully MV3-safe (no inline scripts, no CSP violations)

const ORIGIN_TRIAL_TOKEN =
  "AsTOdLAXt/0rthNXcwBWF67CysqljArFiGCLDIBgstKYFQ7AxuruD2//4xcH4LiF88SQPqVVW8gqqNfasNY1Nw0AAABueyJvcmlnaW4iOiJjaHJvbWUtZXh0ZW5zaW9uOi8vZ2FoZ2NpZmtsaW1tYmthbXBnbmJjcG5ucGlvZ2JraXAiLCJmZWF0dXJlckFQSSIsImV4cGlyeSI6MTc2OTQ3MjAwMH0=";

// --- Origin Trial token injection ---
(() => {
  try {
    const existing = document.querySelector('meta[http-equiv="origin-trial"]');
    if (!existing) {
      const meta = document.createElement("meta");
      meta.httpEquiv = "origin-trial";
      meta.content = ORIGIN_TRIAL_TOKEN;
      document.head?.appendChild(meta);
      console.log(
        "✅ Origin Trial token injected for Rewriter/Summarizer API."
      );
    }
  } catch (err) {
    console.warn("⚠️ Failed to inject origin trial token:", err);
  }
})();

// --- Chrome AI Summarizer availability check ---
async function ensureAI() {
  if (!("Summarizer" in self)) return { ok: false, status: "not_supported" };
  const status = await Summarizer.availability();
  const ok = status === "available" || status === "downloadable";
  return { ok, status };
}

// --- In-page toast utility ---
function showToast(msg = "", ms = 2200) {
  try {
    let el = document.getElementById("__monomind_toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "__monomind_toast";
      el.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        background: rgba(0,0,0,0.75);
        color: #fff;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 13px;
        z-index: 999999;
        transition: opacity 0.3s;
        opacity: 0;
      `;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el.__t);
    el.__t = setTimeout(() => {
      el.style.opacity = "0";
    }, ms);
  } catch (err) {
    console.warn("Toast failed:", err);
  }
}

// --- AI CSS ---
const STYLE_ID = "__monomind_ai_style__";

function applyAICss(cssText) {
  let s = document.getElementById(STYLE_ID);
  if (!s) {
    s = document.createElement("style");
    s.id = STYLE_ID;
    s.type = "text/css";
    document.head.appendChild(s);
  }
  s.textContent = cssText || "";
  showToast("AI style applied");
  return true;
}

function undoAICss() {
  const s = document.getElementById(STYLE_ID);
  if (s && s.parentNode) {
    s.parentNode.removeChild(s);
    showToast("AI style undone");
    return true;
  }
  showToast("No AI style to undo");
  return false;
}

// --- message ---
chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    try {
      const { action, type } = req || {};

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
          const script = document.createElement("script");
          script.src = chrome.runtime.getURL("features/simplify.js");

          script.onload = async () => {
            try {
              const fn = window.MonoMindSimplify?.summarizeToAlert;

              if (typeof fn !== "function") {
                return sendResponse({
                  ok: false,
                  error: "Simplify not initialized",
                });
              }

              // Call it and wait if it returns a Promise
              const r = fn();
              if (r && typeof r.then === "function") {
                await r;
              }

              sendResponse({ ok: true, data: "Simplify completed" });
            } catch (e) {
              sendResponse({ ok: false, error: e?.message || String(e) });
            }
          };

          (document.head || document.documentElement).appendChild(script);
        } catch (err) {
          return sendResponse({ ok: false, error: err.message });
        }
        return true; // keep the channel open until sendResponse is called
      }

      // ---- Calm ----
      if (action === "calm_mode") {
        if (!window.MonoMindCalm?.toggleCalm)
          return sendResponse({ ok: false, error: "Calm not loaded" });
        const out = window.MonoMindCalm.toggleCalm();
        showToast("Calm mode toggled");
        return sendResponse({ ok: true, data: out });
      }

      // ---- CALM / CSS  ----
      if (type === "CALM_TOGGLE_REMOVE") {
        const r = window.__CalmPageImageFeature?.toggleRemove();
        if (r?.mode === "removed") showToast(`Removed ${r.count} elements`);
        if (r?.mode === "restored") showToast(`Restored ${r.count} elements`);
        return sendResponse({ ok: true, ...r });
      }

      if (type === "CALM_APPLY_CSS") {
        const ok = applyAICss(req.css || "");
        return sendResponse({ ok });
      }

      if (type === "CALM_UNDO_CSS") {
        const ok = undoAICss();
        return sendResponse({ ok });
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
