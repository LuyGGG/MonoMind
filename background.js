// bg.js
// 提供 CAPTURE_VIEW：把当前标签页“可见的网页区域”截图为 dataURL(PNG)。

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (!msg || !msg.type) return;

    if (msg.type === 'CAPTURE_VIEW') {
      try {
        chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: 'png' },
          (dataUrl) => {
            if (chrome.runtime.lastError) {
              sendResponse({ ok: false, error: chrome.runtime.lastError.message });
            } else {
              sendResponse({ ok: true, dataUrl });
            }
          }
        );
      } catch (e) {
        sendResponse({ ok: false, error: String(e?.message || e) });
      }
      return true; // 异步应答
    }
  })();
  return true;
});
