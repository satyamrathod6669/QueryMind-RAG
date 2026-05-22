// This file runs on every page
// It just sends the current URL to popup.js when needed

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getUrl") {
    sendResponse({ url: window.location.href });
  }
});
