# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Chrome extension (Manifest V3) that generates cover letters using a locally-running [Ollama](https://ollama.ai) instance. No build step — the extension is loaded directly into Chrome as an unpacked extension.

## Loading / reloading the extension

There is no build process. To test changes:

1. Open `chrome://extensions` in Chrome
2. Enable **Developer Mode**
3. Click **Load unpacked** and select this folder (first time only)
4. After editing files, click the **Reload** button on the extension card

## Prerequisites for running

```bash
ollama serve          # ensure Ollama is running on http://localhost:11434
ollama pull llama3.2  # pull the default model (first time only)
```

## Architecture

The extension follows the standard Chrome MV3 messaging pattern across three isolated contexts:

```
sidepanel.js (UI) ──→ background.js (service worker) ──→ content.js (page)
     │                                                          │
     └── fetches Ollama directly via http://localhost:11434 ◄──┘
```

- **`background.js`** — service worker; opens the side panel on toolbar click and relays messages between the side panel and the content script (the side panel cannot directly message content scripts).
- **`content.js`** — injected into every page; extracts job description text from the DOM when asked, using a priority list of semantic selectors (`main`, `article`, `[class*="job-description"]`, etc.), capped at 8 000 characters.
- **`sidepanel.js`** — all application logic: CV file loading, name extraction heuristic, job description extraction trigger, prompt construction, streaming Ollama API call, and clipboard copy. Persists the job description textarea to `chrome.storage.local`.
- **`sidepanel.html`** — self-contained UI with inline CSS (no external stylesheet). All styles live here; fonts are loaded from Google Fonts.

## Changing the model

Edit the constant at the top of `sidepanel.js`:

```js
const MODEL = "llama3.2"; // change to e.g. "mistral", "llama3.1"
```

## Key Chrome APIs used

- `chrome.sidePanel` — opens/manages the side panel
- `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage` — cross-context messaging
- `chrome.storage.local` — persisting the job description between sessions
- `chrome.scripting` — declared in manifest permissions (used implicitly by MV3)
