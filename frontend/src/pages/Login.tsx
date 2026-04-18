import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginApi } from "../api/chatApi";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await loginApi(email, password);
      login(data.email, data.access_token);
      navigate("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* Left Panel — Branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Background circles */}
        <div className="absolute top-[-80px] left-[-80px] w-72 h-72 bg-white opacity-5 rounded-full" />
        <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 bg-white opacity-5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-white opacity-5 rounded-full transform -translate-x-1/2 -translate-y-1/2" />

        {/* Content */}
        <div className="relative z-10 text-center text-white">
          <div className="text-7xl mb-6">🧠</div>
          <h1 className="text-5xl font-black tracking-tight mb-4">
            AskMyDocs
          </h1>
          <p className="text-xl text-blue-100 font-light max-w-sm leading-relaxed">
            Upload any document and have intelligent conversations with your content using AI.
          </p>

          <div className="mt-10 flex flex-col gap-3 text-left">
            {[
              { icon: "📄", text: "PDF, Word, PowerPoint & Images" },
              { icon: "🤖", text: "Powered by Google Gemini AI" },
              { icon: "🔍", text: "Semantic search with ChromaDB" },
              { icon: "🔒", text: "Your data stays private" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 bg-white bg-opacity-10 rounded-xl px-4 py-3">
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm text-blue-100 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-5xl">🧠</span>
            <h1 className="text-3xl font-black text-gray-800 mt-2">AskMyDocs</h1>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-black text-gray-900">Welcome back 👋</h2>
              <p className="text-gray-500 text-sm mt-1">Sign in to continue to AskMyDocs</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 transition-colors bg-gray-50"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                  <span>❌</span> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-sm font-bold hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-purple-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Signing in...
                  </span>
                ) : "Sign In →"}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{" "}
                <Link to="/signup" className="font-bold text-purple-600 hover:text-purple-700">
                  Create one free →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}