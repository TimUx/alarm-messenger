import nodemailer from 'nodemailer';
import logger from '../utils/logger';

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

export async function sendRegistrationInviteEmail(
  to: string,
  options: { subject: string; text: string; html?: string },
): Promise<{ sent: boolean; reason?: string }> {
  if (!isMailConfigured()) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const host = process.env.SMTP_HOST as string;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || undefined;
  const pass = process.env.SMTP_PASSWORD || undefined;
  const from = process.env.SMTP_FROM as string;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });

    await transporter.sendMail({
      from,
      to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return { sent: true };
  } catch (err) {
    logger.error({ err, to }, 'Failed to send registration invite email');
    return { sent: false, reason: 'send_failed' };
  }
}
