import { Device, DeviceRegistrationRequest } from '../../models/types';

export function parseDevicesPagination(pageValue: string | undefined, limitValue: string | undefined) {
  const page = Math.max(1, Number.parseInt(pageValue || '', 10) || 1);
  const limit = Math.min(200, Math.max(1, Number.parseInt(limitValue || '', 10) || 50));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildGroupCodes(groupRows: Array<{ group_code?: string; code?: string }>) {
  const codes = groupRows
    .map((group) => group.group_code || group.code)
    .filter((code): code is string => Boolean(code));
  return codes.join(',') || null;
}

export function buildRegistrationDevicePayload(params: {
  existingId: string;
  deviceToken: string;
  registrationToken: string;
  platform: DeviceRegistrationRequest['platform'];
  registeredAt: string;
  firstName?: string;
  lastName?: string;
  qualifications?: DeviceRegistrationRequest['qualifications'];
  leadershipRole?: DeviceRegistrationRequest['leadershipRole'];
}): Device {
  return {
    id: params.existingId,
    deviceToken: params.deviceToken,
    registrationToken: params.registrationToken,
    platform: params.platform,
    registeredAt: params.registeredAt,
    active: true,
    firstName: params.firstName,
    lastName: params.lastName,
    qualifications: params.qualifications,
    leadershipRole: params.leadershipRole || 'none',
  };
}

export function buildPushTokenUpdatePlan(fcmToken: unknown, apnsToken: unknown) {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (fcmToken !== undefined && fcmToken !== null) {
    updates.push('fcm_token = ?');
    params.push(fcmToken);
  }

  if (apnsToken !== undefined && apnsToken !== null) {
    updates.push('apns_token = ?');
    params.push(apnsToken);
  }

  return { updates, params };
}
