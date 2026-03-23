export type PaystackMode = "TEST" | "LIVE";

export type PaystackGatewaySettings = {
  id: number;
  portal_id: number;
  portal_name: string;
  mode: PaystackMode;
  test_secret_key_set: boolean;
  test_public_key: string;
  test_callback_url: string;
  test_webhook_url: string;
  live_secret_key_set: boolean;
  live_public_key: string;
  live_callback_url: string;
  live_webhook_url: string;
  use_online_store: boolean;
  pos_location_ids: number[];
  available_pos_locations: Array<{ id: number; name: string }>;
  created_at: string;
  updated_at: string;
};

export type PaystackGatewaySettingsPatch = Partial<{
  mode: PaystackMode;
  test_secret_key: string;
  test_public_key: string;
  test_callback_url: string;
  test_webhook_url: string;
  live_secret_key: string;
  live_public_key: string;
  live_callback_url: string;
  live_webhook_url: string;
  use_online_store: boolean;
  pos_location_ids: number[];
}>;

export type ConnectionStatus = "CONNECTED" | "DISCONNECTED";

export type ConnectionService = {
  id: number;
  key: string;
  name: string;
  service_type: string;
  required_connection_inputs: string[];
  required_connection_outputs: string[];
  integration_options: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectionSetting = {
  id: number | null;
  portal_id: number;
  service_id: number;
  service_key: string;
  service_name: string;
  service_type: string;
  required_connection_inputs: string[];
  required_connection_outputs: string[];
  integration_options: string[];
  status: ConnectionStatus;
  connection_name: string;
  scope: string;
  service_link_name: string;
  connections_associated: string;
  connection_inputs: Record<string, unknown>;
  connection_outputs: Record<string, unknown>;
  integration_targets: string[];
  last_ping_at: string | null;
  last_ping_success: boolean;
  last_ping_message: string;
  created_at: string | null;
  updated_at: string | null;
};

export type ConnectionSettingUpsertPayload = Partial<{
  status: ConnectionStatus;
  connection_name: string;
  scope: string;
  service_link_name: string;
  connections_associated: string;
  connection_inputs: Record<string, unknown>;
  connection_outputs: Record<string, unknown>;
  integration_targets: string[];
  last_ping_success: boolean;
  last_ping_message: string;
}>;
