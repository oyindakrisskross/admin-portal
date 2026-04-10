import React, { useEffect, useMemo, useState } from "react";

import { fetchOutlets } from "../../../api/location";
import {
  fetchCustomerSubscription,
  fetchSubscriptionPlan,
  fetchSubscriptionPlans,
  processSubscriptionPayment,
  resendSubscriptionPassEmail,
  updateCustomerSubscription,
} from "../../../api/subscriptions";
import { useAuth } from "../../../auth/AuthContext";
import { TabNav } from "../../../components/layout/TabNav";
import { CustomerSearchSelect } from "../../../components/crm/CustomerSearchSelect";
import ToastModal from "../../../components/ui/ToastModal";
import type { CustomerRecord } from "../../../types/customerPortal";
import type { Outlet } from "../../../types/location";
import type {
  CustomerSubscriptionRecord,
  CustomerSubscriptionStatus,
  SubscriptionCouponUsageHistoryEntry,
  SubscriptionPaymentHistoryEntry,
  SubscriptionPlan,
  SubscriptionUsageHistoryEntry,
} from "../../../types/subscriptions";

interface Props {
  subscriptionId: number;
  onUpdated?: (subscription: CustomerSubscriptionRecord) => void;
}

type EditableUsageHistoryRow = {
  id?: number;
  visited_at: string;
  location_id: string;
  pos_reference: string;
};

type EditablePaymentHistoryRow = {
  id?: number;
  amount: string;
  method: "CASH" | "CARD" | "TRANSFER" | "OTHER";
  reference: string;
  paid_on: string;
};

type EditState = {
  customer: CustomerRecord | null;
  plan_id: string;
  physical_card_serial: string;
  started_at: string;
  expires_at: string;
  total_uses: string;
  used_uses: string;
  status: CustomerSubscriptionStatus;
  usage_history: EditableUsageHistoryRow[];
  payment_history: EditablePaymentHistoryRow[];
};

const statusOptions: CustomerSubscriptionStatus[] = ["UNPAID", "ACTIVE", "EXPIRED", "DEPLETED", "CANCELLED"];
const paymentMethodOptions: Array<EditablePaymentHistoryRow["method"]> = ["CASH", "CARD", "TRANSFER", "OTHER"];
const fieldInputClass =
  "w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none focus:border-kk-primary";
const currencyFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const toDateTime = (value?: string | null) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString();
};

const toDateTimeLocalValue = (value?: string | null) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
};

const fromDateTimeLocalValue = (value: string) => {
  if (!value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
};

const formatCurrency = (value: number) => currencyFormatter.format(value || 0);

const estimatePlanGrandTotal = (plan: SubscriptionPlan | null | undefined) => {
  if (!plan) return 0;
  const subtotal = (Number(plan.price || 0) || 0) + (Number(plan.setup_fee || 0) || 0);
  const taxRate = Number(plan.sales_tax_rate || 0) || 0;
  return subtotal + (subtotal * taxRate) / 100;
};

const derivePlanTimingDefaults = (plan: SubscriptionPlan, startedAtValue: string) => {
  const startIso = fromDateTimeLocalValue(startedAtValue) || new Date().toISOString();
  const start = new Date(startIso);
  const expiresAt = new Date(start);

  const addDays = (days: number) => {
    expiresAt.setDate(expiresAt.getDate() + days);
    return toDateTimeLocalValue(expiresAt.toISOString());
  };

  const frequencyValue = Number(plan.billing_frequency_value || 1) || 1;
  const multiplier =
    plan.plan_type === "USAGE" && plan.billing_cycles_mode === "FIXED"
      ? Math.max(Number(plan.billing_cycles || 1) || 1, 1)
      : 1;
  const totalFrequencyValue = frequencyValue * multiplier;

  let nextExpiresAt = "";
  if (plan.plan_type === "CYCLE") {
    if (plan.billing_frequency_unit === "DAY") nextExpiresAt = addDays(totalFrequencyValue);
    else if (plan.billing_frequency_unit === "WEEK") nextExpiresAt = addDays(totalFrequencyValue * 7);
    else if (plan.billing_frequency_unit === "MONTH") nextExpiresAt = addDays(totalFrequencyValue * 30);
    else if (plan.billing_frequency_unit === "YEAR") nextExpiresAt = addDays(totalFrequencyValue * 365);
  } else if (plan.billing_cycles_mode === "FIXED") {
    if (plan.billing_frequency_unit === "DAY") nextExpiresAt = addDays(totalFrequencyValue);
    else if (plan.billing_frequency_unit === "WEEK") nextExpiresAt = addDays(totalFrequencyValue * 7);
    else if (plan.billing_frequency_unit === "MONTH") nextExpiresAt = addDays(totalFrequencyValue * 30);
    else if (plan.billing_frequency_unit === "YEAR") nextExpiresAt = addDays(totalFrequencyValue * 365);
  }

  return {
    total_uses: plan.plan_type === "USAGE" ? (plan.included_uses == null ? "" : String(plan.included_uses)) : "",
    expires_at: nextExpiresAt,
  };
};

const mergePlans = (...groups: Array<SubscriptionPlan[]>) => {
  const next = new Map<number, SubscriptionPlan>();
  groups.flat().forEach((plan) => {
    if (plan?.id == null) return;
    next.set(plan.id, plan);
  });
  return Array.from(next.values()).sort((left, right) => {
    const leftLabel = `${left.product_name || ""} ${left.name || ""}`.trim();
    const rightLabel = `${right.product_name || ""} ${right.name || ""}`.trim();
    return leftLabel.localeCompare(rightLabel);
  });
};

const apiErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  const normalize = (message: string) => {
    const text = String(message || "").trim();
    const lowered = text.toLowerCase();
    if (
      lowered.includes("physical card serial") ||
      lowered.includes("card serial number is already in use") ||
      lowered.includes("uniq_subscription_plan_card_serial") ||
      lowered.includes("duplicate key value violates unique constraint") ||
      lowered.includes("unique constraint failed")
    ) {
      return "This card serial number is already in use.";
    }
    return text;
  };
  if (typeof data === "string" && data.trim()) return normalize(data);
  if (data?.detail) return normalize(String(data.detail));
  if (data?.message) return normalize(String(data.message));
  if (Array.isArray(data?.non_field_errors) && data.non_field_errors[0]) {
    return normalize(String(data.non_field_errors[0]));
  }
  if (data && typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string" && value.trim()) return normalize(value);
      if (Array.isArray(value) && value[0]) return normalize(String(value[0]));
    }
  }
  return normalize(err?.message || fallback);
};

