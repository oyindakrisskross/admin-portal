export type DailyItemsMode = "parents" | "all";

export interface DailyReportSettings {
  enabled: boolean;
  export_backend: "LOCAL" | "GRAPH";
  export_path: string;
  export_subdir: string;
  timezone: string;
  run_time: string; // "HH:MM:SS"
  apply_all_locations: boolean;
  location_ids: number[];
  items_mode: DailyItemsMode;
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

export interface DailyReportRunResult {
  location_id: number;
  location_name: string;
  report_date: string; // YYYY-MM-DD
  status: "SUCCESS" | "FAILED";
  file_path: string;
  error: string;
}

export interface DailyReportRunResponse {
  results: DailyReportRunResult[];
}
