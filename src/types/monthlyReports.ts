export type MonthlyItemsMode = "parents" | "all";

export interface MonthlyReportSettings {
  enabled: boolean;
  export_backend: "LOCAL" | "GRAPH";
  export_path: string;
  export_subdir: string;
  timezone: string;
  run_time: string; // "HH:MM:SS"
  apply_all_locations: boolean;
  location_ids: number[];
  items_mode: MonthlyItemsMode;
  include_payments: boolean;
  include_item_lines: boolean;
  include_refunds: boolean;
  last_run_at: string | null;

  graph_tenant_id: string;
  graph_client_id: string;
  graph_client_secret?: string; // write-only
  graph_client_secret_set?: boolean;
  graph_drive_id: string;
  graph_base_path: string;
}

export interface MonthlyReportRunResult {
  location_id: number;
  location_name: string;
  report_month: string; // YYYY-MM
  status: "SUCCESS" | "FAILED";
  file_path: string;
  error: string;
}

export interface MonthlyReportRunResponse {
  results: MonthlyReportRunResult[];
}
