import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { verifyRegistrationInvite } from '../services/registration-invite';

const router = Router();

const resolveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function registrationHelpHtml(): string {
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Registrierung</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}</style>
</head><body>
<h1>Geräteregistrierung</h1>
<p>Bitte den vollständigen Einladungs-Link aus der E-Mail oder dem Admin-Dashboard verwenden. Er enthält den Parameter <code>token=…</code>.</p>
<p>Alternativ in der App unter <strong>Manuelle Registrierung</strong> die JSON-Daten oder <code>Server|Token</code> einfügen.</p>
</body></html>`;
}

function registrationPageHtml(params: {
  registrationJson: string;
  deepLinkHref: string;
  serverUrl: string;
}): string {
  const jsonEsc = escapeHtml(params.registrationJson);
  const linkEsc = escapeHtml(params.deepLinkHref);
  const serverEsc = escapeHtml(params.serverUrl);
  return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Alarm Messenger — Registrieren</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:0 1rem;line-height:1.45}
textarea{width:100%;min-height:7rem;font-family:ui-monospace,monospace;font-size:.85rem}
.btn{display:inline-block;margin:.35rem .35rem .35rem 0;padding:.55rem 1rem;background:#c62828;color:#fff;text-decoration:none;border-radius:6px;border:0;cursor:pointer;font-size:1rem}
.btn-secondary{background:#37474f}
pre{background:#f5f5f5;padding:1rem;overflow:auto;font-size:.8rem}
</style></head><body>
<h1>App registrieren</h1>
<p>Server: <strong>${serverEsc}</strong></p>
<p><a class="btn" href="${linkEsc}">In der App öffnen</a> <span class="btn-secondary" style="padding:.55rem 1rem;border-radius:6px;display:inline-block">Falls die App nicht startet: Daten unten kopieren</span></p>
<h2>Registrierungsdaten (JSON)</h2>
<textarea readonly id="json">${jsonEsc}</textarea>
<p><button class="btn" type="button" id="copy">JSON kopieren</button></p>
<h2>Manuell in der App</h2>
<ol>
<li>Alarm Messenger öffnen (noch nicht registriert).</li>
<li>Registerkarte <strong>Manuell / Link</strong> wählen.</li>
<li>JSON einfügen oder Registrierungs-URL einfügen.</li>
</ol>
<script>
document.getElementById('copy').addEventListener('click', function() {
  var t = document.getElementById('json');
  t.select();
  document.execCommand('copy');
});
</script>
</body></html>`;
}

router.get('/api/registration/resolve', resolveLimiter, (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(400).json({ error: 'Missing token' });
    return;
  }
  const payload = verifyRegistrationInvite(token);
  if (!payload) {
    res.status(400).json({ error: 'Invalid or expired token' });
    return;
  }
  res.json({ serverUrl: payload.serverUrl, token: payload.deviceToken });
});

router.get('/register', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) {
    res.status(200).type('html').send(registrationHelpHtml());
    return;
  }
  const payload = verifyRegistrationInvite(token);
  if (!payload) {
    res.status(400).type('html').send('<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Ungültig</title></head><body><p>Link ungültig oder abgelaufen.</p></body></html>');
    return;
  }
  const registrationJson = JSON.stringify({
    token: payload.deviceToken,
    serverUrl: payload.serverUrl,
  });
  const serverEnc = encodeURIComponent(payload.serverUrl);
  const tokenEnc = encodeURIComponent(token);
  const deepLinkHref = `alarm-messenger://register?token=${tokenEnc}&server=${serverEnc}`;
  res.status(200).type('html').send(
    registrationPageHtml({
      registrationJson,
      deepLinkHref,
      serverUrl: payload.serverUrl,
    }),
  );
});

export default router;
