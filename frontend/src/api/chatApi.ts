import type { UploadResponse, ChatResponse } from "../types";

const BASE_URL = "http://localhost:8000";

// ── Helpers ──────────────────────────────────────────

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

// ── Auth API ─────────────────────────────────────────

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
  return response.json();
}

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
  return response.json();
}

// ── Sessions API ─────────────────────────────────────

export async function fetchSessions(): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/sessions`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch sessions");
  return response.json();
}

export async function fetchSessionMessages(sessionId: number): Promise<any[]> {
  const response = await fetch(`${BASE_URL}/sessions/${sessionId}/messages`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
}

// ── Chat API ─────────────────────────────────────────

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
    throw new Error(error.detail || "Failed to upload PDF");
  }
  return response.json();
}

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