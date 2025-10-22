// calm.js
(function () {
  const log = (...a) => console.log('[Monomind/calm]', ...a);

  let quietOn = false, io, mo;
  async function toggleCalm() {
    quietOn = !quietOn;
    document.documentElement.classList.toggle('calm-on', quietOn);
    if (quietOn) start(); else stop();
    return { on: quietOn };
  }

  function start() {
    io = new IntersectionObserver(onVisible, { threshold:.3 });
    document.querySelectorAll('img,video,canvas').forEach(el => io.observe(el));
    mo = new MutationObserver(m => m.forEach(x => x.addedNodes.forEach(n => {
      if (n instanceof HTMLImageElement) io.observe(n);
    })));
    mo.observe(document.body, { childList:true, subtree:true });
  }
  function stop(){ io?.disconnect(); mo?.disconnect(); }

  async function onVisible(entries){
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      if (el.tagName === 'IMG' && !el.dataset.calmLabel) {
        el.dataset.calmLabel = 'pending';
        const blob = await fetch(el.src).then(r=>r.blob()).catch(()=>null);
        if (!blob) continue;
        const { action, label } = await self.MonoMindAI.classifyImage(blob);
        if (action === 'blur') el.classList.add('calm-blur');
        if (action === 'hide') el.classList.add('calm-hide');
        if (action === 'desaturate') el.style.filter = 'grayscale(100%) brightness(.9)';
        el.dataset.calmLabel = label;
        log('tag', label, action);
      }
    }
  }

  self.MonoMindCalm = { toggleCalm };
})();
