// sidepanel.js

const OLLAMA_BASE = "http://localhost:11434";
const OLLAMA_URL  = `${OLLAMA_BASE}/api/generate`;
const MODEL       = "llama3.2";

// ── State ─────────────────────────────────────────────────────────────────────
let cvText     = "";
let cvName     = "";
let userName   = "";
let generating = false;
let cvMode     = "upload"; // "upload" | "paste"

// ── DOM refs ──────────────────────────────────────────────────────────────────
const cvDrop          = document.getElementById("cv-drop");
const cvFileInput     = document.getElementById("cv-file-input");
const cvLoaded        = document.getElementById("cv-loaded");
const cvFilename      = document.getElementById("cv-filename");
const cvClear         = document.getElementById("cv-clear");
const cvPill          = document.getElementById("cv-pill");

const cvPasteText     = document.getElementById("cv-paste-text");
const cvPasteApply    = document.getElementById("cv-paste-apply");
const cvPasteClear    = document.getElementById("cv-paste-clear");
const cvPasteNameDisp = document.getElementById("cv-paste-name-display");

const jobDesc         = document.getElementById("job-desc");
const jobPill         = document.getElementById("job-pill");
const closing             = document.getElementById("closing");
const extraInstructions   = document.getElementById("extra-instructions");
const btnExtract      = document.getElementById("btn-extract");
const extractStatus   = document.getElementById("extract-status-text");
const btnGenerate     = document.getElementById("btn-generate");
const statusEl        = document.getElementById("status");
const outputSection   = document.getElementById("output-section");
const outputText      = document.getElementById("output-text");
const btnCopy             = document.getElementById("btn-copy");
const btnRegenerate       = document.getElementById("btn-regenerate");
const ollamaStatusDot     = document.getElementById("ollama-status-dot");
const ollamaStatusText    = document.getElementById("ollama-status-text");
const modelSelect         = document.getElementById("model-select");
const ollamaModal         = document.getElementById("ollama-modal");
const ollamaModalDismiss  = document.getElementById("ollama-modal-dismiss");

