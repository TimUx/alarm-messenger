# Rückmeldungen und Einsatzkraft-Details API

## Übersicht

Dieses Dokument beschreibt die Datenstruktur der Rückmeldungen (Responses) und wie externe Systeme wie der **alarm-monitor** mit Authentifizierung auf die Rückmeldungen und detaillierten Einsatzkraft-Informationen zugreifen können.

## Gespeicherte Informationen

### Rückmeldungs-Tabelle (responses)

Die `responses`-Tabelle speichert die grundlegenden Rückmeldungs-Informationen:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID | Eindeutige ID der Rückmeldung |
| `emergency_id` | UUID | Referenz zum Einsatz (Foreign Key) |
| `device_id` | UUID | Referenz zum Gerät/Einsatzkraft (Foreign Key) |
| `participating` | Boolean | Teilnahme (true) oder Absage (false) |
| `responded_at` | ISO 8601 Timestamp | Zeitpunkt der Rückmeldung |

**Wichtig:** Die Rückmeldungs-Tabelle speichert **keine** redundanten Einsatzkraft-Details (Name, Qualifikationen, Führungsrolle). Diese Informationen werden ausschließlich in der `devices`-Tabelle gespeichert.

### Geräte-/Einsatzkraft-Tabelle (devices)

Die `devices`-Tabelle speichert alle detaillierten Informationen zu den Einsatzkräften:

| Feld | Typ | Beschreibung |
|------|-----|--------------|
| `id` | UUID | Eindeutige ID des Geräts/Einsatzkraft |
| `device_token` | String | Geräte-Token vom QR-Code |
| `registration_token` | String | WebSocket-Registrierungs-Token |
| `platform` | String | 'ios' oder 'android' |
| `first_name` | String | Vorname der Einsatzkraft |
| `last_name` | String | Nachname der Einsatzkraft |
| `qual_machinist` | Boolean | Qualifikation: Maschinist |
| `qual_agt` | Boolean | Qualifikation: AGT (Atemschutzgeräteträger) |
| `qual_paramedic` | Boolean | Qualifikation: Sanitäter |
| `leadership_role` | Enum | Führungsrolle: 'none', 'groupLeader', 'platoonLeader' |
| `registered_at` | ISO 8601 Timestamp | Registrierungszeitpunkt |
| `active` | Boolean | Aktiv-Status des Geräts |

### Datenmodell-Vorteile

Durch die Trennung von Rückmeldungen und Einsatzkraft-Details ergeben sich folgende Vorteile:

✅ **Keine Daten-Redundanz**: Einsatzkraft-Informationen werden nur einmal gespeichert  
✅ **Einfache Updates**: Änderungen an Einsatzkraft-Daten (z.B. neue Qualifikation) wirken sich automatisch auf alle Einsätze aus  
✅ **Konsistenz**: Eine einzige "Source of Truth" für Einsatzkraft-Informationen  
✅ **Effizienz**: Geringerer Speicherverbrauch und schnellere Abfragen

## API-Zugriff für alarm-monitor

### Authentifizierung

🔒 **Alle Rückmeldungs-Endpunkte erfordern API-Key-Authentifizierung** zum Schutz sensibler Einsatzkraft-Daten.

Der API-Key muss im HTTP-Header `X-API-Key` übergeben werden:

```bash
X-API-Key: ihr-geheimer-api-key
```

#### Konfiguration

Der API-Key wird in der Server-Umgebungsvariable konfiguriert:

```bash
# In .env Datei
API_SECRET_KEY=ihr-geheimer-api-key-hier
```

**Wichtig:** 
- Verwenden Sie einen starken, zufällig generierten API-Key (mindestens 32 Zeichen)
- Der API-Key kann optional Base64-kodiert werden für zusätzliche Verschleierung
- Der Server erkennt automatisch Base64-kodierte Keys und dekodiert sie
- Ändern Sie den Standard-Key vor dem Produktivbetrieb!

#### API-Key generieren

