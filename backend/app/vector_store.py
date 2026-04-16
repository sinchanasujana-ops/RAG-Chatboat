import chromadb
from sentence_transformers import SentenceTransformer
import os

# Load the embedding model once (runs locally, no API needed)
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")

# Initialize ChromaDB with local persistence
chroma_client = chromadb.PersistentClient(path="./chroma_db")


def get_or_create_collection(collection_name: str):
    """Gets existing collection or creates a new one."""
    return chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}  # Use cosine similarity
    )


def store_chunks(chunks: list[dict], collection_name: str) -> int:
    """
    Embeds and stores chunks into ChromaDB.

    Args:
        chunks: List of {chunk_id, text, page_number} dicts
        collection_name: Name of the ChromaDB collection

    Returns:
        Number of chunks stored
    """
    collection = get_or_create_collection(collection_name)

    texts = [chunk["text"] for chunk in chunks]
    ids = [chunk["chunk_id"] for chunk in chunks]
    metadatas = [{"page_number": chunk["page_number"]} for chunk in chunks]

    # Generate embeddings locally
    embeddings = embedding_model.encode(texts).tolist()

    # Store in ChromaDB
    collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas
    )

    return len(chunks)


def query_similar_chunks(query: str, collection_name: str, top_k: int = 5) -> list[dict]:
    """
    Finds the most relevant chunks for a query.

    Args:
        query: User's question
        collection_name: Name of the ChromaDB collection
        top_k: Number of results to return

    Returns:
        List of relevant chunks with text and metadata
    """
    collection = get_or_create_collection(collection_name)

    # Embed the query
    query_embedding = embedding_model.encode([query]).tolist()

    # Search ChromaDB
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count())
    )

    # Format results
    chunks = []
    for i, doc in enumerate(results["documents"][0]):
        chunks.append({
            "text": doc,
            "page_number": results["metadatas"][0][i]["page_number"],
            "score": results["distances"][0][i]
        })

    return chunks