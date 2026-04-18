import { useEffect, useState } from "react";
import { fetchSessionContent } from "../api/chatApi";

interface Props {
  sessionId: number;
  filename: string;
}

function getFileStyle(filename: string) {
  if (filename.endsWith(".docx")) return {
    icon: "📝", label: "Word Document",
    headerBg: "bg-blue-600", iconBg: "bg-blue-100",
  };
  if (filename.endsWith(".pptx")) return {
    icon: "📊", label: "PowerPoint",
    headerBg: "bg-orange-500", iconBg: "bg-orange-100",
  };
  return {
    icon: "📃", label: "Text File",
    headerBg: "bg-gray-600", iconBg: "bg-gray-100",
  };
}

export default function TextContentViewer({ sessionId, filename }: Props) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const style = getFileStyle(filename);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await fetchSessionContent(sessionId);
        setContent(data.content);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className={`${style.headerBg} px-4 py-3 flex items-center gap-3 flex-shrink-0`}>
        <span className="text-xl">{style.icon}</span>
        <div>
          <p className="text-xs font-bold text-white">{style.label}</p>
          <p className="text-xs text-white/70 truncate max-w-[200px]">{filename}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Loading content...</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-6">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {!loading && !error && content && (
          <div className="p-5">
            {/* Document paper style */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <span className={`w-8 h-8 ${style.iconBg} rounded-lg flex items-center justify-center text-sm`}>
                  {style.icon}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-700 truncate max-w-[220px]">
                    {filename}
                  </p>
                  <p className="text-xs text-gray-400">
                    {content.split(" ").length} words extracted
                  </p>
                </div>
              </div>

              {/* Text content */}
              <div className="prose prose-sm max-w-none">
                {content.split("\n\n").map((paragraph, i) => (
                  paragraph.trim() && (
                    <p
                      key={i}
                      className="text-xs text-gray-700 leading-relaxed mb-3 last:mb-0"
                    >
                      {paragraph.trim()}
                    </p>
                  )
                ))}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !content && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 p-6">
            <span className="text-4xl">📭</span>
            <p className="text-sm">No content could be extracted</p>
          </div>
        )}
      </div>
    </div>
  );
}