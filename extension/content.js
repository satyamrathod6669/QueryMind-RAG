chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      let content = '';

      // Get video title
      const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
      if (title) content += 'Video Title: ' + title.innerText + '\n\n';

      // Get video description
      const description = document.querySelector('#description-inline-expander, #description .content, ytd-text-inline-expander');
      if (description) content += 'Description:\n' + description.innerText + '\n\n';

      // Get transcript if open
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      if (transcriptSegments.length > 0) {
        content += 'Transcript:\n';
        transcriptSegments.forEach(seg => {
          content += seg.innerText.replace(/\n/g, ' ') + ' ';
        });
      }

      // Fallback - get comments if nothing else found
      if (content.trim().length < 100) {
        const comments = document.querySelectorAll('#content-text');
        content += 'Comments:\n';
        comments.forEach(c => content += c.innerText + '\n');
      }

      sendResponse({ content: content.trim() });

    } else {
      // For regular websites grab paragraphs
      const paragraphs = document.querySelectorAll('p');
      let content = '';
      paragraphs.forEach(p => { content += p.innerText + '\n'; });

      if (content.trim().length < 100) {
        content = document.body.innerText;
      }

      sendResponse({ content: content.trim() });
    }
  }
});
