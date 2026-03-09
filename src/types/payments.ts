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
