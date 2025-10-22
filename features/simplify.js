// features/simplify.js
// Summarize the current page into key points and show them in an alert.

window.MonoMindSimplify = window.MonoMindSimplify || {};

window.MonoMindSimplify.summarizeToAlert = async function () {
  // 1) Feature detection
  if (!('Summarizer' in self)) {
    alert("❌ Summarizer API not supported in this browser or context.");
    return;
  }

  // 2) Check availability
  let availability;
  try {
    availability = await Summarizer.availability();
  } catch (err) {
    alert("💥 Could not query Summarizer availability:\n" + err.message);
    console.error(err);
    return;
  }

  if (availability === 'unavailable') {
    alert("❌ Model unavailable on this device.");
    return;
  }

  // 3) Create the summarizer (must be called during a user gesture)
  //    If model is 'downloadable', creation will trigger download.
  if (!navigator.userActivation.isActive) {
    alert("⚠️ Please click the MonoMind button again to allow model init/download.");
    return;
  }

  let summarizer;
  try {
    summarizer = await Summarizer.create({
      type: 'key-points',
      format: 'markdown',     // Chrome returns bullet points in markdown
      length: 'short',        // 3 bullets (per Chrome’s implementation)
      expectedInputLanguages: ['en'],
      expectedContextLanguages: ['en'],
      outputLanguage: "en",
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          // e.loaded is 0..1; you could surface progress if you want
          console.debug(`Gemini Nano download: ${Math.round(e.loaded * 100)}%`);
        });
      }
    });
  } catch (err) {
    alert("💥 Could not create Summarizer:\n" + err.message);
    console.error(err);
    return;
  }

  // 4) Prepare input text (use rendered text, not HTML)
  const text = (document.body?.innerText || '').trim().slice(0, 15000);
  if (!text) {
    alert("ℹ️ Nothing to summarize on this page.");
    return;
  }

  // 5) Summarize and show
  try {
    const summary = await summarizer.summarize(text, {
      context: "Summarise the main points for a busy reader."
    });

    // Alerts show plain text; markdown bullets render as lines starting with '-'
    alert(summary);
  } catch (err) {
    alert("💥 Summarization failed:\n" + err.message);
    console.error(err);
  }
};