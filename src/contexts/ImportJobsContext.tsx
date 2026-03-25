import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { fetchCRMImportJobs, type CRMImportJob, type CRMImportJobStatus } from "../api/contact";
import { useAuth } from "../auth/AuthContext";
import ToastModal from "../components/ui/ToastModal";

type ToastVariant = "error" | "success" | "info";

type ImportJobsContextValue = {
  jobs: CRMImportJob[];
  loading: boolean;
  refreshJobs: () => Promise<void>;
  registerJob: (job: CRMImportJob, startMessage?: string) => void;
};

type ToastItem = {
  id: number;
  message: string;
  variant: ToastVariant;
};

const ImportJobsContext = createContext<ImportJobsContextValue | null>(null);

const TERMINAL_JOB_STATUSES = new Set<CRMImportJobStatus>(["SUCCESS", "PARTIAL_SUCCESS", "ERROR"]);

function storageKeyFor(userId: number | null, portalId: number | null) {
  return `kk_crm_import_jobs_${userId ?? "anon"}_${portalId ?? "portal"}`;
}

function mergeJobs(current: CRMImportJob[], incoming: CRMImportJob[]) {
  const byId = new Map<number, CRMImportJob>();
  for (const job of [...incoming, ...current]) {
    byId.set(job.id, job);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const byCreatedAt = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (byCreatedAt !== 0) return byCreatedAt;
    return b.id - a.id;
  });
}

function uniqueIds(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value))));
}

function buildStartMessage(job: CRMImportJob) {
  if (job.job_kind === "CSV") {
    return "CSV import is running in the background. You can continue using admin portal and you'll be notified when it finishes.";
  }
  return "CRM connection import is running in the background. You can continue using admin portal and you'll be notified when it finishes.";
}

function buildCompletionMessage(job: CRMImportJob) {
  const label =
    job.job_kind === "CSV"
      ? job.file_name || job.source_label || "CSV import"
      : job.source_label || job.service_name || "CRM connection import";

  if (job.status === "SUCCESS") {
    return `${label} finished. ${job.message || `Imported ${job.record_count} record(s).`}`;
  }
  if (job.status === "PARTIAL_SUCCESS") {
    return `${label} finished with issues. ${job.message || "Review the import history for details."}`;
  }
  return `${label} failed. ${job.message || "Review the import history for details."}`;
}

function completionVariant(status: CRMImportJobStatus): ToastVariant {
  if (status === "SUCCESS") return "success";
  if (status === "PARTIAL_SUCCESS") return "info";
  return "error";
}

export function ImportJobsProvider({ children }: React.PropsWithChildren) {
  const { me, can } = useAuth();
  const [jobs, setJobs] = useState<CRMImportJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackedJobIds, setTrackedJobIds] = useState<number[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);
  const trackedJobIdsRef = useRef<number[]>([]);
  const nextToastIdRef = useRef(1);

  const storageKey = useMemo(() => {
    if (!me) return null;
    return storageKeyFor(me.id, me.portal);
  }, [me]);
  const canViewImportJobs = can("Contacts", "view");

  const enqueueToast = useCallback((message: string, variant: ToastVariant) => {
    setToastQueue((prev) => [
      ...prev,
      {
        id: nextToastIdRef.current++,
        message,
        variant,
      },
    ]);
  }, []);

  useEffect(() => {
    if (!storageKey) {
      trackedJobIdsRef.current = [];
      setTrackedJobIds([]);
      setJobs([]);
      return;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const normalized = Array.isArray(parsed) ? uniqueIds(parsed.map((value) => Number(value))) : [];
      trackedJobIdsRef.current = normalized;
      setTrackedJobIds(normalized);
    } catch {
      trackedJobIdsRef.current = [];
      setTrackedJobIds([]);
    }
  }, [storageKey]);

  useEffect(() => {
    trackedJobIdsRef.current = trackedJobIds;
    if (!storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(trackedJobIds));
    } catch {
      // Ignore storage failures.
    }
  }, [trackedJobIds, storageKey]);

  const refreshJobs = useCallback(async () => {
    if (!me || !canViewImportJobs) {
      setJobs([]);
      return;
    }

    setLoading(true);
    try {
      const latest = await fetchCRMImportJobs({ limit: 25 });
      setJobs((prev) => mergeJobs(prev, latest));

      const trackedIds = trackedJobIdsRef.current;
      if (trackedIds.length) {
        const completedJobs = latest.filter(
          (job) => trackedIds.includes(job.id) && TERMINAL_JOB_STATUSES.has(job.status)
        );
        if (completedJobs.length) {
          completedJobs
            .sort((a, b) => a.id - b.id)
            .forEach((job) => enqueueToast(buildCompletionMessage(job), completionVariant(job.status)));
          const completedIds = new Set(completedJobs.map((job) => job.id));
          const nextTrackedIds = trackedIds.filter((id) => !completedIds.has(id));
          trackedJobIdsRef.current = nextTrackedIds;
          setTrackedJobIds(nextTrackedIds);
        }
      }
    } catch {
      // Background polling should stay silent.
    } finally {
      setLoading(false);
    }
  }, [canViewImportJobs, enqueueToast, me]);

  useEffect(() => {
    if (!me || !canViewImportJobs) return;
    void refreshJobs();
    const interval = window.setInterval(() => {
      void refreshJobs();
    }, 10000);
    return () => {
      window.clearInterval(interval);
    };
  }, [canViewImportJobs, me, refreshJobs]);

  const registerJob = useCallback(
    (job: CRMImportJob, startMessage?: string) => {
      setJobs((prev) => mergeJobs(prev, [job]));
      const nextTrackedIds = uniqueIds([...trackedJobIdsRef.current, job.id]);
      trackedJobIdsRef.current = nextTrackedIds;
      setTrackedJobIds(nextTrackedIds);
      enqueueToast(startMessage || buildStartMessage(job), "info");
    },
    [enqueueToast]
  );

  const value = useMemo<ImportJobsContextValue>(
    () => ({
      jobs,
      loading,
      refreshJobs,
      registerJob,
    }),
    [jobs, loading, refreshJobs, registerJob]
  );

  const activeToast = toastQueue[0] ?? null;

  return (
    <ImportJobsContext.Provider value={value}>
      {children}
      <ToastModal
        message={activeToast?.message ?? null}
        variant={activeToast?.variant ?? "info"}
        onClose={() => setToastQueue((prev) => prev.slice(1))}
      />
    </ImportJobsContext.Provider>
  );
}

export function useImportJobs() {
  const context = useContext(ImportJobsContext);
  if (!context) {
    throw new Error("useImportJobs must be used within ImportJobsProvider.");
  }
  return context;
}
