# API-Dokumentation

## Basis-URL

```
http://localhost:3000/api
```

Für den Produktivbetrieb ersetzen Sie dies mit Ihrer Server-URL.

## Authentifizierung

Derzeit erfordert die API keine Authentifizierung. Für den Produktivbetrieb implementieren Sie API-Keys oder OAuth2.

## Endpunkte

### Gesundheitsprüfung

Prüfen, ob der Server läuft.

**Endpunkt:** `GET /health`

**Antwort:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-07T19:00:00.000Z"
}
```

---

## Einsatzverwaltung

### Einsatz erstellen

Erstellt einen neuen Einsatz und löst Push-Benachrichtigungen an alle registrierten Geräte aus.

**Endpunkt:** `POST /api/emergencies`

**Request Body:**
```json
{
  "emergencyNumber": "2024-001",
  "emergencyDate": "2024-12-07T19:00:00Z",
  "emergencyKeyword": "BRAND 3",
  "emergencyDescription": "Wohnungsbrand im 2. OG, Menschenrettung",
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt"
}
```

**Antwort:** `201 Created`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "emergencyNumber": "2024-001",
  "emergencyDate": "2024-12-07T19:00:00Z",
  "emergencyKeyword": "BRAND 3",
  "emergencyDescription": "Wohnungsbrand im 2. OG, Menschenrettung",
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
  "createdAt": "2024-12-07T19:00:00.000Z",
  "active": true
}
```

**Fehlerantworten:**
- `400 Bad Request` - Erforderliche Felder fehlen
- `500 Internal Server Error` - Serverfehler

---

### Alle Einsätze abrufen

Ruft alle Einsätze sortiert nach Erstellungsdatum ab (neueste zuerst).

**Endpunkt:** `GET /api/emergencies`

**Antwort:** `200 OK`
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "emergencyNumber": "2024-001",
    "emergencyDate": "2024-12-07T19:00:00Z",
    "emergencyKeyword": "BRAND 3",
    "emergencyDescription": "Wohnungsbrand im 2. OG",
    "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
    "createdAt": "2024-12-07T19:00:00.000Z",
    "active": true
  }
]
```

---

### Einsatz nach ID abrufen

Ruft einen spezifischen Einsatz ab.

**Endpunkt:** `GET /api/emergencies/:id`

**Antwort:** `200 OK`
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "emergencyNumber": "2024-001",
  "emergencyDate": "2024-12-07T19:00:00Z",
  "emergencyKeyword": "BRAND 3",
  "emergencyDescription": "Wohnungsbrand im 2. OG",
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
  "createdAt": "2024-12-07T19:00:00.000Z",
  "active": true
}
```

**Fehlerantworten:**
- `404 Not Found` - Einsatz nicht gefunden

---

### Rückmeldung zu Einsatz abgeben

Sendet die Rückmeldung eines Geräts (Teilnahme oder Ablehnung) zu einem Einsatz.

**Endpunkt:** `POST /api/emergencies/:id/responses`

**Request Body:**
```json
{
  "deviceId": "device-uuid",
  "participating": true
}
```

**Antwort:** `201 Created`
```json
{
  "id": "response-uuid",
  "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
  "deviceId": "device-uuid",
  "participating": true,
  "respondedAt": "2024-12-07T19:05:00.000Z"
}
```

**Fehlerantworten:**
- `400 Bad Request` - Erforderliche Felder fehlen
- `404 Not Found` - Einsatz oder Gerät nicht gefunden

---

### Einsatz-Teilnehmer abrufen

Ruft alle Geräte ab, die ihre Teilnahme an einem Einsatz bestätigt haben.

**Endpunkt:** `GET /api/emergencies/:id/participants`

**Antwort:** `200 OK`
```json
{
  "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
  "totalParticipants": 5,
  "participants": [
    {
      "id": "response-uuid-1",
      "deviceId": "device-uuid-1",
      "platform": "android",
      "respondedAt": "2024-12-07T19:02:00.000Z"
    },
    {
      "id": "response-uuid-2",
      "deviceId": "device-uuid-2",
      "platform": "ios",
      "respondedAt": "2024-12-07T19:03:00.000Z"
    }
  ]
}
```

**Fehlerantworten:**
- `404 Not Found` - Einsatz nicht gefunden

---

### Alle Rückmeldungen abrufen

Ruft alle Rückmeldungen (sowohl Teilnahme als auch Ablehnung) für einen Einsatz ab.

**Endpunkt:** `GET /api/emergencies/:id/responses`

**Antwort:** `200 OK`
```json
[
  {
    "id": "response-uuid-1",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-1",
    "platform": "android",
    "participating": true,
    "respondedAt": "2024-12-07T19:02:00.000Z"
  },
  {
    "id": "response-uuid-2",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-2",
    "platform": "ios",
    "participating": false,
    "respondedAt": "2024-12-07T19:03:00.000Z"
  }
]
```

---

## Geräteverwaltung

### Registrierungs-Token generieren

Generiert einen QR-Code für die Geräteregistrierung.

**Endpunkt:** `POST /api/devices/registration-token`

**Antwort:** `200 OK`
```json
{
  "deviceToken": "generated-uuid",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "registrationData": {
    "token": "generated-uuid",
    "serverUrl": "http://localhost:3000"
  }
}
```

---

### Gerät registrieren

Registriert ein mobiles Gerät beim Server.

**Endpunkt:** `POST /api/devices/register`

**Request Body:**
```json
{
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android"
}
```

**Parameter:**
- `deviceToken` - Token vom QR-Code
- `registrationToken` - Eindeutige Geräte-ID für WebSocket-Verbindung
- `platform` - Entweder "ios" oder "android"

