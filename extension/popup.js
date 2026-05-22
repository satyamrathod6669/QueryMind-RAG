const API_BASE = "https://querymind-rag.onrender.com";

let currentUrl = "";
let isLoaded = false;

// Get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentUrl = tabs[0].url;
  document.getElementById("currentUrl").textContent = currentUrl;
});

// Load button click
document.getElementById("loadBtn").addEventListener("click", async () => {
  const loadBtn = document.getElementById("loadBtn");
  const status = document.getElementById("status");

  // Detect source type
  let sourceType = "website";
  if (currentUrl.includes("youtube.com") || currentUrl.includes("youtu.be")) {
    sourceType = "youtube";
  }

  loadBtn.disabled = true;
  loadBtn.textContent = "⏳ Loading...";
  status.textContent = "Loading source... please wait!";

  try {
    const response = await fetch(`${API_BASE}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentUrl,
        source_type: sourceType
      })
    });

    const data = await response.json();

    if (data.status === "success") {
      isLoaded = true;
      status.textContent = `✅ Loaded! ${data.chunks} chunks created!`;
      loadBtn.textContent = "✅ Loaded!";

      // Show question input
      document.getElementById("questionInput").style.display = "block";
      document.getElementById("askBtn").style.display = "block";
    } else {
      status.textContent = "❌ Error: " + data.detail;
      loadBtn.disabled = false;
      loadBtn.textContent = "🔍 Load This Page";
    }

  } catch (err) {
    status.textContent = "❌ Cannot reach API. Is it running?";
    loadBtn.disabled = false;
    loadBtn.textContent = "🔍 Load This Page";
  }
});

// Ask button click
document.getElementById("askBtn").addEventListener("click", async () => {
  const question = document.getElementById("questionInput").value.trim();
  const askBtn = document.getElementById("askBtn");
  const status = document.getElementById("status");
  const answerDiv = document.getElementById("answer");

  if (!question) {
    status.textContent = "⚠️ Please enter a question!";
    return;
  }

  askBtn.disabled = true;
  askBtn.textContent = "⏳ Thinking...";
  status.textContent = "";

  try {
    const response = await fetch(`${API_BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentUrl,
        question: question
      })
    });

    const data = await response.json();

    if (data.status === "success") {
      answerDiv.style.display = "block";
      answerDiv.textContent = data.answer;
      status.textContent = "";
    } else {
      status.textContent = "❌ Error: " + data.detail;
    }

  } catch (err) {
    status.textContent = "❌ Cannot reach API!";
  }

  askBtn.disabled = false;
  askBtn.textContent = "💬 Ask";
});
