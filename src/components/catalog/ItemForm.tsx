// src/components/catalog/ItemForm.tsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { 
  type Item, 
  type ItemType,
  type ItemSchedule,
  type Unit,
  type TaxRule, 
  type WeekDay,
  type ItemCustomization,
  type PricingType,
  PRICING_OPTS,
  DAY_OPTIONS,
  TYPE_CHOICES,
  type ItemAvailability,
  type Category,
  type ItemCategory,
} from "../../types/catalog";

import { 
  fetchItems,
  createItem, 
  updateItem,
  fetchUnits,
  fetchTaxRules,
  createItemGallery,
  updateItemGallery,
  deleteItemGallery,
  createItemSchedule,
  updateItemSchedule,
  deleteItemSchedule,
  createItemCustomization,
  updateItemCustomization,
  deleteItemCustomization,
  deleteItemAvailability,
  createItemAvailability,
  fetchCategories,
  deleteItemCategory,
  createItemCategory,
} from "../../api/catalog";

import { fetchLocations } from "../../api/location";
import { type Location } from "../../types/location";

import { Loader2, Plus, Trash2, CheckCircle2, X } from "lucide-react";
import { 
  XMarkIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import ListPageHeader from "../layout/ListPageHeader";
import ToastModal from "../ui/ToastModal";

interface Props {
  initial?: Item | null;
}

const INITIAL_TYPE: ItemType = "GOOD";

const EMPTY_ITEM: Item = { 
  name: "", 
  description: "", 
  type_id: INITIAL_TYPE, 
  status: "ACTIVE", 
  returnable: true, 
  sellable: true, 
  purchasable: true, 
  inventory_tracking: false, 
  gallery: [], 
  scheduled: false, 
  schedules: [],
  customized: false,
  customizations: [],
};

type GalleryItemLocal = {
  id?: number;      // existing DB id, if any
  src: string;      // full URL or object URL
  file?: File;      // for newly added images
  is_primary: boolean;
  sort_order: number;
};

export const ItemForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [item, setItem] = useState<Item>(initial ?? EMPTY_ITEM);
  const [items, setItems] = useState<Item[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  const [selectedType, setSelectedType] = useState<ItemType>(initial?.type_id ?? INITIAL_TYPE); 
  const [unitChoices, setUnitChoices] = useState<Unit[]>([]); 
  const [taxRuleChoices, setTaxRuleChoices] = useState<TaxRule[]>([]); 

  const [selectedImageIdx, setSelectedImageIdx] = useState<number | null>(null);
  const [gallery, setGallery] = useState<GalleryItemLocal[]>([]);
  const initialGalleryRef = useRef<GalleryItemLocal[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [availableLocationIds, setAvailableLocationIds] = useState<number[]>([]);
  const [locationSearch, setLocationSearch] = useState("");
  const [selectedAllLocs, setSelectedAllLocs] = useState(false);
  const initialAvailabilityRef = useRef<ItemAvailability[]>([]);

  const handleRemoveAvailibility = (id: number) => {
    setItem((prev) => ({
      ...prev,
      availabilities: prev.availabilities?.filter((a)=> a.location !== id),
    }));
  };

  const handleAddAvailibility = (id: number) => {
    if (item.availabilities?.find((a) => a.location === id)) return;
    setItem((prev) => ({
      ...prev,
      availabilities: [
        ...(prev.availabilities ?? []),
        {
          location: id,
        },
      ],
    }));
  };

  const toggleLocation = (id: number) => {
    setAvailableLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

    const current = item.availabilities ?? [];
    const exists = current.some((a) => a.location === id);

    if (exists) {
      handleRemoveAvailibility(id);
    } else {
      handleAddAvailibility(id);
    }
  };

  const handleSelectAllLocations = () => {
    setAvailableLocationIds(locations.map((l) => l.id!));
    locations.map((l) => handleAddAvailibility(l.id!));
  };

  const handleRemoveAllLocations = () => {
    availableLocationIds.map((l)=> handleRemoveAvailibility(l));
    setAvailableLocationIds([]);
  };

  const handleRemoveLocation = (id: number) => {
    setAvailableLocationIds((prev) => prev.filter((x) => x !== id));
    handleRemoveAvailibility(id);
  };


  const [returnable, setReturnable] = useState(
    initial?.returnable ?? true
  ); 

  const [sellable, setSellable] = useState(
    initial?.sellable ?? true
  );
  const [purchasable, setPurchasable] = useState(
    initial?.purchasable ?? true
  );
  const [trackInventory, setTrackInventory] = useState(
    initial?.inventory_tracking ?? false
  );

  const [scheduled, setScheduled] = useState(
    initial?.scheduled ?? false
  );
  const initialScheduleRef = useRef<ItemSchedule[]>([]);

  const [customized, setCustomized] = useState(
    initial?.customized ?? false
  );
  const initialCustomRef = useRef<ItemCustomization[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const initialItemCategoriesRef = useRef<ItemCategory[]>([]);

  useEffect(() => {
    (async () => {
      const data = await fetchItems();
      setItems(data.results);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const data = await fetchCategories();
      setCategories(data.results);
    })();
  },[]);

  useEffect(() => {
    (async () => {
      const data = await fetchLocations();
      setLocations(data.results);
    })();
  }, []);

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
    if (availableLocationIds.length === locations.length) {
      setSelectedAllLocs(true);
    } else {
      setSelectedAllLocs(false);
    }
  }, [availableLocationIds, locations, selectedAllLocs]);

  useEffect(() => {
    if (initial) {
      // setItem(initial);

      // Get snapshot of initial available locations
      if (initial?.availabilities && initial.availabilities.length) {
        const mapped = initial.availabilities;
        setAvailableLocationIds(mapped.map((l) => l.location));
        initialAvailabilityRef.current = mapped;
      } else {
        initialAvailabilityRef.current = [];
      }

      // Get snapshot of initial categories
      if (initial?.categories && initial.categories.length) {
        const mapped = initial.categories.map((ic: ItemCategory) => ({
          id: ic.id,
          item: ic.item,
          category: ic.category,
        }));
        initialItemCategoriesRef.current = mapped;
      } else {
        initialItemCategoriesRef.current = [];
      }

      // Get snapshot of initial gallery
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

      // Get snapshot of initial schedules
      if (initial?.scheduled && initial.schedules?.length) {
        const mapped = initial.schedules.map((sch: ItemSchedule) => ({
          id: sch.id,
          item: sch.item,
          weekday: sch.weekday,
          all_day: sch.all_day,
          time_from: sch.time_from,
          time_to: sch.time_to,
        }));
        initialScheduleRef.current = mapped;
      } else {
        initialScheduleRef.current = [];
      }

      // Get snapshot of initial customizations
      if (initial?.customizations && initial.customizations?.length) {
        const mapped = initial.customizations.map((cus: ItemCustomization) => ({
          id: cus.id,
          parent: cus.parent,
          child: cus.child,
          label: cus.label,
          pricing_type: cus.pricing_type,
          price_delta: cus.price_delta,
          min_qty: cus.min_qty,
          max_qty: cus.max_qty,
          step_qty: cus.step_qty,
          sort_order: cus.sort_order,
        }));
        initialCustomRef.current = mapped;
      } else {
        initialCustomRef.current = [];
      }
    }
  }, [initial]);

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



  const handleChange = (patch: Partial<Item>) => {
    setItem((i) => ({ ...i, ...patch }));
  };

  const handleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => { 
    const nextType = event.target.value as ItemType; 
    setSelectedType(nextType); 
 
    if (nextType === "SERVICE") { 
      setTrackInventory(false); 
      setReturnable(true); 
    } 
  }; 

  const handleSellableChg = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setSellable(checked);

    if (!checked) {
      setCustomized(false);
      setTrackInventory(false);
      setScheduled(false);
      handleChange({ price: "0" });
    }
  };

  const handlePurchasableChg = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked;
    setPurchasable(checked);

    if (!checked) {
      handleChange({ cost: "0" });
    }
  };

  const handleCategoryChg = (
    e: React.ChangeEvent<HTMLInputElement>,
    categoryId: number
  ) => {
    const checked = e.target.checked;
    setItem((prev) => {
      const current = prev.categories ?? [];

      // remove if unchecked
      if (!checked) {
        return {
          ...prev,
          categories: current.filter((ic) => ic.category !== categoryId),
        };
      }

      // avoid duplicates
      if (current.some((ic) => ic.category === categoryId)) {
        return prev;
      }

      // add if checked
      return {
        ...prev,
        categories: [
          ...current,
          {
            category: categoryId,
          } as ItemCategory,
        ]
      }
    })
  }

  const handleAddSchedule = () => {
    setItem((i) => ({
      ...i,
      schedules: [
        ...(i.schedules ?? []),
        {
          item: i.id ?? undefined,
          weekday: "" as any,
          all_day: true,
          time_from: null,
          time_to: null,
        },
      ],
    }));
  };

  const handleRemoveSchedule = (index: number) => {
    setItem((i) => ({
      ...i,
      schedules: i.schedules?.filter((_, i) => i !== index),
    }));
  };

  const handleSchedChange = (index: number, patch: Partial<ItemSchedule>) => {
    setItem((i) => ({
      ...i,
      schedules: i.schedules?.map((a, idx) => (idx === index ? { ...a, ...patch } : a)),
    }));
  };

  const syncSchedules = async (itemId: number) => {
    const original = initialScheduleRef.current;
    const current = item.schedules;

    const originalById = new Map<number, ItemSchedule>();
    for (const s of original) {
      if (s.id != null) originalById.set(s.id, s);
    }

    const currentById = new Map<number, ItemSchedule>();
    for (const s of current!) {
      if (s.id != null) currentById.set(s.id, s);
    }

    // 1) Deletes: schedules that existed before but are not in current
    const deletions: number[] = [];
    for (const [id] of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    // 2) Updates: existing schedules whose flags or times changed
    const updates: {
      id: number; 
      patch: {
        weekday?: WeekDay;
        all_day?: boolean;
        time_from?: string;
        time_to?: string;
    }} [] = []
    for (const [id, orig] of originalById.entries()) {
      const cur = currentById.get(id);
      if (!cur) continue;
      const patch: {
        weekday?: WeekDay;
        all_day?: boolean;
        time_from?: string;
        time_to?: string;
      } = {}
      if (orig.weekday !== cur.weekday) patch.weekday = cur.weekday;
      if (orig.all_day !== cur.all_day) patch.all_day = cur.all_day;
      if (orig.time_from !== cur.time_from) patch.time_from = cur.time_from!;
      if (orig.time_to !== cur.time_to) patch.time_to = cur.time_to!;
      
      if (Object.keys(patch).length) updates.push({ id, patch });
    }

    // 3) Creates: schedules without id + with flags
    const creations = current?.filter((s) => !s.id && s.weekday);

    await Promise.all([
      ...deletions.map((id) => deleteItemSchedule(id)),
      ...updates.map((u) => updateItemSchedule(u.id, u.patch)),
      ...creations!.map((s) => {
        const payload: ItemSchedule = {
          item: itemId,
          weekday: s.weekday,
          all_day: s.all_day,
          time_from: s.time_from,
          time_to: s.time_to,
        };
        createItemSchedule(payload)
      }),
    ]);

    // After successful sync, reset "original" snapshot so subsequent saves differ correctly
    const refreshed = current?.map((s) => ({ ...s }));
    initialScheduleRef.current = refreshed as any;
  }

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

  const syncGallery = async (itemId: number) => {
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
      ...deletions.map((id) => deleteItemGallery(id)),
      ...updates.map((u) => updateItemGallery(u.id, u.patch)),
      ...creations.map((g) =>
        createItemGallery(
          itemId,
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

  const handleAddCustom = () => {
    setItem((i) => ({
      ...i,
      customizations: [
        ...(i.customizations ?? []),
        {
          parent: i.id ?? 0,
          child: undefined,   // default id
          label: "",
          pricing_type: "INCLUDED",
          price_delta: "0",
          min_qty: "0",
          max_qty: "10",
          step_qty: "1",
          sort_order: "0",
        },
      ],
    }));
  };

  const handleRemoveCustom = (index: number) => {
    setItem((i) => ({
      ...i,
      customizations: i.customizations?.filter((_, i) => i !== index),
    }));
  };

  const handleCustomChg = (index: number, patch:Partial<ItemCustomization>) => {
    setItem((i) => ({
      ...i,
      customizations: i.customizations?.map((a, idx) => (idx === index ? { ...a, ...patch } : a)),
    }));
  }

  const syncCustomizations = async (itemId: number) => {
    const original = initialCustomRef.current;
    const current = item.customizations;

    const originalById = new Map<number, ItemCustomization>();
    for (const c of original) {
      if (c.id != null) originalById.set(c.id, c);
    }

    const currentById = new Map<number, ItemCustomization>();
    for (const c of current!) {
      if (c.id != null) currentById.set(c.id, c);
    }

    // 1) Deletes: customizations that existed before but are not in current
    const deletions: number[] = [];
    for (const [id] of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    // 2) Updates: existing customizations whose flags or times changed
    const updates: {
      id: number; 
      patch: {
        child?: number;
        label?: string;
        pricing_type?: PricingType;
        price_delta?: string;
        min_qty?: string;
        max_qty?: string;
        step_qty?: string;
        sort_order?: string;
    }} [] = []
    for (const [id, orig] of originalById.entries()) {
      const cur = currentById.get(id);
      if (!cur) continue;
      const patch: {
        child?: number;
        label?: string;
        pricing_type?: PricingType;
        price_delta?: string;
        min_qty?: string;
        max_qty?: string;
        step_qty?: string;
        sort_order?: string;
      } = {}
      if (orig.child !== cur.child) patch.child = cur.child;
      if (orig.label !== cur.label) patch.label = cur.label;
      if (orig.pricing_type !== cur.pricing_type) patch.pricing_type = cur.pricing_type;
      if (orig.price_delta !== cur.price_delta) patch.price_delta = cur.price_delta;
      if (orig.min_qty !== cur.min_qty) patch.min_qty = cur.min_qty!;
      if (orig.max_qty !== cur.max_qty) patch.max_qty = cur.max_qty!;
      if (orig.step_qty !== cur.step_qty) patch.step_qty = cur.step_qty!;
      if (orig.sort_order !== cur.sort_order) patch.sort_order = cur.sort_order!;

      if (Object.keys(patch).length) updates.push({ id, patch });
    }

    // 3) Creates: customizations without id + with flags
    const creations = current?.filter((c) => !c.id && (c.child !== 0));

    await Promise.all([
      ...deletions.map((id) => deleteItemCustomization(id)),
      ...updates.map((u) => updateItemCustomization(u.id, u.patch)),
      ...creations!.map((c) => {
        const payload: ItemCustomization = {
          parent: itemId,
          ...c,
        };
        createItemCustomization(payload);
      }),
    ]);

    // After successful sync, reset "original" snapshot so subsequent saves differ correctly
    const refreshed = current?.map((c) => ({ ...c }));
    initialCustomRef.current = refreshed as any;
  };

  const syncCategories = async (itemId: number) => {
    const original = initialItemCategoriesRef.current;
    const current = item.categories;

    const originalById = new Map<number, ItemCategory>();
    for (const c of original) {
      if (c.id != null) originalById.set(c.id, c);
    }

    const currentById = new Map<number, ItemCategory>();
    for (const c of current!) {
      if (c.id != null) currentById.set(c.id, c);
    }

    // 1} Deletes
    const deletions: number[] = [];
    for (const [id]of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    // 2) Creates
    const creations = current?.filter((c) => !c.id && c.category);

    await Promise.all([
      ...deletions.map((id) => deleteItemCategory(id)),
      ...creations!.map((c) => {
        const payload: ItemCategory = {
          item: itemId,
          category: c.category,
        };
        createItemCategory(payload);
      }),
    ]);

    const refreshed = current?.map((c) => ({ ...c }));
    initialItemCategoriesRef.current = refreshed as any;
  };

  const syncAvailability = async (itemId: number) => {
    const original = initialAvailabilityRef.current;
    const current = item.availabilities;

    const originalById = new Map<number, ItemAvailability>();
    for (const a of original) {
      if (a.id != null) originalById.set(a.id, a);
    }

    const currentById = new Map<number, ItemAvailability>();
    for (const a of current!) {
      if (a.id != null) currentById.set(a.id, a);
    }

    // 1) Deletes
    const deletions: number[] = [];
    for (const [id] of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    // 2) Creates
    const creations = current?.filter((a) => !a.id && a.location);
    
    await Promise.all([
      ...deletions.map((id) => deleteItemAvailability(id)),
      ...creations!.map((c) => {
        const payload: ItemAvailability = {
          item: itemId,
          location: c.location,
        };
        createItemAvailability(payload);
      }),
    ]);

    const refreshed = current?.map((a) => ({ ...a }));
    initialAvailabilityRef.current = refreshed as any;
  };

  const handleSave = async () => {
    setError(null);

    const normalizedPrice = sellable ? item.price : "0";
    const normalizedCost = purchasable ? item.cost : "0";

    if (sellable) {
      const priceNum = Number(normalizedPrice);
      if (normalizedPrice == null || normalizedPrice === "" || !Number.isFinite(priceNum) || priceNum < 0) {
        setError("Price is required (and must be ≥ 0) when Sellable is checked.");
        return;
      }
    }

    if (purchasable) {
      const costNum = Number(normalizedCost);
      if (normalizedCost == null || normalizedCost === "" || !Number.isFinite(costNum) || costNum <= 0) {
        setError("Cost is required (and must be > 0) when Purchasable is checked.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: item.name,
        description: item.description,
        sku: item.sku,
        type_id: selectedType,
        unit: item.unit,
        sale_tax: item.sale_tax,
        returnable: returnable,
        inventory_tracking: trackInventory,
        inventory_input: item.inventory_input,
        price: normalizedPrice,
        cost: normalizedCost,
        sellable: sellable,
        purchasable: purchasable,
        weight: item.weight,
        width: item.width,
        height: item.height,
        length: item.length,
        reorder_point: item.reorder_point,
        scheduled: scheduled,
        customized: customized,
      };

      let saved: Item;
      if (item.id) {
        saved = await updateItem(item.id, payload);
      } else {
        saved = await createItem(payload);
      }

      await syncSchedules(saved.id!);
      await syncGallery(saved.id!);
      await syncCustomizations(saved.id!);
      await syncCategories(saved.id!);
      await syncAvailability(saved.id!);

      navigate(`/catalog/items/${saved.id}`);
    } catch (e) {
      setError("Failed to save item. Please check the form and try again.");
    } finally {
      setSaving(false);
    }
  };


  return (
    <>
      <ListPageHeader
        icon = {<span className="text-lg">🛒</span>}
        section = "Catalog"
        title = {initial ? `Edit ${initial?.name}` : "New Item"}
        right = {
          <button
            onClick={() => navigate("/catalog/items")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-8">

        {/* Overview Section */}
        <section className="flex gap-6 py-7">
          {/* Detail input */}
          <div className="w-2/3 flex flex-col gap-5">
            {/* Item Type */}
            <div className="grid grid-cols-6 gap-2">
              <p> Type </p>
              <div className="col-span-5">
                {TYPE_CHOICES.map((t) => (
                  <label className="mr-4">
                    <input 
                      type="radio" 
                      name={t.label} 
                      value={t.value}
                      checked={selectedType === t.value} 
                      onChange={handleTypeChange}
                      className="mr-2" 
                    /> {t.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Item Name */}
            <div className="grid grid-cols-6 gap-2">
              <p>Item Name</p>
              <input
                type="text"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-5"
                value={item.name}
                onChange={(e) => handleChange({ name: e.target.value })}
              />
            </div>

            {/* SKU */}
            <div className="grid grid-cols-6 gap-2">
              <p>SKU</p>
              <input
                type="text"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-5"
                value={item.sku}
                onChange={(e) => handleChange({ sku: e.target.value })}
              />
            </div>

            {/* Description */}
            <div className="grid grid-cols-6 gap-2">
              <p>Description</p>
              <textarea
                className="min-h-[100px] col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={item.description ?? ""}
                onChange={(e) => handleChange({ description: e.target.value })}
              />
            </div>

            {/* Unit */}
            <div className="grid grid-cols-6 gap-2">
              <p>Unit</p>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-5"
                value={item.unit ? item.unit : undefined}
                onChange={(e) => handleChange({ unit: +e.target.value})}
              >
                <option key={0} value={undefined}></option>
                {unitChoices.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Returnable */}
            { selectedType === "GOOD" && (
              <div className="grid grid-cols-6 gap-2">
                <p></p>
                <label className="flex gap-1 items-center col-span-5">
                  <input
                    id="returnable"
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 mx-2"
                    checked={returnable}
                    onChange={(e) => setReturnable(e.target.checked)}
                  />
                  Returnable Items 
                  <span className="help">
                    <QuestionMarkCircleIcon className="text-shadow-kk-dark-text-muted h-5 w-5 cursor-pointer help" />
                    <span className="tooltip-r w-[200px]">
                      Enable this option if all item is eligible for sales return.
                    </span>
                  </span>
                </label>
              </div>
            )}
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

        {/* Dimensions Section */}
        <section>
          <div className="grid grid-cols-8 gap-2 items-center">
            <div className="flex flex-col gap-2">
              <p>Dimensions</p>
              <p className="text-kk-dark-text-muted">Length x Width x Height</p>
            </div>
            <div className="col-span-2 h-2/3 dimension-fields flex flex-1 gap-1 items-center rounded-md border border-kk-dark-input-border">
              {/* Length */}
              <span className="dimension-input w-1/3 h-full">
                <input 
                  className="text-center w-full h-full"
                  value={item.length}
                  onChange={(e) => handleChange({ length: e.target.value })}
                />
              </span>
              <span className="dimension-seperator text-kk-dark-text-muted">x</span>
              {/* Width */}
              <span className="dimension-input w-1/3 h-full">
                <input 
                  className="text-center w-full h-full"
                  value={item.width}
                  onChange={(e) => handleChange({ width: e.target.value })}
                />
              </span>
              <span className="dimension-seperator text-kk-dark-text-muted">x</span>
              {/* Height */}
              <span className="dimension-input w-1/3 h-full">
                <input 
                  className="text-center w-full h-full"
                  value={item.height}
                  onChange={(e) => handleChange({ height: e.target.value })}
                />
              </span>
            </div>

            {/* Weight */}
            <p className="text-center justify-self-end self-center mr-2">Weight</p>
            <input 
              className="h-2/3 rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2 mr-4"
              value={item.weight}
              onChange={(e) => handleChange({ weight: e.target.value })}
            />
          </div>
        </section>

        {/* Sales & Purchase Information */}
        <section className="grid grid-cols-8 mt-4">
          {/* Sales Info */}
          <div className="flex flex-col gap-3 col-span-3">
            <div className="flex justify-between">
              <p className="col-span-1 text-xl">Sales Information</p>
              <label className="inline-flex items-center gap-1">
                <input 
                  type="checkbox"
                  checked={sellable}
                  onChange={handleSellableChg}
                />
                Sellable
              </label>
            </div>
            <div className="flex gap-4">
              <p className="w-1/2">Selling Price</p>
              <span className="w-full rounded border border-kk-dark-input-border ">
                <span className="w-1/4 px-2 py-1 border border-kk-dark-input-border bg-kk-dark-bg-elevated">NGN</span>
                <input 
                  type="number"
                  className="w-3/4 px-2 py-1"
                  disabled={!sellable}
                  value={item.price}
                  onChange={(e) => handleChange({ price: e.target.value })}
                />
              </span>
            </div>
            <div className="flex gap-4">
              <p className="w-1/2">Tax Rule</p>
              <select
                className="w-full rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={item.sale_tax ? item.sale_tax : undefined}
                onChange={(e) => handleChange({ sale_tax: +e.target.value})}
              >
                <option key={0} value={undefined}></option>
                {taxRuleChoices.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Purchase Info */}
          <div className="flex flex-col gap-3 col-span-3 col-start-5">
            <div className="flex justify-between">
              <p className="col-span-1 text-xl">Purchase Information</p>
              <label className="inline-flex items-center gap-1">
                <input 
                  type="checkbox"
                  checked={purchasable}
                  onChange={handlePurchasableChg}
                />
                Purchasable
              </label>
            </div>
            <div className="flex gap-4">
              <p className="w-1/2">Purchase Price</p>
              <span className="w-full rounded border border-kk-dark-input-border ">
                <span className="w-1/4 px-2 py-1 border border-kk-dark-input-border bg-kk-dark-bg-elevated">NGN</span>
                <input 
                  type="number"
                  className="w-3/4 px-2 py-1"
                  disabled={!purchasable}
                  value={item.cost}
                  onChange={(e) => handleChange({ cost: e.target.value })}
                />
              </span>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mt-6">
          <p className="text-xl mb-5">Categories</p>
          <div className="grid grid-cols-8 gap-3">
            { categories.map((c) => (
              <label>
                <input 
                  key={c.id}
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 mx-2"
                  checked={item.categories?.some((ic) => ic.category === c.id) ?? false}
                  onChange={(e) => handleCategoryChg(e, c.id!)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </section>

        {/* Available Locations for Sale */}
        <section className="mt-6">
          <div className="mb-3 pl-3">
            <p className="text-xl">Available Locations</p>
            <p className="text-xs text-kk-dark-text-muted">
              Select the locations where this item can be sold.
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
                <span className={`flex h-4 w-4 items-center border border-kk-dark-input-border justify-center rounded-full text-[10px] text-white ${
                  selectedAllLocs ? "bg-emerald-500" : "bg-transparent"}`}>
                  ✓
                </span>
                <span className="font-medium">Select All</span>
              </button>

              {/* Locations list */}
              <div className="h-full overflow-auto">
                {locations
                  .filter((loc) =>
                    loc.name
                      .toLowerCase()
                      .includes(locationSearch.toLowerCase())
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
                        <span
                          className={`${
                            selected ? "font-semibold" : "font-medium"
                          }`}
                        >
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
                <span className="tracking-wide text-kk-dark-text">
                  ACCESSIBLE LOCATIONS
                </span>
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
                  <p className="text-xs text-kk-dark-text-muted">
                    No locations selected yet.
                  </p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {locations
                      .filter((loc) => availableLocationIds.includes(loc.id!))
                      .map((loc) => (
                        <li
                          key={loc.id}
                          className="flex items-center justify-between gap-2"
                        >
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

        {/* Inventory Tracking */}
        { selectedType === "GOOD" && (
          <section className="mt-5">
            <div className="flex items-center justify-between w-full">
              <label className="flex gap-2 items-start col-span-5 mb-3">
                <input
                  id="inventoryTracking"
                  type="checkbox"
                  className="h-4 w-4 rounded-md border-slate-300 mt-2"
                  checked={trackInventory}
                  onChange={(e) => setTrackInventory(e.target.checked)}
                />
                <span className="flex flex-col gap-1">
                  <p className="text-xl">Track Inventory for this item</p>
                  <p className="text-kk-dark-text-muted"> You cannot enable/disable inventory tracking once you've created transactions for this item</p>
                </span>
              </label>
            </div>
          </section>
        )}

        {/* Item Scheduler */}
        <section className={`mt-5 ${!sellable ? "collapse h-0" : "visible h-full"}`}>
          <div className="flex items-center justify-between w-full">
            <label className="flex gap-2 items-start col-span-5 mb-3">
              <input
                id="scheduled"
                type="checkbox"
                className="h-4 w-4 rounded-md border-slate-300 mt-2"
                checked={scheduled}
                onChange={(e) => setScheduled(e.target.checked)}
              />
              <span className="flex flex-col gap-1">
                <p className="text-xl">Set Schedule for this item</p>
                <p className="text-kk-dark-text-muted"> Define when this item will be available for sale</p>
              </span>
            </label>
            <div className={`${!scheduled ? "collapse" : "visible"}`}>
              <button
                type="button"
                onClick={handleAddSchedule}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-kk-dark-hover"
              >
                <Plus className="h-3 w-3" />
                Add Schedule
              </button>
            </div>
          </div>
          <div className={`flex flex-col w-full ${!scheduled ? "collapse h-0" : "visible h-full"}`}>
            {item.schedules?.map((sch, idx) => (
              <div
                key={idx}
                className="rounded-xl border-kk-dark-input-border p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex items-center gap-2">
                    <select
                      className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-lg px-2 py-1 text-xs"
                      value={sch.weekday}
                      onChange={(e) => 
                        handleSchedChange(idx, { weekday: e.target.value as WeekDay })
                      }
                    >
                      <option value="" disabled selected>Select a day</option>
                      {DAY_OPTIONS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                    <label className="flex gap-2 text-nowrap">
                      <input
                        type="checkbox"
                        checked={sch.all_day}
                        onChange={(e) => 
                          handleSchedChange(idx, { all_day: e.target.checked })
                        }
                      />
                      All Day 
                    </label>
                    <input 
                      type="time" 
                      disabled={sch.all_day}
                      className="flex-1 rounded-lg border border-kk-dark-input-border px-2.5 py-1.5 text-xs disabled:bg-kk-dark-bg-elevated"
                      value={sch.time_from!}
                      onChange={(e) =>
                        handleSchedChange(idx, { time_from: e.target.value })
                      }
                    />
                    <span>-</span>
                    <input 
                      type="time" 
                      disabled={sch.all_day}
                      className="flex-1 rounded-lg border border-kk-dark-input-border px-2.5 py-1.5 text-xs disabled:bg-kk-dark-bg-elevated"
                      value={sch.time_to!}
                      onChange={(e) => 
                        handleSchedChange(idx, { time_to: e.target.value })
                      }
                    />
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSchedule(idx)}
                    className="rounded-full p-1 hover:bg-kk-dark-hover"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}

            {!item.schedules?.length && (
              <div className="rounded-xl border border-dashed border-kk-dark-input-border px-4 py-6 text-xs text-center">
                No scheduled time yet. Click "+ Add Schedule" to create your first one
              </div>
            )}
          </div>
        </section>

        {/* Item Customizations */}
        <section className={`mt-5 ${!sellable ? "collapse h-0" : "visible h-full"}`}>
          <div className="flex items-center justify-between w-full">
            <label className="flex gap-2 items-start col-span-5 mb-3">
              <input
                id="customized"
                type="checkbox"
                className="h-4 w-4 rounded-md border-slate-300 mt-2"
                checked={customized}
                onChange={(e) => setCustomized(e.target.checked)}
              />
              <span className="flex flex-col gap-1">
                <p className="text-xl">Add Customizations for this item</p>
                <p className="text-kk-dark-text-muted"> Define add-ons and removable items for this product</p>
              </span>
            </label>
            <div className={`${!customized ? "collapse" : "visible"}`}>
              <button
                type="button"
                onClick={handleAddCustom}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-kk-dark-hover"
              >
                <Plus className="h-3 w-3" />
                Add Customization
              </button>
            </div>
          </div>
          <div className={`flex flex-col w-full ${!customized ? "collapse h-0" : "visible h-full"}`}>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left font-medium">
                    Select Product
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Customization Label
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Customization Type
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Pricing
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Max Qty
                  </th>
                  <th className="px-3 py-2 text-left font-medium">
                    Step Qty
                  </th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {item.customizations?.map((cus, idx) => (
                  <tr key={idx}>
                    <td>
                      <select
                        className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-lg px-2 py-1 text-xs"
                        value={cus.child}
                        onChange={(e) => 
                          handleCustomChg(idx, { child: +e.target.value })
                        }
                      >
                        <option value="" disabled selected>Select a product</option>
                        {items.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input 
                        placeholder="e.g Extra Beef Patty"
                        type="text"
                        className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-lg px-2 py-1 text-xs"
                        value={cus.label}
                        onChange={(e) =>
                          handleCustomChg(idx, { label: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-lg px-2 py-1 text-xs"
                        value={cus.pricing_type}
                        onChange={(e) => 
                          handleCustomChg(idx, { pricing_type: e.target.value as PricingType })
                        }
                      >
                        {PRICING_OPTS.map((i) => (
                          <option key={i.value} value={i.value}>
                            {i.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span className="flex items-center">
                        <span className="w-fit px-2 py-1 rounded-l-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated">NGN</span>
                        <input 
                          className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-r-lg px-2 py-1 text-xs"
                          type="number"
                          value={cus.price_delta}
                          onChange={(e) => 
                            handleCustomChg(idx, { price_delta: e.target.value })
                          }
                        />
                      </span>
                    </td>
                    <td>
                      <input 
                          className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-lg px-2 py-1 text-xs"
                          type="number"
                          value={cus.max_qty}
                          onChange={(e) => 
                            handleCustomChg(idx, { max_qty: e.target.value })
                          }
                        />
                    </td>
                    <td>
                      <input 
                          className="w-full bg-kk-dark-bg border border-kk-dark-input-border rounded-lg px-2 py-1 text-xs"
                          type="number"
                          value={cus.step_qty}
                          onChange={(e) => 
                            handleCustomChg(idx, { step_qty: e.target.value })
                          }
                        />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustom(idx)}
                        className="rounded-full p-1 hover:bg-kk-dark-hover"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!item.customizations?.length && (
                <div className="rounded-xl border border-dashed border-kk-dark-input-border px-4 py-6 text-xs text-center">
                  No customizations yet. Click "+ Add Customization" to create your first one
                </div>
              )}
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
            Save Item
          </button>
        </div>
        <ToastModal message={error} onClose={() => setError(null)} variant="error" />
      </div>
    </>
  )
};
