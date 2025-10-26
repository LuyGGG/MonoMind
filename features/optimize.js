// features/optimize.js
window.__CalmOptimize = {
  async runOptimizeOnActiveTab() {
    const dataUrl = await chrome.tabs.captureVisibleTab({ format: 'png' });
    const bitmap  = await window.__Prompt.dataUrlToImageBitmap(dataUrl);

    const session = await window.__Prompt.getPromptSession();
    try {
      const raw = await session.promptImageAndText(bitmap, window.__Prompt.buildOptimizePrompt());
      const text = String(raw || '').trim();
      const json = JSON.parse(text);
      if (typeof json.css !== 'string') throw new Error('Model did not return "css"');
      return {
        css: json.css,
        explanation: json.explanation || '',
        hints: Array.isArray(json.hints) ? json.hints : []
      };
    } finally {
      session.close?.();
    }
  }
};
