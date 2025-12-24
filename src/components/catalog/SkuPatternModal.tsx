// src/features/catalog/components/SkuPatternModal.tsx

import React, { useMemo } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type {
  ItemGroupAttribute,
  SkuPattern,
  SkuPatternRow,
  SkuShowMode,
  SkuCase,
} from "../../types/catalog";

interface Props {
  open: boolean;
  onClose: () => void;
  itemGroupName: string;
  attributes: ItemGroupAttribute[];
  value: SkuPattern | null;
  onChange: (pattern: SkuPattern) => void;
  onApply?: (pattern: SkuPattern) => void;
}

const SHOW_MODES: { value: SkuShowMode; label: string }[] = [
  { value: "FIRST", label: "First" },
  { value: "LAST", label: "Last" },
  { value: "ALL", label: "All" },
];

const CASE_OPTIONS: { value: SkuCase; label: string }[] = [
  { value: "UPPER", label: "Upper Case" },
  { value: "LOWER", label: "Lower Case" },
  { value: "TITLE", label: "Title Case" },
  { value: "AS_IS", label: "As Is" },
];

export const SkuPatternModal: React.FC<Props> = ({
  open,
  onClose,
  itemGroupName,
  attributes,
  value,
  onChange,
  onApply,
}) => {
  if (!open) return null;

  const rows = value?.rows ?? [];

  const handleRowChange = (index: number, patch: Partial<SkuPatternRow>) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onChange({ rows: next });
  };

  const handleAddRow = () => {
    const row: SkuPatternRow = {
      source: "item_group_name",
      show: { mode: "FIRST", length: 3 },
      case: "UPPER",
      separator: "-",
    };
    onChange({ rows: [...rows, row] });
  };

  const handleRemoveRow = (index: number) => {
    const next = rows.filter((_, i) => i !== index);
    onChange({ rows: next });
  };

  const skuPreview = useMemo(() => {
    if (!rows.length) return "";

    const applyCase = (txt: string, c: SkuCase) => {
      switch (c) {
        case "UPPER":
          return txt.toUpperCase();
        case "LOWER":
          return txt.toLowerCase();
        case "TITLE":
          return txt
            .toLowerCase()
            .replace(/\b\w/g, (m) => m.toUpperCase());
        default:
          return txt;
      }
    };

    const parts: string[] = [];

    for (const row of rows) {
      let raw = "";
      if (row.source === "item_group_name") {
        raw = itemGroupName || "ITEM GROUP";
      } else if (row.source === "attribute") {
        const attr = attributes.find((a) => a.id === row.attribute_id);
        raw = attr ? attr.name : "ATTRIBUTE";
      } else if (row.source === "custom_text") {
        raw = row.text || "";
      }

      if (row.show.mode === "FIRST" && row.show.length) {
        raw = raw.slice(0, row.show.length);
      } else if (row.show.mode === "LAST" && row.show.length) {
        raw = raw.slice(-row.show.length);
      } // ALL => keep full string

      raw = applyCase(raw, row.case);

      if (!raw) continue;

      const sep = row.separator ?? "";
      parts.push(raw + sep);
    }

    return parts.join("");
  }, [rows, itemGroupName, attributes]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-16 w-full max-w-4xl rounded-2xl shadow-xl border border-kk-dark-border bg-kk-dark-bg-elevated">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Generate SKU</h2>
            <p className="text-xs">
              Select attributes and formatting rules to generate SKUs for all
              items in this group.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="mb-3 text-xs">
            Select attributes that you would like to generate the SKU from.
          </div>

          <div className="overflow-x-auto rounded-xl border border-kk-dark-input-border">
            <table className="min-w-full text-sm">
              <thead className="text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    Select Attribute
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Show</th>
                  <th className="px-3 py-2 text-left font-medium">
                    Letter Case
                  </th>
                  <th className="px-3 py-2 text-left font-medium">Separator</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-slate-100 hover:bg-kk-dark-hover/60"
                  >
                    {/* Select Attribute */}
                    <td className="px-3 py-2">
                      <select
                        className="w-full bg-kk-dark-bg border-slate-200 rounded-lg px-2 py-1 text-xs"
                        value={row.source === "custom_text" ? "custom_text" : row.source === "item_group_name" ? "item_group_name" : `attr:${row.attribute_id ?? ""}`
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          
                          if (val === "item_group_name") {
                            handleRowChange(idx, {
                              source: "item_group_name",
                              attribute_id: undefined,
                              text: undefined,
                            });
                          } else if (val === "custom_text") {
                            handleRowChange(idx, {
                              source: "custom_text",
                              attribute_id: undefined,
                            });
                          } else if (val.startsWith("attr:")) {
                            const attrId = Number(val.split(":")[1]);
                            const selected = attributes.find((a) => a.id === attrId);
                            handleRowChange(idx, {
                              source: "attribute",
                              attribute_id: attrId,
                              attribute_name: selected?.name ?? row.attribute_name,
                              text: undefined,
                            });
                          }
                        }}
                      >
                        <option value="item_group_name">Item Group Name</option>
                        {attributes.map((attr) => (
                          <option key={attr.id} value={`attr:${attr.id}`}>
                            {attr.name}
                          </option>
                        ))}
                        <option value="custom_text">Custom Text</option>
                      </select>

                      {row.source === "custom_text" && (
                        <input
                          type="text"
                          placeholder="Custom text…"
                          className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs"
                          value={row.text ?? ""}
                          onChange={(e) =>
                            handleRowChange(idx, { text: e.target.value })
                          }
                        />
                      )}
                    </td>

                    {/* Show */}
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="rounded-lg bg-kk-dark-bg border-slate-200 px-2 py-1 text-xs"
                          value={row.show.mode}
                          onChange={(e) =>
                            handleRowChange(idx, {
                              show: {
                                ...row.show,
                                mode: e.target.value as SkuShowMode,
                              },
                            })
                          }
                        >
                          {SHOW_MODES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        {row.show.mode !== "ALL" && (
                          <input
                            type="number"
                            min={1}
                            className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                            value={row.show.length ?? 3}
                            onChange={(e) =>
                              handleRowChange(idx, {
                                show: {
                                  ...row.show,
                                  length: Number(e.target.value) || 1,
                                },
                              })
                            }
                          />
                        )}
                      </div>
                    </td>

                    {/* Letter case */}
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border bg-kk-dark-bg border-slate-200 px-2 py-1 text-xs"
                        value={row.case}
                        onChange={(e) =>
                          handleRowChange(idx, {
                            case: e.target.value as SkuCase,
                          })
                        }
                      >
                        {CASE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Separator */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        maxLength={3}
                        className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                        value={row.separator}
                        onChange={(e) =>
                          handleRowChange(idx, { separator: e.target.value })
                        }
                      />
                    </td>

                    {/* Remove */}
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleRemoveRow(idx)}
                        className="rounded-full p-1 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-xs"
                    >
                      No pattern defined yet. Add an attribute to start building
                      SKUs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddRow}
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium"
          >
            <Plus className="h-3 w-3" />
            Add Attribute
          </button>

          <div className="mt-6 rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated px-4 py-3 text-xs text-amber-700">
            <div className="mb-1 font-medium">SKU Preview</div>
            <div className="font-mono text-sm tracking-wide">
              {skuPreview || "—"}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-3">
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-1.5 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const pattern: SkuPattern = { rows };
              onChange(pattern);
              onApply?.(pattern);
              onClose();
            }}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Generate SKU
          </button>
        </div>
      </div>
    </div>
  );
};
