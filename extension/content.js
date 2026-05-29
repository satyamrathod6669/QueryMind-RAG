chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      // Worker handles transcript — just send title + description as fallback
      let content = '';
      
      const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
      if (title) content += 'Video Title: ' + title.innerText + '\n\n';
      
      const description = document.querySelector('#description-inline-expander, #description');
      if (description) content += 'Description:\n' + description.innerText;
      
      sendResponse({ content: content.trim() });

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
