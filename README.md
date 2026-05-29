# ⚡ QueryMind — AI-Powered Browser Extension

> Ask anything from any webpage or YouTube video — instantly.

![QueryMind](https://img.shields.io/badge/QueryMind-v1.0-purple?style=flat-square)
![Manifest](https://img.shields.io/badge/Manifest-v3-blue?style=flat-square)
![Groq](https://img.shields.io/badge/Powered%20by-Groq%20AI-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

---

## 🧠 What is QueryMind?

**QueryMind** is a Chrome Extension that lets you ask questions about any webpage or YouTube video you're currently viewing. Instead of reading through long articles or watching full videos, just ask a question and get a direct, accurate answer in seconds.

---

## ✨ Features

- 🌐 **Website Q&A** — Ask questions about any webpage
- 🎥 **YouTube Q&A** — Auto-fetches full video transcript, no manual steps
- 🇮🇳 **Hindi + English Support** — Works with multilingual content
- ⚡ **Fast Responses** — Powered by Groq's LLaMA 3.3 70B model
- 🔒 **Secure** — API keys stored safely in Cloudflare environment secrets
- 🎨 **Clean UI** — Dark minimal professional design
- 📄 **Smart Chunking** — Handles pages with 80,000+ characters intelligently

---

## 🏗️ Architecture

```
User opens YouTube / Website
          ↓
Chrome Extension (content.js)
reads page content
          ↓
popup.js sends content + question
to Cloudflare Worker
          ↓
Worker fetches YouTube transcript
via Supadata API (if YouTube)
          ↓
Worker chunks content + queries
Groq LLaMA 3.3 70B
          ↓
Answer displayed in extension popup
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Chrome Extension (HTML, CSS, JavaScript) |
| Backend | Cloudflare Workers (serverless, free tier) |
| AI Model | Groq API — LLaMA 3.3 70B Versatile |
| YouTube Transcripts | Supadata API |
| Hosting | Cloudflare Edge Network |

---

## 📁 Project Structure

```
QueryMind-RAG/
├── extension/
│   ├── manifest.json      ← Chrome extension config
│   ├── popup.html         ← Extension UI
│   ├── popup.js           ← Button logic + API calls
│   └── content.js         ← Page content extraction
└── worker.js              ← Cloudflare Worker (backend)
```

---

## 🚀 Getting Started

### Prerequisites
- Google Chrome browser
- Groq API key (free) — [console.groq.com](https://console.groq.com)
- Supadata API key (free) — [supadata.ai](https://supadata.ai)
- Cloudflare account (free) — [cloudflare.com](https://cloudflare.com)

### 1. Deploy Cloudflare Worker

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Create a new Worker
3. Paste the code from `worker.js`
4. Add environment secrets:
   - `GROQ_API_KEY` — your Groq API key
   - `SUPADATA_API_KEY` — your Supadata API key
5. Deploy!

### 2. Update Worker URL

In `extension/popup.js`, update line 1:

```javascript
const WORKER_URL = "https://your-worker.your-subdomain.workers.dev";
```

### 3. Install Chrome Extension

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Done! ⚡

---

## 💡 How to Use

### For Websites
1. Open any webpage
2. Click the QueryMind extension icon
3. Click **Load This Page**
4. Type your question
5. Click **Ask QueryMind**

### For YouTube
1. Open any YouTube video
2. Click the QueryMind extension icon
3. Click **Load This Page** (transcript loads automatically!)
4. Type your question
5. Click **Ask QueryMind**

---

## 🧩 How It Works

### Website RAG
- `content.js` extracts all paragraph text from the page
- Text is sent to Cloudflare Worker
- Worker splits into 1000-char chunks with 200-char overlap
- Top 12 chunks sent to Groq LLaMA for answering

### YouTube RAG
- `content.js` detects YouTube URL and sends it to Worker
- Worker calls Supadata API with video ID
- Supadata returns full transcript (bypasses YouTube IP blocking)
- Transcript chunked and sent to Groq for answering

---

## 🔧 Challenges & Solutions

| Challenge | Solution |
|---|---|
| YouTube IP blocking on cloud servers | Used Supadata API for transcript fetching |
| Large page content exceeds token limits | Smart chunking with overlap in Worker |
| Hindi content not understood | Multilingual system prompt in Groq |
| API key security | Stored in Cloudflare environment secrets |
| Render.com memory issues (512MB) | Moved entirely to Cloudflare Workers |
| Gemini API rate limits | Switched to Groq (30 req/min free tier) |

---

## 🔮 Future Improvements

- [ ] PDF support — upload and ask questions about PDFs
- [ ] Visual content understanding — analyze video frames
- [ ] Answer highlighting — highlight source text on webpage
- [ ] Multi-tab support — compare content across pages
- [ ] History — save previous questions and answers

---

## 📊 API Usage & Limits

| Service | Free Tier |
|---|---|
| Groq API | 14,400 requests/day |
| Supadata API | 100 credits/month |
| Cloudflare Workers | 100,000 requests/day |

---

## 👨‍💻 Built By

**Satyam Rathod**

This project was built as part of my AI/ML learning journey, covering RAG architecture, LangChain, embeddings, vector databases, and production deployment.

---

## 📄 License

MIT License — feel free to use, modify and distribute.
