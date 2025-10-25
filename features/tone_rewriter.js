// MonoMind - Minimal Tone Softener (Chrome Rewriter API Edition)
// Only replace emotionally intense or insulting words; keep sentence structure intact.

(() => {
  const DEFAULT_EXCLUDE = [
    "script", "style", "noscript", "code", "pre",
    "textarea", "input", "svg", "math", "kbd", "samp"
  ].join(",");

  const ORIGINAL_TEXT = new WeakMap();
  const PROCESSED = new WeakSet();
  let TONE_APPLIED = false;
  let rewriterInstance = null;
  let promptCache = null;

  // Traverse visible text nodes
  function* textNodeIterator(root, exclude = DEFAULT_EXCLUDE) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest(exclude)) return NodeFilter.FILTER_REJECT;
          const style = window.getComputedStyle(parent);
          if (style && (style.visibility === "hidden" || style.display === "none"))
            return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );
    let cur;
    while ((cur = walker.nextNode())) yield cur;
  }

  // Load autism-friendly prompt
  async function loadPrompt() {
    if (promptCache) return promptCache;
    const url = chrome.runtime.getURL("features/prompts/autism_friendly_prompt.txt");
    try {
      const res = await fetch(url);
      const text = await res.text();
      promptCache = text.trim();
      return promptCache;
    } catch {
      // Default fallback prompt
      promptCache = `Only replace emotionally strong or insulting words and phrases with calm, neutral alternatives.
Keep every other word in the sentence exactly the same.
Do not change sentence structure, meaning, or length.
Do not add any explanations or extra words.`;
      return promptCache;
    }
  }

  // Ensure Rewriter instance
  async function ensureRewriter() {
    if (rewriterInstance) return rewriterInstance;
    if (!("Rewriter" in self)) {
      console.warn("Rewriter API not supported in this Chrome version.");
      return null;
    }

    const availability = await Rewriter.availability();
    if (availability !== "available") {
      console.warn(`Rewriter not available (status: ${availability}).`);
      return null;
    }

    rewriterInstance = await Rewriter.create({
      tone: "more-casual",
      format: "plain-text",
      length: "as-is",
      sharedContext:
        "Replace only emotionally intense or insulting words with calm, neutral alternatives. Keep all other text identical.",
    });

    return rewriterInstance;
  }

  // Clean undesired model noise
  function cleanAIOutput(text) {
    if (!text) return "";
    return text
      .replace(/^(\s*(okay|sure|please|note|understand|here is).*)$/gim, "")
      .replace(/(^|\n)(rewrite|summary|as requested|let's|below).*$/gim, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  // Rewrite a single node minimally
  async function softenNode(node, rewriter, prompt) {
    const original = node.nodeValue.trim();
    if (!original || PROCESSED.has(node)) return;

    try {
      const contextPrompt = `${prompt}\n\nIMPORTANT:
Do NOT invent or generate examples.
If no strong or insulting language exists, return the text unchanged.
Output only clean rewritten text, no labels or prefixes.`;
      const stream = rewriter.rewriteStreaming(original, {
        context: contextPrompt,
        tone: "more-casual",
        length: "as-is",
      });

      let rewritten = "";
      for await (const chunk of stream) {
        rewritten += chunk;
      }

      rewritten = cleanAIOutput(rewritten);

      if (rewritten && rewritten !== original) {
        ORIGINAL_TEXT.set(node, original);
        node.nodeValue = rewritten;
      }

      PROCESSED.add(node);
    } catch (err) {
      console.warn("Node rewrite failed:", err);
    }
  }

  // Apply rewriting to the entire page
  async function applyToPage() {
    const nodes = Array.from(textNodeIterator(document.body));
    const rewriter = await ensureRewriter();
    const prompt = await loadPrompt();

    if (!rewriter) return { ok: false, error: "no_rewriter" };
    if (!nodes.length) return { ok: false, error: "no_text" };

    let changed = 0;
    console.log(`Starting minimal tone rewrite on ${nodes.length} text nodes...`);

    for (const node of nodes) {
      await softenNode(node, rewriter, prompt);
      changed++;
      if (changed % 15 === 0) await new Promise(r => setTimeout(r, 20));
    }

    TONE_APPLIED = true;
    console.log(`Tone adjustment complete (${changed} nodes processed).`);
    return { ok: true, changed };
  }

  // Revert softened text
  function revertPage() {
    let restored = 0;
    for (const [node, original] of ORIGINAL_TEXT.entries()) {
      node.nodeValue = original;
      restored++;
    }
    ORIGINAL_TEXT.clear();
    PROCESSED.clear();
    TONE_APPLIED = false;
    console.log(`Restored ${restored} nodes.`);
    return { ok: true, restored };
  }

  // Expose API globally
  const API = {
    apply: applyToPage,
    revert: revertPage,
    isApplied: () => TONE_APPLIED,
  };

  if (typeof window !== "undefined") window.MonoMindTone = API;
  if (typeof self !== "undefined") self.MonoMindTone = API;
})();
