// /api/prompt.js
// Robust Prompt helper with multi-shape fallbacks for current Web AI variations.

async function dataUrlToImageBitmap(dataUrl) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return await createImageBitmap(blob);
}

async function getPromptSession() {
  if ('LanguageModel' in self) {
    const availability = await LanguageModel.availability().catch(() => 'unavailable');
    if (availability === 'unavailable') throw new Error('Prompt API unavailable');

    const session = await LanguageModel.create({
      expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }]
    });

    async function tryPrompt(shapes) {
      let lastErr;
      for (const build of shapes) {
        try {
          const out = await session.prompt(build());
          return typeof out === 'string' ? out : (out?.output_text || out?.text || JSON.stringify(out));
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr || new Error('All prompt shapes failed');
    }

    return {
      async promptImageAndText(imageBitmap, sysText) {
        const userText = 'Analyze this screenshot and respond with STRICT JSON only.';
        const shapes = [
          // Shape A: {type:'text'| 'image', text | data, mimeType}
          () => ([
            { role: 'system', content: [{ type: 'text', text: sysText }] },
            { role: 'user',   content: [
              { type: 'text', text: userText },
              { type: 'image', data: imageBitmap, mimeType: 'image/png' }
            ] }
          ]),
          // Shape B: use "value" instead of "text"
          () => ([
            { role: 'system', content: [{ type: 'text', value: sysText }] },
            { role: 'user',   content: [
              { type: 'text', value: userText },
              { type: 'image', data: imageBitmap, mimeType: 'image/png' }
            ] }
          ]),
          // Shape C: image first
          () => ([
            { role: 'user', content: [
              { type: 'image', data: imageBitmap, mimeType: 'image/png' },
              { type: 'text', text: sysText }
            ] }
          ]),
          // Fallback: text only (no image)
          () => ([
            { role: 'user', content: [{ type: 'text', text: sysText + '\n\n(IMAGE ATTACHMENT FAILED; proceed text-only.)' }] }
          ])
        ];
        return await tryPrompt(shapes);
      },
      close(){ try{ session?.destroy?.(); }catch(_){} }
    };
  }

  if (self.ai?.assistant?.create) {
    const assistant = await self.ai.assistant.create();
    return {
      async promptImageAndText(imageBitmap, sysText) {
        // Assistant API may accept similar shapes
        const out = await assistant.prompt([
          { role: 'system', content: [{ type: 'text', text: sysText }] },
          { role: 'user',   content: [
            { type: 'text', text: 'Analyze this screenshot and respond with STRICT JSON only.' },
            { type: 'image', data: imageBitmap, mimeType: 'image/png' }
          ] }
        ]);
        return typeof out === 'string' ? out : (out?.text ?? JSON.stringify(out));
      },
      close(){ try{ assistant?.destroy?.(); }catch(_){} }
    };
  }

  throw new Error('Prompt API unavailable');
}

function buildOptimizePrompt() {
  return `You are an accessibility-focused front-end expert.
Return STRICT JSON only (no markdown), exactly:
{
  "css": "/* safe, reversible CSS that reduces visual stimuli */",
  "explanation": "short reasoning in English",
  "hints": ["concise point 1", "concise point 2"]
}
Guidelines:
- Reduce contrast/saturation and harsh shadows; carefully disable animations/transitions.
- Slightly improve readability (line-height/letter-spacing/font-size).
- Do not break layout/interaction; avoid broad display:none.
- Prefer html/body/common classes; avoid the universal selector (*).`;
}

window.__Prompt = { dataUrlToImageBitmap, getPromptSession, buildOptimizePrompt };
