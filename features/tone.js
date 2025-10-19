// features/tone.js
// MonoMind - Tone Softener (Autism-friendly)
// 把网页中过强/刺激的语气词替换为更温和的表达；收敛感叹号、全大写“喊话”等。

(() => {
    // -------- 配置 --------
    const DEFAULT_EXCLUDE = [
      "script","style","noscript","code","pre","textarea","input","svg","math","kbd","samp"
    ].join(",")
  
    // 词典（可继续扩展；尽量“温和且不改变事实判断”）
    const EMOTION_MAP_BASE = {
      // 负面强烈
      "\\b(hate|detest)\\b": "dislike",
      "\\b(terrible|awful|horrible|dreadful)\\b": "not ideal",
      "\\b(disgusting|gross)\\b": "unappealing",
      "\\b(stupid|dumb|idiotic)\\b": "not helpful",
      "\\b(useless)\\b": "not very useful",
      "\\b(worst)\\b": "not great",
      "\\b(horrendous)\\b": "very poor",
      "\\b(garbage|trash)\\b": "low quality",
      "\\b(insane|crazy)\\b": "overly intense",
  
      // 攻击性/人身
      "\\b(idiot|moron|loser)\\b": "person",
      "\\b(shut up)\\b": "please stop",
      "\\b(kill)\\b": "stop",
  
      // 绝对化 → 柔化
      "\\b(always)\\b": "often",
      "\\b(never)\\b": "rarely",
      "\\b(must)\\b": "might need to",
      "\\b(perfect)\\b": "very good",
      "\\b(disaster|catastrophe)\\b": "serious issue",
  
      // 夸张 → 收敛
      "\\b(amazing|awesome|incredible)\\b": "quite good",
      "\\b(love)\\b": "really like"
    }
  
    // 更强词典（max 模式启用）
    const EMOTION_MAP_STRONG = {
      "\\b(bad)\\b": "not good",
      "\\b(good)\\b": "fine",
      "\\b(sucks)\\b": "is not great",
      "\\b(angry|furious|outraged)\\b": "upset",
      "\\b(excellent|fantastic)\\b": "very good"
    }
  
    // 句首缓和短语
    const HEDGES = ["It seems", "It appears", "Perhaps", "Maybe"]
  
    // 状态（用于撤销/切换）
    const ORIGINAL_TEXT = new WeakMap() // TextNode -> 原文本
    const PROCESSED = new WeakSet()     // 是否处理过
    let TONE_APPLIED = false            // 是否已应用柔化
  
    // ---- 工具函数 ----
    function keepCase(sample, replacement) {
      if (!sample) return replacement
      const isUpper = sample === sample.toUpperCase()
      const isLower = sample === sample.toLowerCase()
      const isTitle = sample[0] === sample[0].toUpperCase() && sample.slice(1) === sample.slice(1).toLowerCase()
      if (isUpper) return replacement.toUpperCase()
      if (isTitle) return replacement[0].toUpperCase() + replacement.slice(1)
      if (isLower) return replacement.toLowerCase()
      return replacement
    }
  
    function softenSentenceStarts(text, level) {
      if (level === "soft") return text
      // ALL CAPS 整句 → 句首大写
      text = text.replace(/(^|[.!?]\s+)([A-Z]{2,})(?=[^a-zA-Z]|$)/g, (m, p1, p2) => {
        const lower = p2.toLowerCase()
        return p1 + lower[0].toUpperCase() + lower.slice(1)
      })
      // 强势句首 → 添加 hedge
      return text.replace(/(^|[.!?]\s+)(I (hate|love)|This (is|was)|Never|Always)\b/gi, (m, p1) => {
        const h = HEDGES[Math.floor(Math.random() * HEDGES.length)]
        return `${p1}${h} ${m.trim()}`
      })
    }
  
    function normalizePunctuation(text, level) {
      const toOne = level === "max" ? "." : "!"
      text = text.replace(/!{2,}/g, toOne)
      text = text.replace(/\?{2,}/g, "?")
      text = text.replace(/[!?]{3,}/g, level === "max" ? "." : "?")
      return text
    }
  
    function buildReplacers(level) {
      const dict = { ...EMOTION_MAP_BASE, ...(level === "max" ? EMOTION_MAP_STRONG : {}) }
      const rules = []
      for (const pattern in dict) rules.push({ re: new RegExp(pattern, "gi"), rep: dict[pattern] })
      return rules
    }
  
    function applyDictionary(text, rules) {
      for (const { re, rep } of rules) {
        text = text.replace(re, (match) => keepCase(match, rep))
      }
      return text
    }
  
    // 全大写词（喊话）→ 正常大小写；保留常见缩写
    function normalizeAllCaps(text) {
      return text.replace(/\b([A-Z]{3,})\b/g, (m) => {
        if (/(HTTP|HTTPS|CPU|GPU|API|UI|UX|URL|CSS|HTML|JSON|PDF|AI|NLP|OCR|SQL|DNS|IPV6)/.test(m)) return m
        const lower = m.toLowerCase()
        return lower[0].toUpperCase() + lower.slice(1)
      })
    }
  
    // —— 主处理（字符串 → 柔化后字符串）——
    function softenString(input, level = "medium") {
      if (!input || typeof input !== "string") return input
      let text = normalizePunctuation(input, level)
      text = normalizeAllCaps(text)
      text = applyDictionary(text, buildReplacers(level))
      text = softenSentenceStarts(text, level)
      return text
    }
  
    // 遍历可处理的文本节点
    function* textNodeIterator(root, exclude = DEFAULT_EXCLUDE) {
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT
            const parent = node.parentElement
            if (!parent) return NodeFilter.FILTER_REJECT
            if (parent.closest(exclude)) return NodeFilter.FILTER_REJECT
            const style = window.getComputedStyle(parent)
            if (style && (style.visibility === "hidden" || style.display === "none")) return NodeFilter.FILTER_REJECT
            return NodeFilter.FILTER_ACCEPT
          }
        },
        false
      )
      let cur
      while ((cur = walker.nextNode())) yield cur
    }
  
    // 应用到整页
    function applyToPage({ level = "medium", excludeSelectors } = {}) {
      const exclude = excludeSelectors ? `${DEFAULT_EXCLUDE},${excludeSelectors}` : DEFAULT_EXCLUDE
      let changed = 0, scanned = 0
  
      for (const node of textNodeIterator(document.body, exclude)) {
        scanned++
        if (PROCESSED.has(node)) continue
        const original = node.nodeValue
        const softened = softenString(original, level)
        if (softened !== original) {
          ORIGINAL_TEXT.set(node, original)
          node.nodeValue = softened
          changed++
        }
        PROCESSED.add(node)
      }
      if (changed > 0) TONE_APPLIED = true
      return { scanned, changed, level }
    }
  
    // 还原
    function revertPage() {
      let restored = 0
      for (const node of textNodeIterator(document.body)) {
        if (ORIGINAL_TEXT.has(node)) {
          node.nodeValue = ORIGINAL_TEXT.get(node)
          ORIGINAL_TEXT.delete(node)
          restored++
        }
        PROCESSED.delete(node)
      }
      TONE_APPLIED = false
      return { restored }
    }
  
    // 统计
    function stats() {
      return { trackedOriginals: ORIGINAL_TEXT ? ORIGINAL_TEXT.size || "n/a" : "n/a" }
    }
  
    // 暴露 API
    const API = {
      apply: applyToPage,
      revert: revertPage,
      stats,
      softenString,
      isApplied: () => TONE_APPLIED
    }
  
    if (typeof window !== "undefined") window.MonoMindTone = API
    if (typeof self !== "undefined") self.MonoMindTone = API
  
    // 消息通道（支持 state 查询）
    try {
      chrome?.runtime?.onMessage?.addListener((msg, _sender, sendResponse) => {
        if (!msg?.action) return
        if (msg.action === "tone:apply")  { sendResponse({ ok: true, ...API.apply(msg.options || {}) }); return true }
        if (msg.action === "tone:revert") { sendResponse({ ok: true, ...API.revert() }); return true }
        if (msg.action === "tone:stats")  { sendResponse(API.stats()); return true }
        if (msg.action === "tone:state")  { sendResponse({ ok: true, applied: API.isApplied() }); return true }
        return false
      })
    } catch {}
  })()
  