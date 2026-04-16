import { useState } from "react";
import { uploadPDF } from "../api/chatApi";
import type { UploadResponse } from "../types";

interface Props {
  onUploadSuccess: (data: UploadResponse, file: File) => void;
}

// Allowed file types
const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".pptx", ".jpg", ".png"];

const FILE_LABELS: Record<string, string> = {
  ".pdf":  "📄 PDF",
  ".docx": "📝 Word",
  ".txt":  "📃 Text",
  ".pptx": "📊 PowerPoint",
  ".jpg":  "🖼 Image",
  ".png":  "🖼 Image",
};

function getFileExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

function isValidFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext);
}

export default function UploadPanel({ onUploadSuccess }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function processFile(file: File) {
    if (!isValidFile(file)) {
      setError("Unsupported file type. Please upload PDF, DOCX, TXT, PPTX, JPG or PNG.");
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
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-5xl">📚</span>
          <h2 className="text-2xl font-bold text-gray-800 mt-3">
            Upload a Document
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Chat with any document using AI
          </p>
        </div>

        {/* Supported formats */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {ACCEPTED_EXTENSIONS.map((ext) => (
            <span
              key={ext}
              className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full border border-blue-200"
            >
              {FILE_LABELS[ext]}
            </span>
          ))}
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
            dragOver
              ? "border-blue-400 bg-blue-50 scale-105"
              : "border-gray-300 bg-white hover:border-blue-300"
          }`}
        >
          <p className="text-4xl mb-3">
            {dragOver ? "📂" : "📁"}
          </p>
          <p className="text-gray-600 text-sm mb-4">
            Drag & drop your file here, or
          </p>

          <label className="cursor-pointer">
            <span
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-colors inline-block ${
                uploading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
              }`}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Choose File"
              )}
            </span>
            <input
              type="file"
              accept={ACCEPTED_EXTENSIONS.join(",")}
              className="hidden"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>

          <p className="text-xs text-gray-400 mt-3">
            Supports PDF, Word, Text, PowerPoint, Images
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-center gap-2">
            <span>❌</span> {error}
          </div>
        )}

        {/* Tips */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">💡 Tips</p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• PDFs work best with selectable text</li>
            <li>• Images will be OCR scanned for text</li>
            <li>• Large files may take a moment to process</li>
            <li>• Each file becomes a separate chat session</li>
          </ul>
        </div>

      </div>
    </div>
  );
}