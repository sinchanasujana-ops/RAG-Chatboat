import pdfplumber
from fastapi import UploadFile
import tempfile
import os


def extract_text_from_pdf(file_path: str) -> list[dict]:
    """
    Extracts text from each page of a PDF.
    Returns a list of dicts with page number and text content.
    """
    pages = []

    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()

            # Skip empty pages
            if text and text.strip():
                pages.append({
                    "page_number": i + 1,
                    "text": text.strip()
                })

    return pages


async def save_upload_file_temporarily(upload_file: UploadFile) -> str:
    """
    Saves an uploaded file to a temp location on disk.
    Returns the temp file path.
    """
    # Create a temp file with .pdf extension
    suffix = os.path.splitext(upload_file.filename)[-1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await upload_file.read()
        tmp.write(content)
        return tmp.name