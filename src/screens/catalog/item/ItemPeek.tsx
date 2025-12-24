// src/screens/catalog/ItemPeek.tsx

import React, { useState } from "react";

import type { Item } from "../../../types/catalog";
import { TabNav } from "../../../components/layout/TabNav";
import { Transactions } from "./Transactions";
import { Overview } from "./Overview";
import { Locations } from "./Locations";
import { History } from "./History";


interface Props {
  item: Item;
}

export const ItemPeek: React.FC<Props> = ({ item }) => {
  const [tab, setTab] = useState('overview');


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
              action={() => setTab('locations')}
              isActive={tab === 'locations'}
            >
              Locations
            </TabNav>
            <TabNav
              action={() => setTab('transactions')}
              isActive={tab === 'transactions'}
            >
              Transactions
            </TabNav>
            <TabNav
              action={() => setTab('history')}
              isActive={tab === 'history'}
            >
              History
            </TabNav>
          </div>
      </div>
      {tab === 'overview' && <Overview itemId={item.id!}/> }
      {tab === 'locations' && <Locations itemId={item.id!}/> }
      {tab === 'transactions' && <Transactions itemId={item.id!}/> }
      {tab === 'history' && <History itemId={item.id!}/> }

    </div>
  );
};
