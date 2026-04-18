import { useState, useRef, useEffect } from "react";
import type { Message, ChatSession } from "../types";
import { sendMessage, summarizeContent, generateFlowchart } from "../api/chatApi";
import MessageBubble from "./MessageBubble";
import SummaryModal from "./SummaryModal";
import FlowchartModal from "./FlowchartModal";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

interface Props {
  session: ChatSession;
  onUpdateSession: (sessionId: string, messages: Message[]) => void;
}

export default function ChatWindow({ session, onUpdateSession }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryModal, setSummaryModal] = useState<{ title: string; text: string } | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [flowchartModal, setFlowchartModal] = useState<string | null>(null);
  const [isGeneratingChart, setIsGeneratingChart] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isListening, transcript, startListening, stopListening, isSupported: speechSupported } = useSpeechRecognition();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  useEffect(() => { setInput(""); }, [session.id]);
  useEffect(() => { if (transcript) setInput(transcript); }, [transcript]);

  async function handleSend() {
    if (!input.trim() || loading) return;
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    const updated = [...session.messages, userMessage];
    onUpdateSession(session.id, updated);
    setInput("");
    setLoading(true);
    textareaRef.current?.focus();
    try {
      const data = await sendMessage(userMessage.content, session.collection_name, session.dbSessionId);
      onUpdateSession(session.id, [...updated, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      }]);
    } catch (err: any) {
      onUpdateSession(session.id, [...updated, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `❌ Error: ${err.message}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize(type: "chat" | "pdf") {
    setIsSummarizing(true);
    try {
      const chatHistory = type === "chat"
        ? session.messages.map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n")
        : "";
      const data = await summarizeContent(type, session.collection_name, session.dbSessionId, chatHistory);
      setSummaryModal({ title: type === "chat" ? "Chat Summary" : "Document Summary", text: data.summary });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handleFlowchart() {
    setIsGeneratingChart(true);
    try {
      const data = await generateFlowchart(session.collection_name, session.dbSessionId);
      setFlowchartModal(data.mermaid_code);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsGeneratingChart(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const suggestions = ["Summarize this document", "What are the key points?", "What topics are covered?"];

  return (
    <div className="flex flex-col h-full bg-white">

      {/* Chat toolbar */}
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">AI Tools:</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleSummarize("pdf")}
            disabled={isSummarizing}
            className="text-xs px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl transition-colors font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            {isSummarizing ? <span className="animate-spin">⟳</span> : "✨"} Summarize
          </button>
          {session.messages.length > 0 && (
            <button
              onClick={() => handleSummarize("chat")}
              disabled={isSummarizing}
              className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-xl transition-colors font-semibold disabled:opacity-50 flex items-center gap-1"
            >
              💬 Chat Summary
            </button>
          )}
          <button
            onClick={handleFlowchart}
            disabled={isGeneratingChart}
            className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl transition-colors font-semibold disabled:opacity-50 flex items-center gap-1"
          >
            {isGeneratingChart ? <span className="animate-spin">⟳</span> : "🔀"} Flowchart
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 mesh-bg">
        {session.isLoading ? (
          <div className="flex items-center justify-center h-full gap-3 text-gray-400">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Loading messages...</span>
          </div>
        ) : session.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-5">
            <div className="w-20 h-20 animated-bg rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-300 float">
              <span className="text-4xl">🧠</span>
            </div>
            <div className="text-center">
              <p className="font-display font-black text-xl text-gray-800">Ask anything!</p>
              <p className="text-sm text-gray-400 mt-1">I've read your document and I'm ready to help</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-sm">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setInput(s)}
                  className="text-sm text-left px-4 py-3 bg-white rounded-2xl border border-gray-200 hover:border-purple-300 hover:text-purple-700 hover:shadow-md hover:shadow-purple-100 transition-all font-medium text-gray-600"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-1 max-w-4xl mx-auto">
            {session.messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start mb-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 animated-bg rounded-xl flex items-center justify-center text-sm flex-shrink-0">
                🧠
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                <div className="flex space-x-1.5 items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-4 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border-2 border-gray-200 focus-within:border-purple-400 focus-within:shadow-lg focus-within:shadow-purple-100 transition-all p-2">
            <textarea
              ref={textareaRef}
              className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none min-h-[40px] max-h-[120px]"
              rows={1}
              placeholder={isListening ? "🎤 Listening... speak now" : "Ask anything about your document..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {speechSupported && (
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={loading}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse"
                      : "bg-gray-200 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
                  }`}
                  title={isListening ? "Stop" : "Voice input"}
                >
                  {isListening ? "⏹" : "🎤"}
                </button>
              )}
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="w-9 h-9 animated-bg text-white rounded-xl flex items-center justify-center text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-md shadow-purple-200"
              >
                ↑
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <p className="text-xs text-gray-400">Enter to send · Shift+Enter for newline</p>
            {isListening && (
              <p className="text-xs text-red-500 font-semibold animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 bg-red-500 rounded-full inline-block" />
                Recording...
              </p>
            )}
          </div>
        </div>
      </div>

      {summaryModal && (
        <SummaryModal title={summaryModal.title} summary={summaryModal.text} onClose={() => setSummaryModal(null)} />
      )}
      {flowchartModal && (
        <FlowchartModal mermaidCode={flowchartModal} onClose={() => setFlowchartModal(null)} />
      )}
    </div>
  );
}