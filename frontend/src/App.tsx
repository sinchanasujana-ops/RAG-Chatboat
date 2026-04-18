import { useState, useEffect } from "react";
import type { ChatSession, Message } from "./types";
import { useAuth } from "./context/AuthContext";
import { fetchSessions, fetchSessionMessages } from "./api/chatApi";

import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import UploadPanel from "./components/UploadPanel";
import PDFViewer from "./components/PDFViewer";
import TxtViewer from "./components/TextViewer";
import TextContentViewer from "./components/TextContentViewer";

export default function App() {
  const { user, logout } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(true);
  const [showPDF, setShowPDF] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  const generateId = () =>
    window.crypto?.randomUUID?.() || Math.random().toString(36).substring(7);

  useEffect(() => {
    async function loadSessions() {
      try {
        setIsLoadingHistory(true);
        const dbSessions = await fetchSessions();

        if (Array.isArray(dbSessions)) {
          setSessions(
            dbSessions.map((s: any) => ({
              id: generateId(),
              dbSessionId: s.id,
              filename: s.filename,
              collection_name: s.collection_name,
              total_chunks: s.total_chunks,
              total_pages: s.total_pages,
              messages: [],
              createdAt: new Date(s.created_at),
              isLoading: false,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load sessions:", err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    if (user) loadSessions();
  }, [user]);

  async function handleSelectSession(id: string) {
    setActiveSessionId(id);
    setShowUpload(false);

    const session = sessions.find((s) => s.id === id);
    if (!session || session.messages.length > 0) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, isLoading: true } : s
      )
    );

    try {
      const dbMessages = await fetchSessionMessages(session.dbSessionId);

      const messages: Message[] = dbMessages.map((m: any) => ({
        id: generateId(),
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
    } catch {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, isLoading: false } : s
        )
      );
    }
  }

  function handleUploadSuccess(data: any, file: File) {
    const newSession: ChatSession = {
      id: generateId(),
      dbSessionId: data.session_id,
      filename: data.filename,
      collection_name: data.collection_name,
      total_chunks: data.total_chunks,
      total_pages: data.total_pages,
      messages: [],
      createdAt: new Date(),
      pdfFile: file,
      pdfUrl: URL.createObjectURL(file),
      isLoading: false,
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setShowUpload(false);
  }

  function handleUpdateSession(sessionId: string, messages: Message[]) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, messages } : s
      )
    );
  }

  function isImage(filename: string) {
    return [".jpg", ".jpeg", ".png"].some((ext) =>
      filename.toLowerCase().endsWith(ext)
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">

      {/* Sidebar */}
      <div className={`${sidebarOpen ? "w-72" : "w-0"} transition-all duration-300 overflow-hidden`}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={() => {
            setShowUpload(true);
            setActiveSessionId(null);
          }}
          onDeleteSession={(id) => {
            setSessions((prev) => prev.filter((s) => s.id !== id));
            if (activeSessionId === id) {
              setActiveSessionId(null);
              setShowUpload(true);
            }
          }}
          isLoadingHistory={isLoadingHistory}
        />
      </div>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <header className="h-16 bg-white border-b px-5 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(v => !v)}>☰</button>
          <h1 className="font-bold">AskMyDocs</h1>
          <div className="flex items-center gap-3">
            <span className="text-xs">{user?.email}</span>
            <button onClick={logout}>Logout</button>
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {showUpload && (
            <UploadPanel onUploadSuccess={handleUploadSuccess} />
          )}

          {!showUpload && activeSession && (
            <div className="flex flex-1">

              {/* Left Panel */}
              {showPDF && (
                <div className="w-[420px] flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50">

                  {activeSession.filename.toLowerCase().endsWith(".pdf") &&
                    activeSession.pdfUrl && (
                      <PDFViewer file={activeSession.pdfUrl} />
                  )}

                  {isImage(activeSession.filename) && activeSession.pdfUrl && (
                    <div className="flex flex-col h-full">
                      <div className="px-4 py-3 bg-white border-b flex items-center gap-2">
                        <span>🖼</span>
                        <p className="text-sm truncate">{activeSession.filename}</p>
                      </div>
                      <div className="flex-1 flex items-center justify-center p-4">
                        <img
                          src={activeSession.pdfUrl}
                          alt={activeSession.filename}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {activeSession.filename.toLowerCase().endsWith(".docx") && (
                    <TextContentViewer
                      sessionId={activeSession.dbSessionId}
                      filename={activeSession.filename}
                    />
                  )}

                  {activeSession.filename.toLowerCase().endsWith(".pptx") && (
                    <TextContentViewer
                      sessionId={activeSession.dbSessionId}
                      filename={activeSession.filename}
                    />
                  )}

                  {activeSession.filename.toLowerCase().endsWith(".txt") &&
                    activeSession.pdfFile && (
                      <TxtViewer
                        file={activeSession.pdfFile}
                        filename={activeSession.filename}
                      />
                  )}

                  {activeSession.filename.toLowerCase().endsWith(".txt") &&
                    !activeSession.pdfFile && (
                      <TextContentViewer
                        sessionId={activeSession.dbSessionId}
                        filename={activeSession.filename}
                      />
                  )}

                </div>
              )}

              {/* Chat */}
              <div className="flex-1 flex flex-col">
                <button onClick={() => setShowPDF(!showPDF)}>
                  Toggle Doc
                </button>

                <ChatWindow
                  session={activeSession}
                  onUpdateSession={handleUpdateSession}
                />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}