**Antwort:** `201 Created` (oder `200 OK` bei Aktualisierung eines existierenden)
```json
{
  "id": "device-uuid",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-07T19:00:00.000Z",
  "active": true
}
```

**Fehlerantworten:**
- `400 Bad Request` - Erforderliche Felder fehlen oder ungültige Plattform

---

### Alle Geräte abrufen

Ruft alle registrierten und aktiven Geräte ab.

**Endpunkt:** `GET /api/devices`

**Antwort:** `200 OK`
```json
[
  {
    "id": "device-uuid",
    "deviceToken": "generated-uuid",
    "registrationToken": "device-unique-identifier",
    "platform": "android",
    "registeredAt": "2024-12-07T19:00:00.000Z",
    "active": true
  }
]
```

---

### Gerät nach ID abrufen

Ruft ein spezifisches Gerät ab.

**Endpunkt:** `GET /api/devices/:id`

**Antwort:** `200 OK`
```json
{
  "id": "device-uuid",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-07T19:00:00.000Z",
  "active": true
}
```

**Fehlerantworten:**
- `404 Not Found` - Gerät nicht gefunden

---

### Gerät deaktivieren

Deaktiviert ein registriertes Gerät (Soft Delete).

**Endpunkt:** `DELETE /api/devices/:id`

**Antwort:** `200 OK`
```json
{
  "message": "Device deactivated successfully"
}
```

**Fehlerantworten:**
- `404 Not Found` - Gerät nicht gefunden

---

## Integrationsbeispiele

### Node.js-Beispiel

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// Einsatz erstellen
async function createEmergency() {
  const response = await axios.post(`${API_BASE_URL}/emergencies`, {
    emergencyNumber: '2024-001',
    emergencyDate: new Date().toISOString(),
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  });
  
  console.log('Einsatz erstellt:', response.data);
  return response.data.id;
}

// Teilnehmer abrufen
async function getParticipants(emergencyId) {
  const response = await axios.get(
    `${API_BASE_URL}/emergencies/${emergencyId}/participants`
  );
  
  console.log('Teilnehmer:', response.data);
  return response.data.participants;
}

// Verwendung
(async () => {
  const emergencyId = await createEmergency();
  // Etwas Zeit für Rückmeldungen warten...
  setTimeout(async () => {
    const participants = await getParticipants(emergencyId);
  }, 60000);
})();
```

### Python-Beispiel

```python
import requests
import json
from datetime import datetime

API_BASE_URL = 'http://localhost:3000/api'

def create_emergency():
    data = {
        'emergencyNumber': '2024-001',
        'emergencyDate': datetime.now().isoformat(),
        'emergencyKeyword': 'BRAND 3',
        'emergencyDescription': 'Wohnungsbrand im 2. OG',
        'emergencyLocation': 'Hauptstraße 123, 12345 Stadt'
    }
    
    response = requests.post(f'{API_BASE_URL}/emergencies', json=data)
    response.raise_for_status()
    
    emergency = response.json()
    print('Einsatz erstellt:', emergency)
    return emergency['id']

def get_participants(emergency_id):
    response = requests.get(
        f'{API_BASE_URL}/emergencies/{emergency_id}/participants'
    )
    response.raise_for_status()
    
    data = response.json()
    print(f"Gesamt Teilnehmer: {data['totalParticipants']}")
    return data['participants']

# Verwendung
emergency_id = create_emergency()
participants = get_participants(emergency_id)
```

### cURL-Beispiele

```bash
# Einsatz erstellen
curl -X POST http://localhost:3000/api/emergencies \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyNumber": "2024-001",
    "emergencyDate": "2024-12-07T19:00:00Z",
    "emergencyKeyword": "BRAND 3",
    "emergencyDescription": "Wohnungsbrand im 2. OG",
    "emergencyLocation": "Hauptstraße 123, 12345 Stadt"
  }'

# Teilnehmer abrufen
curl http://localhost:3000/api/emergencies/{emergency-id}/participants

# Registrierungs-QR-Code generieren
curl -X POST http://localhost:3000/api/devices/registration-token

# Alle Geräte abrufen
curl http://localhost:3000/api/devices
```

## Rate Limiting

Die API implementiert Rate Limiting:
- **Limit:** 100 Anfragen pro 15 Minuten pro IP-Adresse
- **Antwort bei Überschreitung:** `429 Too Many Requests`

## Fehlerbehandlung

Alle Fehler folgen diesem Format:

```json
{
  "error": "Fehlerbeschreibung"
}
```

Häufige HTTP-Statuscodes:
- `200 OK` - Erfolgreiche GET-Anfrage
- `201 Created` - Erfolgreiche POST-Anfrage
- `400 Bad Request` - Ungültige Anfragedaten
- `404 Not Found` - Ressource nicht gefunden
- `429 Too Many Requests` - Rate Limit überschritten
- `500 Internal Server Error` - Serverfehler

## Webhooks (Zukünftige Funktion)

In zukünftigen Versionen kann das System Webhooks unterstützen, um externe Systeme über Ereignisse zu benachrichtigen:
- Neuer Einsatz erstellt
- Gerät registriert
- Rückmeldung abgegeben

## Best Practices

1. **Antworten immer validieren** - HTTP-Statuscodes vor der Verarbeitung prüfen
2. **Fehler elegant behandeln** - Wiederholungslogik für Netzwerkfehler implementieren
3. **HTTPS im Produktivbetrieb verwenden** - Niemals sensible Daten über HTTP übertragen
4. **Authentifizierung implementieren** - API-Keys für Produktivbetrieb hinzufügen
5. **Rate Limits überwachen** - Exponentielles Backoff implementieren bei Rate Limiting
6. **Alle API-Aufrufe protokollieren** - Für Debugging und Audit-Zwecke
