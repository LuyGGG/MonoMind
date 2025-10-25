// popup.js
document.documentElement.lang = navigator.language || "zh";

const log = (m) => {
  const el = document.getElementById("log");
  if (el) el.textContent = typeof m === "string" ? m : JSON.stringify(m, null, 2);
};

// 获取当前活动标签页
async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// 禁止注入的 URL
function isRestrictedUrl(url = "") {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://")
  );
}

// 发送指令到 content.js
async function send(action, payload = {}) {
  const tab = await activeTab();
  const url = tab?.url || "";

  if (isRestrictedUrl(url)) {
    log("当前页面不允许注入（如 chrome://、商店、PDF 预览）。请在普通网页使用。");
    return { ok: false, error: "restricted_page" };
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action, ...payload });
    log(res);
    return res;
  } catch {
    // 如果 content 未注入，则重新注入
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
      log(`发送失败：${err2?.message || err2}`);
      return { ok: false, error: String(err2?.message || err2) };
    }
  }
}

// Tone 按钮 UI 切换
function setToneButtonUI(applied) {
  const btn = document.getElementById("btn-tone");
  if (!btn) return;
  btn.textContent = applied ? "撤销语气柔化" : "语气柔化";
  btn.dataset.applied = applied ? "1" : "0";
}

// Tone 逻辑
async function toggleTone() {
  const state = await send("tone:state");
  const applied = !!state?.applied;
  if (applied) {
    const r = await send("tone:revert");
    if (r?.ok) setToneButtonUI(false);
  } else {
    const r = await send("tone:apply");
    if (r?.ok) setToneButtonUI(true);
  }
}

// 初始化绑定
document.addEventListener("DOMContentLoaded", async () => {
  const state = await send("tone:state");
  setToneButtonUI(!!state?.applied);

  document.getElementById("btn-tone")?.addEventListener("click", toggleTone);
  document.getElementById("btn-simplify")?.addEventListener("click", () => send("simplify_page"));
  document.getElementById("btn-calm")?.addEventListener("click", () => send("calm_mode"));

  log("Popup ready.");
});
