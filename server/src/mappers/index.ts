import { Emergency, Device, Group } from '../models/types';
import { EmergencyRow, DeviceRow, GroupRow } from '../models/db-types';

export interface ResponderDetails {
  firstName: string | null;
  lastName: string | null;
  qualifications: {
    machinist: boolean;
    agt: boolean;
    paramedic: boolean;
  };
  leadershipRole: string;
}

export function mapEmergencyRow(row: EmergencyRow): Emergency {
  return {
    id: row.id,
    emergencyNumber: row.emergency_number,
    emergencyDate: row.emergency_date,
    emergencyKeyword: row.emergency_keyword,
    emergencyDescription: row.emergency_description,
    emergencyLocation: row.emergency_location,
    createdAt: row.created_at,
    active: row.active === 1,
    groups: row.groups ?? undefined,
  };
}

export function mapDeviceRow(
  row: DeviceRow,
  includeTokens = false
): Omit<Device, 'deviceToken' | 'registrationToken'> & { deviceToken?: string; registrationToken?: string } {
  const device: Omit<Device, 'deviceToken' | 'registrationToken'> & { deviceToken?: string; registrationToken?: string } = {
    id: row.id,
    platform: row.platform as 'ios' | 'android',
    registeredAt: row.registered_at,
    active: row.active === 1,
    firstName: row.first_name ?? undefined,
    lastName: row.last_name ?? undefined,
    qualifications: {
      machinist: row.qual_machinist === 1,
      agt: row.qual_agt === 1,
      paramedic: row.qual_paramedic === 1,
    },
    leadershipRole: (row.leadership_role || 'none') as 'none' | 'groupLeader' | 'platoonLeader',
    assignedGroups: row.group_codes ? row.group_codes.split(',') : [],
  };
  if (includeTokens) {
    device.deviceToken = row.device_token;
    device.registrationToken = row.registration_token;
  }
  return device;
}

export function mapResponderDetails(row: DeviceRow): ResponderDetails {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    qualifications: {
      machinist: row.qual_machinist === 1,
      agt: row.qual_agt === 1,
      paramedic: row.qual_paramedic === 1,
    },
    leadershipRole: row.leadership_role || 'none',
  };
}

export function mapGroupRow(row: GroupRow): Group {
  return {
    code: row.code,
    name: row.name,
    description: row.description ?? undefined,
    createdAt: row.created_at,
  };
}
