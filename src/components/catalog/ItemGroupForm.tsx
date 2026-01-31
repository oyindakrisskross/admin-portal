// src/components/catalog/ItemGroupForm.tsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { 
  type ItemGroup, 
  type ItemGroupAttribute, 
  type SkuPattern,
  type ItemType,
  type Unit,
  type TaxRule,
  type Attribute, 
} from "../../types/catalog";
import type { Location } from "../../types/location";

import { SkuPatternModal } from "./SkuPatternModal";
import ListPageHeader from "../layout/ListPageHeader";
import ToastModal from "../ui/ToastModal";
import { 
  createItemGroup, 
  updateItemGroup,
  fetchAttributes,
  fetchUnits,
  fetchTaxRules,
  createItemGroupGallery,
  updateItemGroupGallery,
  deleteItemGroupGallery,
} from "../../api/catalog";
import { fetchLocations } from "../../api/location";
import { CheckCircle2, Loader2, Plus, Sparkles, Trash2, X } from "lucide-react";

import { 
  XMarkIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

interface Props {
  initial?: ItemGroup | null;
}

type PreviewItem = {
  key: string;
  labelSuffix: string;
  attributesByName: Record<string, string>;
  sku?: string;
  cost: string;
  price: string;
};

const EMPTY_GROUP: ItemGroup = { 
  name: "", 
  description: "", 
  type_id: "GOOD", 
  status: "ACTIVE", 
  returnable: true, 
  sellable: true, 
  purchasable: true, 
  inventory_tracking: true, 
  attributes: [], 
  items: [], 
  sku_pattern: { rows: [] },
  gallery: [],
};

const INITIAL_TYPE: ItemType = "GOOD";

type GalleryItemLocal = {
  id?: number;      // existing DB id, if any
  src: string;      // full URL or object URL
  file?: File;      // for newly added images
  is_primary: boolean;
  sort_order: number;
};

export const ItemGroupForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [group, setGroup] = useState<ItemGroup>(initial ?? EMPTY_GROUP);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skuModalOpen, setSkuModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ItemType>(initial?.type_id ?? INITIAL_TYPE);
  const [attributeChoices, setAttributeChoices] = useState<Attribute[]>([]);
  const [unitChoices, setUnitChoices] = useState<Unit[]>([]);
  const [taxRuleChoices, setTaxRuleChoices] = useState<TaxRule[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableLocationIds, setAvailableLocationIds] = useState<number[]>([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedAllLocs, setSelectedAllLocs] = useState(false);

  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryItemLocal[]>([]);
  const initialGalleryRef = useRef<GalleryItemLocal[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const attrIdCounter = useRef(-1);

  const [sellable, setSellable] = useState(initial?.sellable ?? true);
  const [purchasable, setPurchasable] = useState(initial?.purchasable ?? true);
  const [trackInventory, setTrackInventory] = useState(
    initial?.inventory_tracking ?? true
  );

  const toggleLocation = (id: number) => {
    setAvailableLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllLocations = () => {
    setAvailableLocationIds(locations.map((l) => l.id!));
  };

  const handleRemoveAllLocations = () => {
    setAvailableLocationIds([]);
  };

  const handleRemoveLocation = (id: number) => {
    setAvailableLocationIds((prev) => prev.filter((x) => x !== id));
  };

  useEffect(() => {
    if (!gallery.length) {
      setSelectedImageIdx(null);
      return;
    }

    setSelectedImageIdx((prev) => {
      if (prev != null && prev < gallery.length) return prev;
      const primaryIdx = gallery.findIndex((g) => g.is_primary);
      return primaryIdx >= 0 ? primaryIdx : 0;
    });
  }, [gallery]);

  useEffect(() => {
    if (initial) {
      // setGroup(initial);

      setAvailableLocationIds(initial.availability_location_ids ?? []);

      if (initial?.gallery && initial.gallery.length) {
        const mapped = initial.gallery.map((img: any, idx: number) => ({
          id: img.id,
          src: img.image,            // API should already give full URL
          is_primary: img.is_primary,
          sort_order: img.sort_order ?? idx,
        }));
        setGallery(mapped);
        initialGalleryRef.current = mapped;
      } else {
        setGallery([]);
        initialGalleryRef.current = [];
      }
    }
  }, [initial]);

  useEffect(() => {
    (async () => {
      const data = await fetchLocations();
      setLocations(data.results);
    })();
  }, []);

  useEffect(() => {
    if (locations.length && availableLocationIds.length === locations.length) {
      setSelectedAllLocs(true);
    } else {
      setSelectedAllLocs(false);
    }
  }, [availableLocationIds, locations]);

  useEffect(() => {
    let items = generatePreviewItemsFromGroup(group.attributes);
    if (group.sku_pattern) {
      items = applySkuToPreviewItems(
        items,
        group.sku_pattern,
        group.name,
        group.attributes
      );
    }

    if (group.items && group.items.length) {
      items = items.map((preview, idx) => {
        const existing = group.items?.[idx];
        if (!existing) return preview;
        return {
          ...preview,
          sku: existing.sku || preview.sku,
          cost: existing.cost ?? "",
          price: existing.price ?? "",
        };
      });
    }

    setPreviewItems(items);
  }, [group.name, group.attributes, group.sku_pattern, group.items]);

  useEffect(() => {
    (async () => {
      const data = await fetchUnits();
      setUnitChoices(data.results);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const data = await fetchTaxRules();
      setTaxRuleChoices(data.results);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchAttributes();
        // Normalize anything into a plain array
        const list =
          Array.isArray(data)
            ? data
            : Array.isArray((data as any).results)
            ? (data as any).results
            : [];

        if (!cancelled) {
          setAttributeChoices(list);
        }
      } catch (err) {
        console.error("Failed to load attribute choices", err);
        if (!cancelled) {
          setAttributeChoices([]); // still an array
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (patch: Partial<ItemGroup>) => {
    setGroup((g) => ({ ...g, ...patch }));
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedType(event.target.value as ItemType);
  };

  const handleSellableChg = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSellable(checked);

    if (!checked) {
      setTrackInventory(false);
      setPreviewItems((items) =>
        items.map((it) => ({
          ...it,
          price: "0",
        }))
      );
    }
  };

  const handlePurchasableChg = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setPurchasable(checked);

    if (!checked) {
      setPreviewItems((items) =>
        items.map((it) => ({
          ...it,
          cost: "0",
        }))
      );
    }
  };

  const handleCopyCostToAll = () => {
    if (!purchasable) return;
    if (!previewItems.length) return;

    const first = previewItems[0].cost ?? "";
    const costNum = Number(first);
    if (first === "" || !Number.isFinite(costNum) || costNum <= 0) {
      setError("Enter a valid Cost Price (> 0) in the first row before copying.");
      return;
    }

    setError(null);
    setPreviewItems((items) =>
      items.map((it, idx) => (idx === 0 ? it : { ...it, cost: first }))
    );
  };

  const handleCopyPriceToAll = () => {
    if (!sellable) return;
    if (!previewItems.length) return;

    const first = previewItems[0].price ?? "";
    const priceNum = Number(first);
    if (first === "" || !Number.isFinite(priceNum) || priceNum < 0) {
      setError("Enter a valid Selling Price (≥ 0) in the first row before copying.");
      return;
    }

    setError(null);
    setPreviewItems((items) =>
      items.map((it, idx) => (idx === 0 ? it : { ...it, price: first }))
    );
  };

  const handleAttrChange = (index: number, patch: Partial<ItemGroupAttribute>) => {
    setGroup((g) => ({
      ...g,
      attributes: g.attributes.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    }));
  };

  const handleAddAttribute = () => {
    setGroup((g) => ({
      ...g,
      attributes: [
        ...g.attributes,
        { 
          id: attrIdCounter.current--,
          name: "", 
          options: [{ value: "", code: "" }], 
        },
      ],
    }));
  };

  const handleRemoveAttribute = (index: number) => {
    setGroup((g) => ({
      ...g,
      attributes: g.attributes.filter((_, i) => i !== index),
    }));
  };

  const handleAddOption = (attrIndex: number) => {
    setGroup((g) => ({
      ...g,
      attributes: g.attributes.map((a, i) =>
        i === attrIndex
          ? { ...a, options: [...a.options, { value: "", code: "" }] }
          : a
      ),
    }));
  };

  const handleOptionChange = (
    attrIndex: number,
    optIndex: number,
    value: string
  ) => {
    setGroup((g) => ({
      ...g,
      attributes: g.attributes.map((a, i) =>
        i === attrIndex
          ? {
              ...a,
              options: a.options.map((o, j) =>
                j === optIndex ? { ...o, value, code: value } : o
              ),
            }
          : a
      ),
    }));
  };

  const handleRemoveOption = (attrIndex: number, optIndex: number) => {
    setGroup((g) => ({
      ...g,
      attributes: g.attributes.map((a, i) =>
        i === attrIndex
          ? {
              ...a,
              options: a.options.filter((_, j) => j !== optIndex),
            }
          : a
      ),
    }));
  };

  const handleAddImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);

    setGallery((prev) => {
      const hasPrimary = prev.some((g) => g.is_primary);
      const nextIndex = prev.length ? Math.max(...prev.map((g) => g.sort_order)) + 1 : 0;
      return [
        ...prev,
        {
          file,
          src: url,
          is_primary: !hasPrimary,   // first image becomes primary
          sort_order: nextIndex,
        },
      ];
    });

    // reset input so the same file can be picked again if needed
    e.target.value = "";
  };

  const handleSetPrimary = (index: number) => {
    setGallery((prev) =>
      prev.map((g, i) => ({ ...g, is_primary: i === index }))
    );
  };

  const handleRemoveImage = (index: number) => {
    setGallery((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // if we removed the primary, mark the first one (if any) as primary
      if (next.length && !next.some((g) => g.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  };

  const syncGallery = async (groupId: number) => {
    const original = initialGalleryRef.current;
    const current = gallery;

    const originalById = new Map<number, GalleryItemLocal>();
    for (const g of original) {
      if (g.id != null) originalById.set(g.id, g);
    }

    const currentById = new Map<number, GalleryItemLocal>();
    for (const g of current) {
      if (g.id != null) currentById.set(g.id, g);
    }

    // 1) Deletes: images that existed before but are not in current
    const deletions: number[] = [];
    for (const [id] of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    // 2) Updates: existing images whose is_primary or sort_order changed
    const updates: { id: number; patch: { is_primary?: boolean; sort_order?: number } }[] = [];
    for (const [id, orig] of originalById.entries()) {
      const cur = currentById.get(id);
      if (!cur) continue;
      const patch: { is_primary?: boolean; sort_order?: number } = {};
      if (orig.is_primary !== cur.is_primary) patch.is_primary = cur.is_primary;
      if ((orig.sort_order ?? 0) !== (cur.sort_order ?? 0)) patch.sort_order = cur.sort_order;
      if (Object.keys(patch).length) updates.push({ id, patch });
    }

    // 3) Creates: items without id + with a file
    const creations = current.filter((g) => !g.id && g.file);

    await Promise.all([
      ...deletions.map((id) => deleteItemGroupGallery(id)),
      ...updates.map((u) => updateItemGroupGallery(u.id, u.patch)),
      ...creations.map((g) =>
        createItemGroupGallery(
          groupId,
          g.file as File,
          g.is_primary,
          g.sort_order
        )
      ),
    ]);

    // After successful sync, reset "original" snapshot so subsequent saves diff correctly
    const refreshed = current.map((g) => ({ ...g }));
    initialGalleryRef.current = refreshed;
  };


  const handleSave = async () => {
    setError(null);

    if (sellable) {
      const bad = previewItems.findIndex((pi) => {
        const v = pi.price ?? "";
        const n = Number(v);
        return v === "" || !Number.isFinite(n) || n < 0;
      });
      if (bad >= 0) {
        setError("Selling Price is required (and must be ≥ 0) for all items when Sellable is checked.");
        return;
      }
    }

    if (purchasable) {
      const bad = previewItems.findIndex((pi) => {
        const v = pi.cost ?? "";
        const n = Number(v);
        return v === "" || !Number.isFinite(n) || n <= 0;
      });
      if (bad >= 0) {
        setError("Cost Price is required (and must be > 0) for all items when Purchasable is checked.");
        return;
      }
    }

    setSaving(true);
    try {
      // 1) attributes_input for the backend
      const attributes_input = group.attributes.map((a) => ({
        name: a.name,
        options: a.options.map((o) => o.value).filter((v) => v.trim() !== ""),
      }));

      // 2) item_variants_input: attribute-name map + overrides
      const item_variants_input = previewItems.map((pi) => ({
        attributes: pi.attributesByName,
        sellable: sellable,
        cost: purchasable ? pi.cost : "0",
        price: sellable ? pi.price : "0",
        inventory_tracking: trackInventory,
      }));

      const payload: any = {
        name: group.name,
        description: group.description,
        type_id: selectedType,
        unit: group.unit,
        tax_rule: group.tax_rule,
        returnable: group.returnable,
        inventory_tracking: trackInventory,
        sellable,
        purchasable,
        sku_pattern: group.sku_pattern,
        attributes_input,
        item_variants_input,
        availability_location_ids_input: availableLocationIds,
      };

      console.log(payload)

      let saved: ItemGroup;
      if (group.id) {
        saved = await updateItemGroup(group.id, payload);
      } else {
        saved = await createItemGroup(payload);
      }

      await syncGallery(saved.id!);

      navigate(`/catalog/item-groups/${saved.id}`);
    } catch (e) {
      setError("Failed to save item group. Please check the form and try again.");
    } finally {
      setSaving(false);
    }
  };

  const skuPattern = group.sku_pattern ?? { rows: [] };

  return (
    <>
      <ListPageHeader
        icon = {<span className="text-lg">🛍️</span>}
        section = "Catalog"
        title = {initial ? `Edit ${initial?.name}` : "New Item Group"}
        right = {
          <button
            onClick={() => navigate("/catalog/item-groups")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-3">
        {/* Overview section */}
        <section className="flex gap-6 py-7">
          {/* Detail input */}
          <div className="w-2/3 flex flex-col gap-5">
            {/* Group Type */}
            <div className="grid grid-cols-6 gap-2">
              <p> Type </p>
              <div className="col-span-5">
                <label className="mr-4">
                  <input 
                    type="radio" 
                    name="Goods" 
                    value="GOOD"
                    checked={selectedType === "GOOD"} 
                    onChange={handleTypeChange}
                    className="mr-2" 
                  /> Goods
                </label>
                <label>
                  <input 
                    type="radio" 
                    name="Service" 
                    value="SERVICE"
                    checked={selectedType === "SERVICE"} 
                    onChange={handleTypeChange}
                    className="mr-2"
                  /> Service
                </label>
              </div>
            </div>

            {/* Group Name */}
            <div className="grid grid-cols-6 gap-2">
              <p>Item Group Name</p>
              <input
                type="text"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-5"
                value={group.name}
                onChange={(e) => handleChange({ name: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-6 gap-2">
              <p>Description</p>
              <textarea
                className="min-h-[100px] col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={group.description ?? ""}
                onChange={(e) => handleChange({ description: e.target.value })}
              />
            </div>

            {/* Returnable */}
            <div className="grid grid-cols-6 gap-2">
              <p></p>
              <label className="flex gap-1 items-center col-span-5">
                <input
                  id="returnable"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 mx-2"
                  checked={group.returnable}
                  onChange={(e) => handleChange({ returnable: e.target.checked })}
                />
                Returnable Items 
                <span className="help">
                  <QuestionMarkCircleIcon className="text-shadow-kk-dark-text-muted h-5 w-5 cursor-pointer help" />
                  <span className="tooltip-r w-[200px]">
                    Enable this option if all items in the group
                    are eligible for sales return.
                  </span>
                </span>
              </label>
            </div>

            {/* Unit & Tax Rule */}
            <div className="grid grid-cols-6 gap-2">
              <p>Unit</p>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-2"
                value={group.unit ? group.unit : undefined}
                onChange={(e) => handleChange({ unit: +e.target.value})}
              >
                <option key={0} value={undefined}></option>
                {unitChoices.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>

              <p className="max-w-fit help underline decoration-dotted underline-offset-4 justify-self-end">
                Tax Rule
                <span className="tooltip-r w-[250px]">
                  The tax rates will be automatically applied to transactions based 
                  on your default sales tax rule. If you want to apply a different 
                  tax rate for this item, select a sales tax rule
                </span>
              </p>
              <select
                className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={group.tax_rule ? group.tax_rule : undefined}
                onChange={(e) => handleChange({ tax_rule: +e.target.value})}
              >
                <option key={0} value={undefined}></option>
                {taxRuleChoices.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Gallery input */}
          <div className="flex flex-col gap-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Main preview card */}
            <div className="w-56 h-56 rounded-2xl border border-kk-dark-input-border bg-kk-dark-bg-elevated flex items-center justify-center overflow-hidden">
              {selectedImageIdx != null && gallery[selectedImageIdx] ? (
                <img
                  src={gallery[selectedImageIdx].src}
                  alt="Selected"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs text-kk-muted">
                  No image yet. Click below to add.
                </span>
              )}
            </div>

            {/* Primary / Make primary + Trash for the selected image */}
            {selectedImageIdx != null && gallery[selectedImageIdx] && (
              <div className="w-56 flex justify-between items-center text-[11px] mt-1">
                {gallery[selectedImageIdx].is_primary ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Primary
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(selectedImageIdx)}
                    className="text-[10px] font-medium text-emerald-500 hover:text-emerald-400"
                  >
                    Make primary
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveImage(selectedImageIdx)}
                  className="inline-flex items-center gap-1 text-[10px] text-red-500 hover:text-red-400"
                >
                  <Trash2 className="h-3 w-3" />
                  Remove
                </button>
              </div>
            )}


            {/* Thumbnail strip + add button */}
            <div className="mt-1 flex items-center gap-2">
              {gallery.map((img, idx) => (
                <div
                  key={idx}
                  className={`relative h-14 w-14 rounded-lg border ${
                    idx === selectedImageIdx
                      ? "border-emerald-500"
                      : "border-kk-dark-input-border"
                  } overflow-hidden cursor-pointer`}
                  onClick={() => setSelectedImageIdx(idx)}
                >
                  <img
                    src={img.src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}

              {/* Add image tile */}
              <button
                type="button"
                onClick={handleAddImageClick}
                className="flex h-14 w-14 items-center justify-center rounded-lg border border-dashed border-kk-dark-input-border text-xl text-kk-muted hover:bg-kk-dark-hover"
              >
                +
              </button>
            </div>
          </div>
        </section>

        {/* Attributes section */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">
                Attributes
              </h3>
              <p >
                Define how items in this group vary (e.g. Colour, Size).
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddAttribute}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-kk-dark-hover"
            >
              <Plus className="h-3 w-3" />
              Add Attribute
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {group.attributes.map((attr, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-kk-dark-input-border p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <input
                    list="attribute-name-options"
                    placeholder="Attribute name (e.g. Colour)"
                    className="flex-1 rounded-lg border border-kk-dark-input-border px-2.5 py-1.5 text-xs"
                    value={attr.name}
                    onChange={(e) =>
                      handleAttrChange(idx, { name: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveAttribute(idx)}
                    className="rounded-full p-1 hover:bg-kk-dark-hover"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>

                <div className="mt-1 flex flex-wrap gap-2">
                  {attr.options.map((opt, jdx) => (
                    <div
                      key={jdx}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs border border-kk-dark-input-border"
                    >
                      <input
                        type="text"
                        className="w-24 bg-transparent focus:outline-none"
                        placeholder="Option"
                        value={opt.value}
                        onChange={(e) =>
                          handleOptionChange(idx, jdx, e.target.value)
                        }
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx, jdx)}
                        className="rounded-full p-0.5 hover:bg-kk-dark-hover"
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddOption(idx)}
                    className="inline-flex items-center gap-1 rounded-full border border-dashed border-kk-dark-input-border px-2 py-1 text-xs hover:bg-kk-dark-hover"
                  >
                    <Plus className="h-3 w-3" />
                    Add option
                  </button>
                </div>
              </div>
            ))}

            {!group.attributes.length && (
              <div className="rounded-xl border border-dashed border-kk-dark-input-border px-4 py-6 text-xs text-center">
                No attributes yet. Add at least one attribute (e.g. Colour,
                Size) so we can generate item variants.
              </div>
            )}
          </div>
        </section>

        {/* Items / SKU section */}
        <section className="rounded-2xl border border-kk-dark-input-border p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Items</h3>
              <p className="text-xs">
                Variants are generated from the attributes and options above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSkuModalOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-emerald-700"
            >
              <Sparkles className="h-3 w-3" />
              Generate SKU
            </button>
          </div>

          {/* Toggles */}
          <div className="mb-3 flex gap-6 text-xs items-center">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={sellable}
                onChange={handleSellableChg}
              />
              Sellable
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={purchasable}
                onChange={handlePurchasableChg}
              />
              Purchasable
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                checked={trackInventory}
                onChange={(e) => {
                  setTrackInventory(e.target.checked);
                  handleChange({ inventory_tracking: e.target.checked });
                }}
              />
              Track Inventory
            </label>
          </div>

          {previewItems.length ? (
            <div className="rounded-xl border border-kk-dark-input-border px-4 py-3 text-xs overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="border-b border-kk-dark-input-border/60">
                  <tr>
                    <th className="px-2 py-2 text-left font-medium">ITEM NAME</th>
                    <th className="px-2 py-2 text-left font-medium">SKU</th>
                    <th className="px-2 py-2 text-left font-medium">
                      <div className="flex flex-col gap-1">
                        <span>COST PRICE (per unit)</span>
                        <button
                          type="button"
                          disabled={!purchasable}
                          onClick={handleCopyCostToAll}
                          className="w-fit rounded-full border border-kk-dark-input-border px-2 py-0.5 text-[10px] font-medium hover:bg-kk-dark-hover disabled:opacity-60"
                        >
                          Copy to All
                        </button>
                      </div>
                    </th>
                    <th className="px-2 py-2 text-left font-medium">
                      <div className="flex flex-col gap-1">
                        <span>SELLING PRICE (per unit)</span>
                        <button
                          type="button"
                          disabled={!sellable}
                          onClick={handleCopyPriceToAll}
                          className="w-fit rounded-full border border-kk-dark-input-border px-2 py-0.5 text-[10px] font-medium hover:bg-kk-dark-hover disabled:opacity-60"
                        >
                          Copy to All
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {previewItems.map((row, idx) => (
                    <tr
                      key={row.key}
                      className="border-b border-kk-dark-input-border/40"
                    >
                      <td className="px-2 py-1">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-slate-500">
                            {group.name}
                          </span>
                          <span className="text-[11px]">{row.labelSuffix}</span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-kk-dark-input-border px-2 py-1 text-[11px]"
                          value={row.sku ?? ""}
                          onChange={(e) =>
                            setPreviewItems((items) =>
                              items.map((it, j) =>
                                j === idx ? { ...it, sku: e.target.value } : it
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-kk-dark-input-border px-2 py-1 text-[11px]"
                          disabled={!purchasable}
                          value={row.cost ?? ""}
                          onChange={(e) =>
                            setPreviewItems((items) =>
                              items.map((it, j) =>
                                j === idx ? { ...it, cost: e.target.value } : it
                              )
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full rounded border border-kk-dark-input-border px-2 py-1 text-[11px]"
                          disabled={!sellable}
                          value={row.price ?? ""}
                          onChange={(e) =>
                            setPreviewItems((items) =>
                              items.map((it, j) =>
                                j === idx ? { ...it, price: e.target.value } : it
                              )
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-kk-dark-input-border px-4 py-3 text-xs">
              Add at least one attribute option to generate items.
            </div>
          )}
        </section>

        {/* Available Locations for Sale */}
        <section className="mt-6">
          <div className="mb-3 pl-3">
            <p className="text-xl">Available Locations</p>
            <p className="text-xs text-kk-dark-text-muted">
              Select the locations where this item group (and all generated items) can be sold.
            </p>
          </div>

          <div className="h-64 grid grid-cols-2 gap-0 rounded-2xl border border-kk-dark-input-border overflow-hidden">
            {/* LEFT: all locations + search */}
            <div className="border-r border-kk-dark-input-border">
              {/* Search */}
              <div className="flex items-center gap-2 border-b border-kk-dark-input-border px-4 py-3 text-xs text-kk-dark-text-muted">
                <span className="text-base">🔍</span>
                <input
                  type="text"
                  className="w-full bg-transparent outline-none"
                  placeholder="Type to search Locations"
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                />
              </div>

              {/* Select all */}
              <button
                type="button"
                onClick={handleSelectAllLocations}
                className="flex w-full items-center gap-2 border-b border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
              >
                <span
                  className={`flex h-4 w-4 items-center border border-kk-dark-input-border justify-center rounded-full text-[10px] text-white ${
                    selectedAllLocs ? "bg-emerald-500" : "bg-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="font-medium">Select All</span>
              </button>

              {/* Locations list */}
              <div className="h-full overflow-auto">
                {locations
                  .filter((loc) =>
                    loc.name.toLowerCase().includes(locationSearch.toLowerCase())
                  )
                  .map((loc) => {
                    const selected = availableLocationIds.includes(loc.id!);
                    return (
                      <button
                        key={loc.id}
                        type="button"
                        onClick={() => toggleLocation(loc.id!)}
                        className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                          selected ? "bg-emerald-50" : "hover:bg-kk-dark-hover"
                        }`}
                      >
                        {selected ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="h-4 w-4 rounded-full border border-kk-dark-input-border" />
                        )}
                        <span className={`${selected ? "font-semibold" : "font-medium"}`}>
                          {loc.name}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* RIGHT: selected locations */}
            <div>
              <div className="bg-kk-dark-bg flex items-center justify-between border-b border-kk-dark-input-border px-4 py-3 text-xs">
                <span className="tracking-wide text-kk-dark-text">ACCESSIBLE LOCATIONS</span>
                <button
                  type="button"
                  onClick={handleRemoveAllLocations}
                  className="inline-flex items-center gap-1 text-[11px] text-kk-dark-text-muted hover:text-red-500"
                >
                  <span className="text-xs">−</span>
                  <span>Remove All</span>
                </button>
              </div>

              <div className="h-full overflow-auto px-4 py-3 text-sm">
                {availableLocationIds.length === 0 ? (
                  <p className="text-xs text-kk-dark-text-muted">No locations selected yet.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {locations
                      .filter((loc) => availableLocationIds.includes(loc.id!))
                      .map((loc) => (
                        <li key={loc.id} className="flex items-center justify-between gap-2">
                          <span>{loc.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLocation(loc.id!)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-kk-dark-input-border text-[11px] text-kk-dark-text-muted hover:border-red-500 hover:text-red-500"
                            aria-label={`Remove ${loc.name}`}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Item Group
          </button>
        </div>
        <ToastModal message={error} onClose={() => setError(null)} variant="error" />
      </div>

      <SkuPatternModal
        open={skuModalOpen}
        onClose={() => setSkuModalOpen(false)}
        itemGroupName={group.name}
        attributes={group.attributes}
        value={skuPattern}
        onChange={(pattern: SkuPattern) =>
          setGroup((g) => ({ ...g, sku_pattern: pattern }))
        }
        onApply={(pattern: SkuPattern) => {
          // Apply SKUs to the current preview items
          setPreviewItems((items) =>
            applySkuToPreviewItems(items, pattern, group.name, group.attributes)
          );
        }}
      />

      <datalist 
        id="attribute-name-options"
        className="bg-kk-dark-bg-elevated w-full"
      >
        {Array.isArray(attributeChoices) &&
          attributeChoices.map((a) => (
            <option key={a.id} value={a.name} />
        ))}
      </datalist>
    </>
  );
};

function generatePreviewItemsFromGroup(
  attributes: ItemGroupAttribute[]
): PreviewItem[] {
  const cleanAttrs = attributes
    .filter((a) => a.name.trim())
    .map((a) => ({
      name: a.name.trim(),
      options: a.options.filter((o) => o.value.trim()),
    }))
    .filter((a) => a.options.length > 0);

  if (!cleanAttrs.length) return [];

  let combos: Array<Record<string, string>> = [{}];

  for (const attr of cleanAttrs) {
    const next: Array<Record<string, string>> = [];
    for (const combo of combos) {
      for (const opt of attr.options) {
        next.push({
          ...combo,
          [attr.name]: opt.value,
        });
      }
    }
    combos = next;
  }

  return combos.map((combo, idx) => {
    const suffix =
      " - " +
      Object.values(combo)
        .map((v) => v)
        .join(" - ");

    return {
      key: `var-${idx}`,
      labelSuffix: suffix,
      attributesByName: combo,
      sku: "",
      cost: "",
      price: "",
    };
  });
}

function applySkuToPreviewItems(
  items: PreviewItem[],
  pattern: SkuPattern,
  groupName: string,
  attributes: ItemGroupAttribute[],
): PreviewItem[] {
  const rows = pattern?.rows ?? [];

  if (!rows.length) {
    return items;
  }

  // Map attribute_id -> attribute name
  const attrById = new Map<number, string>();
  attributes.forEach((a: any) => {
    if (a && typeof a.id === "number") {
      attrById.set(a.id, a.name);
    }
  });

  const applyCase = (text: string, mode?: string) => {
    switch (mode) {
      case "UPPER":
        return text.toUpperCase();
      case "LOWER":
        return text.toLowerCase();
      case "TITLE":
        return text
          .toLowerCase()
          .replace(/\b\w/g, (m) => m.toUpperCase());
      default:
        return text;
    }
  };

  const buildSkuForItem = (item: PreviewItem): string => {
    const parts: string[] = [];

    for (const row of rows) {
      let raw = "";

      if (row.source === "item_group_name") {
        raw = groupName || "";
      } else if (row.source === "attribute") {
        const attrName = row.attribute_id
          ? attrById.get(row.attribute_id)
          : undefined;
        if (attrName) {
          raw = item.attributesByName[attrName] || "";
        }
      } else if (row.source === "custom_text") {
        raw = row.text || "";
      }

      if (!raw) continue;

      const show = row.show || { mode: "ALL" };
      if (show.mode === "FIRST" && show.length) {
        raw = raw.slice(0, show.length);
      } else if (show.mode === "LAST" && show.length) {
        raw = raw.slice(-show.length);
      }

      raw = applyCase(raw, row.case);

      if (!raw) continue;
      const sep = row.separator ?? "";
      parts.push(raw + sep);
    }

    return parts.join("");
  };

  return items.map((it) => ({
    ...it,
    sku: buildSkuForItem(it),
  }));
}
