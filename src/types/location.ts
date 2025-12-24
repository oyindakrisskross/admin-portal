// src/types/location.ts

import { type AddressBook } from "./contact";

export type LocationType = "BUSINESS" | "WAREHOUSE" | "PORTAL";

export const LOC_TYPE_CHOICES: {value: LocationType; label: string; info: string}[] = [
    {
        value: "BUSINESS", 
        label: "Business",
        info: `A Business Location represents your organization or 
                office's operational location. It is used to record 
                transactions, assess regional performance, and monitor 
                stock levels for items stored at this location.`
    },
    {
        value: "WAREHOUSE", 
        label: "Warehouse",
        info: `A Warehouse Only Location refers to where your 
                items are stored. It helps track and monitor stock 
                levels for items stored at this location.`
    },
    {
        value: "PORTAL", 
        label: "Portal",
        info: `A Portal Only Location refers to online locations with 
                no physical address. It helps track and monitor business 
                portals such as mobile apps, EMS, CRM, etc.`
    },
];

export interface Location {
    id?: number;
    name: string;
    parent?: string | null;
    website_url?: string;
    address?: number;
    address_lines?: AddressBook;
    type_id: LocationType;
    created_at?: string;
    created_by?: string;
    updated_at?: string;
    updated_by?: string;
};

export type Outlet = { id: number; name: string };