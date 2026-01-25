import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

type Variant = "error" | "success" | "info";

type Props = {
  message: string | null;
  onClose: () => void;
  variant?: Variant;
  durationMs?: number;
};

export default function ToastModal({
  message,
  onClose,
  variant = "error",
  durationMs = 10_000,
}: Props) {
  const [visible, setVisible] = useState(false);
  const closeTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);

  const startClose = () => {
    if (!message) return;
    setVisible(false);
    if (unmountTimerRef.current) window.clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = window.setTimeout(() => {
      onClose();
    }, 220);
  };

  useEffect(() => {
    if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
    if (unmountTimerRef.current) window.clearTimeout(unmountTimerRef.current);

    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);
    closeTimerRef.current = window.setTimeout(() => {
      startClose();
    }, durationMs);

    return () => {
      if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
      if (unmountTimerRef.current) window.clearTimeout(unmountTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, durationMs]);

  if (!message) return null;

  const styles =
    variant === "success"
      ? {
          panel: "bg-emerald-50 border-emerald-200 text-emerald-950",
          iconWrap: "bg-emerald-600",
          Icon: CheckCircle2,
        }
      : variant === "info"
      ? {
          panel: "bg-slate-50 border-slate-200 text-slate-950",
          iconWrap: "bg-slate-700",
          Icon: CheckCircle2,
        }
      : {
          panel: "bg-red-50 border-red-200 text-red-950",
          iconWrap: "bg-red-600",
          Icon: AlertCircle,
        };

  const Icon = styles.Icon;

  return (
    <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 px-3">
      <div
        className={[
          "pointer-events-auto flex min-w-[320px] max-w-[640px] items-center gap-3 rounded-2xl border px-4 py-3 shadow-soft",
          "transition-all duration-200 ease-out",
          visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
          styles.panel,
        ].join(" ")}
        role="alert"
        aria-live="assertive"
      >
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-xl text-white",
            styles.iconWrap,
          ].join(" ")}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 text-sm font-medium">{message}</div>

        <button
          type="button"
          onClick={startClose}
          className="rounded-md p-1 hover:bg-black/5"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

