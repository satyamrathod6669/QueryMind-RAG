chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {

      // Auto-click transcript button
      const allButtons = document.querySelectorAll('button, tp-yt-paper-button, yt-button-shape button');
      let transcriptBtn = null;
      allButtons.forEach(btn => {
        if (btn.innerText && btn.innerText.toLowerCase().includes('transcript')) {
          transcriptBtn = btn;
        }
      });
      if (transcriptBtn) transcriptBtn.click();

      // Wait for panel to open
      setTimeout(() => {
        
        const transcriptPanel = document.querySelector(
          'ytd-transcript-renderer #segments-container, ytd-transcript-segment-list-renderer'
        );

        if (transcriptPanel) {
          // Force scroll through entire transcript to load all segments
          let scrollPos = 0;
          const scrollHeight = transcriptPanel.scrollHeight;
          const scrollStep = 300;
          
          const scrollInterval = setInterval(() => {
            scrollPos += scrollStep;
            transcriptPanel.scrollTop = scrollPos;
            
            if (scrollPos >= scrollHeight) {
              clearInterval(scrollInterval);
              // Scroll back to top
              transcriptPanel.scrollTop = 0;
              setTimeout(() => grabYouTubeContent(sendResponse), 500);
            }
          }, 100);

        } else {
          grabYouTubeContent(sendResponse);
        }

      }, 2000);

      return true;

    } else {
      // Regular websites
      const paragraphs = document.querySelectorAll('p');
      let content = '';
      paragraphs.forEach(p => { content += p.innerText + '\n'; });
      if (content.trim().length < 100) content = document.body.innerText;
      sendResponse({ content: content.trim() });
    }
  }

  // Highlight text on page
  if (request.action === "highlightText") {
    const text = request.text;
    if (!text || text.length < 20) {
      sendResponse({ done: true });
      return;
    }

    // Remove previous highlights
    document.querySelectorAll('.querymind-highlight').forEach(el => {
      el.outerHTML = el.innerHTML;
    });

    // Find and highlight
    const sentences = text.split('.').filter(s => s.trim().length > 20);
    sentences.slice(0, 3).forEach(sentence => {
      const trimmed = sentence.trim();
      if (!trimmed) return;

      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while (node = walker.nextNode()) {
        if (node.textContent.includes(trimmed.substring(0, 40))) {
          const span = document.createElement('mark');
          span.className = 'querymind-highlight';
          span.style.cssText = 'background:#7F77DD33; border-bottom:2px solid #7F77DD; padding:1px 0;';
          const range = document.createRange();
          range.selectNode(node);
          try {
            range.surroundContents(span);
            node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch(e) {}
          break;
        }
      }
    });

    sendResponse({ done: true });
    return true;
  }
});

function grabYouTubeContent(sendResponse) {
  let content = '';

  const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
  if (title) content += 'Video Title: ' + title.innerText + '\n\n';

  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  if (segments.length > 0) {
    content += 'Transcript:\n';
    segments.forEach(seg => {
      const text = seg.querySelector('.segment-text, yt-formatted-string');
      if (text) content += text.innerText + ' ';
    });
  } else {
    content += 'Note: No transcript available.\n\n';
    const description = document.querySelector('#description-inline-expander, #description');
    if (description) content += 'Description:\n' + description.innerText + '\n\n';
    const comments = document.querySelectorAll('#content-text');
    let count = 0;
    comments.forEach(c => {
      if (count < 15) { content += c.innerText + '\n'; count++; }
    });
  }

  sendResponse({ content: content.trim() });
}
