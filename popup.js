// popup.js — unified controller for MonoMind
// Handles Tone, Simplify (Summarize), Calm, Remove Toggle, AI Optimize, Apply/Undo CSS, and logging.

const $ = (selector) => document.querySelector(selector);
const logEl = $("#log");
const detailsEl = $("#details");

let lastCss = "";

// ---------- Logging ----------
function log(message, append = true) {
  if (!append) logEl.textContent = "";
  const text = typeof message === "string" ? message : JSON.stringify(message, null, 2);
  logEl.textContent += (logEl.textContent ? "\n" : "") + text;
  detailsEl.open = true;
}

// ---------- Active tab ----------
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// ---------- Restricted URL check ----------
function isRestrictedUrl(url = "") {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://")
  );
}

// ---------- Send message to content.js ----------
async function send(actionOrType, payload = {}) {
  const tab = await activeTab();
  const url = tab?.url || "";

  if (isRestrictedUrl(url)) {
    log("This page cannot be modified (Chrome internal pages, Web Store, or PDF previews).", false);
    return { ok: false, error: "restricted_page" };
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, {
      action: actionOrType,
      type: actionOrType,
      ...payload,
    });
    log(res);
    return res;
  } catch {
    // Try re-injecting content scripts if not yet loaded
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
      const res2 = await chrome.tabs.sendMessage(tab.id, {
        action: actionOrType,
        type: actionOrType,
        ...payload,
      });
      log(res2);
      return res2;
    } catch (err2) {
      log(`Failed to send message: ${err2?.message || err2}`, false);
      return { ok: false, error: String(err2?.message || err2) };
    }
  }
}

// ---------- Tone button UI ----------
function setToneButtonUI(applied) {
  const btn = $("#btn-tone");
  if (!btn) return;
  btn.textContent = applied ? "Revert Tone" : "Soften Tone";
  btn.dataset.applied = applied ? "1" : "0";
  btn.disabled = false;
}

// ---------- Tone toggle ----------
async function toggleTone() {
  const btn = $("#btn-tone");
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = "Processing...";

  try {
    const state = await send("tone:state");
    const applied = !!state?.applied;

    if (applied) {
      const r = await send("tone:revert");
      if (r?.ok) setToneButtonUI(false);
      else log("Failed to revert tone.", false);
    } else {
      const r = await send("tone:apply");
      if (r?.ok) setToneButtonUI(true);
      else log("Tone softening failed.", false);
    }
  } catch (err) {
    log(`Error: ${err.message}`, false);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Remove image / animation toggle ----------
async function toggleRemove() {
  const btn = $("#btnRemoveToggle");
  btn.disabled = true;
  try {
    const res = await send("CALM_TOGGLE_REMOVE");
    const msg =
      res?.mode === "removed"
        ? `Removed ${res.count} elements (click again to restore)`
        : `Restored ${res.count} elements`;
    log(msg);

    const tab = await activeTab();
    await chrome.action.setBadgeText({
      text: res?.mode === "removed" ? "ON" : "",
      tabId: tab.id,
    });
    await chrome.action.setBadgeBackgroundColor({
      color: "#0ea5e9",
      tabId: tab.id,
    });
  } catch (e) {
    log("Operation failed: " + (e?.message || e), false);
  } finally {
    btn.disabled = false;
  }
}

// ---------- Optimize via Prompt API ----------
async function runOptimize() {
  $("#btnOptimize").disabled = true;
  $("#btnApplyCss").disabled = true;
  $("#btnUndoCss").disabled = true;
  log("Starting AI optimization...", false);

  try {
    const out = await window.__CalmOptimize.runOptimizeOnActiveTab();
    lastCss = out.css || "";
    log("AI CSS suggestion ready (not applied):\n" + (out.explanation || ""));
    if (out.hints?.length) log("Hints:\n- " + out.hints.join("\n- "));
    if (lastCss.trim().length >= 8) $("#btnApplyCss").disabled = false;
  } catch (e) {
    const msg = String(e?.message || e).includes("unavailable")
      ? "Prompt API unavailable. Please enable Web AI/Prompt API in a recent Chrome build or wait for model download."
      : "Optimization failed: " + (e?.message || e);
    log(msg, false);
  } finally {
    $("#btnOptimize").disabled = false;
  }
}

// ---------- Apply / Undo AI CSS ----------
async function applyCss() {
  if (!lastCss) return;
  $("#btnApplyCss").disabled = true;
  try {
    await send("CALM_APPLY_CSS", { css: lastCss });
    $("#btnUndoCss").disabled = false;
    log("AI CSS applied successfully.");
  } catch (e) {
    $("#btnApplyCss").disabled = false;
    log("Apply failed: " + (e?.message || e));
  }
}

async function undoCss() {
  $("#btnUndoCss").disabled = true;
  try {
    await send("CALM_UNDO_CSS");
    $("#btnApplyCss").disabled = !lastCss;
    log("AI CSS undone.");
  } catch (e) {
    $("#btnUndoCss").disabled = false;
    log("Undo failed: " + (e?.message || e));
  }
}

// ---------- Simplify / Summarize ----------
async function checkSummarizerSupport() {
  try {
    if (!("Summarizer" in self)) return false;
    const status = await Summarizer.availability();
    return status === "available" || status === "downloadable";
  } catch {
    return false;
  }
}

async function triggerSimplify() {
  const btn = $("#btn-simplify");
  if (!btn) return;
  btn.disabled = true;
  log("Running Simplify (Summarizer API)...", false);
  try {
    await send("simplify_page");
  } catch (e) {
    log("Simplify failed: " + (e?.message || e));
  } finally {
    btn.disabled = false;
  }
}

// ---------- Initialization ----------
document.addEventListener("DOMContentLoaded", async () => {
  const simplifyBtn = $("#btn-simplify");
  const toneBtn = $("#btn-tone");

  // Initialize Tone state
  const state = await send("tone:state");
  setToneButtonUI(!!state?.applied);

  // Enable Simplify button if supported
  if (simplifyBtn) {
    const supported = await checkSummarizerSupport();
    if (supported) {
      simplifyBtn.disabled = false;
      simplifyBtn.addEventListener("click", triggerSimplify);
    } else {
      simplifyBtn.disabled = true;
      simplifyBtn.title = "Summarizer API not supported in this browser.";
    }
  }

  // Bind other buttons
  toneBtn?.addEventListener("click", toggleTone);
  $("#btn-calm")?.addEventListener("click", () => send("calm_mode"));
  $("#btnRemoveToggle")?.addEventListener("click", toggleRemove);
  $("#btnOptimize")?.addEventListener("click", runOptimize);
  $("#btnApplyCss")?.addEventListener("click", applyCss);
  $("#btnUndoCss")?.addEventListener("click", undoCss);

  log("Popup initialized.", false);
});