const statusBadge = (label: string) => {
  const tone =
    label === "ACTIVE"
      ? "bg-emerald-700 text-emerald-100"
      : label === "UNPAID"
        ? "bg-orange-700 text-orange-100"
      : label === "DEPLETED"
        ? "bg-amber-700 text-amber-100"
        : label === "EXPIRED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
};

const buildCustomerValue = (subscription: CustomerSubscriptionRecord): CustomerRecord => ({
  id: subscription.customer,
  contact_id: 0,
  email: subscription.customer_email || "",
  is_active: true,
  first_name: subscription.customer_name || subscription.customer_email || `Customer #${subscription.customer}`,
  last_name: null,
  phone: null,
  minors_count: 0,
  minors: [],
  customer_minors: [],
  active_minors_count: 0,
  created_at: subscription.created_on,
  updated_at: subscription.updated_on,
});

const buildEditState = (subscription: CustomerSubscriptionRecord): EditState => ({
  customer: buildCustomerValue(subscription),
  plan_id: String(subscription.plan),
  physical_card_serial: String(subscription.physical_card_serial || ""),
  started_at: toDateTimeLocalValue(subscription.started_at),
  expires_at: toDateTimeLocalValue(subscription.expires_at),
  total_uses: subscription.total_uses == null ? "" : String(subscription.total_uses),
  used_uses: String(subscription.used_uses ?? 0),
  status: subscription.status,
  usage_history: Array.isArray(subscription.usage_history)
    ? subscription.usage_history.map((entry) => ({
        id: entry.id,
        visited_at: toDateTimeLocalValue(entry.visited_at),
        location_id: entry.location_id == null ? "" : String(entry.location_id),
        pos_reference: String(entry.pos_reference || ""),
      }))
    : [],
  payment_history: Array.isArray(subscription.payment_history)
    ? subscription.payment_history.map((entry) => ({
        id: entry.id,
        amount: String(entry.amount ?? ""),
        method: (String(entry.method || "OTHER").toUpperCase() as EditablePaymentHistoryRow["method"]) || "OTHER",
        reference: String(entry.reference || ""),
        paid_on: toDateTimeLocalValue(entry.paid_on),
      }))
    : [],
});

