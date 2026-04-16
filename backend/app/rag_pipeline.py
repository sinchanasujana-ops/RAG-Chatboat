import google.generativeai as genai
from dotenv import load_dotenv
import os

from app.vector_store import query_similar_chunks

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel(os.getenv("GEMINI_MODEL"))


def build_prompt(question: str, chunks: list[dict]) -> str:
    """
    Builds a prompt for Gemini using retrieved chunks as context.
    """
    context = "\n\n".join([
        f"[Page {chunk['page_number']}]: {chunk['text']}"
        for chunk in chunks
    ])

    prompt = f"""You are a helpful assistant that answers questions based ONLY on the provided context.
If the answer is not found in the context, say "I don't have enough information to answer that."

CONTEXT:
{context}

QUESTION:
{question}

ANSWER:"""

    return prompt


def ask_question(question: str, collection_name: str, top_k: int = 5) -> dict:
    """
    Full RAG pipeline:
    1. Retrieve relevant chunks from ChromaDB
    2. Build a prompt with context
    3. Send to Gemini and return the answer

    Args:
        question: User's question
        collection_name: ChromaDB collection to search
        top_k: Number of chunks to retrieve

    Returns:
        Dict with answer and source chunks
    """
    # Step 1: Retrieve relevant chunks
    chunks = query_similar_chunks(question, collection_name, top_k)

    if not chunks:
        return {
            "answer": "No relevant information found in the document.",
            "sources": []
        }

    # Step 2: Build prompt
    prompt = build_prompt(question, chunks)

    # Step 3: Send to Gemini
    response = model.generate_content(prompt)

    return {
        "answer": response.text,
        "sources": [
            {
                "page_number": chunk["page_number"],
                "text": chunk["text"][:200] + "..."  # Preview only
            }
            for chunk in chunks
        ]
    }