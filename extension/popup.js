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
    answerDiv.style.display = "block";
   answerDiv.innerHTML = `
      <div style="font-size:10px; color:#666; margin-bottom:6px; font-style:italic;">
        Searched for: "${data.rewritten_question}"
      </div>
      ${data.answer}
    `;
    
    // Highlight source on page
    if (data.source) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "highlightText",
          text: data.source
        });
      });
    }

  } catch (err) {
    status.textContent = "❌ Error: " + err.message;
  }

  askBtn.disabled = false;
  askBtn.innerHTML = "✨ Ask QueryMind";
});
