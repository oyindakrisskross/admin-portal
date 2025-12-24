import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password, 2);
      navigate("/");
    } catch (err: any) {
      setError("Invalid credentials or server error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-kk-bg">
      <div className="w-full max-w-sm rounded-xl bg-kk-bg-elevated shadow-soft border border-kk-dark-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-8 w-8 rounded-md bg-purple-500 flex items-center justify-center text-sm font-bold">
            KK
          </div>
          <div>
            <div className="text-sm font-semibold">Kriss Kross Admin</div>
            <div className="text-xs text-kk-muted">Sign in to continue</div>
          </div>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1">
            <label className="text-xs text-kk-muted">Email</label>
            <input
              className="w-full rounded-md bg-[rgba(15,16,19,0.95)] border border-kk-dark-border px-3 py-2 text-sm outline-none focus:border-kk-accent"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-kk-muted">Password</label>
            <input
              className="w-full rounded-md bg-[rgba(15,16,19,0.95)] border border-kk-dark-border px-3 py-2 text-sm outline-none focus:border-kk-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </div>
          {error && <div className="text-xs text-kk-danger">{error}</div>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 rounded-md bg-kk-accent hover:bg-blue-500 text-sm font-medium py-2 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
