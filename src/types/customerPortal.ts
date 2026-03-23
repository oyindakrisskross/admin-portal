export interface CustomerMinorRecord {
  id: number;
  first_name: string;
  last_name: string;
  dob: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerRecord {
  id: number;
  contact_id: number;
  email: string;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  minors_count: number;
  minors?: CustomerMinorRecord[];
  customer_minors?: CustomerMinorRecord[];
  active_minors_count?: number;
  created_at: string;
  updated_at: string;
}
