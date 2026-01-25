// src/screens/catalog/ItemPeek.tsx

import React, { useEffect, useState } from "react";

import type { Item } from "../../../types/catalog";
import { TabNav } from "../../../components/layout/TabNav";
import { fetchItem } from "../../../api/catalog";
import { Transactions } from "./Transactions";
import { Overview } from "./Overview";
import { Locations } from "./Locations";
import { History } from "./History";
import { Schedule } from "./Schedule";
import { Customizations } from "./Customizations";
import { Availability } from "./Availability";


interface Props {
  item: Item;
}

export const ItemPeek: React.FC<Props> = ({ item }) => {
  const [tab, setTab] = useState('overview');
  const [peekItem, setPeekItem] = useState<Item | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchItem(item.id!);
        if (!cancelled) setPeekItem(data);
      } catch {
        if (!cancelled) setPeekItem(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [item.id]);

  const showSchedule = Boolean(peekItem?.scheduled ?? item?.scheduled);
  const showCustomizations = Boolean(peekItem?.customized ?? item?.customized);
  const showInventory = Boolean(peekItem?.inventory_tracking ?? item?.inventory_tracking);

  useEffect(() => {
    if (tab === "schedule" && !showSchedule) setTab("overview");
    if (tab === "customizations" && !showCustomizations) setTab("overview");
    if (tab === "inventory" && !showInventory) setTab("overview");
  }, [showCustomizations, showSchedule, tab]);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">

          {/* Item title */}
          <h2 className="text-3xl font-semibold">
            {item?.name}
          </h2>

          {/* Tab navigation */}
          <div className="flex gap-7">
            <TabNav
              action={() => setTab('overview')}
              isActive={tab === 'overview'}
            >
              Overview
            </TabNav>
            <TabNav
              action={() => setTab("availability")}
              isActive={tab === "availability"}
            >
              Availability
            </TabNav>
            {showInventory && (
              <TabNav
                action={() => setTab("inventory")}
                isActive={tab === "inventory"}
              >
                Inventory
              </TabNav>
            )}
            <TabNav
              action={() => setTab('transactions')}
              isActive={tab === 'transactions'}
            >
              Transactions
            </TabNav>
            {showSchedule && (
              <TabNav action={() => setTab("schedule")} isActive={tab === "schedule"}>
                Schedule
              </TabNav>
            )}
            {showCustomizations && (
              <TabNav
                action={() => setTab("customizations")}
                isActive={tab === "customizations"}
              >
                Customizations
              </TabNav>
            )}
            <TabNav
              action={() => setTab('history')}
              isActive={tab === 'history'}
            >
              History
            </TabNav>
          </div>
      </div>
      {tab === 'overview' && <Overview itemId={item.id!}/> }
      {tab === "availability" && <Availability itemId={item.id!} />}
      {tab === "inventory" && <Locations itemId={item.id!} />}
      {tab === 'transactions' && <Transactions itemId={item.id!}/> }
      {tab === "schedule" && <Schedule itemId={item.id!} />}
      {tab === "customizations" && <Customizations itemId={item.id!} />}
      {tab === 'history' && <History itemId={item.id!}/> }

    </div>
  );
};
