// =============================================
// QueryMind RAG - popup.js
// Calls Gemini API directly - no server needed!
// =============================================

// ⚠️ ADD YOUR GEMINI API KEY HERE:
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

let pageContent = "";
let currentUrl = "";
let sourceType = "website";

// ─── Detect current page ───────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  currentUrl = tabs[0].url;
  document.getElementById("currentUrl").textContent = currentUrl;

  // Detect if YouTube or Website
  if (currentUrl.includes("youtube.com/watch") || currentUrl.includes("youtu.be")) {
    sourceType = "youtube";
    document.getElementById("sourceBadge").innerHTML =
      '<span class="source-badge badge-youtube">▶ YouTube Video</span>';
  } else {
    sourceType = "website";
    document.getElementById("sourceBadge").innerHTML =
      '<span class="source-badge badge-website">🌐 Website</span>';
  }
});

// ─── Load Button ───────────────────────────────────────────
document.getElementById("loadBtn").addEventListener("click", async () => {
  const loadBtn = document.getElementById("loadBtn");
  const status = document.getElementById("status");

  loadBtn.disabled = true;
  loadBtn.textContent = "⏳ Loading...";
  status.className = "";

  if (sourceType === "youtube") {
    status.textContent = "Reading YouTube transcript...";

    // Inject script to get YouTube transcript from page
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getYouTubeTranscript" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            // Fallback: get page text
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "getPageContent" },
              (res) => {
                if (res && res.content && res.content.length > 100) {
                  pageContent = res.content.substring(0, 40000);
                  onLoadSuccess(loadBtn, status);
                } else {
                  onLoadError(loadBtn, status, "Could not read YouTube page!");
                }
              }
            );
            return;
          }

          if (response.transcript && response.transcript.length > 50) {
            pageContent = response.transcript;
            onLoadSuccess(loadBtn, status);
          } else {
            // Fallback to page text
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "getPageContent" },
              (res) => {
                if (res && res.content) {
                  pageContent = res.content.substring(0, 40000);
                  onLoadSuccess(loadBtn, status);
                } else {
                  onLoadError(loadBtn, status, "Could not read YouTube content!");
                }
              }
            );
          }
        }
      );
    });

  } else {
    // Website
    status.textContent = "Reading page content...";

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { action: "getPageContent" },
        (response) => {
          if (chrome.runtime.lastError || !response) {
            onLoadError(loadBtn, status, "Could not read page! Try refreshing.");
            return;
          }

          if (response.content && response.content.length > 50) {
            pageContent = response.content.substring(0, 40000);
            onLoadSuccess(loadBtn, status);
          } else {
            onLoadError(loadBtn, status, "Page content is empty!");
          }
        }
      );
    });
  }
});

// ─── Load Success ──────────────────────────────────────────
function onLoadSuccess(loadBtn, status) {
  status.textContent = `✅ Loaded! (${Math.round(pageContent.length / 1000)}K chars) Ask your question!`;
  loadBtn.textContent = "✅ Loaded!";
  document.getElementById("questionInput").style.display = "block";
  document.getElementById("askBtn").style.display = "block";
}

// ─── Load Error ────────────────────────────────────────────
function onLoadError(loadBtn, status, msg) {
  status.className = "error";
  status.textContent = "❌ " + msg;
  loadBtn.disabled = false;
  loadBtn.textContent = "🔍 Load This Page";
}

// ─── Ask Button ────────────────────────────────────────────
document.getElementById("askBtn").addEventListener("click", async () => {
  const question = document.getElementById("questionInput").value.trim();
  const askBtn = document.getElementById("askBtn");
  const status = document.getElementById("status");
  const answerDiv = document.getElementById("answer");

  if (!question) {
    status.className = "error";
    status.textContent = "⚠️ Please enter a question!";
    return;
  }

  if (!pageContent) {
    status.className = "error";
    status.textContent = "⚠️ Please load the page first!";
    return;
  }

  askBtn.disabled = true;
  askBtn.textContent = "⏳ Thinking...";
  status.className = "";
  status.textContent = "Asking Gemini AI...";
  answerDiv.style.display = "none";

  // Build prompt
  const sourceLabel = sourceType === "youtube" ? "YouTube video transcript" : "website content";
  const prompt = `You are a helpful assistant that answers questions based ONLY on the provided ${sourceLabel}.

${sourceLabel.toUpperCase()}:
${pageContent}

USER QUESTION: ${question}

INSTRUCTIONS:
- Answer ONLY based on the content above
- Be clear and concise
- If the answer is not in the content, say exactly: "This topic is not covered in this ${sourceType === "youtube" ? "video" : "page"}."
- Do not make up information

ANSWER:`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 500
        }
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "API error");
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (answer) {
      answerDiv.style.display = "block";
      answerDiv.textContent = answer;
      status.textContent = "";
    } else {
      throw new Error("No answer received from Gemini");
    }

  } catch (err) {
    status.className = "error";
    if (err.message.includes("429")) {
      status.textContent = "⚠️ Rate limit hit! Wait 30 seconds and try again.";
    } else if (err.message.includes("API_KEY")) {
      status.textContent = "❌ Invalid API key! Check popup.js line 1.";
    } else {
      status.textContent = "❌ Error: " + err.message;
    }
  }

  askBtn.disabled = false;
  askBtn.textContent = "💬 Ask";
});
