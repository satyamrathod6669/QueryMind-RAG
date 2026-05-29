chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    const isYouTube = window.location.hostname.includes('youtube.com');
    
    if (isYouTube) {
      let captionUrl = null;
      const scripts = document.querySelectorAll('script');
      
      for (let script of scripts) {
        const text = script.textContent;
        const match = text.match(/"captionTracks":\[{"baseUrl":"([^"]+)"/);
        if (match) {
          captionUrl = match[1].replace(/\\u0026/g, '&');
          break;
        }
      }

      if (captionUrl) {
        fetch(captionUrl)
          .then(r => r.text())
          .then(xml => {
            const transcript = xml
              .replace(/<[^>]+>/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&#39;/g, "'")
              .replace(/&quot;/g, '"')
              .replace(/\s+/g, ' ')
              .trim();

            const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
            const titleText = title ? 'Video Title: ' + title.innerText + '\n\n' : '';

            sendResponse({ content: titleText + 'Transcript:\n' + transcript });
          })
          .catch(() => sendFallback(sendResponse));
      } else {
        sendFallback(sendResponse);
      }

      return true;

    } else {
      const paragraphs = document.querySelectorAll('p');
      let content = '';
      paragraphs.forEach(p => { content += p.innerText + '\n'; });
      if (content.trim().length < 100) content = document.body.innerText;
      sendResponse({ content: content.trim() });
    }
  }
});

function sendFallback(sendResponse) {
  const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.style-scope.ytd-watch-metadata');
  const description = document.querySelector('#description-inline-expander, #description');
  let content = '';
  if (title) content += 'Video Title: ' + title.innerText + '\n\n';
  if (description) content += 'Description:\n' + description.innerText;
  sendResponse({ content: content.trim() });
}
