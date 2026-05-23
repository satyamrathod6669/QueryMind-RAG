chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getPageContent") {
    
    // Remove unwanted elements
    const unwanted = document.querySelectorAll(
      'script, style, nav, footer, header, iframe, .mw-navigation, #mw-navigation'
    );
    unwanted.forEach(el => el.remove());

    // Get clean main content
    const mainContent = 
      document.querySelector('main') ||
      document.querySelector('article') ||
      document.querySelector('#content') ||
      document.querySelector('.mw-body') ||
      document.body;

    const content = mainContent.innerText
      .replace(/\n{3,}/g, '\n\n')  // remove extra blank lines
      .trim();

    sendResponse({ content: content });
  }
});
