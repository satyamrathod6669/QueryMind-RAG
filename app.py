import os
import streamlit as st
from langchain_community.document_loaders import YoutubeLoader, WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

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
def create_rag(source, source_type="youtube"):
    if source_type == "youtube":
        loader = YoutubeLoader.from_youtube_url(
            source,
            add_video_info=False,
            language=["en", "hi"]
        )
    elif source_type == "website":
        loader = WebBaseLoader(source)

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
    ["YouTube Video", "Website"],
    horizontal=True
)

# URL input
if source_type == "YouTube Video":
    url = st.text_input(
        "Paste YouTube URL:",
        placeholder="https://www.youtube.com/watch?v=..."
    )
    source_key = "youtube"
else:
    url = st.text_input(
        "Paste Website URL:",
        placeholder="https://example.com"
    )
    source_key = "website"

# Load button
if url:
    if st.button("🔍 Load Source", type="primary"):
        with st.spinner("Loading and processing... Please wait!"):
            try:
                retriever, chunks = create_rag(url, source_key)
                st.session_state.retriever = retriever
                st.session_state.chunks = chunks
                st.session_state.url = url
                st.success(f"✅ Loaded! Created {chunks} chunks!")
            except Exception as e:
                st.error(f"❌ Error: {str(e)}")

st.divider()

# Question input
if "retriever" in st.session_state:
    st.markdown(f"**Source:** {st.session_state.url}")
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
