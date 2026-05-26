chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      
      // Auto-click "Show transcript" button
      const allButtons = document.querySelectorAll('button, tp-yt-paper-button, yt-button-shape button');
      let transcriptBtn = null;
      allButtons.forEach(btn => {
        if (btn.innerText && btn.innerText.toLowerCase().includes('transcript')) {
          transcriptBtn = btn;
        }
      });

      if (transcriptBtn) transcriptBtn.click();

      // Wait for transcript to load then grab it
      setTimeout(() => {
        let content = '';

        // Get title
        const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
        if (title) content += 'Video Title: ' + title.innerText + '\n\n';

        // Try transcript
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (segments.length > 0) {
          content += 'Transcript:\n';
          segments.forEach(seg => {
            const text = seg.querySelector('.segment-text, yt-formatted-string');
            if (text) content += text.innerText + ' ';
          });
        } else {
          // No transcript - fallback to description + comments
          content += 'Note: No transcript available. Using description and comments.\n\n';
          
          const description = document.querySelector('#description-inline-expander, #description');
          if (description) content += 'Description:\n' + description.innerText + '\n\n';

          const comments = document.querySelectorAll('#content-text');
          let count = 0;
          comments.forEach(c => {
            if (count < 15) { content += c.innerText + '\n'; count++; }
          });
        }

        sendResponse({ content: content.trim() });
      }, 2000);

      return true; // Keep channel open for async

    } else {
      // Regular websites - grab paragraphs
      const paragraphs = document.querySelectorAll('p');
      let content = '';
      paragraphs.forEach(p => { content += p.innerText + '\n'; });
      if (content.trim().length < 100) content = document.body.innerText;
      sendResponse({ content: content.trim() });
    }
  }
});
