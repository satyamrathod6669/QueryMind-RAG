const WORKER_URL = "https://shrill-rice-3aba.rathodsatyamkumar.workers.dev";
let pageContent = "";
let currentPageUrl = "";

// Initialize tab URL with a safe fallback
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs && tabs[0] && tabs[0].url) {
    currentPageUrl = tabs[0].url;
    const urlElement = document.getElementById("currentUrl");
    if (urlElement) urlElement.textContent = currentPageUrl;

    if (currentPageUrl.includes('youtube.com/watch')) {
      const statusElement = document.getElementById("status");
      if (statusElement) {
        statusElement.textContent = "💡 YouTube detected! Loading transcript automatically.";
        statusElement.style.color = "#f0a500";
      }
    }
  } else {
    // Fallback if tabs query returns empty
    currentPageUrl = window.location.href;
    const urlElement = document.getElementById("currentUrl");
    if (urlElement) urlElement.textContent = currentPageUrl;
  }
});

document.getElementById("loadBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const loadBtn = document.getElementById("loadBtn");

  loadBtn.disabled = true;
  loadBtn.innerHTML = '<span class="spinner"></span> Loading...';
  status.textContent = "Reading page content...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      status.textContent = "❌ Could not find active tab!";
      loadBtn.disabled = false;
      loadBtn.innerHTML = "🔍 Load This Page";
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, { action: "getPageContent" }, (response) => {
      if (chrome.runtime.lastError) {
        status.textContent = "❌ Refresh page and try again!";
        loadBtn.disabled = false;
        loadBtn.innerHTML = "🔍 Load This Page";
        return;
      }

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
    answerDiv.textContent = "";

    const ans = document.createElement("div");
    ans.style.cssText = "font-size:14px;margin-bottom:12px;";
    ans.textContent = data.answer;

    const info = document.createElement("div");
    info.style.cssText = "font-size:11px;color:#888;";
    const r = data.retrieval;
    info.textContent = r
      ? `Searched ${r.used_chunks} of ${r.total_chunks} sections (${r.text_source})`
      : "";

    answerDiv.append(ans, info);

  } catch (err) {
    status.textContent = "❌ Error: " + err.message;
  }

  askBtn.disabled = false;
  askBtn.innerHTML = "✨ Ask QueryMind";
});
