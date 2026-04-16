export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
}

export interface Source {
  page_number: number;
  text: string;
}

export interface UploadResponse {
  filename: string;
  collection_name: string;
  total_pages: number;
  total_chunks: number;
  session_id: number;
  message: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface ChatSession {
  id: string;
  dbSessionId: number;
  filename: string;
  collection_name: string;
  total_chunks: number;
  total_pages: number;
  messages: Message[];
  createdAt: Date;
  pdfFile?: File;
  pdfUrl?: string;
  isLoading?: boolean;
}