// ── Ollama health check ────────────────────────────────────────────────────────
async function checkOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`);
    if (!res.ok) throw new Error();
    const { models } = await res.json();
    const names = (models || []).map(m => m.name.replace(/:latest$/, ""));

    ollamaStatusDot.className    = "running";
    ollamaStatusText.textContent = "Ollama · ";

    modelSelect.innerHTML = names.length
      ? names.map(n => `<option value="${n}">${n}</option>`).join("")
      : `<option value="${MODEL}">${MODEL}</option>`;

    // Pre-select the default model if present, otherwise first available
    if (names.includes(MODEL)) modelSelect.value = MODEL;

    modelSelect.style.display = "";
    modelSelect.disabled      = false;
  } catch {
    ollamaStatusDot.className    = "stopped";
    ollamaStatusText.textContent = "Ollama not running";
    modelSelect.style.display    = "none";

    ollamaModal.classList.add("visible");
  }
}

ollamaModalDismiss.addEventListener("click", () => {
  ollamaModal.classList.remove("visible");
});

checkOllamaStatus();

// ── Collapsible sections ───────────────────────────────────────────────────────
document.querySelectorAll(".section-header[data-toggle]").forEach(header => {
  header.addEventListener("click", () => {
    const sectionId = header.getAttribute("data-toggle");
    const section   = document.getElementById(sectionId);
    if (section) section.classList.toggle("open");
  });
});

// ── CV Tabs (Upload / Paste) ───────────────────────────────────────────────────
document.querySelectorAll(".cv-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".cv-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".cv-input-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    cvMode = tab.dataset.tab;
    document.getElementById(`cv-panel-${cvMode}`).classList.add("active");

    // If switching away from paste and paste has uncommitted text, warn softly
    if (cvMode === "upload" && cvPasteText.value.trim() && !cvText) {
      showStatus("Don't forget to click ✓ Apply after pasting your CV.", "info");
    }
  });
});

// ── CV Upload ──────────────────────────────────────────────────────────────────
cvDrop.addEventListener("click", () => cvFileInput.click());
cvDrop.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") cvFileInput.click(); });
cvDrop.addEventListener("dragover", e => { e.preventDefault(); cvDrop.classList.add("dragover"); });
cvDrop.addEventListener("dragleave", () => cvDrop.classList.remove("dragover"));
cvDrop.addEventListener("drop", e => {
  e.preventDefault();
  cvDrop.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) loadCVFile(file);
});
cvFileInput.addEventListener("change", () => {
  if (cvFileInput.files[0]) loadCVFile(cvFileInput.files[0]);
});

function loadCVFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    setCVText(e.target.result, file.name);
    cvDrop.style.display = "none";
    cvLoaded.classList.add("visible");
    cvFilename.textContent = file.name;
  };
  reader.readAsText(file);
}

cvClear.addEventListener("click", () => {
  clearCV();
  cvDrop.style.display = "";
  cvLoaded.classList.remove("visible");
  cvFileInput.value = "";
});

// ── CV Paste ───────────────────────────────────────────────────────────────────
cvPasteApply.addEventListener("click", () => {
  const text = cvPasteText.value.trim();
  if (!text) {
    showStatus("Please paste your CV text first.", "error");
    return;
  }
  setCVText(text, "pasted CV");
  cvPasteNameDisp.textContent = userName ? `✓ Name detected: ${userName}` : "✓ CV applied";
  cvPasteApply.textContent = "✓ Applied";
  setTimeout(() => { cvPasteApply.textContent = "✓ Apply"; }, 2000);
});

cvPasteClear.addEventListener("click", () => {
  cvPasteText.value = "";
  cvPasteNameDisp.textContent = "";
  clearCV();
});

// Live re-apply when paste text changes after already being applied
cvPasteText.addEventListener("input", () => {
  if (cvText && cvMode === "paste") {
    // Mark as dirty until re-applied
    cvPasteNameDisp.textContent = "Edit detected — click ✓ Apply to update";
    cvPasteNameDisp.style.color = "var(--muted)";
  }
});

// ── Shared CV helpers ──────────────────────────────────────────────────────────
function setCVText(text, label) {
  cvText   = text;
  cvName   = label;
  userName = extractName(text);

  // Update header pill
  cvPill.textContent = userName || "Loaded";
  cvPill.classList.add("visible");

  updateGenerateButton();
  showStatus(`CV loaded${userName ? ` · Name detected: ${userName}` : ""}`, "success");

  // Auto-collapse CV section now it's set
  document.getElementById("section-cv").classList.remove("open");
}

function clearCV() {
  cvText = ""; cvName = ""; userName = "";
  cvPill.textContent = "";
  cvPill.classList.remove("visible");
  updateGenerateButton();
  hideStatus();
}

function extractName(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 6)) {
    const cleaned = line
      .replace(/^#+\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/[_`]/g, "")
      .trim();
    const words = cleaned.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      words.every(w => /^[A-Z][a-zA-Z'\-]+$/.test(w))
    ) {
      return cleaned;
    }
  }
  return "";
}

// ── Extract Job Description ────────────────────────────────────────────────────
btnExtract.addEventListener("click", async () => {
  btnExtract.disabled    = true;
  btnExtract.textContent = "Extracting…";
  extractStatus.textContent = "Reading page…";

  try {
    const response = await chrome.runtime.sendMessage({ type: "EXTRACT_PAGE_CONTENT" });
    if (response?.error) throw new Error(response.error);
    const text = response?.text || "";
    if (text.trim().length < 50) {
      showStatus("Couldn't extract much from this page — please paste manually.", "error");
    } else {
      jobDesc.value = text.trim();
      extractStatus.textContent = "Extracted — edit as needed";
      jobPill.textContent = "Extracted";
      jobPill.classList.add("visible");
      showStatus("Job description extracted. Review and edit before generating.", "info");
      updateGenerateButton();
    }
  } catch (err) {
    showStatus("Extraction failed: " + err.message, "error");
    extractStatus.textContent = "Extraction failed — paste manually";
  } finally {
    btnExtract.disabled    = false;
    btnExtract.textContent = "↓ Extract from page";
  }
});

