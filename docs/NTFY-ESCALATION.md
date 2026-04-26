# NTFY Escalation (Stage 2)

Dieses Dokument beschreibt den Betrieb der Stage-2-Eskalation via eigener `ntfy`-Instanz.

## Zielbild

- **Stage 1:** Sofortige Alarmierung via WebSocket.
- **Stage 2:** Wenn nach `NTFY_STAGE2_DELAY_SECONDS` keine Rückmeldung vorliegt, wird zusätzlich eine Nachricht via `ntfy` gesendet.
- **Kein Stage 3:** Nach den konfigurierten Retry-Versuchen endet die Eskalation in `failed_final`.

## Server-Konfiguration

Setzen Sie in `server/.env`:

```env
ENABLE_NTFY_ESCALATION=true
NTFY_BASE_URL=https://ntfy.example.com

# Auth (eine Variante verwenden)
NTFY_AUTH_TOKEN=
NTFY_USERNAME=
NTFY_PASSWORD=

NTFY_TOPIC_TEMPLATE=alarm-{deviceId}
NTFY_STAGE2_DELAY_SECONDS=25
NTFY_RETRY_SCHEDULE_SECONDS=20,60
NTFY_CHECK_INTERVAL_MS=5000
NTFY_PRIORITY=5
NTFY_TAGS=rotating_light,fire_engine
NTFY_TEST_COOLDOWN_MS=30000
```

## Device-Provisioning (Admin UI)

In `Admin -> Einsatzkräfte` kann pro Gerät über das Glocken-Symbol (`🔔`) die ntfy-Subscription geöffnet werden:

- Topic anzeigen/kopieren
- Subscribe-Link anzeigen/kopieren
- QR-Code anzeigen/herunterladen
- Testversand über `🧪` direkt aus der Geräteliste

Zusätzlich zeigt die Geräteliste ein ntfy-Status-Badge pro Gerät:

- `ntfy bereit`: Provisioning-Link/Topic erfolgreich erzeugbar
- `ntfy aus`: Server nicht für ntfy konfiguriert
- `ntfy Fehler`: Provisioning-Check fehlgeschlagen

Der Testversand ist serverseitig gedrosselt (Standard: 30s pro Admin+Gerät).

Die Topic-Erzeugung erfolgt über `NTFY_TOPIC_TEMPLATE` (Standard: `alarm-{deviceId}`).

## Empfohlene ntfy-Härtung

- Immer TLS erzwingen.
- Topic-Zugriff absichern (Token oder Benutzer/Passwort).
- Keine sensitiven Einsatzdetails in ntfy transportieren, nur das Notwendige.
- Volldetails weiterhin aus der Alarm-Messenger-API laden.

## Retry-/Statuslogik

- Stage-2-Trigger nach `NTFY_STAGE2_DELAY_SECONDS`
- Retries gemäß `NTFY_RETRY_SCHEDULE_SECONDS`
- Status in `notification_outbox`:
  - `pending`
  - `delivered`
  - `failed`
  - `failed_final`

## Monitoring

Abrufbar über:

- `GET /api/info/dispatch-metrics` (Admin-Session erforderlich)

Zusätzliche Stage-2-KPIs:

- `delivery.ntfyStage2Triggered`
- `delivery.ntfySuccess`
- `delivery.ntfyFailed`
