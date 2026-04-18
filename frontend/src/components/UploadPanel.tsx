import { useState } from "react";
import { uploadPDF } from "../api/chatApi";
import type { UploadResponse } from "../types";

interface Props {
  onUploadSuccess: (data: UploadResponse, file: File) => void;
}

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".pptx", ".jpg", ".png"];

const FILE_INFO = [
  { ext: ".pdf",  icon: "📄", label: "PDF",         color: "bg-red-100 text-red-600" },
  { ext: ".docx", icon: "📝", label: "Word",         color: "bg-blue-100 text-blue-600" },
  { ext: ".pptx", icon: "📊", label: "PowerPoint",   color: "bg-orange-100 text-orange-600" },
  
];

function isValidFile(filename: string) {
  return ACCEPTED_EXTENSIONS.some((ext) =>
    filename.toLowerCase().endsWith(ext)
  );
}

export default function UploadPanel({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file: File) {
    if (!isValidFile(file.name)) {
      setError("Unsupported file. Please upload PDF, DOCX, TXT, PPTX, JPG or PNG.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const data = await uploadPDF(file);
      onUploadSuccess(data, file);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 p-8">
      <div className="w-full max-w-lg">

  {/* Hero */}
  <div className="text-center mb-8 pt-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl shadow-2xl shadow-purple-300 dark:shadow-purple-900 mb-5">
            <span className="text-4xl">🧠</span>
          </div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white">
            AskMyDocs
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
            Upload a document and start an AI-powered conversation
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-200 ${
            dragOver
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20 scale-[1.02]"
              : "border-purple-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-100 dark:hover:shadow-none"
          }`}
        >
          <div className="text-5xl mb-4">
            {dragOver ? "📂" : "📁"}
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-1 font-medium">
            Drag & drop your document here
          </p>
          <p className="text-gray-400 dark:text-gray-600 text-xs mb-6">or</p>

          <label className="cursor-pointer">
            <span className={`px-8 py-3 rounded-2xl text-sm font-bold inline-block transition-all shadow-lg ${
              uploading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 hover:scale-105 active:scale-95 shadow-purple-200"
            }`}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Processing...
                </span>
              ) : "Choose File"}
            </span>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-600 flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        {/* Supported formats */}
        <div className="mt-6">
          <p className="text-xs text-gray-400 dark:text-gray-600 font-semibold uppercase tracking-wider text-center mb-3">
            Supported Formats
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {FILE_INFO.map((f) => (
              <span
                key={f.ext}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${f.color}`}
              >
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  );
}