// background.js — opens the side panel when the action icon is clicked

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from the side panel requesting page content extraction
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "EXTRACT_PAGE_CONTENT") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) {
        sendResponse({ error: "No active tab found" });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_TEXT" }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script not running (e.g. SPA navigation) — inject it and retry
          chrome.scripting.executeScript(
            { target: { tabId: tabs[0].id }, files: ["content.js"] },
            () => {
              if (chrome.runtime.lastError) {
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
              }
              chrome.tabs.sendMessage(tabs[0].id, { type: "GET_PAGE_TEXT" }, (response2) => {
                if (chrome.runtime.lastError) {
                  sendResponse({ error: chrome.runtime.lastError.message });
                } else {
                  sendResponse(response2);
                }
              });
            }
          );
        } else {
          sendResponse(response);
        }
      });
    });
    return true; // keep channel open for async response
  }
});
