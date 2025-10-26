// background.js
// screenshot

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
      return true; // asynchronous response
    }
  })();
  return true;
});
