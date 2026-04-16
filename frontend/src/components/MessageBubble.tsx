import type { Message } from "../types";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${
        message.role === "user" 
          ? "bg-blue-600 text-white rounded-br-none" 
          : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
      }`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        
        {/* Sources Section */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Sources:</p>
            <div className="flex flex-col gap-2">
              {message.sources.map((source, index) => (
                <div key={index} className="bg-gray-50 p-2 rounded border border-gray-100">
                  <p className="text-[10px] font-bold text-blue-600">
                    Page {source.page_number}
                  </p>
                  <p className="text-xs text-gray-600 italic">
                    "{source.text}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}