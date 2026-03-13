// content.js — injected into every page to extract readable text

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PAGE_TEXT") {
    const text = extractJobDescription();
    sendResponse({ text });
  }
});

function extractJobDescription() {
  // Remove noisy elements
  const REMOVE_TAGS = ["script", "style", "noscript", "nav", "header", "footer", "iframe", "svg"];
  const cloned = document.body.cloneNode(true);
  REMOVE_TAGS.forEach(tag => {
    cloned.querySelectorAll(tag).forEach(el => el.remove());
  });

  // Try to find the main content area first
  const candidates = [
    cloned.querySelector("main"),
    cloned.querySelector("article"),
    cloned.querySelector('[class*="job-description"]'),
    cloned.querySelector('[class*="job_description"]'),
    cloned.querySelector('[class*="jobDescription"]'),
    cloned.querySelector('[class*="description"]'),
    cloned.querySelector('[id*="job-description"]'),
    cloned.querySelector('[id*="jobDescription"]'),
    cloned.querySelector('[role="main"]'),
  ].filter(Boolean);

  const source = candidates.length > 0 ? candidates[0] : cloned;
  const raw = source.innerText || source.textContent || "";

  // Clean up whitespace
  return raw
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .join("\n")
    .substring(0, 8000); // cap to avoid overwhelming the model
}
