# Cover Letter Writer — Chrome Extension

An AI-powered cover letter generator that runs entirely on your local machine using Ollama.

---

## Prerequisites

- [Ollama](https://ollama.ai) installed and running
- The `llama3.2` model pulled: `ollama pull llama3.2`
- Google Chrome (or any Chromium-based browser)

---

## Installation (No App Store needed)

1. **Download / unzip** this folder somewhere on your computer (e.g. `~/cover-letter-extension`)

2. **Open Chrome** and navigate to: `chrome://extensions`

3. **Enable Developer Mode** — toggle in the top-right corner

4. **Click "Load unpacked"** — select the `cover-letter-extension` folder

5. The extension icon will appear in your toolbar. **Pin it** for easy access.

---

## Usage

1. Navigate to a job listing page in Chrome
2. Click the extension icon to open the side panel
3. **Upload your CV** (`.md` or `.txt`) — your name is extracted automatically
4. Click **"↓ Extract from page"** to pull the job description, then review and edit it
5. Optionally add a custom closing line
6. Click **GENERATE COVER LETTER**
7. Copy the result to your clipboard

---

## Ollama Setup

Make sure Ollama is running before generating:

```bash
# Start Ollama (if not already running as a service)
ollama serve

# In another terminal, confirm the model is available
ollama list
```

If you see a connection error in the extension, check that Ollama is running on `http://localhost:11434`.

### Allow the extension to reach Ollama (required)

Chrome extensions have a `chrome-extension://` origin that Ollama blocks by default. You must allow it or generation will silently fail.

**One-time fix (macOS):**

```bash
launchctl setenv OLLAMA_ORIGINS "chrome-extension://*"
```

Then restart Ollama (quit the app or stop `ollama serve` and start it again).

**Per-session alternative:**

```bash
OLLAMA_ORIGINS=chrome-extension://* ollama serve
```

> **Symptom if missing:** DevTools Network tab shows many `net::ERR_FAILED` fetch requests with 0 kB transferred.

### Changing the model

Open `sidepanel.js` and change the `MODEL` constant at the top:

```js
const MODEL = "llama3.2"; // change to e.g. "mistral", "llama3.1", etc.
```

---

## Hosting on your personal website (optional)

You can offer the extension as a download from your website. Simply zip the extension folder and link to it:

```html
<a href="/downloads/cover-letter-extension.zip">Download Cover Letter Extension</a>
```

Users follow the same "Load unpacked" steps above after unzipping.

> **Note:** Chrome will show a warning that the extension isn't from the Web Store — this is normal for developer/personal extensions. Click "Keep" to dismiss.

---

## File Structure

```
cover-letter-extension/
├── manifest.json       # Extension configuration
├── background.js       # Service worker (opens side panel)
├── content.js          # Injected into pages to extract job descriptions
├── sidepanel.html      # The UI
├── sidepanel.js        # All logic (CV parsing, Ollama API, generation)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```
