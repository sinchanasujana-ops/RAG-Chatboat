import type { UploadResponse, ChatResponse } from "../types";

const BASE_URL = "http://localhost:8000";

// ─────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────

export async function loginApi(
  email: string,
  password: string
): Promise<{ access_token: string; email: string }> {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Login failed");
  }

  const data = await response.json();

  localStorage.setItem("token", data.access_token);

  return data;
}

// ─────────────────────────────────────────
// SIGNUP
// ─────────────────────────────────────────

export async function signupApi(
  email: string,
  password: string
): Promise<{ access_token: string; email: string }> {
  const response = await fetch(`${BASE_URL}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Signup failed");
  }

  const data = await response.json();

  if (data.access_token) {
    localStorage.setItem("token", data.access_token);
  }

  return data;
}

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function getAuthHeadersFormData(): HeadersInit {
  const token = localStorage.getItem("token");

  return {
    Authorization: `Bearer ${token}`,
  };
}

// ─────────────────────────────────────────
// UPLOAD & SESSIONS
// ─────────────────────────────────────────

export async function uploadPDF(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload-pdf`, {
    method: "POST",
    headers: getAuthHeadersFormData(),
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

export async function fetchSessions(): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/sessions`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) throw new Error("Failed to fetch sessions");
  return response.json();
}

export async function fetchSessionMessages(
  sessionId: number
): Promise<any[]> {
  const response = await fetch(
    `${BASE_URL}/sessions/${sessionId}/messages`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
}

// ✅ FETCH CONTENT
export async function fetchSessionContent(
  sessionId: number
): Promise<{ content: string; filename: string }> {
  const response = await fetch(
    `${BASE_URL}/sessions/${sessionId}/content`,
    {
      method: "GET",
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) throw new Error("Failed to fetch content");
  return response.json();
}

// ─────────────────────────────────────────
// CHAT & AI FEATURES
// ─────────────────────────────────────────

export async function sendMessage(
  question: string,
  collectionName: string,
  sessionId: number
): Promise<ChatResponse> {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      question,
      collection_name: collectionName,
      session_id: sessionId,
      top_k: 5,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to get response");
  }

  return response.json();
}

export async function summarizeContent(
  type: "chat" | "pdf",
  collectionName: string,
  sessionId: number,
  chatHistory?: string
): Promise<{ summary: string }> {
  const response = await fetch(`${BASE_URL}/summarize`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      type,
      collection_name: collectionName,
      session_id: sessionId,
      chat_history: chatHistory || "",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Summarization failed");
  }

  return response.json();
}

export async function generateFlowchart(
  collectionName: string,
  sessionId: number,
  sourceText?: string
): Promise<{ mermaid_code: string }> {
  const response = await fetch(`${BASE_URL}/flowchart`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      collection_name: collectionName,
      session_id: sessionId,
      source_text: sourceText || "",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Flowchart generation failed");
  }

  return response.json();
}

// ─────────────────────────────────────────
// DELETE SESSION (✅ NEW)
// ─────────────────────────────────────────

export async function deleteSession(
  sessionId: number
): Promise<void> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Failed to delete session");
  }
}