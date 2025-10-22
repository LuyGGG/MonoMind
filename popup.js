// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // Helper to log results in popup
  const log = (m) => {
    const el = document.getElementById('log');
    if (el) el.textContent = m;
  };

  // 1️⃣ 内容简化
  document.getElementById('btn-simplify')?.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');

      // Inject and run summarizeToAlert() directly
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['features/simplify.js'],
        world: 'MAIN'
      });
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: 'MAIN',
        func: () => window.MonoMindSimplify?.summarizeToAlert()
      });

      log('✅ Simplify executed successfully');
    } catch (err) {
      console.error(err);
      log(`❌ ${err.message}`);
    }
  });

  // 2️⃣ 语气柔化
  document.getElementById('btn-tone')?.addEventListener('click', () => {
    send('soften_tone');
  });

  // 3️⃣ 安静模式
  document.getElementById('btn-calm')?.addEventListener('click', () => {
    send('calm_mode');
  });

  // Generic message sender for the two other features
  async function send(action, payload = {}) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found');
      const res = await chrome.tabs.sendMessage(tab.id, { action, payload });
      log(JSON.stringify(res, null, 2));
    } catch (err) {
      console.error(err);
      log(`❌ ${err.message}`);
    }
  }
});