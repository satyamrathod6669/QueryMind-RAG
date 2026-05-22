import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.document_loaders import YoutubeLoader, WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

# ─── App ───────────────────────────────────────────────────
app = FastAPI()

# ─── CORS (allows Chrome Extension to call this API) ───────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Key ───────────────────────────────────────────────
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY")

# ─── LLM ───────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3
)

# ─── Embeddings ────────────────────────────────────────────
embeddings = GoogleGenerativeAIEmbeddings(
    model="models/embedding-001"
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

# ─── In-memory retriever store ─────────────────────────────
# Stores retriever per URL so we don't reload every time
retriever_store = {}

# ─── Request Models ────────────────────────────────────────
class LoadRequest(BaseModel):
    url: str
    source_type: str  # "youtube" or "website"

class AskRequest(BaseModel):
    url: str
    question: str

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

    db = FAISS.from_documents(chunks, embeddings)

    retriever = db.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 3}
    )

    return retriever, len(chunks)

# ─── Routes ────────────────────────────────────────────────

@app.get("/")
def home():
    return {"status": "QueryMind RAG API is running! 🚀"}


@app.post("/load")
def load_source(req: LoadRequest):
    """Load a YouTube video or Website and create RAG"""
    try:
        retriever, chunks = create_rag(req.url, req.source_type)
        retriever_store[req.url] = retriever  # save in memory
        return {
            "status": "success",
            "chunks": chunks,
            "message": f"Loaded successfully! {chunks} chunks created."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask")
def ask_question(req: AskRequest):
    """Ask a question about a loaded source"""
    try:
        # Check if source is loaded
        if req.url not in retriever_store:
            raise HTTPException(
                status_code=400,
                detail="Source not loaded! Please call /load first."
            )

        retriever = retriever_store[req.url]

        # Get relevant chunks
        relevant_chunks = retriever.invoke(req.question)
        context = "\n\n".join(
            [chunk.page_content for chunk in relevant_chunks]
        )

        # Build prompt and call LLM
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
