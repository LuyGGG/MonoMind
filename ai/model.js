// ai/model.js
(function () {
  async function lmAvailability() {
    // 检查 chrome.ml 是否可用
    if (!chrome?.ml?.getLanguageModel) {
      return { ok:false, status:'no-LanguageModel-API' };
    }
    
    try {
      const model = await chrome.ml.getLanguageModel();
      const status = await model.availability({
      expectedInputs:  [
        { type: 'text',  languages: ['en'] },
        { type: 'image' }              // 你会做多模态，所以要声明
      ],
      expectedOutputs: [{ type: 'text', languages: ['en'] }]
    });
      const ok = ['readily','downloadable','downloading'].includes(status);
      return { ok, status };
    } catch (e) { 
      console.error('[MonoMind/AI] Error:', e);
      return { ok:false, status: e?.message || 'error' }; 
    }
  }

  let _session;
  async function getSession() {
    if (_session) return _session;
    
    try {
      const model = await chrome.ml.getLanguageModel();
      _session = await model.create({
        expectedInputs:  [{ type: 'text', languages: ['en'] }, { type: 'image' }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        defaultOutputLanguage: 'en',
        monitor(m) {
          m.addEventListener('downloadprogress', e =>
            console.log('[AI] download', Math.round(e.loaded*100)+'%'));
        }
      });
      return _session;
    } catch (e) {
      console.error('[MonoMind/AI] Session creation error:', e);
      throw e;
    }
  }

  // ✅ 每次 prompt 时都显式指定输出语言
  async function promptText(text, opts = {}) {
    const s = await getSession();
    const merged = {
      ...opts,
      output: { type: 'text', language: 'en', ...(opts.output || {}) }
    };
    return s.prompt(text, merged);
  }

  // ✅ 多模态同样在 prompt 的 options 里指定输出语言
  async function classifyImage(blob) {
    const s = await getSession();
    const system = `Return strict JSON {label: violent|gore|sexual|high-contrast|flashing|ad-like|safe, action: hide|blur|desaturate|none, confidence: 0..1}`;
    const res = await s.prompt(
      [
        { role: 'user', content: [
          { type: 'image', value: blob },
          { type: 'text',  value: system }
        ] }
      ],
      { 
        output: { 
          type: 'text', 
          language: 'en'  // 确保每次调用都指定输出语言
        },
      }
    );
    try { return typeof res === 'string' ? JSON.parse(res) : res; }
    catch { return { label: 'safe', action: 'none', confidence: 0 }; }
  }

  self.MonoMindAI = { lmAvailability, getSession, promptText, classifyImage };
})();
