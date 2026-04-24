import jwt, { JwtPayload } from 'jsonwebtoken';
import { decodeSecret, resolveSecret } from '../utils/secrets';

const INVITE_TYP = 'device-registration-invite';

function inviteSecret(): string {
  return resolveSecret('JWT_SECRET')
    || decodeSecret(process.env.API_SECRET_KEY)
    || 'change-me-in-production';
}

/** Short-lived JWT for web / email registration links (same claims as QR JSON). */
export function signRegistrationInvite(deviceToken: string, serverUrl: string): string {
  return jwt.sign(
    { typ: INVITE_TYP, deviceToken, serverUrl },
    inviteSecret(),
    { expiresIn: '48h', algorithm: 'HS256' },
  );
}

export function verifyRegistrationInvite(token: string): { deviceToken: string; serverUrl: string } | null {
  try {
    const decoded = jwt.verify(token, inviteSecret()) as JwtPayload;
    if (
      decoded.typ !== INVITE_TYP
      || typeof decoded.deviceToken !== 'string'
      || typeof decoded.serverUrl !== 'string'
      || !decoded.deviceToken
      || !decoded.serverUrl
    ) {
      return null;
    }
    return { deviceToken: decoded.deviceToken, serverUrl: decoded.serverUrl };
  } catch {
    return null;
  }
}
