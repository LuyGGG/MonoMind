// MonoMind - Autism-friendly Tone Softener (Chrome Rewriter API Edition)
// Uses Gemini Nano Rewriter to rewrite webpage text into calm, clear, emotionally safe language.

(() => {
    const DEFAULT_EXCLUDE = [
      "script","style","noscript","code","pre","textarea","input","svg","math","kbd","samp"
    ].join(",");
  
    const ORIGINAL_TEXT = new WeakMap();
    const PROCESSED = new WeakSet();
    let TONE_APPLIED = false;
    let rewriterInstance = null;
  
    /** Traverse visible text nodes */
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
            if (style && (style.visibility === "hidden" || style.display === "none")) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          },
        },
        false
      );
      let cur;
      while ((cur = walker.nextNode())) yield cur;
    }
  
    /** Load autism-friendly prompt */
    async function loadPrompt() {
      const url = chrome.runtime.getURL("features/prompts/autism_friendly_prompt.txt");
      const res = await fetch(url);
      return res.text();
    }
  
    /** Ensure Rewriter API instance */
    async function ensureRewriter() {
      if (rewriterInstance) return rewriterInstance;
      if (!("Rewriter" in self)) {
        console.warn("❌ Rewriter API not available in this browser.");
        return null;
      }
  
      const availability = await Rewriter.availability();
      if (availability === "unavailable") {
        console.warn("❌ Rewriter API unavailable.");
        return null;
      }
  
      rewriterInstance = await Rewriter.create({
        tone: "more-casual",
        format: "plain-text",
        length: "as-is",
        sharedContext:
          "This tool rewrites web page text to sound calm, kind, clear, and emotionally safe for autistic readers.",
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            console.log(`Model downloading: ${(e.loaded * 100).toFixed(1)}%`);
          });
        },
      });
      return rewriterInstance;
    }
  
    /** Rewrite text via Gemini Nano */
    async function softenWithAI(text) {
      try {
        const rewriter = await ensureRewriter();
        if (!rewriter) return text;
        const prompt = await loadPrompt();
        const result = await rewriter.rewrite(text, { context: prompt, tone: "more-casual" });
        return result || text;
      } catch (err) {
        console.error("Rewriter failed:", err);
        return text;
      }
    }
  
    /** Apply softening */
    async function applyToPage() {
      let changed = 0, scanned = 0;
      const nodes = Array.from(textNodeIterator(document.body));
      for (const node of nodes) {
        scanned++;
        if (PROCESSED.has(node)) continue;
        const original = node.nodeValue.trim();
        if (!original) continue;
        const rewritten = await softenWithAI(original);
        if (rewritten && rewritten !== original) {
          ORIGINAL_TEXT.set(node, original);
          node.nodeValue = rewritten;
          changed++;
        }
        PROCESSED.add(node);
      }
      if (changed > 0) TONE_APPLIED = true;
      return { ok: true, scanned, changed };
    }
  
    /** Revert softened text */
    function revertPage() {
      let restored = 0;
      for (const node of textNodeIterator(document.body)) {
        if (ORIGINAL_TEXT.has(node)) {
          node.nodeValue = ORIGINAL_TEXT.get(node);
          ORIGINAL_TEXT.delete(node);
          restored++;
        }
        PROCESSED.delete(node);
      }
      TONE_APPLIED = false;
      return { ok: true, restored };
    }
  
    const API = { apply: applyToPage, revert: revertPage, isApplied: () => TONE_APPLIED };
    if (typeof window !== "undefined") window.MonoMindTone = API;
    if (typeof self !== "undefined") self.MonoMindTone = API;
  })();
  