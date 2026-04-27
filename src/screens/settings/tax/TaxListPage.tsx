// src/screens/settings/TaxListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import {
  TAX_CALCULATION_BASIS_OPTIONS,
  type TaxCalculationBasis,
  type TaxRule,
  type TaxSettings,
} from "../../../types/catalog";
import { fetchTaxRules, fetchTaxSettings, updateTaxSettings } from "../../../api/catalog";
import { Loader2, Plus } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";

const TAX_CALCULATION_BASIS_HELPERS: Record<TaxCalculationBasis, string> = {
  AFTER_DISCOUNTS: "Discounts reduce the taxable amount first, then tax is calculated on the reduced total.",
  BEFORE_DISCOUNTS: "Tax is calculated on the original price before discounts are applied to the final total.",
};

export const TaxListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<TaxRule[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [taxCalculationBasis, setTaxCalculationBasis] =
    useState<TaxCalculationBasis>("AFTER_DISCOUNTS");
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"success" | "error">("success");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [taxRuleData, settingsData] = await Promise.all([
          fetchTaxRules(),
          fetchTaxSettings(),
        ]);
        if (cancelled) return;
        setTaxes(taxRuleData.results);
        setTaxSettings(settingsData);
        setTaxCalculationBasis(settingsData.tax_calculation_basis);
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setToastVariant("error");
        setToastMessage("Failed to load tax settings.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOnClick = (id: number) => {
    if (!can("Taxes", "edit")) return;
    
    navigate(`/settings/taxes/${id}/edit`)
  };

  const handleSaveSettings = async () => {
    if (!can("Taxes", "edit")) return;

    setSettingsSaving(true);
    try {
      const next = await updateTaxSettings({
        tax_calculation_basis: taxCalculationBasis,
      });
      setTaxSettings(next);
      setTaxCalculationBasis(next.tax_calculation_basis);
      setToastVariant("success");
      setToastMessage("Tax calculation settings updated.");
    } catch (error) {
      console.error(error);
      setToastVariant("error");
      setToastMessage("Failed to update tax settings.");
    } finally {
      setSettingsSaving(false);
    }
  };

  const hasSettingsChanges =
    taxSettings != null && taxCalculationBasis !== taxSettings.tax_calculation_basis;

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader 
          title= "Tax Rules"
          right= {
            <>
              {can("Taxes","create") && (
                <button
                  onClick={() => navigate("/settings/taxes/new")} 
                  className="new inline-flex items-center gap-1 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              )}
            </>
          }
        />

        <div className="px-4">
          <section className="rounded-2xl border border-kk-dark-input-border p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-kk-dark-text">Tax calculation basis</h2>
                <p className="max-w-3xl text-xs text-kk-dark-text-muted">
                  Choose whether sales tax should be calculated before discounts are applied or after discounts reduce the taxable amount.
                </p>
              </div>
              {can("Taxes", "edit") && (
                <button
                  type="button"
                  disabled={!hasSettingsChanges || settingsSaving}
                  onClick={handleSaveSettings}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {settingsSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save Setting
                </button>
              )}
            </div>

            <div className="mt-4 grid gap-3">
              {TAX_CALCULATION_BASIS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                    taxCalculationBasis === option.value
                      ? "border-emerald-600 bg-emerald-600/10"
                      : "border-kk-dark-input-border"
                  } ${can("Taxes", "edit") ? "cursor-pointer" : "cursor-default"}`}
                >
                  <input
                    type="radio"
                    name="tax-calculation-basis"
                    className="mt-0.5 h-4 w-4"
                    value={option.value}
                    checked={taxCalculationBasis === option.value}
                    disabled={!can("Taxes", "edit")}
                    onChange={() => setTaxCalculationBasis(option.value)}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-kk-dark-text">{option.label}</p>
                    <p className="text-xs text-kk-dark-text-muted">
                      {TAX_CALCULATION_BASIS_HELPERS[option.value]}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Table */}
        <div className="overflow-hidden px-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Tax Name</th>
                <th>Rate (%)</th>
              </tr>
            </thead>
            {taxes?.length ? (
              <tbody>
                {taxes?.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => handleOnClick(t.id!)}
                  >
                    <td>{t.name}</td>
                    <td>{t.rate}</td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No Tax Rules yet. Click "New" to create your first one.
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>

      {toastMessage && (
        <ToastModal
          message={toastMessage}
          onClose={() => setToastMessage(null)}
          variant={toastVariant}
        />
      )}
    </div>
  );
};