export const SubscriptionPeek: React.FC<Props> = ({ subscriptionId, onUpdated }) => {
  const { can } = useAuth();
  const canEdit = can("Subscriptions", "edit");

  const [subscription, setSubscription] = useState<CustomerSubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [planOptions, setPlanOptions] = useState<SubscriptionPlan[]>([]);
  const [currentPlanDetail, setCurrentPlanDetail] = useState<SubscriptionPlan | null>(null);
  const [loadingPlanOptions, setLoadingPlanOptions] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<EditablePaymentHistoryRow["method"]>("OTHER");
  const [paymentReference, setPaymentReference] = useState("");
  const [tab, setTab] = useState<"overview" | "usage" | "payments" | "coupons">("overview");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("info");

  useEffect(() => {
    let cancelled = false;
    setEditing(false);
    (async () => {
      setLoading(true);
      try {
        const data = await fetchCustomerSubscription(subscriptionId);
        if (!cancelled) setSubscription(data);
      } catch {
        if (!cancelled) setSubscription(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  useEffect(() => {
    if (!subscription) {
      setEditState(null);
      return;
    }
    setEditState(buildEditState(subscription));
  }, [subscription]);

  useEffect(() => {
    if (!subscription) return;
    const lastMethod =
      Array.isArray(subscription.payment_history) && subscription.payment_history.length
        ? String(subscription.payment_history[0]?.method || "OTHER").toUpperCase()
        : "OTHER";
    setPaymentMethod(
      paymentMethodOptions.includes(lastMethod as EditablePaymentHistoryRow["method"])
        ? (lastMethod as EditablePaymentHistoryRow["method"])
        : "OTHER"
    );
    setPaymentReference("");
    setShowPaymentForm(false);
    const remaining = Number(subscription.source_invoice_balance_due || 0) || 0;
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : "");
  }, [subscription]);

  useEffect(() => {
    setTab("overview");
  }, [subscriptionId]);

  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchOutlets();
        if (!cancelled) setOutlets(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setOutlets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canEdit]);

  useEffect(() => {
    if (!canEdit || !subscription) {
      setPlanOptions([]);
      setCurrentPlanDetail(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingPlanOptions(true);
      try {
        const [activePlansData, currentPlan] = await Promise.all([
          fetchSubscriptionPlans({ status: "ACTIVE", page_size: 300 }),
          fetchSubscriptionPlan(subscription.plan),
        ]);
        if (cancelled) return;
        const merged = mergePlans(activePlansData.results ?? [], currentPlan ? [currentPlan] : []);
        setPlanOptions(merged);
        setCurrentPlanDetail(currentPlan);
      } catch {
        if (cancelled) return;
        setPlanOptions([]);
        setCurrentPlanDetail(null);
      } finally {
        if (!cancelled) setLoadingPlanOptions(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canEdit, subscription?.id, subscription?.plan]);

  const usageHistory = useMemo(
    () => (Array.isArray(subscription?.usage_history) ? subscription.usage_history : []),
    [subscription?.usage_history]
  );
  const couponUsageHistory = useMemo(
    () => (Array.isArray(subscription?.coupon_usage_history) ? subscription.coupon_usage_history : []),
    [subscription?.coupon_usage_history]
  );
  const paymentHistory = useMemo(
    () => (Array.isArray(subscription?.payment_history) ? subscription.payment_history : []),
    [subscription?.payment_history]
  );
  const invoiceGrandTotal = Number(subscription?.source_invoice_grand_total || 0) || 0;
  const recordedAmountPaid = Number(subscription?.source_invoice_amount_paid || 0) || 0;
  const remainingBalanceDue = Number(subscription?.source_invoice_balance_due || 0) || 0;
  const canChangePlan = Boolean(
    subscription?.can_change_plan ??
      ((subscription?.used_uses ?? 0) === 0 && usageHistory.length === 0 && couponUsageHistory.length === 0)
  );
  const canChangeCardSerial = canChangePlan;
  const selectedPlan = useMemo(() => {
    if (!editState) return null;
    return planOptions.find((plan) => String(plan.id) === editState.plan_id) ?? null;
  }, [editState, planOptions]);
  const effectivePlan = editing ? selectedPlan ?? currentPlanDetail : currentPlanDetail;
  const effectivePlanUsesPhysicalCard = Boolean(effectivePlan?.uses_physical_card ?? subscription?.plan_uses_physical_card);
  const effectivePlanRequiresCardSerial = Boolean(
    effectivePlan?.requires_card_serial ?? subscription?.plan_requires_card_serial
  );
  const cardSerialRequired =
    effectivePlanRequiresCardSerial && editState != null && !["CANCELLED", "EXPIRED"].includes(editState.status);
  const planChangeDelta =
    selectedPlan && currentPlanDetail && selectedPlan.id !== currentPlanDetail.id
      ? estimatePlanGrandTotal(selectedPlan) - estimatePlanGrandTotal(currentPlanDetail)
      : 0;
  const projectedInvoiceTotal = invoiceGrandTotal + planChangeDelta;
  const projectedRemainingBalance = Math.max(projectedInvoiceTotal - recordedAmountPaid, 0);
  const projectedRefundAmount = Math.max(recordedAmountPaid - projectedInvoiceTotal, 0);
  const pendingPaymentAmount = paymentAmount.trim() ? Number(paymentAmount) || 0 : remainingBalanceDue;
  const projectedBalanceDue = Math.max(remainingBalanceDue - pendingPaymentAmount, 0);

  if (loading && !subscription) {
    return <div className="px-3 py-6 text-sm text-kk-dark-text-muted">Loading subscription...</div>;
  }

  if (!subscription || !editState) {
    return <div className="px-3 py-6 text-sm text-kk-dark-text-muted">Unable to load subscription.</div>;
  }

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const result = await resendSubscriptionPassEmail(subscription.id);
      setToastVariant("success");
      setToastMessage(result.detail || "Subscription QR email sent.");
    } catch (err: any) {
      setToastVariant("error");
      setToastMessage(apiErrorMessage(err, "Failed to send subscription QR email."));
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePlanSelection = (planId: string) => {
    setEditState((current) => {
      if (!current) return current;
      const nextPlan = planOptions.find((plan) => String(plan.id) === planId);
      if (!nextPlan) {
        return { ...current, plan_id: planId };
      }
      const derived = derivePlanTimingDefaults(nextPlan, current.started_at);
      return {
        ...current,
        plan_id: planId,
        total_uses: derived.total_uses,
        expires_at: derived.expires_at,
        physical_card_serial: nextPlan.uses_physical_card ? current.physical_card_serial : "",
      };
    });
  };

  const handleSave = async () => {
    if (!editState.customer) {
      setToastVariant("error");
      setToastMessage("Select the customer assigned to this subscription.");
      return;
    }
    if (!editState.started_at.trim()) {
      setToastVariant("error");
      setToastMessage("Subscription start date is required.");
      return;
    }
    if (!editState.plan_id.trim()) {
      setToastVariant("error");
      setToastMessage("Select the subscription plan assigned to this subscription.");
      return;
    }
    if (effectivePlanUsesPhysicalCard && cardSerialRequired && !editState.physical_card_serial.trim()) {
      setToastVariant("error");
      setToastMessage("Physical card serial is required for this subscription plan.");
      return;
    }

    const nextPlanId = Number(editState.plan_id);
    if (!Number.isFinite(nextPlanId) || nextPlanId <= 0) {
      setToastVariant("error");
      setToastMessage("Select a valid subscription plan.");
      return;
    }

    const isPlanChanged = nextPlanId !== subscription.plan;

    const payload: Parameters<typeof updateCustomerSubscription>[1] = {
      customer: editState.customer.id,
      plan: nextPlanId,
      status: editState.status === "UNPAID" ? "ACTIVE" : editState.status,
      started_at: fromDateTimeLocalValue(editState.started_at) || subscription.started_at,
      expires_at: editState.expires_at.trim() ? fromDateTimeLocalValue(editState.expires_at) : null,
      total_uses: editState.total_uses.trim() === "" ? null : Number(editState.total_uses),
      used_uses: editState.used_uses.trim() === "" ? 0 : Number(editState.used_uses),
      physical_card_serial: effectivePlanUsesPhysicalCard ? editState.physical_card_serial.trim() || null : null,
      usage_history_input: editState.usage_history
        .filter((row) => row.visited_at.trim())
        .map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          visited_at: fromDateTimeLocalValue(row.visited_at) || subscription.started_at,
          location_id: row.location_id.trim() ? Number(row.location_id) : null,
          pos_reference: row.pos_reference.trim(),
        })),
    };

    if (subscription.source_invoice) {
      payload.payment_history_input = editState.payment_history
        .filter((row) => row.id != null || row.amount.trim() || row.reference.trim() || row.paid_on.trim())
        .map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          amount: row.amount.trim() || "0.00",
          method: row.method,
          reference: row.reference.trim(),
          ...(row.paid_on.trim() ? { paid_on: fromDateTimeLocalValue(row.paid_on) || undefined } : {}),
        }));
    }

    setSaving(true);
    try {
      const updated = await updateCustomerSubscription(subscription.id, payload);
      setSubscription(updated);
      onUpdated?.(updated);
      setEditing(false);
      setToastVariant("success");
      if (isPlanChanged && projectedRefundAmount > 0.009) {
        setToastMessage(`Subscription updated. Refund recorded: ${formatCurrency(projectedRefundAmount)}.`);
      } else if (isPlanChanged && projectedRemainingBalance > 0.009) {
        setToastMessage(`Subscription updated. Remaining balance: ${formatCurrency(projectedRemainingBalance)}.`);
      } else {
        setToastMessage("Subscription updated.");
      }
    } catch (err: any) {
      setToastVariant("error");
      setToastMessage(apiErrorMessage(err, "Failed to update subscription."));
    } finally {
      setSaving(false);
    }
  };

  const updateUsageRow = (index: number, patch: Partial<EditableUsageHistoryRow>) => {
    setEditState((current) => {
      if (!current) return current;
      const next = [...current.usage_history];
      next[index] = { ...next[index], ...patch };
      return { ...current, usage_history: next };
    });
  };

  const handleProcessPayment = async () => {
    if (!subscription.source_invoice) {
      setToastVariant("error");
      setToastMessage("This subscription does not have a source invoice to receive payment.");
      return;
    }
    if (remainingBalanceDue <= 0) {
      setToastVariant("info");
      setToastMessage("This subscription is already fully paid.");
      return;
    }

    const rawAmount = paymentAmount.trim() || remainingBalanceDue.toFixed(2);
    const parsedAmount = Number(rawAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setToastVariant("error");
      setToastMessage("Payment amount must be a valid amount greater than zero.");
      return;
    }
    if (parsedAmount - remainingBalanceDue > 0.009) {
      setToastVariant("error");
      setToastMessage("Payment amount cannot exceed the remaining invoice balance.");
      return;
    }

    setProcessingPayment(true);
    try {
      const updated = await processSubscriptionPayment(subscription.id, {
        amount_paid: rawAmount,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || undefined,
      });
      setSubscription(updated);
      onUpdated?.(updated);
      setShowPaymentForm(false);
      setToastVariant("success");
      setToastMessage("Subscription payment recorded.");
    } catch (err: any) {
      setToastVariant("error");
      setToastMessage(apiErrorMessage(err, "Failed to record subscription payment."));
    } finally {
      setProcessingPayment(false);
    }
  };

  const updatePaymentRow = (index: number, patch: Partial<EditablePaymentHistoryRow>) => {
    setEditState((current) => {
      if (!current) return current;
      const next = [...current.payment_history];
      next[index] = { ...next[index], ...patch };
      return { ...current, payment_history: next };
    });
  };

  return (
    <div className="flex h-full flex-col gap-6 p-5 pb-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{editing ? effectivePlan?.name || subscription.plan_name : subscription.plan_name}</h2>
          <p className="text-sm text-kk-dark-text-muted">
            {editing ? effectivePlan?.code || subscription.plan_code : subscription.plan_code}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditState(buildEditState(subscription));
                  setEditing(false);
                }}
                className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs font-medium hover:bg-kk-dark-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-full bg-kk-primary px-4 py-2 text-xs font-medium text-black disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          ) : null}
          {canEdit && !editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs font-medium hover:bg-kk-dark-hover"
            >
              Edit Subscription
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSendEmail()}
            disabled={sendingEmail || !subscription.customer_email}
            className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs font-medium hover:bg-kk-dark-hover disabled:opacity-60"
          >
            {sendingEmail ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-7 gap-y-2">
        <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
          Overview
        </TabNav>
        <TabNav action={() => setTab("usage")} isActive={tab === "usage"}>
          Usage History
        </TabNav>
        <TabNav action={() => setTab("payments")} isActive={tab === "payments"}>
          Payment History
        </TabNav>
        <TabNav action={() => setTab("coupons")} isActive={tab === "coupons"}>
          Coupon Usage
        </TabNav>
      </div>

      {tab === "overview" ? (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-kk-dark-text-muted">Assignment</p>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Plan</p>
              {editing ? (
                canChangePlan ? (
                  <div className="space-y-2">
                    <select
                      className={fieldInputClass}
                      value={editState.plan_id}
                      onChange={(e) => handlePlanSelection(e.target.value)}
                      disabled={loadingPlanOptions}
                    >
                      <option value="">Select a plan</option>
                      {planOptions.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                          {plan.code ? ` (${plan.code})` : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-kk-dark-text-muted">
                      {loadingPlanOptions ? "Loading available plans..." : "Only unused subscriptions can switch plans."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm text-kk-dark-text">
                      {subscription.plan_name}
                      {subscription.plan_code ? ` (${subscription.plan_code})` : ""}
                    </p>
                    <p className="text-xs text-kk-dark-text-muted">
                      {subscription.plan_change_block_reason || "This subscription can no longer switch plans."}
                    </p>
                  </div>
                )
              ) : (
                <p className="text-sm text-kk-dark-text">
                  {subscription.plan_name}
                  {subscription.plan_code ? ` (${subscription.plan_code})` : ""}
                </p>
              )}
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Customer</p>
              {editing ? (
                <CustomerSearchSelect
                  value={editState.customer}
                  onChange={(customer) => setEditState((current) => (current ? { ...current, customer } : current))}
                  onError={(message) => {
                    setToastVariant("error");
                    setToastMessage(message);
                  }}
                />
              ) : (
                <p className="text-sm text-kk-dark-text">{subscription.customer_name || subscription.customer_email}</p>
              )}
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Email</p>
              <p className="text-sm text-kk-dark-text">{subscription.customer_email || "-"}</p>
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Physical Card Serial</p>
              {editing && effectivePlanUsesPhysicalCard ? (
                <input
                  className={fieldInputClass}
                  value={editState.physical_card_serial}
                  disabled={!canChangeCardSerial}
                  onChange={(e) =>
                    setEditState((current) =>
                      current ? { ...current, physical_card_serial: e.target.value } : current
                    )
                  }
                  placeholder={cardSerialRequired ? "Required serial number" : "Serial number"}
                />
              ) : (
                <p className="text-sm text-kk-dark-text">
                  {effectivePlanUsesPhysicalCard ? subscription.physical_card_serial || "-" : "Not used on this plan"}
                </p>
              )}
              {editing && effectivePlanUsesPhysicalCard ? (
                <p className="mt-1 text-xs text-kk-dark-text-muted">
                  {!canChangeCardSerial
                    ? "Card serial cannot be changed after the subscription has been used."
                    : cardSerialRequired
                    ? "Card serial is required unless the subscription is being cancelled or expired."
                    : "Card serial is optional for the selected status."}
                </p>
              ) : null}
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Status</p>
              {editing ? (
                <select
                  className={fieldInputClass}
                  value={editState.status}
                  onChange={(e) =>
                    setEditState((current) =>
                      current ? { ...current, status: e.target.value as CustomerSubscriptionStatus } : current
                    )
                  }
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              ) : (
                <div>{statusBadge(subscription.status)}</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-kk-dark-text-muted">Timing & Usage</p>
          <div className="space-y-3">
            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Subscription Created</p>
              <p className="text-sm text-kk-dark-text">{toDateTime(subscription.created_on)}</p>
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Subscription Start</p>
              {editing ? (
                <input
                  type="datetime-local"
                  className={fieldInputClass}
                  value={editState.started_at}
                  onChange={(e) =>
                    setEditState((current) => {
                      if (!current) return current;
                      const nextStartedAt = e.target.value;
                      const shouldRefreshPlanDefaults =
                        selectedPlan != null && currentPlanDetail != null && selectedPlan.id !== currentPlanDetail.id;
                      if (!shouldRefreshPlanDefaults) {
                        return { ...current, started_at: nextStartedAt };
                      }
                      const derived = derivePlanTimingDefaults(selectedPlan, nextStartedAt);
                      return {
                        ...current,
                        started_at: nextStartedAt,
                        expires_at: derived.expires_at,
                        total_uses: derived.total_uses,
                      };
                    })
                  }
                />
              ) : (
                <p className="text-sm text-kk-dark-text">{toDateTime(subscription.started_at)}</p>
              )}
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Expires</p>
              {editing ? (
                <input
                  type="datetime-local"
                  className={fieldInputClass}
                  value={editState.expires_at}
                  onChange={(e) =>
                    setEditState((current) => (current ? { ...current, expires_at: e.target.value } : current))
                  }
                />
              ) : (
                <p className="text-sm text-kk-dark-text">{toDateTime(subscription.expires_at)}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm text-kk-dark-text-muted">Total Uses</p>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={fieldInputClass}
                    value={editState.total_uses}
                    onChange={(e) =>
                      setEditState((current) => (current ? { ...current, total_uses: e.target.value } : current))
                    }
                    placeholder="Unlimited"
                  />
                ) : (
                  <p className="text-sm text-kk-dark-text">
                    {subscription.total_uses == null ? "Unlimited" : subscription.total_uses}
                  </p>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm text-kk-dark-text-muted">Used Uses</p>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className={fieldInputClass}
                    value={editState.used_uses}
                    onChange={(e) =>
                      setEditState((current) => (current ? { ...current, used_uses: e.target.value } : current))
                    }
                  />
                ) : (
                  <p className="text-sm text-kk-dark-text">
                    {subscription.total_uses == null
                      ? subscription.used_uses
                      : `${subscription.used_uses}/${subscription.total_uses} (remaining: ${subscription.remaining_uses ?? 0})`}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Payment Date</p>
              <p className="text-sm text-kk-dark-text">
                {toDateTime(subscription.source_invoice_paid_at || subscription.source_invoice_date || null)}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm text-kk-dark-text-muted">Source Invoice</p>
              <p className="text-sm text-kk-dark-text">{subscription.source_invoice_number || "-"}</p>
            </div>
          </div>
        </div>
      </div>
      ) : null}

      {tab === "usage" ? (
      <div className="rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Usage History</h3>
          {editing ? (
            <button
              type="button"
              onClick={() =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        usage_history: [
                          ...current.usage_history,
                          { visited_at: toDateTimeLocalValue(new Date().toISOString()), location_id: "", pos_reference: "" },
                        ],
                      }
                    : current
                )
              }
              className="rounded-full border border-kk-dark-input-border px-3 py-1 text-xs font-medium hover:bg-kk-dark-hover"
            >
              Add Usage
            </button>
          ) : null}
        </div>
        {editing ? (
          editState.usage_history.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-kk-dark-text-muted">
                    <th className="px-2 py-2">Used At</th>
                    <th className="px-2 py-2">Location</th>
                    <th className="px-2 py-2">POS Ref</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {editState.usage_history.map((entry, index) => (
                    <tr key={entry.id ?? `usage-${index}`} className="border-t border-kk-dark-border/60">
                      <td className="px-2 py-2">
                        <input
                          type="datetime-local"
                          className={fieldInputClass}
                          value={entry.visited_at}
                          onChange={(e) => updateUsageRow(index, { visited_at: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          className={fieldInputClass}
                          value={entry.location_id}
                          onChange={(e) => updateUsageRow(index, { location_id: e.target.value })}
                        >
                          <option value="">No location</option>
                          {outlets.map((outlet) => (
                            <option key={outlet.id} value={outlet.id}>
                              {outlet.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          className={fieldInputClass}
                          value={entry.pos_reference}
                          onChange={(e) => updateUsageRow(index, { pos_reference: e.target.value })}
                          placeholder="POS reference"
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setEditState((current) =>
                              current
                                ? {
                                    ...current,
                                    usage_history: current.usage_history.filter((_, rowIndex) => rowIndex !== index),
                                  }
                                : current
                            )
                          }
                          className="rounded-full border border-kk-dark-input-border px-3 py-1 text-xs font-medium hover:bg-kk-dark-hover"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No usage entries yet. Add one if needed.</p>
          )
        ) : usageHistory.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-kk-dark-text-muted">
                  <th className="px-2 py-2">Used At</th>
                  <th className="px-2 py-2">Location</th>
                  <th className="px-2 py-2">POS Ref</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((entry: SubscriptionUsageHistoryEntry) => (
                  <tr key={entry.id} className="border-t border-kk-dark-border/60">
                    <td className="px-2 py-2">{toDateTime(entry.visited_at)}</td>
                    <td className="px-2 py-2">{entry.location_name || "-"}</td>
                    <td className="px-2 py-2">{entry.pos_reference || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-kk-dark-text-muted">No usage recorded yet.</p>
        )}
      </div>
      ) : null}

      {tab === "payments" ? (
        subscription.source_invoice ? (
        <div className="rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Payment History</h3>
            {editing ? (
              <button
                type="button"
                onClick={() =>
                  setEditState((current) =>
                    current
                      ? {
                          ...current,
                          payment_history: [
                            ...current.payment_history,
                            {
                              amount: "0.00",
                              method: "OTHER",
                              reference: "",
                              paid_on: toDateTimeLocalValue(new Date().toISOString()),
                            },
                          ],
                        }
                      : current
                  )
                }
                className="rounded-full border border-kk-dark-input-border px-3 py-1 text-xs font-medium hover:bg-kk-dark-hover"
              >
                Add Payment
              </button>
            ) : canEdit && remainingBalanceDue > 0 ? (
              <button
                type="button"
                onClick={() => setShowPaymentForm((current) => !current)}
                className="rounded-full border border-kk-dark-input-border px-3 py-1 text-xs font-medium hover:bg-kk-dark-hover"
              >
                {showPaymentForm ? "Close Payment" : "Process Payment"}
              </button>
            ) : null}
          </div>

          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Source Invoice Status</p>
              <p className="mt-1 text-sm font-semibold">{subscription.source_invoice_status || "-"}</p>
            </div>
            <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Invoice Total</p>
              <p className="mt-1 text-sm font-semibold">NGN {invoiceGrandTotal.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Recorded Payments</p>
              <p className="mt-1 text-sm font-semibold">NGN {recordedAmountPaid.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-3">
              <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Remaining Balance</p>
              <p className="mt-1 text-sm font-semibold">NGN {remainingBalanceDue.toFixed(2)}</p>
            </div>
          </div>

          {editing && planChangeDelta !== 0 ? (
            <div className="mb-4 rounded-xl border border-kk-dark-input-border bg-kk-dark-bg px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold">Plan Change Impact</h4>
                  <p className="text-xs text-kk-dark-text-muted">
                    {planChangeDelta > 0
                      ? "Switching to this plan increases the subscription amount."
                      : "Switching to this plan reduces the subscription amount."}
                  </p>
                </div>
                <div className="rounded-md bg-kk-dark-bg-elevated px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Plan Delta</p>
                  <p className="mt-1 text-sm font-semibold">
                    {planChangeDelta > 0 ? "+" : "-"}
                    {formatCurrency(Math.abs(planChangeDelta))}
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Projected Invoice Total</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(projectedInvoiceTotal)}</p>
                </div>
                <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Projected Balance</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(projectedRemainingBalance)}</p>
                </div>
                <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                  <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Auto Refund</p>
                  <p className="mt-1 text-sm font-semibold">{formatCurrency(projectedRefundAmount)}</p>
                </div>
              </div>
            </div>
          ) : null}

          {!editing && showPaymentForm ? (
            <div className="mb-4 space-y-3 rounded-xl border border-kk-dark-input-border bg-kk-dark-bg px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold">Process Payment</h4>
                  <p className="text-xs text-kk-dark-text-muted">
                    Record an installment against the source invoice for this subscription.
                  </p>
                </div>
                <div className="rounded-md bg-kk-dark-bg-elevated px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Projected Balance</p>
                  <p className="mt-1 text-sm font-semibold">NGN {projectedBalanceDue.toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Amount paid</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                    }}
                    className={fieldInputClass}
                    placeholder="Defaults to remaining balance"
                    disabled={processingPayment}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Payment method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as EditablePaymentHistoryRow["method"])}
                    className={fieldInputClass}
                    disabled={processingPayment}
                  >
                    {paymentMethodOptions.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Reference</label>
                  <input
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className={fieldInputClass}
                    placeholder="Optional reference"
                    disabled={processingPayment}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentAmount(remainingBalanceDue > 0 ? remainingBalanceDue.toFixed(2) : "");
                    setPaymentReference("");
                  }}
                  className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs font-medium hover:bg-kk-dark-hover"
                  disabled={processingPayment}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleProcessPayment()}
                  className="rounded-full bg-kk-primary px-4 py-2 text-xs font-medium text-black disabled:opacity-60"
                  disabled={processingPayment}
                >
                  {processingPayment ? "Processing..." : "Record Payment"}
                </button>
              </div>
            </div>
          ) : null}

          {editing ? (
            editState.payment_history.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-kk-dark-text-muted">
                      <th className="px-2 py-2">Amount</th>
                      <th className="px-2 py-2">Method</th>
                      <th className="px-2 py-2">Reference</th>
                      <th className="px-2 py-2">Paid On</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {editState.payment_history.map((entry, index) => (
                      <tr key={entry.id ?? `payment-${index}`} className="border-t border-kk-dark-border/60">
                        <td className="px-2 py-2">
                          <input
                            type="number"
                            step="0.01"
                            className={fieldInputClass}
                            value={entry.amount}
                            onChange={(e) => updatePaymentRow(index, { amount: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2">
                          <select
                            className={fieldInputClass}
                            value={entry.method}
                            onChange={(e) =>
                              updatePaymentRow(index, {
                                method: e.target.value as EditablePaymentHistoryRow["method"],
                              })
                            }
                          >
                            {paymentMethodOptions.map((method) => (
                              <option key={method} value={method}>
                                {method}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            className={fieldInputClass}
                            value={entry.reference}
                            onChange={(e) => updatePaymentRow(index, { reference: e.target.value })}
                            placeholder="Reference"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="datetime-local"
                            className={fieldInputClass}
                            value={entry.paid_on}
                            onChange={(e) => updatePaymentRow(index, { paid_on: e.target.value })}
                          />
                        </td>
                        <td className="px-2 py-2 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setEditState((current) =>
                                current
                                  ? {
                                      ...current,
                                      payment_history: current.payment_history.filter((_, rowIndex) => rowIndex !== index),
                                    }
                                  : current
                              )
                            }
                            className="rounded-full border border-kk-dark-input-border px-3 py-1 text-xs font-medium hover:bg-kk-dark-hover"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-kk-dark-text-muted">No payments recorded on the source invoice yet.</p>
            )
          ) : paymentHistory.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-kk-dark-text-muted">
                    <th className="px-2 py-2">Amount</th>
                    <th className="px-2 py-2">Method</th>
                    <th className="px-2 py-2">Reference</th>
                    <th className="px-2 py-2">Paid On</th>
                    <th className="px-2 py-2">Received By</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((entry: SubscriptionPaymentHistoryEntry) => (
                    <tr key={entry.id} className="border-t border-kk-dark-border/60">
                      <td className="px-2 py-2">{entry.amount}</td>
                      <td className="px-2 py-2">{entry.method}</td>
                      <td className="px-2 py-2">{entry.reference || "-"}</td>
                      <td className="px-2 py-2">{toDateTime(entry.paid_on)}</td>
                      <td className="px-2 py-2">{entry.received_by_name || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No payments recorded on the source invoice yet.</p>
          )}
        </div>
        ) : (
          <div className="rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <p className="mt-3 text-sm text-kk-dark-text-muted">
              This subscription does not have a source invoice payment history.
            </p>
          </div>
        )
      ) : null}

      {tab === "coupons" ? (
      <div className="rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
        <h3 className="mb-3 text-lg font-semibold">Subscription Coupon Usage</h3>
        {couponUsageHistory.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-kk-dark-text-muted">
                  <th className="px-2 py-2">Coupon</th>
                  <th className="px-2 py-2">Invoice</th>
                  <th className="px-2 py-2">Date</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Location</th>
                </tr>
              </thead>
              <tbody>
                {couponUsageHistory.map((entry: SubscriptionCouponUsageHistoryEntry, idx) => (
                  <tr key={`${entry.invoice_id}-${entry.coupon_code}-${idx}`} className="border-t border-kk-dark-border/60">
                    <td className="px-2 py-2">{entry.coupon_name || entry.coupon_code}</td>
                    <td className="px-2 py-2">{entry.invoice_number}</td>
                    <td className="px-2 py-2">{toDateTime(entry.invoice_date)}</td>
                    <td className="px-2 py-2">{entry.invoice_status || "-"}</td>
                    <td className="px-2 py-2">{entry.location_name || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-kk-dark-text-muted">No subscription coupon usage recorded yet.</p>
        )}
      </div>
      ) : null}

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
};