```bash
# Linux/Mac - Plain-Text
openssl rand -hex 32

# Linux/Mac - Base64-kodiert (empfohlen)
openssl rand -base64 32

# Node.js - Base64-kodiert
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Verschlüsselte Kommunikation

🔐 **HTTPS/TLS ist zwingend erforderlich** für den Produktivbetrieb, um die Vertraulichkeit der Einsatzkraft-Daten zu gewährleisten.

- Verwenden Sie ein gültiges TLS/SSL-Zertifikat (z.B. von Let's Encrypt)
- Konfigurieren Sie den Server mit Caddy oder Nginx als Reverse Proxy
- Siehe [DOCKER.md](DOCKER.md) für Deployment-Anleitungen mit automatischem HTTPS

## API-Endpunkte

### 1. Teilnehmer abrufen

Ruft alle **teilnehmenden** Einsatzkräfte mit vollständigen Details ab.

**Endpunkt:** `GET /api/emergencies/:id/participants`

**Authentifizierung:** API-Key erforderlich (X-API-Key Header)

**Request:**
```bash
curl -X GET https://ihr-server.de/api/emergencies/550e8400-e29b-41d4-a716-446655440000/participants \
  -H "X-API-Key: ihr-geheimer-api-key"
```

**Response:** `200 OK`
```json
{
  "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
  "totalParticipants": 5,
  "participants": [
    {
      "id": "response-uuid-1",
      "deviceId": "device-uuid-1",
      "platform": "android",
      "respondedAt": "2024-12-08T14:05:00.000Z",
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
      "respondedAt": "2024-12-08T14:06:00.000Z",
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

**Response-Felder:**

- `emergencyId`: ID des Einsatzes
- `totalParticipants`: Gesamtzahl der Teilnehmer
- `participants`: Array aller teilnehmenden Einsatzkräfte
  - `id`: ID der Rückmeldung
  - `deviceId`: ID des Geräts
  - `platform`: Plattform ('ios' oder 'android')
  - `respondedAt`: Zeitpunkt der Rückmeldung
  - `responder`: Einsatzkraft-Details
    - `firstName`: Vorname
    - `lastName`: Nachname
    - `qualifications`: Objekt mit Qualifikationen
      - `machinist`: Maschinist (true/false)
      - `agt`: Atemschutzgeräteträger (true/false)
      - `paramedic`: Sanitäter (true/false)
    - `leadershipRole`: Führungsrolle
      - `'none'`: Keine Führungsrolle
      - `'groupLeader'`: Gruppenführer
      - `'platoonLeader'`: Zugführer

### 2. Alle Rückmeldungen abrufen

Ruft **alle** Rückmeldungen (Teilnahme und Absagen) mit vollständigen Einsatzkraft-Details ab.

**Endpunkt:** `GET /api/emergencies/:id/responses`

**Authentifizierung:** API-Key erforderlich (X-API-Key Header)

**Request:**
```bash
curl -X GET https://ihr-server.de/api/emergencies/550e8400-e29b-41d4-a716-446655440000/responses \
  -H "X-API-Key: ihr-geheimer-api-key"
```

**Response:** `200 OK`
```json
[
  {
    "id": "response-uuid-1",
    "emergencyId": "550e8400-e29b-41d4-a716-446655440000",
    "deviceId": "device-uuid-1",
    "platform": "android",
    "participating": true,
    "respondedAt": "2024-12-08T14:05:00.000Z",
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
    "respondedAt": "2024-12-08T14:06:00.000Z",
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

**Response-Felder:**

Alle Felder wie bei `/participants`, zusätzlich:
- `participating`: Boolean - true für Teilnahme, false für Absage

### 3. Einzelnes Gerät/Einsatzkraft abrufen

Falls nur die Details einer spezifischen Einsatzkraft benötigt werden.

**Endpunkt:** `GET /api/devices/:id`

**Authentifizierung:** Keine erforderlich (Read-Only Endpunkt)

**Request:**
```bash
curl -X GET https://ihr-server.de/api/devices/device-uuid-1
```

**Response:** `200 OK`
```json
{
  "id": "device-uuid-1",
  "deviceToken": "generated-uuid",
  "registrationToken": "device-unique-identifier",
  "platform": "android",
  "registeredAt": "2024-12-01T10:00:00.000Z",
  "active": true,
  "firstName": "Max",
  "lastName": "Mustermann",
  "qualifications": {
    "machinist": true,
    "agt": true,
    "paramedic": false
  },
  "leadershipRole": "groupLeader",
  "assignedGroups": ["WIL26", "SWA11"]
}
```

## Integration in alarm-monitor

### JavaScript/TypeScript Beispiel

```javascript
const API_BASE_URL = 'https://ihr-alarm-messenger-server.de/api';
const API_KEY = process.env.ALARM_MESSENGER_API_KEY; // Aus Umgebungsvariablen laden!

/**
 * Erstellt einen neuen Einsatz und löst Alarmierung aus
 */
async function createEmergency(emergencyData) {
  const response = await fetch(`${API_BASE_URL}/emergencies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      emergencyNumber: emergencyData.number,
      emergencyDate: new Date().toISOString(),
      emergencyKeyword: emergencyData.keyword,
      emergencyDescription: emergencyData.description,
      emergencyLocation: emergencyData.location,
      groups: emergencyData.groups // Optional: Comma-separated group codes
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to create emergency: ${response.statusText}`);
  }

  const emergency = await response.json();
  console.log('✓ Einsatz erstellt:', emergency.id);
  return emergency.id;
}

/**
 * Ruft alle teilnehmenden Einsatzkräfte mit vollständigen Details ab
 */
async function getParticipants(emergencyId) {
  const response = await fetch(`${API_BASE_URL}/emergencies/${emergencyId}/participants`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch participants: ${response.statusText}`);
  }

  const data = await response.json();
  return data.participants;
}

/**
 * Ruft alle Rückmeldungen (Teilnahme + Absagen) mit Details ab
 */
async function getAllResponses(emergencyId) {
  const response = await fetch(`${API_BASE_URL}/emergencies/${emergencyId}/responses`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch responses: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Beispiel-Verwendung: Einsatz erstellen und Rückmeldungen verarbeiten
 */
async function handleEmergency() {
  try {
    // 1. Einsatz erstellen
    const emergencyId = await createEmergency({
      number: '2024-042',
      keyword: 'BRAND 3',
      description: 'Wohnungsbrand mit Menschenrettung',
      location: 'Hauptstraße 123, 12345 Musterstadt',
      groups: 'WIL26,SWA11' // Optional: Nur bestimmte Gruppen alarmieren
    });

    // 2. Warten auf Rückmeldungen (z.B. 60 Sekunden)
    await new Promise(resolve => setTimeout(resolve, 60000));

    // 3. Teilnehmer abrufen
    const participants = await getParticipants(emergencyId);
    
    console.log(`\n📊 Einsatz ${emergencyId} - ${participants.length} Teilnehmer:`);
    
    // 4. Teilnehmer-Details anzeigen
    participants.forEach(participant => {
      const { responder } = participant;
      const name = `${responder.firstName} ${responder.lastName}`;
      
      // Qualifikationen formatieren
      const quals = [];
      if (responder.qualifications.machinist) quals.push('Maschinist');
      if (responder.qualifications.agt) quals.push('AGT');
      if (responder.qualifications.paramedic) quals.push('Sanitäter');
      
      // Führungsrolle formatieren
      let leadership = '';
      if (responder.leadershipRole === 'groupLeader') {
        leadership = ' (Gruppenführer)';
      } else if (responder.leadershipRole === 'platoonLeader') {
        leadership = ' (Zugführer)';
      }
      
      console.log(`  • ${name}${leadership} - ${quals.join(', ') || 'Keine Qualifikationen'}`);
      console.log(`    Rückgemeldet: ${new Date(participant.respondedAt).toLocaleString('de-DE')}`);
    });

    // 5. Optional: Alle Rückmeldungen (inkl. Absagen) abrufen
    const allResponses = await getAllResponses(emergencyId);
    const declined = allResponses.filter(r => !r.participating);
    
    if (declined.length > 0) {
      console.log(`\n❌ ${declined.length} Absagen:`);
      declined.forEach(response => {
        const name = `${response.responder.firstName} ${response.responder.lastName}`;
        console.log(`  • ${name}`);
      });
    }

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }
}

// Verwendung
handleEmergency();
```

### Python Beispiel

```python
import requests
import time
from datetime import datetime
from typing import List, Dict, Optional

API_BASE_URL = 'https://ihr-alarm-messenger-server.de/api'
API_KEY = 'ihr-geheimer-api-key'  # In Produktion aus Umgebungsvariablen laden!

class AlarmMessengerClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'X-API-Key': api_key
        }
    
    def create_emergency(self, emergency_data: Dict) -> str:
        """Erstellt einen neuen Einsatz und gibt die Emergency-ID zurück."""
        response = requests.post(
            f'{self.base_url}/emergencies',
            json=emergency_data,
            headers=self.headers
        )
        response.raise_for_status()
        emergency = response.json()
        print(f"✓ Einsatz erstellt: {emergency['id']}")
        return emergency['id']
    
    def get_participants(self, emergency_id: str) -> List[Dict]:
        """Ruft alle teilnehmenden Einsatzkräfte ab."""
        response = requests.get(
            f'{self.base_url}/emergencies/{emergency_id}/participants',
            headers={'X-API-Key': self.headers['X-API-Key']}
        )
        response.raise_for_status()
        data = response.json()
        return data['participants']
    
    def get_all_responses(self, emergency_id: str) -> List[Dict]:
        """Ruft alle Rückmeldungen (Teilnahme + Absagen) ab."""
        response = requests.get(
            f'{self.base_url}/emergencies/{emergency_id}/responses',
            headers={'X-API-Key': self.headers['X-API-Key']}
        )
        response.raise_for_status()
        return response.json()
    
    def format_participant(self, participant: Dict) -> str:
        """Formatiert Teilnehmer-Informationen für die Ausgabe."""
        responder = participant['responder']
        name = f"{responder['firstName']} {responder['lastName']}"
        
        # Qualifikationen
        quals = []
        if responder['qualifications']['machinist']:
            quals.append('Maschinist')
        if responder['qualifications']['agt']:
            quals.append('AGT')
        if responder['qualifications']['paramedic']:
            quals.append('Sanitäter')
        
        # Führungsrolle
        leadership = ''
        if responder['leadershipRole'] == 'groupLeader':
            leadership = ' (Gruppenführer)'
        elif responder['leadershipRole'] == 'platoonLeader':
            leadership = ' (Zugführer)'
        
        quals_str = ', '.join(quals) if quals else 'Keine Qualifikationen'
        responded_at = datetime.fromisoformat(participant['respondedAt'].replace('Z', '+00:00'))
        
        return f"  • {name}{leadership} - {quals_str}\n    Rückgemeldet: {responded_at.strftime('%d.%m.%Y %H:%M:%S')}"

# Verwendung
def main():
    client = AlarmMessengerClient(API_BASE_URL, API_KEY)
    
    # Einsatz erstellen
    emergency_id = client.create_emergency({
        'emergencyNumber': '2024-042',
        'emergencyDate': datetime.now().isoformat(),
        'emergencyKeyword': 'BRAND 3',
        'emergencyDescription': 'Wohnungsbrand mit Menschenrettung',
        'emergencyLocation': 'Hauptstraße 123, 12345 Musterstadt',
        'groups': 'WIL26,SWA11'  # Optional
    })
    
    # Warten auf Rückmeldungen
    print("⏳ Warte auf Rückmeldungen (60 Sekunden)...")
    time.sleep(60)
    
    # Teilnehmer abrufen
    participants = client.get_participants(emergency_id)
    print(f"\n📊 Einsatz {emergency_id} - {len(participants)} Teilnehmer:")
    
    for participant in participants:
        print(client.format_participant(participant))
    
    # Absagen abrufen
    all_responses = client.get_all_responses(emergency_id)
    declined = [r for r in all_responses if not r['participating']]
    
    if declined:
        print(f"\n❌ {len(declined)} Absagen:")
        for response in declined:
            name = f"{response['responder']['firstName']} {response['responder']['lastName']}"
            print(f"  • {name}")

if __name__ == '__main__':
    main()
```

## Fehlerbehandlung

### Authentifizierungsfehler

**Fehlender oder ungültiger API-Key:**
```json
HTTP 401 Unauthorized
{
  "error": "Invalid or missing API key"
}
```

**Lösung:** Überprüfen Sie, dass der API-Key korrekt im `X-API-Key` Header übergeben wird und mit der Server-Konfiguration übereinstimmt.

### Ressourcen-Fehler

**Einsatz nicht gefunden:**
```json
HTTP 404 Not Found
{
  "error": "Emergency not found"
}
```

**Lösung:** Überprüfen Sie, dass die Emergency-ID korrekt ist und der Einsatz existiert.

### Rate Limiting

```json
HTTP 429 Too Many Requests
{
  "error": "Too many requests"
}
```

**Limit:** 100 Anfragen pro 15 Minuten pro IP-Adresse

**Lösung:** Implementieren Sie exponentielles Backoff und reduzieren Sie die Anzahl der Anfragen.

## Sicherheits-Best-Practices

### 1. HTTPS verwenden

✅ **Immer HTTPS im Produktivbetrieb verwenden**
- Verhindert Man-in-the-Middle-Angriffe
- Schützt API-Keys vor Abfangen
- Verschlüsselt sensible Einsatzkraft-Daten

### 2. API-Keys sicher aufbewahren

✅ **Sichere Speicherung von API-Keys**
- Nie in Git committen oder im Code hardcoden
- Umgebungsvariablen oder Secret-Management verwenden
- Regelmäßig rotieren, besonders nach Verdacht auf Kompromittierung

```bash
# .env Datei (nicht in Git!)
ALARM_MESSENGER_API_KEY=ihr-geheimer-api-key

# Optional: Base64-kodiert für zusätzliche Verschleierung
ALARM_MESSENGER_API_KEY=aWhyLWdlaGVpbWVyLWFwaS1rZXk=
```

### 3. Fehlerbehandlung implementieren

✅ **Robuste Fehlerbehandlung**
- Alle API-Aufrufe in try-catch-Blöcke einbinden
- HTTP-Statuscodes prüfen
- Wiederholungslogik mit exponentiellen Backoff
- Benutzerfreundliche Fehlermeldungen anzeigen

### 4. Logging und Monitoring

✅ **Audit-Trail erstellen**
- API-Aufrufe protokollieren
- Fehler und Exceptions loggen
- Performance-Metriken überwachen
- Anomalien erkennen und alarmieren

### 5. Zugriffskontrolle

✅ **Minimale Berechtigungen**
- Separate API-Keys für verschiedene Systeme/Umgebungen
- Keys nur mit notwendigen Berechtigungen ausstatten
- Zugriff auf .env-Dateien beschränken

## Datenmodell-Diagramm

```
┌─────────────────────────────────┐
│     emergencies (Einsätze)      │
│                                 │
│  • id (PK)                      │
│  • emergency_number             │
│  • emergency_date               │
│  • emergency_keyword            │
│  • emergency_description        │
│  • emergency_location           │
│  • groups                       │
│  • created_at                   │
│  • active                       │
└────────────┬────────────────────┘
             │
             │ 1:N
             │
             ▼
┌─────────────────────────────────┐
│    responses (Rückmeldungen)    │
│                                 │
│  • id (PK)                      │
│  • emergency_id (FK) ───────────┘
│  • device_id (FK) ──────────┐
│  • participating            │
│  • responded_at             │
└─────────────────────────────┘
                               │
                               │ N:1
                               │
                               ▼
              ┌────────────────────────────────┐
              │   devices (Geräte/Kräfte)      │
              │                                │
              │  • id (PK)                     │
              │  • device_token                │
              │  • registration_token          │
              │  • platform                    │
              │  • first_name                  │
              │  • last_name                   │
              │  • qual_machinist              │
              │  • qual_agt                    │
              │  • qual_paramedic              │
              │  • leadership_role             │
              │  • registered_at               │
              │  • active                      │
              └────────────────────────────────┘
```

## Zusammenfassung

### Gespeicherte Informationen

1. **Rückmeldungs-Tabelle** speichert nur:
   - Rückmeldungs-ID
   - Referenz zum Einsatz
   - Referenz zum Gerät/Einsatzkraft
   - Teilnahme-Status (ja/nein)
   - Zeitpunkt der Rückmeldung

2. **Geräte-Tabelle** speichert Einsatzkraft-Details:
   - Name (Vorname, Nachname)
   - Qualifikationen (Maschinist, AGT, Sanitäter)
   - Führungsrolle (Gruppenführer, Zugführer, keine)
   - Gruppenzuordnungen

### API-Zugriff für alarm-monitor

✅ **GET /api/emergencies/:id/participants** - Teilnehmer mit vollständigen Details  
✅ **GET /api/emergencies/:id/responses** - Alle Rückmeldungen mit vollständigen Details  
🔒 **Authentifizierung:** API-Key erforderlich (X-API-Key Header)  
🔐 **Verschlüsselung:** HTTPS/TLS zwingend im Produktivbetrieb  

### Vorteile

✅ Keine Daten-Redundanz  
✅ Einfache Aktualisierung von Einsatzkraft-Daten  
✅ Konsistente Datenhaltung  
✅ Sichere Authentifizierung und Verschlüsselung  
✅ Flexibler Zugriff über verschiedene API-Endpunkte  

## Siehe auch

- [API.md](API.md) - Vollständige API-Dokumentation
- [AUTHENTIFIZIERUNG.md](AUTHENTIFIZIERUNG.md) - Authentifizierungs-Details
- [BASE64-SECRETS.md](BASE64-SECRETS.md) - Base64-Kodierung für Secrets
- [DOCKER.md](DOCKER.md) - Deployment mit HTTPS/TLS
