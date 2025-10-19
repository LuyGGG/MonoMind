// 暴露到 window，便于 content.js 调用
window.MonoMindSimplify = {
  async simplifyCurrentPage() {
    // 1) 抽取正文（先用最简单策略，后续你再优化）
    const text = Array.from(document.querySelectorAll('article, main, p'))
      .slice(0, 200) // 防止过长
      .map(el => el.innerText.trim())
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 8000);

    // 2) Summarizer 可用性
    const st = await ai.summarizer.availability();
    if (st === 'downloadable' && !navigator.userActivation.isActive) {
      return {note:'需要点击触发下载（用户激活）'};
    }

    // 3) 创建 summarizer 并摘要（默认配置即可起跑）
    const summarizer = await ai.summarizer.create();
    const res = await summarizer.summarize(text, {
      type: "key-points",  // or "teaser" / "paragraph"
      format: "markdown",  // or "plain-text"
      length: "short"      // "short" | "medium" | "long"
    });

    // 4) 把结果渲染到页面（最简单：顶部插入一个浮层）
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed; right: 16px; top: 16px; z-index: 999999;
      width: 380px; max-height: 60vh; overflow:auto;
      background: #111; color: #fff; padding: 12px; border-radius: 12px; box-shadow:0 6px 24px rgba(0,0,0,.3)
    `;
    panel.innerHTML = `<b>MonoMind · 摘要</b><hr><div>${res.summary.replace(/\n/g,'<br>')}</div>`;
    document.body.appendChild(panel);

    return {summary: res.summary};
  }
};