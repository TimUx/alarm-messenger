export interface EmergencyRow {
  id: string;
  emergency_number: string;
  emergency_date: string;
  emergency_keyword: string;
  emergency_description: string;
  emergency_location: string;
  created_at: string;
  active: number;
  groups: string | null;
}

export interface DeviceRow {
  id: string;
  device_token: string;
  registration_token: string;
  platform: string;
  registered_at: string;
  active: number;
  responder_name: string | null;
  qual_machinist: number;
  qual_agt: number;
  qual_paramedic: number;
  leadership_role: string | null;
  first_name: string | null;
  last_name: string | null;
  qr_code_data: string | null;
  fcm_token: string | null;
  apns_token: string | null;
  registration_expires_at: string | null;
  group_codes?: string | null; // From JOIN with device_groups
}

export interface ResponseRow {
  id: string;
  emergency_id: string;
  device_id: string;
  participating: number;
  responded_at: string;
}

export interface AdminUserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  role: string | null;
  full_name: string | null;
}

export interface GroupRow {
  code: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface NotificationOutboxRow {
  id: string;
  emergency_id: string;
  device_id: string;
  channel: 'fcm' | 'apns' | 'websocket';
  status: 'pending' | 'delivered' | 'failed';
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevokedTokenRow {
  token_hash: string;
  expires_at: string;
}
