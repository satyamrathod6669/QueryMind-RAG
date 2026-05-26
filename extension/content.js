chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      // Try to auto-open transcript first
      const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
      
      if (transcriptSegments.length > 0) {
        // Transcript already open - grab it
        let content = '';
        
        const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
        if (title) content += 'Video Title: ' + title.innerText + '\n\n';
        
        content += 'Transcript:\n';
        transcriptSegments.forEach(seg => {
          const text = seg.querySelector('.segment-text, yt-formatted-string');
          if (text) content += text.innerText + ' ';
        });
        
        sendResponse({ content: content.trim() });
        
      } else {
        // Transcript not open - grab title + description
        let content = '';
        
        const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
        if (title) content += 'Video Title: ' + title.innerText + '\n\n';
        
        // Expand description first
        const expandBtn = document.querySelector('tp-yt-paper-button#expand, #expand');
        if (expandBtn) expandBtn.click();
        
        setTimeout(() => {
          const description = document.querySelector('#description-inline-expander, ytd-text-inline-expander #content');
          if (description) content += 'Description:\n' + description.innerText + '\n\n';
          
          sendResponse({ content: content.trim() });
        }, 500);
        
        return true; // Keep channel open for async response
      }
      
    } else {
      const paragraphs = document.querySelectorAll('p');
      let content = '';
      paragraphs.forEach(p => { content += p.innerText + '\n'; });
      if (content.trim().length < 100) content = document.body.innerText;
      sendResponse({ content: content.trim() });
    }
  }
});
