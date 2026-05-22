// =============================================
// QueryMind RAG - content.js
// Runs on every page to extract content
// =============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // ─── Get clean website text ──────────────────
  if (request.action === "getPageContent") {

    try {
      // Remove noise elements
      const noiseSelectors = [
        "script", "style", "nav", "footer", "header",
        "iframe", "noscript", "aside", ".ads", ".advertisement",
        "#cookie-banner", ".cookie", ".popup", ".modal"
      ];

      // Clone body to avoid modifying real page
      const bodyClone = document.body.cloneNode(true);

      // Remove noise from clone
      noiseSelectors.forEach(selector => {
        bodyClone.querySelectorAll(selector).forEach(el => el.remove());
      });

      // Get clean text
      let text = bodyClone.innerText || bodyClone.textContent || "";

      // Clean up whitespace
      text = text
        .replace(/\s+/g, " ")         // multiple spaces to one
        .replace(/\n{3,}/g, "\n\n")   // multiple newlines to two
        .trim();

      sendResponse({ content: text });

    } catch (err) {
      sendResponse({ content: document.body.innerText || "" });
    }

    return true; // Keep message channel open
  }

  // ─── Get YouTube transcript ───────────────────
  if (request.action === "getYouTubeTranscript") {

    try {
      // Method 1: Try to get transcript from YouTube's transcript panel
      // YouTube shows transcript in a panel - check if it's open
      const transcriptItems = document.querySelectorAll(
        "ytd-transcript-segment-renderer, .segment-text, ytd-transcript-body-renderer"
      );

      if (transcriptItems.length > 0) {
        let transcript = "";
        transcriptItems.forEach(item => {
          transcript += item.innerText + " ";
        });

        if (transcript.trim().length > 50) {
          sendResponse({ transcript: transcript.trim() });
          return true;
        }
      }

      // Method 2: Get video description + title + captions area text
      let content = "";

      // Get video title
      const title = document.querySelector(
        "h1.ytd-video-primary-info-renderer, yt-formatted-string.ytd-video-primary-info-renderer"
      );
      if (title) content += "Video Title: " + title.innerText + "\n\n";

      // Get video description
      const description = document.querySelector(
        "#description-inline-expander, ytd-text-inline-expander, #description"
      );
      if (description) content += "Description: " + description.innerText + "\n\n";

      // Get comments visible on page (top few)
      const comments = document.querySelectorAll("#content-text");
      if (comments.length > 0) {
        content += "Comments:\n";
        let count = 0;
        comments.forEach(c => {
          if (count < 10) {
            content += c.innerText + "\n";
            count++;
          }
        });
      }

      if (content.trim().length > 50) {
        sendResponse({ transcript: content.trim() });
      } else {
        // Method 3: Fallback - get all visible text on page
        const pageText = document.body.innerText
          .replace(/\s+/g, " ")
          .trim();
        sendResponse({ transcript: pageText.substring(0, 40000) });
      }

    } catch (err) {
      // Final fallback
      sendResponse({ transcript: document.body.innerText || "" });
    }

    return true; // Keep message channel open
  }
});
