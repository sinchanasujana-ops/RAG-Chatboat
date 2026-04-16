def chunk_text(pages: list[dict], chunk_size: int = 500, overlap: int = 50) -> list[dict]:
    """
    Splits page texts into smaller overlapping chunks.

    Args:
        pages: List of {page_number, text} dicts from pdf_processor
        chunk_size: Max number of characters per chunk
        overlap: Number of characters to overlap between chunks

    Returns:
        List of {chunk_id, text, page_number} dicts
    """
    chunks = []
    chunk_id = 0

    for page in pages:
        text = page["text"]
        page_number = page["page_number"]
        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text_slice = text[start:end]

            # Avoid creating tiny leftover chunks (less than 50 chars)
            if len(chunk_text_slice.strip()) > 50:
                chunks.append({
                    "chunk_id": f"chunk_{chunk_id}",
                    "text": chunk_text_slice.strip(),
                    "page_number": page_number
                })
                chunk_id += 1

            # Move forward with overlap
            start += chunk_size - overlap

    return chunks