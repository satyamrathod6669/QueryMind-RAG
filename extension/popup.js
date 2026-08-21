const WORKER_URL = "https://shrill-rice-3aba.rathodsatyamkumar.workers.dev";
let pageContent = "";
let currentPageUrl = "";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url;
  currentPageUrl = url;
  document.getElementById("currentUrl").textContent = url;

  if (url.includes('youtube.com/watch')) {
    document.getElementById("status").textContent = "💡 YouTube detected! Loading transcript automatically.";
    document.getElementById("status").style.color = "#f0a500";
  }
});

document.getElementById("loadBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const loadBtn = document.getElementById("loadBtn");

  loadBtn.disabled = true;
  loadBtn.innerHTML = '<span class="spinner"></span> Loading...';
  status.textContent = "Reading page content...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id,
      { action: "getPageContent" },
      (response) => {
        if (response && response.content) {
          pageContent = response.content;
          status.textContent = "✅ Page loaded! Ask your question!";
          loadBtn.innerHTML = "✅ Loaded!";
          document.getElementById("questionInput").style.display = "block";
          document.getElementById("askBtn").style.display = "block";
        } else {
          status.textContent = "❌ Could not read page!";
          loadBtn.disabled = false;
          loadBtn.innerHTML = "🔍 Load This Page";
        }
      });
  });
});

document.getElementById("askBtn").addEventListener("click", async () => {
  const question = document.getElementById("questionInput").value.trim();
  const askBtn = document.getElementById("askBtn");
  const status = document.getElementById("status");
  const answerDiv = document.getElementById("answer");

  if (!question) {
    status.textContent = "Please enter a question!";
    return;
  }

  askBtn.disabled = true;
  askBtn.innerHTML = '<span class="spinner"></span> Thinking...';
  status.textContent = "";
  answerDiv.style.display = "none";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question,
        context: pageContent,
        url: currentPageUrl
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }

    answerDiv.style.display = "block";
    
    answerDiv.innerHTML = `
      <div style="font-size: 14px; margin-bottom: 12px;">
        ${data.answer}
      </div>
      
      <div style="background: #1a1a1a; padding: 10px; border-radius: 8px; border: 1px solid #333; margin-top: 15px;">
          <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
            Live Observability Metrics
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #ccc;">Groundedness</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.groundedness_score > 80 ? '#4caf50' : '#ff9800'};">${data.groundedness_score}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 12px; color: #ccc;">Context Relevance</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.context_relevance > 80 ? '#4caf50' : '#ff9800'};">${data.context_relevance}%</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; color: #ccc;">Answer Relevance</span>
            <span style="font-size: 12px; font-weight: bold; color: ${data.answer_relevance > 80 ? '#4caf50' : '#ff9800'};">${data.answer_relevance}%</span>
          </div>
      </div>
    `;

  } catch (err) {
    status.textContent = "❌ Error: " + err.message;
  }

  askBtn.disabled = false;
  askBtn.innerHTML = "✨ Ask QueryMind";
});
