import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.document_loaders import YoutubeLoader, WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# ─── App ───────────────────────────────────────────────────
app = FastAPI()

# ─── CORS ──────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Key ───────────────────────────────────────────────
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

# ─── LLM ───────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3
)

# ─── Prompt ────────────────────────────────────────────────
prompt_template = PromptTemplate(
    template="""
You are a helpful assistant.
Answer the question based on context below.
Context may be in any language (Hindi/English).
Understand and translate if needed!

Context:
{context}

Question:
{question}

Instructions:
- Answer based on context only!
- Answer in English!
- If not in context say:
  "This topic is not covered in the source!"

Answer:
""",
    input_variables=["context", "question"]
)

# ─── In-memory store ───────────────────────────────────────
source_store = {}

# ─── Request Models ────────────────────────────────────────
class LoadRequest(BaseModel):
    url: str
    source_type: str

class AskRequest(BaseModel):
    url: str
    question: str

# ─── TF-IDF Retriever ──────────────────────────────────────
class TFIDFRetriever:
    def __init__(self, chunks):
        self.chunks = chunks
        self.texts = [c.page_content for c in chunks]
        self.vectorizer = TfidfVectorizer()
        self.matrix = self.vectorizer.fit_transform(self.texts)

    def get_relevant(self, question, k=3):
        q_vec = self.vectorizer.transform([question])
        scores = cosine_similarity(q_vec, self.matrix).flatten()
        top_k = np.argsort(scores)[-k:][::-1]
        return [self.chunks[i] for i in top_k]

# ─── RAG Function ──────────────────────────────────────────
def create_rag(url, source_type):
    if source_type == "youtube":
        loader = YoutubeLoader.from_youtube_url(
            url,
            add_video_info=False,
            language=["en", "hi"]
        )
    elif source_type == "website":
        loader = WebBaseLoader(url)
    else:
        raise ValueError("source_type must be 'youtube' or 'website'")

    documents = loader.load()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)
    retriever = TFIDFRetriever(chunks)

    return retriever, len(chunks)

# ─── Routes ────────────────────────────────────────────────
@app.get("/")
def home():
    return {"status": "QueryMind RAG API is running! 🚀"}

@app.post("/load")
def load_source(req: LoadRequest):
    try:
        retriever, chunks = create_rag(req.url, req.source_type)
        source_store[req.url] = retriever
        return {
            "status": "success",
            "chunks": chunks,
            "message": f"Loaded! {chunks} chunks created."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ask")
def ask_question(req: AskRequest):
    try:
        if req.url not in source_store:
            raise HTTPException(
                status_code=400,
                detail="Source not loaded! Please call /load first."
            )

        retriever = source_store[req.url]
        relevant_chunks = retriever.get_relevant(req.question)
        context = "\n\n".join([c.page_content for c in relevant_chunks])

        final_prompt = prompt_template.format(
            context=context,
            question=req.question
        )
        response = llm.invoke(final_prompt)

        return {
            "status": "success",
            "answer": response.content
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
