# MonoMind
🧠 MonoMind – Read Calmer, Feel Safer
MonoMind is a Chrome extension designed with autism-friendly principles in mind.
It helps users reduce emotional and sensory overload while reading online, making web content calmer, clearer, and easier to process.

🪶 Tagline
“Read calmer, feel safer — one page at a time.”

💙 Who It’s For
MonoMind is especially helpful for:
-	People on the autism spectrum (ASD)
-	Those sensitive to strong language or visual stimulation
-	Readers who prefer gentle tone and simpler wording
-	Anyone who wants a quieter, less overwhelming reading experience

✨ Features
🕊️ Soften Tone
Use Rewrite API to rewrite emotionally intense or aggressive text into neutral, balanced language. You can apply or revert it anytime — instantly.
📖 Summarize Content
Uses Chrome’s Summarizer API to generate concise and easy-to-understand summaries of web pages.
🧩 Remove Image
Temporarily hides distracting images and videos. Click again to bring them back.
🎨 Style Optimize （In Development）
Uses the Prompt API to suggest calmer, more comfortable color schemes and layouts. You can apply or undo these AI-generated styles safely.

🧭 How It Works
MonoMind runs directly in Chrome using its built-in on-device AI models:
•	Rewriter API → Tone softening
•	Summarizer API → Content simplification
•	Prompt API → Visual design optimization
All processing happens locally, right in your browser. ✅ No data leaves your device — nothing is uploaded or tracked.
💡 Example Uses
•	Make intense or emotional articles calmer to read
•	Simplify complex documents or research papers
•	Reduce sensory overload during long reading sessions
•	Adjust web design for a more soothing experience

🔒 Privacy
MonoMind is 100% local. It does not collect, send, or store any user data. Everything — rewriting, summarizing, or optimizing — happens within Chrome’s local AI runtime.

📦 Installation
1.	Enable each of the below flags in chrome://flags and restart Chrome:
#prompt-api-for-gemini-nano
#rewriter-api
#summarizer-api
#optimization-guide-on-device-model
2.	Open chrome://extensions
3.	Enable Developer mode
4.	Click Load unpacked
5.	Select your monomind/ project folder
The MonoMind icon will appear in your toolbar.

⚙️ Usage
1.	Open any webpage (not Chrome’s internal pages or the Web Store).
2.	Click the MonoMind icon in your toolbar.
3.	Choose an action:
•	🕊️ Soften Tone — rewrite for calmer language
•	📖 Summarize — get a concise summary
•	🧩 Remove Image — hide or restore visuals
4.	Check the log area to see progress and details.

🧩 Compatibility
•	Requires Google Chrome 127+ (supports Rewriter, Summarizer, and Prompt APIs)
•	Works on most webpages – not available on chrome://, about:, Web Store, or PDF previews.
•	Runs fully offline using local Gemini Nano models.

🧑‍💻 Developer Notes
Built with:
-	Manifest V3
-	Chrome AI APIs: Rewriter, Summarizer, Prompt
-	Modular architecture (MV3-safe, no inline scripts, full CSP compliance)

Core files:
manifest.json
popup.html
popup.js
content.js
api/prompt.js
features/
  ├── tone_rewriter.js
  ├── simplify.js
  ├── image.js
  ├── optimize.js
  └── prompts/
