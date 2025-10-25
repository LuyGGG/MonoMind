// Set popup language dynamically based on browser settings
document.documentElement.lang = navigator.language || "en";

const log = (m) => {
  const el = document.getElementById("log");
  if (el) el.textContent = typeof m === "string" ? m : JSON.stringify(m, null, 2);
};

// Get the current active tab
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Disallow injection on restricted pages
function isRestrictedUrl(url = "") {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://")
  );
}

// Send message to content.js
async function send(action, payload = {}) {
  const tab = await activeTab();
  const url = tab?.url || "";

  if (isRestrictedUrl(url)) {
    log("This page type cannot be modified (e.g., Chrome pages, Store, or PDF preview). Please use it on a normal webpage.");
    return { ok: false, error: "restricted_page" };
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    log(res);
    return res;
  } catch {
    // Re-inject scripts if content.js isn’t loaded yet
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [
          "features/tone_rewriter.js",
          "features/simplify.js",
          "features/calm.js",
          "content.js",
        ],
      });
      const res2 = await chrome.tabs.sendMessage(tab.id, { action, ...payload });
      log(res2);
      return res2;
    } catch (err2) {
      log(`Failed to send: ${err2?.message || err2}`);
      return { ok: false, error: String(err2?.message || err2) };
    }
  }
}

// Update Tone button UI state
function setToneButtonUI(applied) {
  const btn = document.getElementById("btn-tone");
  if (!btn) return;
  btn.textContent = applied ? "Revert Tone" : "Soften Tone";
  btn.dataset.applied = applied ? "1" : "0";
  btn.disabled = false; // re-enable after completion
}

// Tone toggle logic
async function toggleTone() {
  const btn = document.getElementById("btn-tone");
  if (!btn) return;

  // Prevent double-click
  btn.disabled = true;
  btn.textContent = "Processing...";

  try {
    const state = await send("tone:state");
    const applied = !!state?.applied;

    if (applied) {
      const r = await send("tone:revert");
      if (r?.ok) setToneButtonUI(false);
      else log("Failed to revert tone.");
    } else {
      const r = await send("tone:apply");
      if (r?.ok) setToneButtonUI(true);
      else log("Tone softening failed.");
    }
  } catch (err) {
    log(`${err.message}`);
  } finally {
    btn.disabled = false;
  }
}

// Initialize event bindings
document.addEventListener("DOMContentLoaded", async () => {
  const state = await send("tone:state");
  setToneButtonUI(!!state?.applied);

  document.getElementById("btn-tone")?.addEventListener("click", toggleTone);
  document.getElementById("btn-simplify")?.addEventListener("click", () => send("simplify_page"));
  document.getElementById("btn-calm")?.addEventListener("click", () => send("calm_mode"));

  log("Popup ready.");
});
