import os
import streamlit as st
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document

# ─── Page Config ───────────────────────────────────────────
st.set_page_config(
    page_title="AskAnything AI",
    page_icon="🤖",
    layout="centered"
)

# ─── API Key from Streamlit Secrets ────────────────────────
os.environ["GOOGLE_API_KEY"] = st.secrets["GOOGLE_API_KEY"]

# ─── LLM ───────────────────────────────────────────────────
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3
)

# ─── Embeddings ────────────────────────────────────────────
@st.cache_resource
def load_embeddings():
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        cache_folder="/tmp/embeddings"
    )

embeddings = load_embeddings()

# ─── Prompt Template ───────────────────────────────────────
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

# ─── RAG Functions ─────────────────────────────────────────
def create_rag_from_text(text):
    """Create RAG from plain text (YouTube transcript paste)"""
    documents = [Document(page_content=text)]

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


def create_rag_from_website(url):
    """Create RAG from website URL"""
    loader = WebBaseLoader(url)
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


def ask(retriever, question):
    relevant_chunks = retriever.invoke(question)

    context = "\n\n".join(
        [chunk.page_content for chunk in relevant_chunks]
    )

    final_prompt = prompt_template.format(
        context=context,
        question=question
    )

    response = llm.invoke(final_prompt)
    return response.content

# ─── UI ────────────────────────────────────────────────────
st.title("🤖 AskAnything AI")
st.markdown("Ask questions from any **YouTube video** or **Website**!")

st.divider()

# Source type selection
source_type = st.radio(
    "Choose source type:",
    ["YouTube (Paste Transcript)", "Website"],
    horizontal=True
)

# ─── YouTube Transcript Paste ──────────────────────────────
if source_type == "YouTube (Paste Transcript)":

    st.info(
        "📋 **How to get YouTube transcript:**\n"
        "1. Go to [youtubetranscript.com](https://youtubetranscript.com)\n"
        "2. Paste your YouTube video URL\n"
        "3. Copy the transcript\n"
        "4. Paste it below!"
    )

    transcript_text = st.text_area(
        "Paste YouTube transcript here:",
        placeholder="Paste the full transcript text here... (Hindi or English both work!)",
        height=200
    )

    if transcript_text:
        if st.button("🔍 Load Transcript", type="primary"):
            with st.spinner("Processing transcript... Please wait!"):
                try:
                    retriever, chunks = create_rag_from_text(transcript_text)
                    st.session_state.retriever = retriever
                    st.session_state.chunks = chunks
                    st.session_state.source_label = "YouTube Transcript (Pasted)"
                    st.success(f"✅ Loaded! Created {chunks} chunks!")
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")

# ─── Website URL ───────────────────────────────────────────
else:
    url = st.text_input(
        "Paste Website URL:",
        placeholder="https://example.com"
    )

    if url:
        if st.button("🔍 Load Website", type="primary"):
            with st.spinner("Loading website... Please wait!"):
                try:
                    retriever, chunks = create_rag_from_website(url)
                    st.session_state.retriever = retriever
                    st.session_state.chunks = chunks
                    st.session_state.source_label = url
                    st.success(f"✅ Loaded! Created {chunks} chunks!")
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")

st.divider()

# ─── Question Input ────────────────────────────────────────
if "retriever" in st.session_state:
    st.markdown(f"**Source:** {st.session_state.source_label}")
    st.markdown(f"**Chunks:** {st.session_state.chunks}")

    question = st.text_input(
        "Ask your question:",
        placeholder="What is this about?"
    )

    if question:
        if st.button("💬 Ask", type="primary"):
            with st.spinner("Thinking..."):
                try:
                    answer = ask(st.session_state.retriever, question)
                    st.markdown("### 🤖 Answer:")
                    st.markdown(answer)
                except Exception as e:
                    st.error(f"❌ Error: {str(e)}")
else:
    st.info("👆 Please load a source first!")

st.divider()
st.markdown("Built with ❤️ using LangChain + Gemini AI")
