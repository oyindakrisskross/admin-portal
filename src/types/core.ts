// src/types/core.ts

export interface Organization {
  id?: number;
  name?: string;
  location?: number;
  location_name?: string;
  website_url?: string;
  base_currency?: number;
  base_currency_name?: string;
  base_currency_code?: string;
  fiscal_year?: number;
  fiscal_year_name?: string;
  fiscal_start_date?: string;
  date_format?: number;
  date_format_name?: string;
  date_format_code?: string;
}