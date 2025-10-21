// content.js
importScripts?.()

async function ensureAI() {
  try {
    if (!self.ai || !ai.summarizer) return { ok: false, status: 'no_ai' }
    const status = await ai.summarizer.availability()
    const ok = status === 'available' || status === 'downloadable'
    return { ok, status }
  } catch (e) {
    return { ok: false, status: 'error', error: String(e) }
  }
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
  (async () => {
    try {
      const { action } = req || {}

      // ---- Tone ----
      if (action === 'tone:apply') {
        const options = req.options || { level: 'medium' }
        if (!window.MonoMindTone?.apply) return sendResponse({ ok: false, error: 'MonoMindTone not loaded' })
        const out = window.MonoMindTone.apply(options)
        return sendResponse({ ok: true, data: out })
      }

      if (action === 'tone:revert') {
        if (!window.MonoMindTone?.revert) return sendResponse({ ok: false, error: 'MonoMindTone not loaded' })
        const out = window.MonoMindTone.revert()
        return sendResponse({ ok: true, data: out })
      }

      if (action === 'tone:state') {
        const applied = !!window.MonoMindTone?.isApplied?.()
        return sendResponse({ ok: true, applied })
      }

      // ---- Simplify（若依赖 AI 再检查）----
      if (action === 'simplify_page') {
        if (!window.MonoMindSimplify?.simplifyCurrentPage)
          return sendResponse({ ok: false, error: 'MonoMindSimplify not loaded' })

        const ai = await ensureAI()
        if (!ai.ok) return sendResponse({ ok: false, error: `AI ${ai.status}` })

        const out = await window.MonoMindSimplify.simplifyCurrentPage()
        return sendResponse({ ok: true, data: out })
      }

      // ---- Calm ----
      if (action === 'calm_mode') {
        if (!window.MonoMindCalm?.toggleCalm)
          return sendResponse({ ok: false, error: 'MonoMindCalm not loaded' })
        const out = window.MonoMindCalm.toggleCalm()
        return sendResponse({ ok: true, data: out })
      }

      return sendResponse({ ok: false, error: 'unknown_action' })
    } catch (err) {
      return sendResponse({ ok: false, error: String(err) })
    }
  })()
  return true
})
