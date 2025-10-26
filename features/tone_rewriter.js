// MonoMind - Tone Rewriter (Final fixed version)
// 修复：长文本未缓存导致 revert 后再 soften 不一致的问题

(() => {
  const DEFAULT_EXCLUDE = [
    "script", "style", "noscript", "code", "pre",
    "textarea", "input", "svg", "math", "kbd", "samp"
  ].join(",");

  const ORIGINAL_TEXT = new WeakMap();
  const REWRITTEN_CACHE = new WeakMap();
  const REWRITTEN_NODES = new Set();
  const NODE_STATUS = new WeakMap(); // node -> "applied" | "reverted"
  let TONE_APPLIED = false;
  let rewriterInstance = null;
  let promptCache = null;

  // 防止缓存过多
  let CACHE_COUNT = 0;
  const CACHE_LIMIT = 3000; // 合理上限，防止内存过高

  // --- DOM Traversal ---
  function* textNodeIterator(root, exclude = DEFAULT_EXCLUDE) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p || p.closest(exclude)) return NodeFilter.FILTER_REJECT;
        const style = window.getComputedStyle(p);
        if (style && (style.visibility === "hidden" || style.display === "none"))
          return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let cur;
    while ((cur = walker.nextNode())) yield cur;
  }

  // --- Load prompt ---
  async function loadPrompt() {
    if (promptCache) return promptCache;
    try {
      const url = chrome.runtime.getURL("features/prompts/autism_friendly_prompt.txt");
      const res = await fetch(url);
      promptCache = (await res.text()).trim();
    } catch {
      promptCache = `Only replace emotionally strong or insulting words and phrases with calm, neutral alternatives.
Keep every other word in the sentence exactly the same. Do not change structure or length.`;
    }
    return promptCache;
  }

  // --- Ensure rewriter ---
  async function ensureRewriter() {
    if (rewriterInstance) return rewriterInstance;
    if (!("Rewriter" in self)) return null;
    const avail = await Rewriter.availability();
    if (avail !== "available") return null;
    rewriterInstance = await Rewriter.create({
      tone: "more-casual",
      format: "plain-text",
      length: "as-is",
      sharedContext:
        "Replace only emotionally intense or insulting words with calm, neutral alternatives. Keep all other text identical."
    });
    return rewriterInstance;
  }

  function cleanAIOutput(t) {
    if (!t) return "";
    return t
      .replace(/^(\s*(okay|sure|please|note|understand|here is).*)$/gim, "")
      .replace(/(^|\n)(rewrite|summary|as requested|let's|below).*$/gim, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // --- Cache helper ---
  function cacheRewrite(node, rewritten) {
    if (!rewritten) return;
    // 不再限制长度，全部缓存
    if (CACHE_COUNT < CACHE_LIMIT) {
      REWRITTEN_CACHE.set(node, rewritten);
      CACHE_COUNT++;
    } else {
      // 超过上限时，只更新，不计数
      REWRITTEN_CACHE.set(node, rewritten);
    }
  }

  // --- Soften a node ---
  async function softenNode(node, rewriter, prompt) {
    const original = node.nodeValue;
    if (!original) return;

    const contextPrompt = `${prompt}\n\nIMPORTANT:
If no emotional words exist, return text unchanged.`;
    try {
      const stream = rewriter.rewriteStreaming(original, {
        context: contextPrompt,
        tone: "more-casual",
        length: "as-is"
      });

      let rewritten = "";
      for await (const chunk of stream) rewritten += chunk;
      rewritten = cleanAIOutput(rewritten);

      if (rewritten && rewritten !== original) {
        ORIGINAL_TEXT.set(node, original);
        node.nodeValue = rewritten;
        REWRITTEN_CACHE.set(node, rewritten); // ✅ 一律缓存，不管多长
        REWRITTEN_NODES.add(node);
        NODE_STATUS.set(node, "applied");
      } else {
        NODE_STATUS.set(node, "applied");
      }
    } catch (err) {
      console.warn("Rewrite failed:", err);
    }
  }

  // --- Apply tone to page ---
  async function applyToPage() {
    const nodes = Array.from(textNodeIterator(document.body));
    const rewriter = await ensureRewriter();
    const prompt = await loadPrompt();
    if (!rewriter) return { ok: false, error: "no_rewriter" };

    let changed = 0;
    for (const node of nodes) {
      const status = NODE_STATUS.get(node);

      if (status === "applied" && REWRITTEN_CACHE.has(node)) {
        // reuse
        node.nodeValue = REWRITTEN_CACHE.get(node);
        continue;
      }

      if (status === "reverted" && REWRITTEN_CACHE.has(node)) {
        // restore from cache
        node.nodeValue = REWRITTEN_CACHE.get(node);
        NODE_STATUS.set(node, "applied");
        continue;
      }

      // 未缓存或新节点 → 重新 rewrite
      await softenNode(node, rewriter, prompt);
      changed++;
      if (changed % 15 === 0) await new Promise(r => setTimeout(r, 20));
    }

    TONE_APPLIED = true;
    console.log(`Tone applied (${changed} new or reused nodes).`);
    return { ok: true, changed };
  }

  // --- Revert all ---
  function revertPage() {
    let restored = 0;
    for (const node of REWRITTEN_NODES) {
      const orig = ORIGINAL_TEXT.get(node);
      if (orig) {
        node.nodeValue = orig;
        NODE_STATUS.set(node, "reverted");
        restored++;
      }
    }
    TONE_APPLIED = false;
    console.log(`Reverted ${restored} nodes.`);
    return { ok: true, restored };
  }

  const API = {
    apply: applyToPage,
    revert: revertPage,
    isApplied: () => TONE_APPLIED
  };

  if (typeof window !== "undefined") window.MonoMindTone = API;
  if (typeof self !== "undefined") self.MonoMindTone = API;
})();
