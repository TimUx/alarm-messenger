# Authentifizierung im Alarm Messenger System

Dieses Dokument erklärt die Authentifizierungsmechanismen im Alarm Messenger System für beide Anwendungsfälle: Mobile App und Einsatzerstellung.

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Authentifizierungsmechanismen](#authentifizierungsmechanismen)
  - [API-Key-Authentifizierung](#1-api-key-authentifizierung-für-einsatzerstellung)
  - [JWT-Token-Authentifizierung](#2-jwt-token-authentifizierung-für-admin-interface)
  - [Device-Token-Authentifizierung](#3-device-token-authentifizierung-für-mobile-app)
- [Implementierungsdetails](#implementierungsdetails)
- [Sicherheitshinweise](#sicherheitshinweise)
- [Best Practices](#best-practices)

## Übersicht

Das Alarm Messenger System **verwendet bereits Authentifizierung** für kritische Endpunkte. Die Authentifizierung ist vollständig implementiert und sollte im Produktivbetrieb verwendet werden.

## Authentifizierungsmechanismen

Das System verwendet **zwei verschiedene Authentifizierungsmechanismen** für unterschiedliche Anwendungsfälle:

### 1. API-Key-Authentifizierung (für Einsatzerstellung)

**Verwendungszweck:** Externe Systeme (z.B. alarm-monitor), die Einsätze erstellen möchten.

**Implementierung:**
- Verwendet den HTTP-Header `X-API-Key`
- Der API-Key wird in der Umgebungsvariable `API_SECRET_KEY` konfiguriert
- Wird durch die Middleware `verifyApiKey` im Server durchgesetzt

**Geschützte Endpunkte:**
- `POST /api/emergencies` - Einsatz erstellen

**Konfiguration:**

```bash
# In server/.env oder .env (Docker)
API_SECRET_KEY=ihr-geheimer-api-key-hier
```

⚠️ **Sicherheitshinweis:** Ändern Sie den Standard-API-Key vor dem Produktivbetrieb! Der Server gibt eine Warnung aus, wenn der Standard-Wert verwendet wird.

**Beispiel-Verwendung:**

```bash
# cURL-Beispiel
curl -X POST http://localhost:3000/api/emergencies \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ihr-geheimer-api-key-hier" \
  -d '{
    "emergencyNumber": "2024-001",
    "emergencyDate": "2024-12-07T19:00:00Z",
    "emergencyKeyword": "BRAND 3",
    "emergencyDescription": "Wohnungsbrand im 2. OG",
    "emergencyLocation": "Hauptstraße 123, 12345 Stadt"
  }'
```

```javascript
// JavaScript-Beispiel (z.B. für alarm-monitor)
const response = await fetch('http://alarm-messenger-server:3000/api/emergencies', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'ihr-geheimer-api-key-hier'
  },
  body: JSON.stringify({
    emergencyNumber: '2024-001',
    emergencyDate: '2024-12-07T19:00:00Z',
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  })
});
```

### 2. Session + CSRF-Authentifizierung (für Admin-Interface)

**Verwendungszweck:** Admin-Benutzer, die auf das Web-Interface zugreifen möchten.

**Implementierung:**
- Login-Endpunkt setzt ein HttpOnly Session-Cookie (`connect.sid`)
- Login-Antwort enthält zusätzlich ein JWT-Token und einen CSRF-Token
- Zustandsverändernde Anfragen (POST/PUT/DELETE) erfordern den `X-CSRF-Token` Header
- Session-Gültigkeit wird serverseitig verwaltet
- JWT-Gültigkeit: 1 Stunde
- Passwörter werden mit bcrypt gehasht gespeichert

**Konfiguration:**

```bash
# In server/.env oder .env (Docker)
JWT_SECRET=ihr-jwt-geheimnis-hier
```

⚠️ **Sicherheitshinweis:** Verwenden Sie ein starkes, zufälliges JWT-Secret im Produktivbetrieb!

**Geschützte Endpunkte (Session-basiert):**
- `POST /api/admin/users` - Zusätzliche Admin-Benutzer erstellen (Admin-Rolle erforderlich)
- `PUT /api/admin/users/:id` - Admin-Benutzer aktualisieren (Admin-Rolle erforderlich)
- `DELETE /api/admin/users/:id` - Admin-Benutzer löschen (Admin-Rolle erforderlich)
- `PUT /api/admin/users/:id/password` - Passwort ändern
- `GET /api/admin/users` - Alle Benutzer abrufen (Admin-Rolle erforderlich)
- `GET /api/admin/profile` - Eigenes Profil abrufen
- `PUT /api/admin/devices/:id` - Geräteinformationen aktualisieren (Admin-Rolle erforderlich)
- `PATCH /api/admin/emergencies/:id` - Einsatz manuell beenden
- `GET /api/admin/emergencies` - Einsatzhistorie abrufen
- `GET /api/admin/emergencies/:id` - Einsatz-Details abrufen
- `GET /api/admin/events` - Server-Sent Events (SSE) für Echtzeit-Updates

**Login-Ablauf:**

1. **Ersten Admin-Benutzer initialisieren** (nur beim ersten Mal):
```bash
curl -X POST http://localhost:3000/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "ihr-sicheres-passwort"
  }'
```

2. **Login durchführen:**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "ihr-sicheres-passwort"
  }'
```

Antwort:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "csrfToken": "random-csrf-token-hex",
  "user": {
    "id": "uuid",
    "username": "admin",
    "role": "admin",
    "fullName": null
  }
}
```

3. **Session-Cookie und CSRF-Token für geschützte Anfragen verwenden:**
```bash
# Session-Cookie wird automatisch beim Login gesetzt
# Für zustandsverändernde Anfragen (POST/PUT/DELETE) muss der CSRF-Token als Header mitgesendet werden:
curl -X PUT http://localhost:3000/api/admin/devices/device-id \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <csrfToken-aus-Login-Antwort>" \
  -b "connect.sid=<session-cookie>" \
  -d '{
    "firstName": "Max",
    "lastName": "Mustermann",
    "qualifications": {
      "machinist": true,
      "agt": true,
      "paramedic": false
    },
    "leadershipRole": "groupLeader"
  }'
```

## Mobile App Authentifizierung

Die Mobile App verwendet **Device-Token-Authentifizierung** für ihre Funktionen:

- **Geräteregistrierung** (`POST /api/devices/register`) - Kein Token erforderlich (Token wird aus dem QR-Code verwendet)
- **Einsätze abrufen** (`GET /api/emergencies`) - `X-Device-Token` Header erforderlich
- **Einsatz nach ID abrufen** (`GET /api/emergencies/:id`) - `X-Device-Token` Header erforderlich
- **Rückmeldung absenden** (`POST /api/emergencies/:id/responses`) - `X-Device-Token` Header erforderlich

**Implementierung:**

Die Mobile App sendet den `deviceToken` (erhalten beim QR-Code-Scan und der Registrierung) als HTTP-Header:
```
X-Device-Token: <deviceToken>
```

Der Server prüft, ob der Token in der Datenbank existiert und das Gerät aktiv ist. Das Gerät wird so automatisch identifiziert, ohne zusätzliche Anmeldedaten.

**Warum Device-Token-Authentifizierung?**
- Geräte werden durch den Registrierungsprozess (QR-Code) autorisiert
- DeviceToken dient als eindeutige Identifikation
- Vereinfacht die Mobile-App-Architektur
- Rückmeldungen werden automatisch dem richtigen Gerät zugeordnet

## Sicherheitsmodell

### Base64-Kodierung für Secrets

**NEU:** Das System unterstützt jetzt Base64-kodierte Secrets für `API_SECRET_KEY` und `JWT_SECRET`.

**Vorteile:**
- Secrets sind nicht sofort lesbar in Konfigurationsdateien
- Reduziert das Risiko versehentlicher Offenlegung in Logs oder Screenshots
- Zusätzliche Sicherheitsebene bei der Speicherung
- Vollständige Rückwärtskompatibilität mit Plain-Text Secrets

**Verwendung:**
```bash
# Plain-Text Secret (funktioniert weiterhin)
API_SECRET_KEY=my-secret-key

# Base64-kodiertes Secret (wird automatisch dekodiert)
API_SECRET_KEY=bXktc2VjcmV0LWtleQ==
```

Das System erkennt automatisch, ob ein Secret Base64-kodiert ist und dekodiert es bei Bedarf. Plain-Text Secrets funktionieren weiterhin ohne Änderungen.

**Wichtig:** Base64-Kodierung ist **keine Verschlüsselung**, sondern nur eine Verschleierung. Für echte Sicherheit ist HTTPS zwingend erforderlich, und Secrets müssen sicher aufbewahrt werden.

### Warum verschiedene Authentifizierungsmethoden?

1. **API-Key für Einsatzerstellung:**
   - Einfach für externe Systeme zu integrieren
   - Ein Key kann von mehreren Systemen verwendet werden
   - Geeignet für Server-zu-Server-Kommunikation
   - Kann einfach rotiert werden, ohne alle Benutzer zu beeinflussen

2. **Session + CSRF für Admin-Interface:**
   - Ermöglicht benutzerspezifische Authentifizierung
   - HttpOnly-Session-Cookie verhindert JavaScript-Zugriff auf Anmeldedaten
   - CSRF-Schutz für zustandsverändernde Anfragen
   - JWT mit begrenzter Gültigkeit (1 Stunde) für zustandslose Verifizierung
   - Unterstützt mehrere Admin-Benutzer mit individuellen Credentials
   - Standard-Methode für Web-Interfaces

### Sicherheits-Best-Practices

1. **Immer HTTPS verwenden im Produktivbetrieb**
   - Verhindert Abfangen von API-Keys und Tokens
   - Schützt alle Datenübertragungen

2. **Starke Secrets verwenden**
   - API_SECRET_KEY: Mindestens 32 Zeichen, zufällig generiert
   - JWT_SECRET: Mindestens 32 Zeichen, zufällig generiert
   - Niemals Standard-Werte im Produktivbetrieb verwenden

3. **Secrets sicher aufbewahren**
   - Nie in Git committen
   - Umgebungsvariablen oder Secret-Management-Systeme verwenden
   - Zugriff auf .env-Dateien beschränken
   - **Optional: Base64-Kodierung für zusätzliche Verschleierung verwenden**

4. **API-Keys regelmäßig rotieren**
   - Besonders nach Verdacht auf Kompromittierung
   - Bei Mitarbeiterwechsel

5. **Starke Passwörter für Admin-Benutzer**
   - Mindestens 12 Zeichen
   - Kombination aus Groß-/Kleinbuchstaben, Zahlen, Sonderzeichen

## Fehlerbehandlung

### API-Key-Authentifizierung

**Fehlender oder ungültiger API-Key:**
```json
HTTP 401 Unauthorized
{
  "error": "Invalid or missing API key"
}
```

**Server-Konfigurationsfehler (Produktivmodus ohne konfigurierten Key):**
```json
HTTP 500 Internal Server Error
{
  "error": "Server configuration error: API_SECRET_KEY not properly configured"
}
```

### Device-Token-Authentifizierung

**Fehlender Device-Token:**
```json
HTTP 401 Unauthorized
{
  "error": "Missing X-Device-Token header"
}
```

**Ungültiger oder inaktiver Device-Token:**
```json
HTTP 401 Unauthorized
{
  "error": "Invalid or inactive device token"
}
```

### JWT- / Session-Authentifizierung

**Fehlender Token:**
```json
HTTP 401 Unauthorized
{
  "error": "No token provided"
}
```

**Ungültiger oder abgelaufener Token:**
```json
HTTP 401 Unauthorized
{
  "error": "Invalid or expired token"
}
```

## Implementierungsdetails

Die Authentifizierungs-Middleware ist in `server/src/middleware/auth.ts` implementiert:

### verifyApiKey Middleware
```typescript
export const verifyApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey || apiKey !== VALID_API_KEY) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
};
```

### verifySession Middleware (Admin-Interface)
```typescript
export const verifySession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const userId = req.session.userId;

  if (!userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  // CSRF-Schutz für zustandsverändernde Anfragen
  const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
  if (!SAFE_METHODS.has(req.method.toUpperCase())) {
    const csrfToken = req.headers['x-csrf-token'] as string | undefined;
    if (!csrfToken || csrfToken !== req.session.csrfToken) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }
  }

  const user = await dbGet('SELECT id, username, role FROM admin_users WHERE id = ?', [userId]);
  if (!user) {
    res.status(401).json({ error: 'Session invalid' });
    return;
  }

  req.userId = user.id;
  req.username = user.username;
  req.userRole = user.role || 'admin';
  next();
};
```

### verifyDeviceToken Middleware
```typescript
export const verifyDeviceToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const deviceToken = req.headers['x-device-token'] as string | undefined;

  if (!deviceToken) {
    res.status(401).json({ error: 'Missing X-Device-Token header' });
    return;
  }

  const device = await dbGet('SELECT id, active FROM devices WHERE device_token = ?', [deviceToken]);

  if (!device || device.active !== 1) {
    res.status(401).json({ error: 'Invalid or inactive device token' });
    return;
  }

  (req as DeviceRequest).device = { id: device.id };
  next();
};
```

## Migration von Entwicklung zu Produktion

Wenn Sie vom Entwicklungs- zum Produktivbetrieb wechseln:

1. **Generieren Sie starke Secrets:**
```bash
# Linux/Mac - Direkt als Base64
openssl rand -base64 32  # Für API_SECRET_KEY
openssl rand -base64 32  # Für JWT_SECRET

# Oder mit Node.js - Direkt als Base64
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Wenn Sie Plain-Text verwenden möchten (auch unterstützt):
openssl rand -hex 32
```

2. **Konfigurieren Sie die Umgebungsvariablen:**

**Option A: Base64-kodierte Secrets (empfohlen für zusätzliche Sicherheit)**
```bash
# .env Datei
NODE_ENV=production

# Secrets im Base64-Format (werden automatisch dekodiert)
API_SECRET_KEY=U3VwZXJTZWNyZXRBcGlLZXlGb3JQcm9kdWN0aW9u
JWT_SECRET=U3VwZXJTZWNyZXRKV1RLZXlGb3JQcm9kdWN0aW9u

SERVER_URL=https://ihre-domain.de
```

**Option B: Plain-Text Secrets (ebenfalls unterstützt)**
```bash
# .env Datei
NODE_ENV=production
API_SECRET_KEY=SuperSecretApiKeyForProduction
JWT_SECRET=SuperSecretJWTKeyForProduction
SERVER_URL=https://ihre-domain.de
```

**Hinweis:** Das System erkennt automatisch, ob ein Secret Base64-kodiert ist und dekodiert es entsprechend. Plain-Text Secrets funktionieren weiterhin für vollständige Rückwärtskompatibilität.

**Base64-Kodierung eines bestehenden Secrets:**
```bash
# Linux/Mac
echo -n "mein-geheimer-schlüssel" | base64

# Windows PowerShell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("mein-geheimer-schlüssel"))

# Node.js
node -e "console.log(Buffer.from('mein-geheimer-schlüssel', 'utf-8').toString('base64'))"
```

3. **Starten Sie den Server neu**

4. **Testen Sie die Authentifizierung:**
```bash
# Sollte mit richtigem Key funktionieren
curl -X POST https://ihre-domain.de/api/emergencies \
  -H "X-API-Key: <ihr-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"emergencyNumber":"TEST-001",...}'

# Sollte ohne Key fehlschlagen
curl -X POST https://ihre-domain.de/api/emergencies \
  -H "Content-Type: application/json" \
  -d '{"emergencyNumber":"TEST-001",...}'
```

## Zusammenfassung

- ✅ **Authentifizierung ist bereits implementiert** für kritische Endpunkte
- ✅ **API-Key-Authentifizierung** schützt die Einsatzerstellung und Rückmeldungs-Abfragen
- ✅ **Session + CSRF-Authentifizierung** schützt das Admin-Interface
- ✅ **Device-Token-Authentifizierung** schützt die Mobile-App-Endpunkte (X-Device-Token Header)
- ⚠️ **Konfiguration erforderlich** vor dem Produktivbetrieb
- 🔒 **HTTPS zwingend erforderlich** im Produktivbetrieb

Die API-Dokumentation reflektiert diese Authentifizierungsanforderungen korrekt.
