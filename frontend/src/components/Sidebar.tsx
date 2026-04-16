import type { ChatSession } from "../types";

interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  isLoadingHistory: boolean;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  isLoadingHistory,
}: Props) {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col h-full flex-shrink-0">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">📚 RAG Chatbot</h1>
        <p className="text-xs text-gray-400 mt-0.5">Gemini + ChromaDB</p>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-lg">+</span> New Chat
        </button>
      </div>

      {/* History Label */}
      <div className="px-4 pb-1">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
          Chat History
        </p>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">

        {/* Loading state */}
        {isLoadingHistory && (
          <div className="flex items-center justify-center mt-6 gap-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading history...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoadingHistory && sessions.length === 0 && (
          <p className="text-xs text-gray-500 text-center mt-4 px-2">
            No chats yet. Upload a PDF to start!
          </p>
        )}

        {/* Session items */}
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className={`w-full text-left px-3 py-3 rounded-lg mb-1 transition-colors ${
              activeSessionId === session.id
                ? "bg-gray-700 text-white"
                : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <p className="text-sm font-medium truncate">
              📄 {session.filename}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {session.messages.length} messages · {session.total_chunks} chunks
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(session.createdAt).toLocaleDateString()}
            </p>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          Built with FastAPI + React
        </p>
      </div>
    </div>
  );
}