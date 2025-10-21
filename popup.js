// popup.js
const log = (m) => {
  const el = document.getElementById('log')
  if (!el) return
  el.textContent = typeof m === 'string' ? m : JSON.stringify(m, null, 2)
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab
}

function isRestrictedUrl(url = '') {
  return (
    url.startsWith('chrome://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('chrome-extension://')
  )
}

// 受限页提示；失败时自动注入后重试
async function send(action, payload = {}) {
  const tab = await activeTab()
  const url = tab?.url || ''

  if (isRestrictedUrl(url)) {
    log('当前页面不允许注入（如 chrome://、商店、PDF 预览）。请在普通网站页面上使用。')
    return { ok: false, error: 'restricted_page' }
  }

  try {
    const res = await chrome.tabs.sendMessage(tab.id, { action, ...payload })
    log(res)
    return res
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['features/tone.js', 'features/simplify.js', 'features/calm.js', 'content.js']
      })
      const res2 = await chrome.tabs.sendMessage(tab.id, { action, ...payload })
      log(res2)
      return res2
    } catch (err2) {
      log(`发送失败：${err2?.message || err2}`)
      return { ok: false, error: String(err2?.message || err2) }
    }
  }
}

/** ---------- Tone 单按钮切换 ---------- **/
function setToneButtonUI(applied) {
  const btn = document.getElementById('btn-tone')
  if (!btn) return
  btn.textContent = applied ? '撤销语气柔化' : '语气柔化'
  btn.setAttribute('aria-pressed', applied ? 'true' : 'false')
  btn.dataset.applied = applied ? '1' : '0'
}

async function toggleTone() {
  const state = await send('tone:state')
  const applied = !!state?.applied
  if (applied) {
    const r = await send('tone:revert')
    if (r?.ok) setToneButtonUI(false)
  } else {
    const r = await send('tone:apply', { options: { level: 'medium' } }) // 可改 soft/max
    if (r?.ok) setToneButtonUI(true)
  }
}

/** ---------- 绑定 ---------- **/
document.addEventListener('DOMContentLoaded', async () => {
  // 初始化按钮文案与状态
  const state = await send('tone:state')
  setToneButtonUI(!!state?.applied)

  document.getElementById('btn-tone')?.addEventListener('click', toggleTone)
  document.getElementById('btn-simplify')?.addEventListener('click', () => send('simplify_page'))
  document.getElementById('btn-calm')?.addEventListener('click', () => send('calm_mode'))

  log('Popup ready.')
})
