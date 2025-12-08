# Authentifizierung im Alarm Messenger System

Dieses Dokument erklärt die Authentifizierungsmechanismen im Alarm Messenger System für beide Anwendungsfälle: Mobile App und Einsatzerstellung.

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

### 2. JWT-Token-Authentifizierung (für Admin-Interface)

**Verwendungszweck:** Admin-Benutzer, die auf das Web-Interface zugreifen möchten.

**Implementierung:**
- Verwendet JWT (JSON Web Tokens) mit Bearer-Schema
- Token wird über den HTTP-Header `Authorization: Bearer <token>` übermittelt
- JWT-Secret wird in der Umgebungsvariable `JWT_SECRET` konfiguriert
- Token-Gültigkeit: 24 Stunden
- Passwörter werden mit bcrypt gehasht gespeichert

**Konfiguration:**

```bash
# In server/.env oder .env (Docker)
JWT_SECRET=ihr-jwt-geheimnis-hier
```

⚠️ **Sicherheitshinweis:** Verwenden Sie ein starkes, zufälliges JWT-Secret im Produktivbetrieb!

**Geschützte Endpunkte:**
- `POST /api/admin/users` - Zusätzliche Admin-Benutzer erstellen
- `PUT /api/admin/devices/:id` - Geräteinformationen aktualisieren

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
  "userId": "uuid",
  "username": "admin"
}
```

3. **Token für geschützte Anfragen verwenden:**
```bash
curl -X PUT http://localhost:3000/api/admin/devices/device-id \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "responderName": "Max Mustermann",
    "qualifications": {
      "machinist": true,
      "agt": true
    }
  }'
```

## Mobile App Authentifizierung

**Wichtig:** Die Mobile App selbst benötigt **keine Authentifizierung** für ihre Funktionen:

- **Geräteregistrierung** (`POST /api/devices/register`) - Keine Authentifizierung erforderlich
- **Einsätze abrufen** (`GET /api/emergencies`) - Keine Authentifizierung erforderlich
- **Rückmeldung absenden** (`POST /api/emergencies/:id/responses`) - Keine Authentifizierung erforderlich

**Grund:** Die Geräte authentifizieren sich durch:
1. Das deviceToken, das beim Scannen des QR-Codes erhalten wird
2. Die registrationToken (WebSocket-Verbindungs-ID)

Diese Tokens ermöglichen die Identifikation des Geräts ohne zusätzliche Authentifizierung.

## Sicherheitsmodell

### Warum verschiedene Authentifizierungsmethoden?

1. **API-Key für Einsatzerstellung:**
   - Einfach für externe Systeme zu integrieren
   - Ein Key kann von mehreren Systemen verwendet werden
   - Geeignet für Server-zu-Server-Kommunikation
   - Kann einfach rotiert werden, ohne alle Benutzer zu beeinflussen

2. **JWT für Admin-Interface:**
   - Ermöglicht benutzerspezifische Authentifizierung
   - Token haben eine begrenzte Gültigkeit (24 Stunden)
   - Unterstützt mehrere Admin-Benutzer mit individuellen Credentials
   - Standard-Methode für Web-Interfaces

3. **Keine Authentifizierung für Mobile App:**
   - Geräte werden durch den Registrierungsprozess (QR-Code) autorisiert
   - DeviceToken dient als Identifikation
   - Vereinfacht die Mobile-App-Architektur
   - Ausreichend für das Sicherheitsmodell (Geräte müssen physisch registriert werden)

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

### JWT-Authentifizierung

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
  const validApiKey = process.env.API_SECRET_KEY || 'change-me-in-production';

  if (validApiKey === 'change-me-in-production') {
    // Warnung ausgeben und in Produktivumgebung ablehnen
    if (IS_PRODUCTION) {
      res.status(500).json({ error: 'Server configuration error: API_SECRET_KEY not properly configured' });
      return;
    }
  }

  if (!apiKey || apiKey !== validApiKey) {
    res.status(401).json({ error: 'Invalid or missing API key' });
    return;
  }

  next();
};
```

### verifyToken Middleware
```typescript
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

## Migration von Entwicklung zu Produktion

Wenn Sie vom Entwicklungs- zum Produktivbetrieb wechseln:

1. **Generieren Sie starke Secrets:**
```bash
# Linux/Mac
openssl rand -base64 32  # Für API_SECRET_KEY
openssl rand -base64 32  # Für JWT_SECRET

# Oder mit Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

2. **Konfigurieren Sie die Umgebungsvariablen:**
```bash
# .env Datei
NODE_ENV=production
API_SECRET_KEY=<generierter-key-1>
JWT_SECRET=<generierter-key-2>
SERVER_URL=https://ihre-domain.de
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
- ✅ **API-Key-Authentifizierung** schützt die Einsatzerstellung
- ✅ **JWT-Authentifizierung** schützt das Admin-Interface
- ✅ **Mobile App** benötigt keine zusätzliche Authentifizierung (Geräte-basierte Autorisierung)
- ⚠️ **Konfiguration erforderlich** vor dem Produktivbetrieb
- 🔒 **HTTPS zwingend erforderlich** im Produktivbetrieb

Die API-Dokumentation wird aktualisiert, um diese Authentifizierungsanforderungen korrekt zu reflektieren.
