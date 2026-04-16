from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import re
import json

from app.pdf_processor import extract_text_from_pdf, save_upload_file_temporarily
from app.chunker import chunk_text
from app.vector_store import store_chunks, query_similar_chunks
from app.rag_pipeline import ask_question
from app.database import get_db, init_db, User, ChatSession, ChatMessage
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

load_dotenv()

app = FastAPI(
    title="RAG Chatbot API",
    description="LLM-powered RAG chatbot using Gemini + ChromaDB",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Init DB on startup ───────────────────────────────

@app.on_event("startup")
def on_startup():
    init_db()


# ── Request Models ───────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ChatRequest(BaseModel):
    question: str
    collection_name: str
    session_id: int
    top_k: int = 5


# ── Public Routes ────────────────────────────────────

@app.get("/")
def root():
    return {"message": "RAG Chatbot API v2 is running!"}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "gemini_model": os.getenv("GEMINI_MODEL"),
        "message": "All systems go!"
    }


@app.post("/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")

    if len(request.password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters."
        )

    user = User(
        email=request.email,
        hashed_password=hash_password(request.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "email": user.email,
        "message": "Account created successfully!"
    }


@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "email": user.email,
        "message": "Logged in successfully!"
    }


@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "id": current_user.id,
        "created_at": current_user.created_at
    }


# ── Protected Routes ─────────────────────────────────

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    tmp_path = None

    try:
        tmp_path = await save_upload_file_temporarily(file)
        pages = extract_text_from_pdf(tmp_path)

        if not pages:
            raise HTTPException(
                status_code=422,
                detail="No text could be extracted from this PDF."
            )

        chunks = chunk_text(pages)

        # Sanitize collection name
        collection_name = os.path.splitext(file.filename)[0]
        collection_name = re.sub(r'[^a-zA-Z0-9_-]', '_', collection_name)
        collection_name = re.sub(r'_+', '_', collection_name)
        collection_name = collection_name.strip('_')

        if not collection_name or not collection_name[0].isalnum():
            collection_name = 'doc_' + collection_name
        if not collection_name[-1].isalnum():
            collection_name = collection_name + '0'

        collection_name = collection_name[:63]
        if len(collection_name) < 3:
            collection_name = collection_name + '_doc'

        num_stored = store_chunks(chunks, collection_name)

        # Save session to database
        session = ChatSession(
            user_id=current_user.id,
            filename=file.filename,
            collection_name=collection_name,
            total_chunks=num_stored,
            total_pages=len(pages)
        )
        db.add(session)
        db.commit()
        db.refresh(session)

        return {
            "filename": file.filename,
            "collection_name": collection_name,
            "total_pages": len(pages),
            "total_chunks": num_stored,
            "session_id": session.id,
            "message": f"Successfully processed and stored {num_stored} chunks."
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process PDF: {str(e)}"
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/sessions")
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all chat sessions for the current user."""
    sessions = (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )

    return [
        {
            "id": s.id,
            "filename": s.filename,
            "collection_name": s.collection_name,
            "total_chunks": s.total_chunks,
            "total_pages": s.total_pages,
            "created_at": s.created_at,
            "message_count": len(s.messages)
        }
        for s in sessions
    ]


@app.get("/sessions/{session_id}/messages")
def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all messages for a specific session (only if owned by user)."""
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    return [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sources": json.loads(m.sources) if m.sources else [],
            "created_at": m.created_at
        }
        for m in session.messages
    ]


@app.post("/chat")
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify session belongs to current user
    session = db.query(ChatSession).filter(
        ChatSession.id == request.session_id,
        ChatSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    try:
        # Save user message
        user_msg = ChatMessage(
            session_id=session.id,
            role="user",
            content=request.question
        )
        db.add(user_msg)
        db.commit()

        # Get RAG answer
        result = ask_question(
            question=request.question,
            collection_name=request.collection_name,
            top_k=request.top_k
        )

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=result["answer"],
            sources=json.dumps(result["sources"])
        )
        db.add(assistant_msg)
        db.commit()

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.get("/search")
def search_chunks(
    query: str,
    collection_name: str,
    top_k: int = 5,
    current_user: User = Depends(get_current_user)
):
    try:
        results = query_similar_chunks(query, collection_name, top_k)
        return {"query": query, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))