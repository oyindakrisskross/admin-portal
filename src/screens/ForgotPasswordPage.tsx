import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ToastModal from "../components/ui/ToastModal";
import { requestPasswordReset } from "../api/passwordReset";

const PORTAL_ID = 1;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(
    null
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email, PORTAL_ID);
      setToast({ message: "Password reset email sent. Check your inbox.", variant: "success" });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Failed to send reset email. Please try again.";
      setToast({ message: msg, variant: "error" });
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
            <div className="text-sm font-semibold">Forgot Password</div>
            <div className="text-xs text-kk-muted">Enter your email to reset your password</div>
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
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 rounded-md bg-kk-accent hover:bg-blue-500 text-sm font-medium py-2 disabled:opacity-60"
          >
            {submitting ? "Sending…" : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-xs">
          <Link to="/login" className="text-kk-muted hover:text-gray-100">
            Back to sign in
          </Link>
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="text-kk-muted hover:text-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

