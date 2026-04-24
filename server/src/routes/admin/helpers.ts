import { DeviceRow, AdminUserRow } from '../../models/db-types';
import { mapResponderDetails } from '../../mappers';

export type AdminRole = 'admin' | 'operator';

export interface AdminUserDto {
  id: string;
  username: string;
  fullName: string | null;
  role: string;
  createdAt: string;
}

export interface EmergencyResponseDto {
  id: string;
  deviceId: string;
  platform: string;
  participating: boolean;
  respondedAt: string;
  responder: ReturnType<typeof mapResponderDetails>;
}

export interface AdminEmergencyResponseJoinRow extends DeviceRow {
  device_id: string;
  responded_at: string;
  participating: number;
}

export interface NotificationSummary {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
}

export function isValidAdminRole(role?: string): role is AdminRole {
  return role === 'admin' || role === 'operator';
}

export function mapAdminUser(user: AdminUserRow): AdminUserDto {
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role || 'admin',
    createdAt: user.created_at,
  };
}

export function parsePagination(
  pageValue: string | undefined,
  limitValue: string | undefined,
  maxLimit: number,
  defaultLimit: number
) {
  const page = Math.max(1, Number.parseInt(pageValue || '', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, Number.parseInt(limitValue || '', 10) || defaultLimit));
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function mapEmergencyResponses(rows: AdminEmergencyResponseJoinRow[]): EmergencyResponseDto[] {
  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    platform: row.platform,
    participating: row.participating === 1,
    respondedAt: row.responded_at,
    responder: mapResponderDetails(row as DeviceRow),
  }));
}

export function buildEmergencySummary(responses: EmergencyResponseDto[]) {
  const participants = responses.filter((response) => response.participating).length;
  return {
    totalResponses: responses.length,
    participants,
    nonParticipants: responses.length - participants,
  };
}

export function withNotificationSummaryDefaults(summary?: Partial<NotificationSummary> | null): NotificationSummary {
  return {
    total: summary?.total ?? 0,
    delivered: summary?.delivered ?? 0,
    failed: summary?.failed ?? 0,
    pending: summary?.pending ?? 0,
  };
}
