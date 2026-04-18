import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface Props {
  mermaidCode: string;
  onClose: () => void;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  flowchart: { curve: "basis" },
});

export default function FlowchartModal({ mermaidCode, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    async function render() {
      if (!containerRef.current) return;

      try {
        let cleanCode = mermaidCode
          .replace(/```mermaid/g, "")
          .replace(/```/g, "")
          .trim();

        // Fix graph -> flowchart
        cleanCode = cleanCode
          .replace(/^graph TD/m, "flowchart TD")
          .replace(/^graph LR/m, "flowchart LR");

        // Remove subgraphs
        cleanCode = cleanCode.replace(/subgraph[\s\S]*?end/gm, "").trim();

        // Fix nested square brackets + invalid characters in labels
        cleanCode = cleanCode.replace(
          /\["([^"]+)"\]/g,
          (_, label) =>
            `["${label
              .replace(/\[/g, "")
              .replace(/\]/g, "")
              .replace(/\(/g, "")
              .replace(/\)/g, "")
              .replace(/[{}]/g, "")
            }"]`
        );

        // Fix unquoted labels
        cleanCode = cleanCode.replace(
          /\[([^\]"]+)\]/g,
          (_, label) =>
            `["${label
              .replace(/\[/g, "")
              .replace(/\(/g, "")
              .replace(/\)/g, "")
              .replace(/[{}]/g, "")
              .trim()
            }"]`
        );

        // Limit complexity (first 12 lines)
        const lines = cleanCode.split("\n").filter((l) => l.trim());
        cleanCode = lines.slice(0, 12).join("\n");

        console.log("Rendering mermaid:", cleanCode);

        const id = `mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(id, cleanCode);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (err: any) {
        setError("Could not render the flowchart. The content may be too complex.");
        console.error("Mermaid error:", err);
      }
    }

    render();
  }, [mermaidCode]);

  function downloadSVG() {
    if (!containerRef.current) return;
    const svg = containerRef.current.innerHTML;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flowchart.svg";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-800">🔀 Flowchart</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Flowchart Area */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50 flex items-center justify-center min-h-[300px]">
          {error ? (
            <div className="text-center text-red-500">
              <p className="text-4xl mb-3">⚠️</p>
              <p className="text-sm">{error}</p>
              <details className="mt-3 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer">
                  Show raw code
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 rounded p-3 overflow-auto max-h-40">
                  {mermaidCode}
                </pre>
              </details>
            </div>
          ) : !rendered ? (
            <div className="flex flex-col items-center gap-3 text-gray-400">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Rendering flowchart...</p>
            </div>
          ) : null}

          {/* SAFE RENDER TARGET */}
          <div
            ref={containerRef}
            className={`w-full flex justify-center ${
              !rendered || error ? "hidden" : ""
            }`}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 flex justify-between items-center">
          <details className="text-left">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
              View Mermaid code
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 rounded p-3 overflow-auto max-h-32 max-w-xl">
              {mermaidCode}
            </pre>
          </details>

          <div className="flex gap-2">
            {rendered && (
              <button
                onClick={downloadSVG}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors"
              >
                ⬇ Download SVG
              </button>
            )}
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}