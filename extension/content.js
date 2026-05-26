chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      let content = '';

      // Get video title
      const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
      if (title) content += 'Video Title: ' + title.innerText + '\n\n';

      // Get description
      const expandBtn = document.querySelector('#expand, tp-yt-paper-button#expand');
      if (expandBtn) expandBtn.click();

      setTimeout(() => {
        const description = document.querySelector('#description-inline-expander, ytd-text-inline-expander #content, #description');
        if (description) content += 'Description:\n' + description.innerText + '\n\n';

        // Get transcript if already open on page
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (transcriptSegments.length > 0) {
          content += 'Transcript:\n';
          transcriptSegments.forEach(seg => {
            const text = seg.querySelector('.segment-text, yt-formatted-string');
            if (text) content += text.innerText + ' ';
          });
        }

        // Get comments
        const comments = document.querySelectorAll('#content-text');
        if (comments.length > 0) {
          content += '\n\nComments:\n';
          let count = 0;
          comments.forEach(c => {
            if (count < 20) { content += c.innerText + '\n'; count++; }
          });
        }

        sendResponse({ content: content.trim() });
      }, 800);

      return true; // Keep channel open for async

    } else {
      // Regular websites
      const paragraphs = document.querySelectorAll('p');
      let content = '';
      paragraphs.forEach(p => { content += p.innerText + '\n'; });
      if (content.trim().length < 100) content = document.body.innerText;
      sendResponse({ content: content.trim() });
    }
  }
});
