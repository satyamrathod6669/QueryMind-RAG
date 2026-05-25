chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    // Get all paragraph text from the page
    const paragraphs = document.querySelectorAll('p');
    let content = '';
    
    paragraphs.forEach(p => {
      content += p.innerText + '\n';
    });

    // Fallback to body text if paragraphs are empty
    if (content.trim().length < 100) {
      content = document.body.innerText;
    }

    sendResponse({ content: content.trim() });
  }
});
