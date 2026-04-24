import crypto from 'crypto';
import QRCode from 'qrcode';
import { dbRun } from './database';
import { signRegistrationInvite } from './registration-invite';

export interface PendingRegistrationResult {
  id: string;
  deviceToken: string;
  qrCodeDataUrl: string;
  registrationData: { token: string; serverUrl: string };
  registrationLink: string;
  registrationInviteToken: string;
}

export async function createPendingRegistrationDevice(): Promise<PendingRegistrationResult> {
  const deviceToken = crypto.randomUUID();
  const serverUrl = (process.env.SERVER_URL || 'http://localhost:3000').replace(/\/$/, '');
  const registrationData = {
    token: deviceToken,
    serverUrl,
  };

  const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));

  const id = crypto.randomUUID();
  const registeredAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await dbRun(
    `INSERT INTO devices (
        id, device_token, registration_token, platform, registered_at, active, registration_expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      deviceToken,
      '',
      'android',
      registeredAt,
      0,
      expiresAt,
    ],
  );

  const registrationInviteToken = signRegistrationInvite(deviceToken, serverUrl);
  const registrationLink = `${serverUrl}/register?token=${encodeURIComponent(registrationInviteToken)}`;

  return {
    id,
    deviceToken,
    qrCodeDataUrl,
    registrationData,
    registrationLink,
    registrationInviteToken,
  };
}
