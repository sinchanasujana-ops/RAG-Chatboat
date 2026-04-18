import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { user, isLoading } = useAuth();

  // ✅ Wait for localStorage to finish loading before deciding
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600 font-medium">Loading...</p>
      </div>
    );
  }

  // ✅ Only redirect after we're sure there's no user
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}