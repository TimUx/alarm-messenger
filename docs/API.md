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
  - [Geräte-Details mit Gruppen abrufen](#geräte-details-mit-gruppen-abrufen)
  - [Push-Token aktualisieren](#push-token-aktualisieren)
  - [Gerät deaktivieren](#gerät-deaktivieren)
- [Server-Informationen](#server-informationen)
  - [Server-Info abrufen](#server-info-abrufen)
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
  "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
  "groups": "WIL26,SWA11"
}
```

**Parameter:**
- `emergencyNumber`, `emergencyDate`, `emergencyKeyword`, `emergencyDescription`, `emergencyLocation` – Pflichtfelder
- `groups` – Optional: Kommagetrennte Liste von Gruppen-Codes. Wenn angegeben, werden nur Geräte der genannten Gruppen benachrichtigt. Ohne dieses Feld werden alle aktiven Geräte benachrichtigt.

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
  "active": true,
  "groups": "WIL26,SWA11"
}
```

**Fehlerantworten:**
- `400 Bad Request` - Erforderliche Felder fehlen oder ungültige Zeichen im `groups`-Parameter
- `401 Unauthorized` - API-Key fehlt oder ist ungültig
- `409 Conflict` - Ein aktiver Einsatz mit dieser Nummer existiert bereits
- `500 Internal Server Error` - Serverfehler oder API-Key nicht konfiguriert (Produktionsmodus)

---

### Alle Einsätze abrufen

Ruft alle Einsätze sortiert nach Erstellungsdatum ab (neueste zuerst). Standardmäßig werden nur aktive Einsätze zurückgegeben.

**Endpunkt:** `GET /api/emergencies`

🔒 **Authentifizierung erforderlich:** Device-Token über `X-Device-Token` Header

**Request Header:**
```
X-Device-Token: ihr-geräte-token
```

**Query-Parameter (optional):**
- `page` – Seite (Standard: 1)
- `limit` – Einträge pro Seite (Standard: 50, max. 200)
- `includeInactive=true` – Auch abgeschlossene Einsätze einschließen
- `emergencyNumber` – Einsätze nach Einsatznummer filtern

**Antwort:** `200 OK`
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "emergencyNumber": "2024-001",
      "emergencyDate": "2024-12-07T19:00:00Z",
      "emergencyKeyword": "BRAND 3",
      "emergencyDescription": "Wohnungsbrand im 2. OG",
      "emergencyLocation": "Hauptstraße 123, 12345 Stadt",
      "createdAt": "2024-12-07T19:00:00.000Z",
      "active": true,
      "groups": null
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

**Fehlerantworten:**
- `401 Unauthorized` - Device-Token fehlt oder ist ungültig

---

### Einsatz nach ID abrufen

Ruft einen spezifischen Einsatz ab.

**Endpunkt:** `GET /api/emergencies/:id`

🔒 **Authentifizierung erforderlich:** Device-Token über `X-Device-Token` Header

**Request Header:**
```
X-Device-Token: ihr-geräte-token
```

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
  "active": true,
  "groups": null
}
```

**Fehlerantworten:**
- `401 Unauthorized` - Device-Token fehlt oder ist ungültig
- `404 Not Found` - Einsatz nicht gefunden

---

### Rückmeldung zu Einsatz abgeben

Sendet die Rückmeldung eines Geräts (Teilnahme oder Ablehnung) zu einem Einsatz.

**Endpunkt:** `POST /api/emergencies/:id/responses`

🔒 **Authentifizierung erforderlich:** Device-Token über `X-Device-Token` Header

**Request Header:**
```
Content-Type: application/json
X-Device-Token: ihr-geräte-token
```

**Request Body:**
```json
{
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
- `401 Unauthorized` - Device-Token fehlt oder ist ungültig
- `404 Not Found` - Einsatz nicht gefunden

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

🔒 **Authentifizierung erforderlich:** Admin-Session (`connect.sid`) + CSRF-Header `X-CSRF-Token`

**Antwort:** `200 OK`
```json
{
  "deviceToken": "generated-uuid",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "registrationData": {
    "token": "generated-uuid",
    "serverUrl": "http://localhost:3000"
  },
  "registrationLink": "http://localhost:3000/register?token=…"
}
```

- `registrationLink` – Öffnet eine Hilfsseite mit Kopier-JSON und Deep-Link `alarm-messenger://register?…` für die Mobile-App (JWT, typischerweise 48h gültig).

---

### Registrierungs-Einladung per E-Mail

Erzeugt wie der QR-Endpunkt ein vorgemerktes Gerät **oder** versendet die Einladung erneut für ein **bereits** erzeugtes `deviceToken`.

**Endpunkt:** `POST /api/devices/registration-token/email`

🔒 **Authentifizierung erforderlich:** Admin-Session + CSRF-Header `X-CSRF-Token`

**Request Body:**
```json
{
  "email": "einsatzkraft@feuerwehr.example",
  "deviceToken": "optional-uuid-wenn-bereits-generiert"
}
```

- Ohne `deviceToken`: neues pending Device wie `POST /api/devices/registration-token`, plus E-Mail-Versuch.
- Mit `deviceToken`: gleiches Gerät; nützlich, um nach QR-Erzeugung nur die E-Mail nachzusenden.

**Antwort:** `200 OK` — wie Token-Generierung, zusätzlich:
```json
{
  "email": { "sent": true }
}
```
Ist SMTP nicht konfiguriert, ist `sent` false (`reason`: `smtp_not_configured`); `registrationLink` und `registrationData` sind trotzdem nutzbar.

**Fehler:** `400` (ungültige E-Mail), `404` (unbekanntes `deviceToken` oder bereits aktiv), `410` (Einladung abgelaufen).

---

### Einladungs-JWT auflösen (öffentlich)

Liefert die gleichen Daten wie im QR-JSON, ohne Admin-Session. Zum Aufruf aus der Mobile-App nach Link/E-Mail.

**Endpunkt:** `GET /api/registration/resolve?token=<jwt>`

**Antwort:** `200 OK`
```json
{
  "serverUrl": "https://alarm.example",
  "token": "generated-uuid"
}
```

**Fehler:** `400` (fehlend/ungültig/abgelaufen).

---

### Registrierungs-Webseite (Browser)

**Endpunkt:** `GET /register?token=<jwt>`

HTML-Hilfeseite: kopierbares JSON, Link „In der App öffnen“. Ohne `token`: statische Kurzinfo.

---

### Gerät registrieren

Registriert ein mobiles Gerät beim Server. Der `deviceToken` muss zuvor über den Endpunkt `POST /api/devices/registration-token` generiert worden sein.

**Endpunkt:** `POST /api/devices/register`

**Request Body:**
```json
{
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "firstName": "Max",
  "lastName": "Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": false
  },
  "leadershipRole": "none",
  "fcmToken": "firebase-cloud-messaging-token",
  "apnsToken": "apple-push-notification-token"
}
```

**Parameter:**
- `deviceToken` – Token vom QR-Code (Pflichtfeld)
- `registrationToken` – Eindeutige Geräte-ID für WebSocket-Verbindung (Pflichtfeld)
- `platform` – `"ios"`, `"android"` oder `"linux"` (Pflichtfeld; Linux-Desktop-Clients)
- `firstName`, `lastName` – Optionaler Name der Einsatzkraft
- `qualifications` – Optionale Qualifikationen (`machinist`, `agt`, `paramedic`)
- `leadershipRole` – Optionale Führungsrolle: `"none"`, `"groupLeader"`, `"commandLeader"`
- `fcmToken` – Optionaler Firebase Cloud Messaging Token (Android Push-Benachrichtigungen)
- `apnsToken` – Optionaler Apple Push Notification Service Token (iOS Push-Benachrichtigungen)

**Antwort:** `200 OK`
```json
{
  "id": "device-uuid",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-07T19:00:00.000Z",
  "active": true,
  "firstName": "Max",
  "lastName": "Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": false
  },
  "leadershipRole": "none"
}
```

**Fehlerantworten:**
- `400 Bad Request` - Erforderliche Felder fehlen oder ungültige Plattform
- `403 Forbidden` - Ungültiger, abgelaufener oder bereits aktiver Token

---

### Alle Geräte abrufen

Ruft alle registrierten und aktiven Geräte ab.

**Endpunkt:** `GET /api/devices`

🔒 **Authentifizierung erforderlich:** Admin-Session (`connect.sid`)

**Antwort:** `200 OK`
```json
{
  "data": [
    {
      "id": "device-uuid",
      "platform": "android",
      "registeredAt": "2024-12-07T19:00:00.000Z",
      "active": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### Gerät nach ID abrufen

Ruft ein spezifisches Gerät ab.

**Endpunkt:** `GET /api/devices/:id`

🔒 **Authentifizierung erforderlich:** Device-Token über `X-Device-Token` Header

**Wichtig:** Ein Gerät darf nur seine **eigene** ID abfragen.

**Antwort:** `200 OK`
```json
{
  "id": "device-uuid",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-07T19:00:00.000Z",
  "active": true,
  "firstName": "Max",
  "lastName": "Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": false,
    "paramedic": true
  },
  "leadershipRole": "groupLeader",
  "assignedGroups": ["WIL26", "SWA11"]
}
```

**Fehlerantworten:**
- `403 Forbidden` - Zugriff auf fremdes Gerät nicht erlaubt
- `404 Not Found` - Gerät nicht gefunden

---

### Geräte-Details mit Gruppen abrufen

Ruft ein spezifisches Gerät mit vollständigen Gruppeninformationen ab.

**Endpunkt:** `GET /api/devices/:id/details`

🔒 **Authentifizierung erforderlich:** Device-Token über `X-Device-Token` Header

**Wichtig:** Ein Gerät darf nur seine **eigenen** Details abrufen.

**Antwort:** `200 OK`
```json
{
  "device": {
    "id": "device-uuid",
    "deviceToken": "generated-uuid",
    "registrationToken": "device-unique-identifier",
    "platform": "android",
    "registeredAt": "2024-12-07T19:00:00.000Z",
    "active": true,
    "firstName": "Max",
    "lastName": "Mustermann",
    "qualifications": {
      "machinist": true,
      "agt": false,
      "paramedic": true
    },
    "leadershipRole": "groupLeader",
    "assignedGroups": ["WIL26", "SWA11"]
  },
  "assignedGroups": [
    {
      "code": "WIL26",
      "name": "Willisau 26",
      "description": "Hauptlöschzug Willisau",
      "createdAt": "2024-12-07T19:00:00.000Z"
    },
    {
      "code": "SWA11",
      "name": "Sursee WA 11",
      "description": "Wasserrettung Sursee",
      "createdAt": "2024-12-07T19:00:00.000Z"
    }
  ]
}
```

**Fehlerantworten:**
- `403 Forbidden` - Zugriff auf fremdes Gerät nicht erlaubt
- `404 Not Found` - Gerät nicht gefunden

---

### Push-Token aktualisieren

Aktualisiert den FCM- oder APNs-Push-Token eines registrierten Geräts (z. B. nach App-Update oder Token-Rotation).

**Endpunkt:** `POST /api/devices/update-push-token`

🔒 **Authentifizierung erforderlich:** Device-Token über `X-Device-Token` Header

**Request Header:**
```
Content-Type: application/json
X-Device-Token: ihr-geräte-token
```

**Request Body:**
```json
{
  "deviceToken": "generated-uuid",
  "fcmToken": "neuer-firebase-token"
}
```

**Parameter:**
- `deviceToken` – Device-Token (Pflichtfeld)
- `fcmToken` – Neuer FCM-Token (Android; optional, wenn `apnsToken` angegeben)
- `apnsToken` – Neuer APNs-Token (iOS; optional, wenn `fcmToken` angegeben)

**Wichtig:** Der `deviceToken` muss zum übergebenen `X-Device-Token` gehören. Geräte dürfen nur ihre eigenen Push-Tokens aktualisieren.

**Antwort:** `200 OK`
```json
{
  "message": "Push token updated successfully"
}
```

**Fehlerantworten:**
- `400 Bad Request` - `deviceToken` fehlt oder weder `fcmToken` noch `apnsToken` angegeben
- `401 Unauthorized` - `X-Device-Token` Header fehlt oder ungültig
- `403 Forbidden` - `deviceToken` gehört zu einem anderen Gerät
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

## Server-Informationen

### Server-Info abrufen

Ruft allgemeine Server-Informationen ab (Organisationsname, Version, Server-URL).

**Endpunkt:** `GET /api/info`

**Antwort:** `200 OK`
```json
{
  "organizationName": "Feuerwehr Musterstadt",
  "serverVersion": "1.0.0",
  "serverUrl": "https://alarm.example.com"
}
```

**Verwendung:**

Diese Informationen können in der Mobile App angezeigt werden, um dem Benutzer zu zeigen:
- Welche Organisation/Feuerwehr den Server betreibt
- Welche Server-Version installiert ist
- Welche Server-URL verwendet wird

**Konfiguration:**

Der Organisationsname kann in der `.env` Datei konfiguriert werden:
```bash
ORGANIZATION_NAME=Feuerwehr Musterstadt
```

Falls nicht gesetzt, wird "Alarm Messenger" als Standard verwendet.

---

### Dispatch-Metriken abrufen

Ruft Laufzeitmetriken für Benachrichtigungs-Dispatch und Outbox-Status ab.

**Endpunkt:** `GET /api/info/dispatch-metrics`

🔒 **Authentifizierung erforderlich:** Admin-Session (`connect.sid`)

**Antwort:** `200 OK`
```json
{
  "dispatch": {
    "total": 42,
    "averageDurationMs": 187,
    "lastDispatchAt": "2026-04-24T12:34:56.000Z"
  },
  "delivery": {
    "pushSuccess": 120,
    "pushFailed": 3,
    "websocketSuccess": 87,
    "websocketFailed": 14
  },
  "outbox": {
    "pending": 0,
    "delivered": 203,
    "failed": 17
  }
}
```

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
