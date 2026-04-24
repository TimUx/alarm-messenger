import { DeviceRow } from '../../models/db-types';
import { mapResponderDetails } from '../../mappers';

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

export interface EmergencyListQueries {
  countQuery: string;
  dataQuery: string;
  countParams: Array<string | number>;
}

export interface EmergencyResponseJoinRow extends DeviceRow {
  emergency_id: string;
  device_id: string;
  responded_at: string;
  participating: number;
}

export function sanitizeGroupsInput(groups?: string | null): string | null {
  if (!groups) {
    return null;
  }

  const normalized = groups.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  // Accept optional whitespace around comma-separated group codes to be
  // tolerant towards upstream formatting differences.
  const rawGroups = normalized.split(',').map((group) => group.trim()).filter(Boolean);
  if (rawGroups.length === 0) {
    return null;
  }

  if (!rawGroups.every((group) => /^[A-Z0-9-]+$/.test(group))) {
    throw new Error('INVALID_GROUPS_FORMAT');
  }

  if (rawGroups.length > 50) {
    throw new Error('TOO_MANY_GROUPS');
  }

  return rawGroups.join(',');
}

export function parseListPagination(pageValue: string | undefined, limitValue: string | undefined): PaginationResult {
  const page = Math.max(1, Number.parseInt(pageValue || '', 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(limitValue || '', 10) || 50));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildEmergencyListQueries(includeInactive: boolean, emergencyNumberFilter?: string): EmergencyListQueries {
  if (emergencyNumberFilter) {
    if (includeInactive) {
      return {
        countQuery: 'SELECT COUNT(*) as total FROM emergencies WHERE emergency_number = ?',
        dataQuery: 'SELECT * FROM emergencies WHERE emergency_number = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
        countParams: [emergencyNumberFilter] as Array<string | number>,
      };
    }
    return {
      countQuery: 'SELECT COUNT(*) as total FROM emergencies WHERE active = 1 AND emergency_number = ?',
      dataQuery: 'SELECT * FROM emergencies WHERE active = 1 AND emergency_number = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      countParams: [emergencyNumberFilter] as Array<string | number>,
    };
  }

  if (includeInactive) {
    return {
      countQuery: 'SELECT COUNT(*) as total FROM emergencies',
      dataQuery: 'SELECT * FROM emergencies ORDER BY created_at DESC LIMIT ? OFFSET ?',
      countParams: [] as Array<string | number>,
    };
  }

  return {
    countQuery: 'SELECT COUNT(*) as total FROM emergencies WHERE active = 1',
    dataQuery: 'SELECT * FROM emergencies WHERE active = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
    countParams: [] as Array<string | number>,
  };
}

export function mapParticipants(rows: EmergencyResponseJoinRow[]) {
  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    platform: row.platform,
    respondedAt: row.responded_at,
    responder: mapResponderDetails(row as DeviceRow),
  }));
}

export function mapResponses(rows: EmergencyResponseJoinRow[]) {
  return rows.map((row) => ({
    id: row.id,
    emergencyId: row.emergency_id,
    deviceId: row.device_id,
    platform: row.platform,
    participating: row.participating === 1,
    respondedAt: row.responded_at,
    responder: mapResponderDetails(row as DeviceRow),
  }));
}
