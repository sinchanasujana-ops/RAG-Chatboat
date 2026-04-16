import { useEffect, useState } from "react";

interface Props {
  file: File | string;
}

export default function PDFViewer({ file }: Props) {
  const [viewUrl, setViewUrl] = useState<string>("");

  useEffect(() => {
    // If the prop is a raw File object, convert it to a URL
    // If it's already a string (pdfUrl), use it directly
    let url = "";
    if (file instanceof File) {
      url = URL.createObjectURL(file);
    } else {
      url = file;
    }

    setViewUrl(url);

    // Cleanup the memory when the component unmounts
    return () => {
      if (file instanceof File) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);

  if (!viewUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
        <p>Loading PDF Preview...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-200">
      <div className="bg-white px-4 py-2 border-b border-gray-300 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
          PDF Preview
        </span>
      </div>
      <iframe
        src={`${viewUrl}#toolbar=0`}
        className="flex-1 w-full border-none"
        title="PDF Viewer"
      />
    </div>
  );
}