// features/image.js
// Fully remove/restore images, popups and animated distractions.
// Safe heuristics to avoid nuking app roots (e.g. #root, __next).

(function () {
  const store = {
    enabled: false,
    removed: [] // { node, parent, next }
  };

  function detach(node) {
    if (!node || !node.parentNode) return null;
    const rec = { node, parent: node.parentNode, next: node.nextSibling };
    try { node.parentNode.removeChild(node); } catch (_) {}
    return rec;
  }

  function restoreAll() {
    let n = 0;
    for (let i = store.removed.length - 1; i >= 0; i--) {
      const { node, parent, next } = store.removed[i];
      try {
        if (next && next.parentNode === parent) parent.insertBefore(node, next);
        else parent.appendChild(node);
        n++;
      } catch (_) {}
    }
    store.removed = [];
    store.enabled = false;
    return n;
  }

  const SAFE_ROOT_SELECTOR = [
    'html','body','main','#root','#__next','#__nuxt',
    '[data-root]','[data-reactroot]','[data-nextjs]'
  ].join(',');

  function isSafeRoot(el) {
    return el.matches(SAFE_ROOT_SELECTOR);
  }

  function isLikelyPopup(el, vw, vh) {
    const cs = getComputedStyle(el);

    // Obvious modal markers
    if (el.matches('[aria-modal="true"],dialog,[role="dialog"],.modal,[class*="overlay"],[class*="popup"],[class*="dialog"]')) {
      return true;
    }

    // Heuristic: fixed + large + high z-index
    const fixed = cs.position === 'fixed' || cs.position === 'sticky';
    if (!fixed) return false;

    const r = el.getBoundingClientRect();
    const area = Math.max(0, r.width) * Math.max(0, r.height);
    const ratio = area / (vw * vh);
    const z = parseInt(cs.zIndex || '0', 10);

    return ratio > 0.35 && z >= 1000;
  }

  function isAnimated(el) {
    // Only remove obvious distracting animations; transitions alone are ok
    if (el.matches('video,marquee,blink,[data-animated]')) return true;

    const cs = getComputedStyle(el);
    const hasAnimation = cs.animationName && cs.animationName !== 'none';
    if (!hasAnimation) return false;

    const dur = (cs.animationDuration || '0s').split(',').map(s => parseFloat(s) || 0);
    const iter = (cs.animationIterationCount || '1').split(',').map(s =>
      (s.trim() === 'infinite' ? Infinity : (parseFloat(s) || 1))
    );

    return dur.some((d, i) => d > 0.5 && (iter[i] === Infinity || iter[i] >= 3));
  }

  function collectAndRemove() {
    const vw = Math.max(1, window.innerWidth);
    const vh = Math.max(1, window.innerHeight);
    const set = new Set();

    // 1) Images and image-like nodes
    document.querySelectorAll('img,picture,figure,svg image,object[type^="image"],embed[type^="image"],video,canvas,[role="img"]').forEach(n => {
      if (!isSafeRoot(n)) set.add(n);
    });

    // 2) Popups/overlays
    document.querySelectorAll('body *').forEach(el => {
      try { if (!isSafeRoot(el) && isLikelyPopup(el, vw, vh)) set.add(el); } catch(_) {}
    });

    // 3) Animated distractions
    document.querySelectorAll('body *').forEach(el => {
      try { if (!isSafeRoot(el) && isAnimated(el)) set.add(el); } catch(_) {}
    });

    set.delete(document.documentElement);
    set.delete(document.body);

    let cnt = 0;
    for (const el of set) {
      const rec = detach(el);
      if (rec) { store.removed.push(rec); cnt++; }
    }
    return cnt;
  }

  function toggleRemove() {
    if (!store.enabled) {
      const n = collectAndRemove();
      store.enabled = true;
      return { mode: 'removed', count: n };
    } else {
      const n = restoreAll();
      return { mode: 'restored', count: n };
    }
  }

  window.__CalmPageImageFeature = {
    toggleRemove,
    restoreAll,
    get enabled() { return store.enabled; }
  };
})();
