import { useEffect, useState } from "react";

interface Props {
  file: File;
  filename: string;
}

export default function TxtViewer({ file, filename }: Props) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target?.result as string);
    };
    reader.readAsText(file);
  }, [file]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          📃 {filename}
        </p>
      </div>
      <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-800">
        <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
          {content || "Loading..."}
        </pre>
      </div>
    </div>
  );
}