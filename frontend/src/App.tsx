import { useState, useEffect } from "react";
import type { ChatSession, Message } from "./types";
import { useAuth } from "./context/AuthContext";
import {
  fetchSessions,
  fetchSessionMessages,
} from "./api/chatApi";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import UploadPanel from "./components/UploadPanel";
import PDFViewer from "./components/PDFViewer";

export default function App() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [showPDF, setShowPDF] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  // Load sessions from DB when user logs in
  useEffect(() => {
    async function loadSessions() {
      try {
        setIsLoadingHistory(true);
        const dbSessions = await fetchSessions();

        const loaded: ChatSession[] = dbSessions.map((s: any) => ({
          id: crypto.randomUUID(),
          dbSessionId: s.id,
          filename: s.filename,
          collection_name: s.collection_name,
          total_chunks: s.total_chunks,
          total_pages: s.total_pages,
          messages: [],
          createdAt: new Date(s.created_at),
          isLoading: false,
        }));

        setSessions(loaded);
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    if (user) loadSessions();
  }, [user]);

  // Load messages when selecting a session
  async function handleSelectSession(id: string) {
    setActiveSessionId(id);
    setShowUpload(false);

    const session = sessions.find((s) => s.id === id);
    if (!session || session.messages.length > 0) return;

    // Mark as loading
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isLoading: true } : s))
    );

    try {
      const dbMessages = await fetchSessionMessages(session.dbSessionId);

      const messages: Message[] = dbMessages.map((m: any) => ({
        id: crypto.randomUUID(),
        role: m.role,
        content: m.content,
        sources: m.sources || [],
        timestamp: new Date(m.created_at),
      }));

      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, messages, isLoading: false } : s
        )
      );
    } catch (err) {
      console.error("Failed to load messages:", err);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isLoading: false } : s))
      );
    }
  }

  function handleUploadSuccess(data: any, file: File) {
    const pdfUrl = URL.createObjectURL(file);

    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      dbSessionId: data.session_id,
      filename: data.filename,
      collection_name: data.collection_name,
      total_chunks: data.total_chunks,
      total_pages: data.total_pages,
      messages: [],
      createdAt: new Date(),
      pdfFile: file,
      pdfUrl: pdfUrl,
      isLoading: false,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowUpload(false);
  }

  function handleUpdateSession(sessionId: string, messages: Message[]) {
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, messages } : s))
    );
  }

  function handleNewChat() {
    setShowUpload(true);
    setActiveSessionId(null);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">

      {/* Header */}
      <header className="bg-blue-600 text-white px-6 py-3 shadow-md flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold tracking-tight">📚 RAG Chatbot</h1>
          <p className="text-blue-200 text-xs">
            Powered by Gemini · ChromaDB
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-blue-200">{user?.email}</span>
          <button
            onClick={logout}
            className="text-xs bg-blue-700 hover:bg-red-500 px-3 py-1 rounded-lg transition-colors font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          isLoadingHistory={isLoadingHistory}
        />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">

          {/* Upload View */}
          {showUpload && (
            <div className="flex-1">
              <UploadPanel onUploadSuccess={handleUploadSuccess} />
            </div>
          )}

          {/* Chat + PDF View */}
          {!showUpload && activeSession && (
            <>
              {/* PDF Viewer */}
              {showPDF && activeSession.pdfUrl && (
                <div className="w-[450px] border-r border-gray-200 flex flex-col bg-white">
                  <PDFViewer file={activeSession.pdfUrl} />
                </div>
              )}

              {/* Chat Panel */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="px-4 py-2 bg-white border-b border-gray-200 flex justify-end flex-shrink-0">
                  <button
                    onClick={() => setShowPDF((v) => !v)}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    {showPDF ? "⬅ Hide Document" : "➡ Show Document"}
                  </button>
                </div>

                <ChatWindow
                  session={activeSession}
                  onUpdateSession={handleUpdateSession}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}