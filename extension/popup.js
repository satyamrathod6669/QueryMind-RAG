const WORKER_URL = "https://shrill-rice-3aba.rathodsatyamkumar.workers.dev";

let pageContent = "";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const url = tabs[0].url;
  document.getElementById("currentUrl").textContent = url;
  
  if (url.includes('youtube.com/watch')) {
    document.getElementById("status").textContent = "💡 For YouTube: click '...' under video → Show transcript first!";
    document.getElementById("status").style.color = "#f0a500";
  }
});

document.getElementById("loadBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const loadBtn = document.getElementById("loadBtn");

  loadBtn.disabled = true;
  loadBtn.textContent = "Loading...";
  status.textContent = "Reading page content...";

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id,
      { action: "getPageContent" },
      (response) => {
        if (response && response.content) {
          pageContent = response.content;
          status.textContent = "Page loaded! Ask your question!";
          loadBtn.textContent = "Loaded!";
          document.getElementById("questionInput").style.display = "block";
          document.getElementById("askBtn").style.display = "block";
        } else {
          status.textContent = "Could not read page!";
          loadBtn.disabled = false;
          loadBtn.textContent = "Load This Page";
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
  askBtn.textContent = "Thinking...";
  status.textContent = "";

  try {
    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question,
        context: pageContent
      })
    });

    const data = await response.json();
    answerDiv.style.display = "block";
    answerDiv.innerHTML = `
      <small style="color:#aaa;">
        Searched for: "${data.rewritten_question}"
      </small>
      <br><br>
      ${data.answer}
    `;

  } catch (err) {
    status.textContent = "Error: " + err.message;
  }

  askBtn.disabled = false;
  askBtn.textContent = "Ask";
});
