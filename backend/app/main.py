from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import re
import json

from app.file_processor import extract_text, save_upload_file_temporarily, is_supported
from app.chunker import chunk_text
from app.vector_store import store_chunks, query_similar_chunks
from app.rag_pipeline import ask_question
from app.database import get_db, init_db, User, ChatSession, ChatMessage
from app.auth import hash_password, verify_password, create_access_token, get_current_user

load_dotenv()

app = FastAPI(title="RAG Chatbot API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "http://localhost:5173",
            "Access-Control-Allow-Credentials": "true",
        }
    )

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

class SummarizeRequest(BaseModel):
    type: str
    collection_name: str
    session_id: int
    chat_history: str = ""

class FlowchartRequest(BaseModel):
    collection_name: str
    session_id: int
    source_text: str = ""

# ── Public Routes ────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AskMyDocs API is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok", "gemini_model": os.getenv("GEMINI_MODEL")}

@app.post("/signup")
def signup(request: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered.")
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    user = User(email=request.email, hashed_password=hash_password(request.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "email": user.email}

@app.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer", "email": user.email}

@app.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {"email": current_user.email, "id": current_user.id}

# ── Protected Routes ─────────────────────────────────

@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not is_supported(file.filename):
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    tmp_path = None
    try:
        tmp_path = await save_upload_file_temporarily(file)
        pages = extract_text(tmp_path, file.filename)

        if not pages:
            raise HTTPException(status_code=422, detail="No text could be extracted.")

        chunks = chunk_text(pages)

        base_name = os.path.splitext(file.filename)[0]
        base_name = re.sub(r'[^a-zA-Z0-9_-]', '_', base_name)
        base_name = re.sub(r'_+', '_', base_name)
        base_name = base_name.strip('_')

        if not base_name or not base_name[0].isalnum():
            base_name = 'doc_' + base_name
        if not base_name[-1].isalnum():
            base_name = base_name + '0'

        collection_name = f"u{current_user.id}_{base_name}"
        collection_name = collection_name[:63]
        if not collection_name[-1].isalnum():
            collection_name = collection_name[:-1] + '0'
        if len(collection_name) < 3:
            collection_name = collection_name + '_doc'

        num_stored = store_chunks(chunks, collection_name)

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
            "message": f"Stored {num_stored} chunks."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/sessions")
def get_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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


@app.get("/sessions/{session_id}/content")
def get_session_content(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    try:
        chunks = query_similar_chunks("content text overview", session.collection_name, top_k=10)
        full_text = "\n\n".join([c["text"] for c in chunks])
        return {"content": full_text, "filename": session.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()
    return {"message": "Session deleted successfully."}


@app.post("/chat")
def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == request.session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    try:
        user_msg = ChatMessage(session_id=session.id, role="user", content=request.question)
        db.add(user_msg)
        db.commit()

        result = ask_question(
            question=request.question,
            collection_name=session.collection_name,
            top_k=request.top_k
        )

        assistant_msg = ChatMessage(
            session_id=session.id,
            role="assistant",
            content=result["answer"],
            sources=json.dumps(result["sources"])
        )
        db.add(assistant_msg)
        db.commit()
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/summarize")
def summarize(
    request: SummarizeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == request.session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    gemini = genai.GenerativeModel(os.getenv("GEMINI_MODEL"))

    if request.type == "chat":
        if not request.chat_history.strip():
            raise HTTPException(status_code=400, detail="No chat history to summarize.")
        prompt = f"""Summarize this conversation in 3-5 bullet points.

CONVERSATION:
{request.chat_history}

SUMMARY:"""
    else:
        chunks = query_similar_chunks("main topics key points overview", session.collection_name, top_k=8)
        if not chunks:
            raise HTTPException(status_code=422, detail="No content found.")
        context = "\n\n".join([c["text"] for c in chunks])
        prompt = f"""Summarize this document in 5-7 bullet points.

DOCUMENT:
{context}

SUMMARY:"""

    try:
        response = gemini.generate_content(prompt)
        return {"summary": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Summarization failed: {str(e)}")


@app.post("/flowchart")
def generate_flowchart(
    request: FlowchartRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(ChatSession).filter(
        ChatSession.id == request.session_id,
        ChatSession.user_id == current_user.id
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    import google.generativeai as genai
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    gemini = genai.GenerativeModel(os.getenv("GEMINI_MODEL"))

    if request.source_text.strip():
        context = request.source_text
    else:
        chunks = query_similar_chunks("process steps workflow structure", session.collection_name, top_k=6)
        if not chunks:
            raise HTTPException(status_code=422, detail="No content found.")
        context = "\n\n".join([c["text"] for c in chunks])

    prompt = f"""Generate a simple Mermaid.js flowchart from this content.

STRICT RULES:
- Output ONLY valid Mermaid syntax, nothing else
- Start with exactly: flowchart TD
- Use simple IDs: A, B, C, D, E
- Node labels MUST use double quotes: A["Label here"]
- NO square brackets inside labels
- NO parentheses inside labels
- Arrows use -->
- Maximum 10 nodes only
- NO subgraphs
- NO markdown fences

CONTENT:
{context}

OUTPUT:"""

    try:
        response = gemini.generate_content(prompt)
        raw = response.text.strip()
        raw = raw.replace("```mermaid", "").replace("```", "").strip()
        raw = raw.replace("graph TD", "flowchart TD").replace("graph LR", "flowchart LR")

        import re as _re
        raw = _re.sub(r'subgraph[\s\S]*?end\n?', '', raw).strip()
        raw = _re.sub(
            r'\["([^"]+)"\]',
            lambda m: '["' + m.group(1).replace('[','').replace(']','').replace('(','').replace(')','') + '"]',
            raw
        )

        lines = [l for l in raw.split("\n") if l.strip()]
        raw = "\n".join(lines[:12])

        if not raw.strip().startswith("flowchart"):
            raise HTTPException(status_code=422, detail="Could not generate valid flowchart.")

        return {"mermaid_code": raw}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flowchart failed: {str(e)}")


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