import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import ToastModal from "../components/ui/ToastModal";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  useEffect(() => {
    const state: any = location.state;
    if (state?.toast?.message) {
      setToast(state.toast);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setToast({ message: "Invalid credentials or server error.", variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen min-w-screen flex items-center justify-center bg-kk-bg">
      <ToastModal
        message={toast?.message ?? null}
        onClose={() => setToast(null)}
        variant={toast?.variant ?? "error"}
      />
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
            <div className="flex items-center overflow-hidden rounded-md border border-kk-dark-border bg-[rgba(15,16,19,0.95)] focus-within:border-kk-accent">
              <input
                className="w-full flex-1 bg-transparent px-3 py-2 text-sm outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-black/5"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-kk-muted" />
                ) : (
                  <Eye className="h-4 w-4 text-kk-muted" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs text-kk-muted hover:text-gray-100"
            >
              Forgot password?
            </Link>
          </div>
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
