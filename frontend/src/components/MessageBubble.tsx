import { useState } from "react";
import type { Message } from "../types";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis();

  function copyToClipboard() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`flex gap-3 mb-4 slide-in ${isUser ? "flex-row-reverse" : "flex-row"}`}>

      {/* Avatar */}
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-md ${
        isUser
          ? "animated-bg text-white shadow-purple-200"
          : "bg-gradient-to-br from-gray-700 to-gray-900 text-white"
      }`}>
        {isUser ? message.content[0]?.toUpperCase() || "U" : "🧠"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] group ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-none shadow-purple-200"
            : "bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-gray-100"
        }`}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

          {/* Sources */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/20">
              <p className="text-xs font-bold opacity-70 mb-2">📄 Sources:</p>
              {message.sources.slice(0, 2).map((source, i) => (
                <div key={i} className="text-xs opacity-60 mt-1 bg-black/10 rounded-lg p-2">
                  <span className="font-semibold">Page {source.page_number}:</span>{" "}
                  {source.text.slice(0, 100)}...
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions — AI only */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={copyToClipboard}
              className="text-xs text-gray-400 hover:text-purple-600 transition-colors font-medium flex items-center gap-1"
            >
              {copied ? "✅ Copied!" : "📋 Copy"}
            </button>
            {ttsSupported && (
              <button
                onClick={() => isSpeaking ? stop() : speak(message.content)}
                className={`text-xs font-medium transition-colors flex items-center gap-1 ${
                  isSpeaking ? "text-blue-500 hover:text-red-400" : "text-gray-400 hover:text-blue-500"
                }`}
              >
                {isSpeaking ? "⏹ Stop" : "🔊 Listen"}
              </button>
            )}
          </div>
        )}

        {/* Timestamp */}
        <p className={`text-xs text-gray-400 mt-1 ${isUser ? "text-right" : "text-left"}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}