jobDesc.addEventListener("input", () => {
  updateGenerateButton();
  if (jobDesc.value.trim()) {
    jobPill.textContent = "Ready";
    jobPill.classList.add("visible");
  } else {
    jobPill.classList.remove("visible");
  }
  chrome.storage.local.set({ savedJobDesc: jobDesc.value });
});

// ── Generate ───────────────────────────────────────────────────────────────────
function updateGenerateButton() {
  btnGenerate.disabled = !cvText || !jobDesc.value.trim() || generating;
}

async function generate() {
  if (generating) return;
  generating = true;
  updateGenerateButton();

  outputText.textContent = "";

  // Show and open output section
  outputSection.classList.add("visible");
  outputSection.classList.add("open");
  outputSection.querySelector(".section-body-wrap").style.gridTemplateRows = ""; // let .open handle it

  // Add generating class to the inner section div
  const outputInner = outputSection;
  outputInner.classList.add("generating");

  showStatus("Connecting to Ollama…", "info");

  const prompt = buildPrompt();

  try {
    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: modelSelect.value || MODEL, prompt, stream: true })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama returned ${res.status}: ${err}`);
    }

    showStatus("Generating…", "info");

    const reader   = res.body.getReader();
    const decoder  = new TextDecoder();
    let   fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n").filter(Boolean)) {
        try {
          const obj = JSON.parse(line);
          if (obj.response) {
            fullText += obj.response;
            outputText.textContent = fullText;
            window.scrollTo(0, document.body.scrollHeight);
          }
          if (obj.done) break;
        } catch (_) { /* partial JSON */ }
      }
    }

    outputInner.classList.remove("generating");
    showStatus("Cover letter ready!", "success");

    // Scroll output into view
    outputSection.scrollIntoView({ behavior: "smooth", block: "nearest" });

  } catch (err) {
    outputInner.classList.remove("generating");
    let msg = err.message;
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      msg = "Cannot reach Ollama. Make sure it's running on localhost:11434.";
    }
    showStatus(msg, "error");
  } finally {
    generating = false;
    updateGenerateButton();
  }
}

function buildPrompt() {
  const name = userName ? `The applicant's name is ${userName}.` : "";
  const closingNote = closing.value.trim()
    ? `End the cover letter with this closing line: "${closing.value.trim()}"`
    : "End with a professional closing line.";

  const extra = extraInstructions.value.trim();

  return `You are an expert cover letter writer. Write a professional, compelling, and personalised cover letter.

${name}

--- CV / RESUME ---
${cvText}

--- JOB DESCRIPTION ---
${jobDesc.value.trim()}

--- INSTRUCTIONS ---
- Write the full cover letter in plain text, no markdown formatting.
- Match the tone and language of the job description.
- Highlight the most relevant experience and skills from the CV.
- Be concise — aim for 3-4 paragraphs.
- Do NOT include a date or address block.
- Start directly with "Dear Hiring Manager," or use the company name if visible in the job description.
- ${closingNote}
- Sign off with the applicant's name${userName ? ` (${userName})` : ""}.${extra ? `\n- ${extra.split("\n").join("\n- ")}` : ""}

Write the cover letter now:`;
}

btnGenerate.addEventListener("click",   generate);
btnRegenerate.addEventListener("click", generate);

// ── Copy ───────────────────────────────────────────────────────────────────────
btnCopy.addEventListener("click", async () => {
  const text = outputText.textContent.trim();
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    btnCopy.textContent = "Copied!";
    setTimeout(() => { btnCopy.textContent = "Copy to clipboard"; }, 2000);
  } catch (_) {
    showStatus("Clipboard access denied.", "error");
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────
function showStatus(msg, type = "info") {
  statusEl.textContent = msg;
  statusEl.className   = type;
}
function hideStatus() {
  statusEl.textContent = "";
  statusEl.className   = "";
}

// Restore saved job desc
chrome.storage.local.get(["savedJobDesc"], result => {
  if (result.savedJobDesc) {
    jobDesc.value = result.savedJobDesc;
    if (jobDesc.value.trim()) {
      jobPill.textContent = "Ready";
      jobPill.classList.add("visible");
      updateGenerateButton();
    }
  }
});
