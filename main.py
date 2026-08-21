import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from langchain_community.document_loaders import YoutubeLoader, WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# ─── App ───────────────────────────────────────────────────
# Initialize the FastAPI application instance
app = FastAPI()

# ─── CORS ──────────────────────────────────────────────────
# Add Cross-Origin Resource Sharing (CORS) middleware
# This allows the Chrome extension (which runs in a browser) to communicate with this backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow requests from any origin (can be restricted for better security later)
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── API Key ───────────────────────────────────────────────
# Ensure the Google API key is set in the environment variables for LangChain to use
os.environ["GOOGLE_API_KEY"] = os.getenv("GOOGLE_API_KEY", "")

# ─── LLM ───────────────────────────────────────────────────
# Initialize the Google Gemini 3.5 Flash model
# Temperature is set to 0.3 for a good balance of accuracy and natural language generation
llm = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash",
    temperature=0.3
)

# ─── Prompt ────────────────────────────────────────────────
# Define the core instructions for the AI model
# This template tells the model exactly how to behave and formats the injected context and user question
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
""",
    input_variables=["context", "question"]
)

# ─── In-memory store ───────────────────────────────────────
# A simple dictionary to store the initialized RAG retrievers for different URLs
# Note: In a production app with multiple users, you might want to use a database (like Redis or Pinecone) instead
source_store = {}

# ─── Request & Response Models ─────────────────────────────
# Define the expected JSON body for the /load endpoint
class LoadRequest(BaseModel):
    url: str
    source_type: str # Either "youtube" or "website"

# Define the expected JSON body for the /ask endpoint
class AskRequest(BaseModel):
    url: str
    question: str

# Define the structured output schema for Gemini using Pydantic
# This forces the LLM to return a JSON object with these specific fields, enabling live evaluation metrics
class EvaluatedResponse(BaseModel):
    answer: str = Field(description="The final answer to the question based only on context.")
    groundedness_score: int = Field(description="Score from 0 to 100 rating how strictly the answer is derived only from the context.")
    context_relevance: int = Field(description="Score from 0 to 100 rating how relevant the retrieved context is to answering the question.")

# ─── TF-IDF Retriever ──────────────────────────────────────
# A custom retrieval class that uses Term Frequency-Inverse Document Frequency (TF-IDF)
# to find the most relevant chunks of text based on the user's question
class TFIDFRetriever:
    def __init__(self, chunks):
        self.chunks = chunks
        self.texts = [c.page_content for c in chunks] # Extract text from LangChain Document objects
        self.vectorizer = TfidfVectorizer()
        # Convert all document chunks into a numerical matrix for fast searching
        self.matrix = self.vectorizer.fit_transform(self.texts) 

    def get_relevant(self, question, k=10):
        # Convert the user's question into the same numerical format
        q_vec = self.vectorizer.transform([question])
        # Compare the question against all chunks to find the closest matches
        scores = cosine_similarity(q_vec, self.matrix).flatten()
        # Get the indices of the top 'k' highest-scoring chunks
        top_k = np.argsort(scores)[-k:][::-1]
        return [self.chunks[i] for i in top_k]

# ─── RAG Function ──────────────────────────────────────────
# Main function to extract text from a source, chunk it, and create a retriever
def create_rag(url, source_type):
    # 1. Load the data based on the source type
    if source_type == "youtube":
        loader = YoutubeLoader.from_youtube_url(
            url,
            add_video_info=False,
            language=["en", "hi"] # Support both English and Hindi transcripts
        )
    elif source_type == "website":
        loader = WebBaseLoader(url)
    else:
        raise ValueError("source_type must be 'youtube' or 'website'")

    documents = loader.load()

    # 2. Split the massive text into smaller, manageable chunks
    # 1000 characters per chunk, with 200 characters overlapping to prevent cutting sentences in half
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    )
    chunks = splitter.split_documents(documents)
    
    # 3. Create and return the search engine (retriever) for these chunks
    retriever = TFIDFRetriever(chunks)

    return retriever, len(chunks)

# ─── Routes ────────────────────────────────────────────────
# Health check endpoint to verify the API is online
@app.get("/")
def home():
    return {"status": "QueryMind RAG API is running! 🚀"}

# Endpoint to process a URL and prepare it for questions
@app.post("/load")
def load_source(req: LoadRequest):
    try:
        # Create the RAG pipeline and store it in memory tied to the URL
        retriever, chunks = create_rag(req.url, req.source_type)
        source_store[req.url] = retriever
        return {
            "status": "success",
            "chunks": chunks,
            "message": f"Loaded! {chunks} chunks created."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to handle user questions and generate answers with live metrics
@app.post("/ask")
def ask_question(req: AskRequest):
    try:
        # Ensure the user has loaded the page first
        if req.url not in source_store:
            raise HTTPException(
                status_code=400,
                detail="Source not loaded! Please call /load first."
            )

        # 1. Retrieve the top 10 most relevant chunks of text
        retriever = source_store[req.url]
        relevant_chunks = retriever.get_relevant(req.question, k=10)
        
        # Combine the chunks into a single large string
        context = "\n\n".join([c.page_content for c in relevant_chunks])

        # 2. Inject the retrieved context and the user's question into the prompt template
        final_prompt = prompt_template.format(
            context=context,
            question=req.question
        )

        # 3. Ask Gemini for the answer AND the evaluation metrics simultaneously
        # Using structured output ensures the response perfectly matches our EvaluatedResponse schema
        structured_llm = llm.with_structured_output(EvaluatedResponse)
        result = structured_llm.invoke(final_prompt)

        # 4. Send the structured data back to the Chrome extension
        return {
            "status": "success",
            "answer": result.answer,
            "metrics": {
                "groundedness": result.groundedness_score,
                "relevance": result.context_relevance
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
