import { useState } from "react";
import type { ChatSession } from "../types";
import { deleteSession } from "../api/chatApi";

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isLoadingHistory: boolean;
}

function getFileIcon(filename: string) {
  if (filename.endsWith(".pdf")) return { icon: "📄", color: "bg-red-100 text-red-500" };
  if (filename.endsWith(".docx")) return { icon: "📝", color: "bg-blue-100 text-blue-500" };
  if (filename.endsWith(".pptx")) return { icon: "📊", color: "bg-orange-100 text-orange-500" };
  if (filename.endsWith(".txt")) return { icon: "📃", color: "bg-gray-100 text-gray-500" };
  if ([".jpg", ".jpeg", ".png"].some((e) => filename.endsWith(e)))
    return { icon: "🖼", color: "bg-green-100 text-green-500" };
  return { icon: "📁", color: "bg-purple-100 text-purple-500" };
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isLoadingHistory,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, session: ChatSession) {
    e.stopPropagation();

    if (confirmId !== session.id) {
      setConfirmId(session.id);
      return;
    }

    setDeletingId(session.id);
    try {
      await deleteSession(session.dbSessionId);
      onDeleteSession(session.id);
    } catch (err: any) {
      alert("Failed to delete: " + err.message);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  }

  return (
    <div className="w-72 h-full flex flex-col bg-gray-950 overflow-hidden">

      {/* Brand */}
      <div className="px-5 py-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 animated-bg rounded-xl flex items-center justify-center shadow-lg shadow-purple-900/50">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <p className="font-display font-black text-white text-base leading-none">
              AskMyDocs
            </p>
            <p className="text-xs text-gray-500 leading-none mt-0.5">
              AI Document Chat
            </p>
          </div>
        </div>

        <button
          onClick={onNewChat}
          className="w-full py-3 animated-bg text-white text-sm font-bold rounded-2xl shadow-lg shadow-purple-900/40 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span className="text-base">＋</span> New Document
        </button>
      </div>

      <div className="mx-5 border-t border-gray-800 mb-3 flex-shrink-0" />

      <div className="px-5 mb-2 flex-shrink-0 flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">
          Recent Chats
        </p>
        <p className="text-xs text-gray-700">
          {sessions.length} doc{sessions.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
        {isLoadingHistory && (
          <div className="flex flex-col gap-2 px-2 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl shimmer opacity-20" />
            ))}
          </div>
        )}

        {!isLoadingHistory && sessions.length === 0 && (
          <div className="text-center mt-12 px-4">
            <div className="text-4xl mb-3 float inline-block">📭</div>
            <p className="text-sm text-gray-600 font-medium">No documents yet</p>
            <p className="text-xs text-gray-700 mt-1">Upload one to get started</p>
          </div>
        )}

        {sessions.map((session) => {
          const { icon, color } = getFileIcon(session.filename);
          const isActive = activeSessionId === session.id;
          const isDeleting = deletingId === session.id;
          const isConfirming = confirmId === session.id;

          return (
            <div
              key={session.id}
              className={`relative rounded-2xl transition-all group ${
                isActive
                  ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30"
                  : "hover:bg-gray-800/60 border border-transparent"
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-b from-purple-400 to-blue-400 rounded-r-full" />
              )}

              {/* Session button */}
              <button
                onClick={() => onSelectSession(session.id)}
                className="w-full text-left px-3 py-3 pl-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${color}`}>
                    {icon}
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <p className={`text-xs font-semibold truncate leading-tight ${
                      isActive ? "text-white" : "text-gray-300 group-hover:text-white"
                    }`}>
                      {session.filename}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {session.messages.length} msg · {session.total_chunks} chunks
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      {new Date(session.createdAt).toLocaleDateString([], {
                        month: "short", day: "numeric"
                      })}
                    </p>
                  </div>
                </div>
              </button>

              {/* Delete button */}
              <button
                onClick={(e) => handleDelete(e, session)}
                disabled={isDeleting}
                className={`absolute right-2 top-1/2 -translate-y-1/2 transition-all rounded-lg px-1.5 py-1 text-xs font-bold ${
                  isConfirming
                    ? "opacity-100 bg-red-500 text-white"
                    : "opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 hover:bg-gray-700"
                }`}
                title={isConfirming ? "Click again to confirm" : "Delete chat"}
              >
                {isDeleting ? (
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : isConfirming ? "✓?" : "🗑"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800 flex-shrink-0">
        <p className="text-xs text-gray-700 text-center">
          Built with ❤️ using Gemini + FastAPI
        </p>
      </div>
    </div>
  );
}