# API-Dokumentation

## Inhaltsverzeichnis

- [Basis-URL](#basis-url)
- [Authentifizierung](#authentifizierung)
- [Endpunkte](#endpunkte)
  - [Gesundheitsprüfung](#gesundheitsprüfung)
- [Einsatzverwaltung](#einsatzverwaltung)
  - [Einsatz erstellen](#einsatz-erstellen)
  - [Alle Einsätze abrufen](#alle-einsätze-abrufen)
  - [Einsatz nach ID abrufen](#einsatz-nach-id-abrufen)
  - [Rückmeldung zu Einsatz abgeben](#rückmeldung-zu-einsatz-abgeben)
  - [Einsatz-Teilnehmer abrufen](#einsatz-teilnehmer-abrufen)
  - [Alle Rückmeldungen abrufen](#alle-rückmeldungen-abrufen)
- [Geräteverwaltung](#geräteverwaltung)
  - [Registrierungs-Token generieren](#registrierungs-token-generieren)
  - [Gerät registrieren](#gerät-registrieren)
  - [Alle Geräte abrufen](#alle-geräte-abrufen)
  - [Gerät nach ID abrufen](#gerät-nach-id-abrufen)
  - [Gerät deaktivieren](#gerät-deaktivieren)
- [Integrationsbeispiele](#integrationsbeispiele)
  - [Node.js-Beispiel](#nodejs-beispiel)
  - [Python-Beispiel](#python-beispiel)
  - [cURL-Beispiele](#curl-beispiele)
- [Rate Limiting](#rate-limiting)
- [Fehlerbehandlung](#fehlerbehandlung)
- [Best Practices](#best-practices)

## Basis-URL

```
http://localhost:3000/api
```

Für den Produktivbetrieb ersetzen Sie dies mit Ihrer Server-URL.

## Authentifizierung

Die API verwendet **API-Key-Authentifizierung** für kritische Endpunkte. Für den Produktivbetrieb muss ein sicherer API-Key konfiguriert werden.

**Geschützte Endpunkte erfordern den HTTP-Header:**
```
X-API-Key: ihr-geheimer-api-key
```

**Konfiguration:**
```bash
# In server/.env oder .env (Docker)
API_SECRET_KEY=ihr-geheimer-api-key-hier
```

⚠️ **Wichtig:** Ändern Sie den Standard-API-Key vor dem Produktivbetrieb! Der Server gibt eine Warnung aus und lehnt Anfragen ab, wenn der Standard-Wert in der Produktionsumgebung verwendet wird.

**Weitere Details:** Siehe [AUTHENTIFIZIERUNG.md](AUTHENTIFIZIERUNG.md) für vollständige Dokumentation.

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

🔒 **Authentifizierung erforderlich:** API-Key über `X-API-Key` Header

**Request Header:**
```
Content-Type: application/json
X-API-Key: ihr-geheimer-api-key
```

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
- `401 Unauthorized` - API-Key fehlt oder ist ungültig
- `500 Internal Server Error` - Serverfehler oder API-Key nicht konfiguriert (Produktionsmodus)

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

Ruft alle Geräte ab, die ihre Teilnahme an einem Einsatz bestätigt haben, **inklusive vollständiger Einsatzkraft-Details** (Name, Qualifikationen, Führungsrolle).

**Endpunkt:** `GET /api/emergencies/:id/participants`

🔒 **Authentifizierung erforderlich:** API-Key über `X-API-Key` Header

**Request Header:**
```
X-API-Key: ihr-geheimer-api-key
```

**Antwort:** `200 OK`
```json
{
  "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
  "totalParticipants": 2,
  "participants": [
    {
      "id": "response-uuid-1",
      "deviceId": "device-uuid-1",
      "platform": "android",
      "respondedAt": "2024-12-07T19:02:00.000Z",
      "responder": {
        "firstName": "Max",
        "lastName": "Mustermann",
        "qualifications": {
          "machinist": true,
          "agt": true,
          "paramedic": false
        },
        "leadershipRole": "groupLeader"
      }
    },
    {
      "id": "response-uuid-2",
      "deviceId": "device-uuid-2",
      "platform": "ios",
      "respondedAt": "2024-12-07T19:03:00.000Z",
      "responder": {
        "firstName": "Anna",
        "lastName": "Schmidt",
        "qualifications": {
          "machinist": false,
          "agt": true,
          "paramedic": true
        },
        "leadershipRole": "none"
      }
    }
  ]
}
```

**Fehlerantworten:**
- `401 Unauthorized` - API-Key fehlt oder ist ungültig
- `404 Not Found` - Einsatz nicht gefunden

---

### Alle Rückmeldungen abrufen

Ruft alle Rückmeldungen (sowohl Teilnahme als auch Ablehnung) für einen Einsatz ab, **inklusive vollständiger Einsatzkraft-Details** (Name, Qualifikationen, Führungsrolle).

**Endpunkt:** `GET /api/emergencies/:id/responses`

🔒 **Authentifizierung erforderlich:** API-Key über `X-API-Key` Header

**Request Header:**
```
X-API-Key: ihr-geheimer-api-key
```

**Antwort:** `200 OK`
```json
[
  {
    "id": "response-uuid-1",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-1",
    "platform": "android",
    "participating": true,
    "respondedAt": "2024-12-07T19:02:00.000Z",
    "responder": {
      "firstName": "Max",
      "lastName": "Mustermann",
      "qualifications": {
        "machinist": true,
        "agt": true,
        "paramedic": false
      },
      "leadershipRole": "groupLeader"
    }
  },
  {
    "id": "response-uuid-2",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-2",
    "platform": "ios",
    "participating": false,
    "respondedAt": "2024-12-07T19:03:00.000Z",
    "responder": {
      "firstName": "Anna",
      "lastName": "Schmidt",
      "qualifications": {
        "machinist": false,
        "agt": true,
        "paramedic": true
      },
      "leadershipRole": "none"
    }
  }
]
```

**Fehlerantworten:**
- `401 Unauthorized` - API-Key fehlt oder ist ungültig

**Hinweis:** Für detaillierte Informationen zur Datenstruktur und Integration siehe [RUECKMELDUNGEN-API.md](RUECKMELDUNGEN-API.md).

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
const API_KEY = 'ihr-geheimer-api-key'; // Aus Umgebungsvariablen laden!

// Einsatz erstellen
async function createEmergency() {
  const response = await axios.post(`${API_BASE_URL}/emergencies`, {
    emergencyNumber: '2024-001',
    emergencyDate: new Date().toISOString(),
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  }, {
    headers: {
      'X-API-Key': API_KEY  // API-Key erforderlich!
    }
  });
  
  console.log('Einsatz erstellt:', response.data);
  return response.data.id;
}

// Teilnehmer mit vollständigen Einsatzkraft-Details abrufen
async function getParticipants(emergencyId) {
  const response = await axios.get(
    `${API_BASE_URL}/emergencies/${emergencyId}/participants`,
    {
      headers: {
        'X-API-Key': API_KEY  // API-Key erforderlich!
      }
    }
  );
  
  console.log('Teilnehmer:', response.data);
  
  // Beispiel: Details ausgeben
  response.data.participants.forEach(p => {
    const name = `${p.responder.firstName} ${p.responder.lastName}`;
    const quals = [];
    if (p.responder.qualifications.machinist) quals.push('Maschinist');
    if (p.responder.qualifications.agt) quals.push('AGT');
    if (p.responder.qualifications.paramedic) quals.push('Sanitäter');
    console.log(`${name} (${quals.join(', ')})`);
  });
  
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
import os
from datetime import datetime

API_BASE_URL = 'http://localhost:3000/api'
API_KEY = os.environ.get('API_SECRET_KEY', 'ihr-geheimer-api-key')  # Aus Umgebung laden!

def create_emergency():
    data = {
        'emergencyNumber': '2024-001',
        'emergencyDate': datetime.now().isoformat(),
        'emergencyKeyword': 'BRAND 3',
        'emergencyDescription': 'Wohnungsbrand im 2. OG',
        'emergencyLocation': 'Hauptstraße 123, 12345 Stadt'
    }
    
    headers = {
        'X-API-Key': API_KEY  # API-Key erforderlich!
    }
    
    response = requests.post(
        f'{API_BASE_URL}/emergencies', 
        json=data, 
        headers=headers  # Headers mit API-Key hinzufügen
    )
    response.raise_for_status()
    
    emergency = response.json()
    print('Einsatz erstellt:', emergency)
    return emergency['id']

def get_participants(emergency_id):
    headers = {
        'X-API-Key': API_KEY  # API-Key erforderlich!
    }
    
    response = requests.get(
        f'{API_BASE_URL}/emergencies/{emergency_id}/participants',
        headers=headers
    )
    response.raise_for_status()
    
    data = response.json()
    print(f"Gesamt Teilnehmer: {data['totalParticipants']}")
    
    # Beispiel: Details ausgeben
    for p in data['participants']:
        name = f"{p['responder']['firstName']} {p['responder']['lastName']}"
        quals = []
        if p['responder']['qualifications']['machinist']:
            quals.append('Maschinist')
        if p['responder']['qualifications']['agt']:
            quals.append('AGT')
        if p['responder']['qualifications']['paramedic']:
            quals.append('Sanitäter')
        print(f"{name} ({', '.join(quals)})")
    
    return data['participants']

# Verwendung
emergency_id = create_emergency()
participants = get_participants(emergency_id)
```

### cURL-Beispiele

```bash
# Einsatz erstellen (benötigt API-Key)
curl -X POST http://localhost:3000/api/emergencies \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ihr-geheimer-api-key" \
  -d '{
    "emergencyNumber": "2024-001",
    "emergencyDate": "2024-12-07T19:00:00Z",
    "emergencyKeyword": "BRAND 3",
    "emergencyDescription": "Wohnungsbrand im 2. OG",
    "emergencyLocation": "Hauptstraße 123, 12345 Stadt"
  }'

# Teilnehmer mit vollständigen Einsatzkraft-Details abrufen (benötigt API-Key)
curl http://localhost:3000/api/emergencies/{emergency-id}/participants \
  -H "X-API-Key: ihr-geheimer-api-key"

# Alle Rückmeldungen abrufen (benötigt API-Key)
curl http://localhost:3000/api/emergencies/{emergency-id}/responses \
  -H "X-API-Key: ihr-geheimer-api-key"

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
