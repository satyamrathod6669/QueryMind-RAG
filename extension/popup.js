// Replace this with your actual deployed FastAPI URL later!
const API_URL = "http://localhost:8000"; 
let currentPageUrl = "";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url;
  currentPageUrl = url;
  document.getElementById("currentUrl").textContent = url;

  if (url.includes('youtube.com/watch')) {
    document.getElementById("status").textContent = "💡 YouTube detected! Ready to load transcript.";
    document.getElementById("status").style.color = "#f0a500";
  }
});

// ─── STEP 1: LOAD PAGE / VIDEO ──────────────────────────
document.getElementById("loadBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const loadBtn = document.getElementById("loadBtn");

  loadBtn.disabled = true;
  loadBtn.innerHTML = '<span class="spinner"></span> Loading Source...';
  status.textContent = "Connecting to backend...";

  // Determine source type based on URL
  const sourceType = currentPageUrl.includes("youtube.com") ? "youtube" : "website";

  try {
    // Call the /load endpoint on your FastAPI backend
    const response = await fetch(`${API_URL}/load`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentPageUrl,
        source_type: sourceType
      })
    });

    const data = await response.json();

    if (data.status === "success") {
      status.textContent = "✅ Source loaded! Ask your question!";
      loadBtn.innerHTML = "✅ Loaded!";
      document.getElementById("questionInput").style.display = "block";
      document.getElementById("askBtn").style.display = "block";
    } else {
      throw new Error(data.detail || "Failed to load source.");
    }
  } catch (err) {
    status.textContent = "❌ Error: " + err.message;
    loadBtn.disabled = false;
    loadBtn.innerHTML = "🔍 Load This Page";
  }
});

// ─── STEP 2: ASK QUESTION & SHOW METRICS ────────────────
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
    // Call the /ask endpoint on your FastAPI backend
    const response = await fetch(`${API_URL}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: currentPageUrl,
        question: question
      })
    });

    const data = await response.json();

    if (data.status === "success") {
      answerDiv.style.display = "block";
      
      // Inject the Answer AND the AI Observability Metrics UI
      answerDiv.innerHTML = `
        <div style="font-size: 14px; margin-bottom: 12px;">
          ${data.answer}
        </div>
        
        <!-- Live AI Observability Metrics Card -->
        <div style="background: #1a1a1a; padding: 10px; border-radius: 8px; border: 1px solid #333; margin-top: 15px;">
            <div style="font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
              Live Observability Metrics
            </div>
            
            <!-- Groundedness Metric -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #ccc;">Groundedness</span>
              <span style="font-size: 12px; font-weight: bold; color: ${data.metrics.groundedness > 80 ? '#4caf50' : '#ff9800'};">${data.metrics.groundedness}%</span>
            </div>
            
            <!-- Relevance Metric -->
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 12px; color: #ccc;">Context Relevance</span>
              <span style="font-size: 12px; font-weight: bold; color: ${data.metrics.relevance > 80 ? '#4caf50' : '#ff9800'};">${data.metrics.relevance}%</span>
            </div>
        </div>
      `;
    } else {
      throw new Error(data.detail || "Failed to generate answer.");
    }
  } catch (err) {
    status.textContent = "❌ Error: " + err.message;
  }

  askBtn.disabled = false;
  askBtn.innerHTML = "✨ Ask QueryMind";
});
