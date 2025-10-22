// content.js

async function ensureAI() {
  if (!("Summarizer" in self)) return { ok: false, status: "not_supported" };
  const status = await Summarizer.availability();
  const ok = status === "available" || status === "downloadable";
  return { ok, status };
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    try {
      const { action } = req || {};

      // ---- Simplify ----
      if (action === "simplify_page") {
        const url = chrome.runtime.getURL("features/simplify.js");
        if (!url || url.startsWith("chrome-extension://invalid")) {
          sendResponse({
            ok: false,
            error:
              "Stale content script. Refresh this tab after reloading the extension.",
          });
          return;
        }
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => {
          const runner = document.createElement("script");
          runner.textContent =
            "window.MonoMindSimplify && window.MonoMindSimplify.summarizeToAlert();";
          (document.head || document.documentElement).appendChild(runner);
          runner.remove();
        };
        (document.head || document.documentElement).appendChild(script);
        sendResponse({
          ok: true,
          data: "simplify.js injected & executed on click",
        });
        return;
      }

      // ---- Tone ----
      if (action === "tone:apply") {
        const options = req.options || { level: "medium" };
        if (!window.MonoMindTone?.apply)
          return sendResponse({ ok: false, error: "MonoMindTone not loaded" });
        const out = window.MonoMindTone.apply(options);
        return sendResponse({ ok: true, data: out });
      }

      if (action === "tone:revert") {
        if (!window.MonoMindTone?.revert)
          return sendResponse({ ok: false, error: "MonoMindTone not loaded" });
        const out = window.MonoMindTone.revert();
        return sendResponse({ ok: true, data: out });
      }

      // ---- Calm ----
      if (action === "calm_mode") {
        if (!window.MonoMindCalm?.toggleCalm)
          return sendResponse({ ok: false, error: "MonoMindCalm not loaded" });
        const out = window.MonoMindCalm.toggleCalm();
        return sendResponse({ ok: true, data: out });
      }

      return sendResponse({ ok: false, error: "unknown_action" });
    } catch (err) {
      return sendResponse({ ok: false, error: String(err) });
    }
  })();

  return true; // keep channel open for async
});
