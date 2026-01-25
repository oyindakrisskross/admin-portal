import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ToastModal from "../components/ui/ToastModal";
import { confirmPasswordReset } from "../api/passwordReset";
import { SAFE_SPECIAL_CHARS, validatePortalPassword } from "../utils/passwordPolicy";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const query = useQuery();
  const uid = query.get("uid") ?? "";
  const token = query.get("token") ?? "";

  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(
    null
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMismatch(false);

    const invalid = validatePortalPassword(password1);
    if (invalid) {
      setToast({ message: invalid, variant: "error" });
      return;
    }

    if (password1 !== password2) {
      setMismatch(true);
      setToast({ message: "Passwords do not match", variant: "error" });
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset({
        uid,
        token,
        new_password1: password1,
        new_password2: password2,
      });
      navigate("/login", {
        replace: true,
        state: { toast: { message: "Password was changed successfully.", variant: "success" } },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        "Failed to reset password. Please try again.";
      setToast({ message: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const ring = mismatch ? "ring-2 ring-red-500" : "";

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
            <div className="text-sm font-semibold">Reset Password</div>
            <div className="text-xs text-kk-muted">Enter your new password</div>
          </div>
        </div>

        {!uid || !token ? (
          <div className="text-xs text-kk-danger">
            Invalid reset link. Please request a new one.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-1">
              <label className="text-xs text-kk-muted">New password</label>
              <input
                className={`w-full rounded-md bg-[rgba(15,16,19,0.95)] border border-kk-dark-border px-3 py-2 text-sm outline-none focus:border-kk-accent ${ring}`}
                value={password1}
                onChange={(e) => {
                  setMismatch(false);
                  setPassword1(e.target.value);
                }}
                type="password"
                autoComplete="new-password"
                required
              />
              <p className="text-[11px] text-kk-muted">
                Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special ({SAFE_SPECIAL_CHARS}).
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-kk-muted">Confirm password</label>
              <input
                className={`w-full rounded-md bg-[rgba(15,16,19,0.95)] border border-kk-dark-border px-3 py-2 text-sm outline-none focus:border-kk-accent ${ring}`}
                value={password2}
                onChange={(e) => {
                  setMismatch(false);
                  setPassword2(e.target.value);
                }}
                type="password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 rounded-md bg-kk-accent hover:bg-blue-500 text-sm font-medium py-2 disabled:opacity-60"
            >
              {submitting ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}

        <div className="mt-4 text-xs">
          <Link to="/login" className="text-kk-muted hover:text-gray-100">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
