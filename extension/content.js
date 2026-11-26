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


function findRange(needle) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const p = n.parentElement;
      if (!p || ["SCRIPT", "STYLE", "NOSCRIPT"].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let text = "";
  const map = [];
  let prevSpace = false;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const raw = node.nodeValue;
    for (let i = 0; i < raw.length; i++) {
      let ch = raw[i];
      if (/\s/.test(ch)) {
        if (prevSpace) continue;
        ch = " ";
        prevSpace = true;
      } else {
        prevSpace = false;
      }
      text += ch;
      map.push([node, i]);
    }
  }

  const target = needle.replace(/\s+/g, " ").trim();
  if (!target) return null;
  const idx = text.indexOf(target);
  if (idx === -1) return null;

  const [startNode, startOffset] = map[idx];
  const [endNode, endOffset] = map[idx + target.length - 1];
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset + 1);
  return range;
}
