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

async function fetchScores(question, answer, excerpts) {
  const res = await fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "judge", question, answer, excerpts })
  });
  return res.json();
}

function scoreRow(label, value) {
  const row = document.createElement("div");
  row.style.cssText = "display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;";
  const name = document.createElement("span");
  name.style.color = "#ccc";
  name.textContent = label;
  const val = document.createElement("span");
  val.style.fontWeight = "bold";
  val.style.color = value === null ? "#888" : value >= 80 ? "#4caf50" : "#ff9800";
  val.textContent = value === null ? "n/a" : value + "%";
  row.append(name, val);
  return row;
}

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
      ? `Searched ${r.used_chunks} of ${r.total_chunks} sections (${r.text_source}, ${r.method})`
      : "";

    answerDiv.append(ans, info);

    if (data.sources && data.sources.length) {
      const label = document.createElement("div");
      label.style.cssText = "font-size:10px;color:#777;text-transform:uppercase;letter-spacing:0.5px;margin-top:10px;";
      label.textContent = "Sources";
      answerDiv.append(label);
      data.sources.forEach((src) => {
        const item = document.createElement("div");
        item.style.cssText = "font-size:12px;color:#bbb;border-left:2px solid #a855f7;padding:4px 8px;margin-top:6px;";
        item.textContent = `[${src.n}] ${src.highlight}`;
        item.style.cursor = "pointer";
        item.title = "Click to highlight on the page";
        item.addEventListener("click", () => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "highlight", text: src.highlight }, (res) => {
              if (chrome.runtime.lastError || !res || !res.found) {
                status.textContent = "Could not find this text on the page";
              }
            });
          });
        });
        answerDiv.append(item);
      });
    }

    const scoreBox = document.createElement("div");
    scoreBox.style.cssText = "background:#1a1a1a;padding:10px;border-radius:8px;border:1px solid #333;margin-top:12px;";
    const scoreTitle = document.createElement("div");
    scoreTitle.style.cssText = "font-size:10px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;";
    scoreTitle.textContent = "Answer quality (LLM-judged)";
    const scoreBody = document.createElement("div");
    scoreBody.style.cssText = "font-size:12px;color:#888;";
    scoreBody.textContent = "Checking answer...";
    scoreBox.append(scoreTitle, scoreBody);
    answerDiv.append(scoreBox);

    fetchScores(question, data.answer, data.context_chunks || [])
      .then((sc) => {
        if (sc.error) throw new Error(sc.error);
        scoreBody.textContent = "";
        scoreBody.append(
          scoreRow("Faithfulness", sc.faithfulness),
          scoreRow("Context relevance", sc.context_relevance),
          scoreRow("Answer relevance", sc.answer_relevance)
        );
        if (sc.unsupported && sc.unsupported.length) {
          const warn = document.createElement("div");
          warn.style.cssText = "font-size:11px;color:#ff9800;margin-top:6px;";
          warn.textContent = "Not found in source: " + sc.unsupported.join("; ");
          scoreBody.append(warn);
        }
      })
      .catch(() => { scoreBody.textContent = "Scores unavailable"; });

  } catch (err) {
    status.textContent = "❌ Error: " + err.message;
  }

  askBtn.disabled = false;
  askBtn.innerHTML = "✨ Ask QueryMind";
});
