export interface CustomerRecord {
  id: number;
  contact_id: number;
  email: string;
  is_active: boolean;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  minors_count: number;
  created_at: string;
  updated_at: string;
}
