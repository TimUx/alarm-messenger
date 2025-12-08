# Server-Konfiguration und Geräteverbindung

Dieses Dokument erklärt, wie Mobile Geräte die Server-URL erfahren und wie die Kommunikation zwischen Server und Geräten konfiguriert wird.

## Übersicht

Das Alarm Messenger System verwendet einen **QR-Code-basierten Registrierungsprozess**, bei dem Geräte automatisch die Server-Konfiguration erhalten. Dies ermöglicht eine einfache und sichere Geräteregistrierung ohne manuelle Konfiguration.

## Wie erfahren Geräte die Server-URL?

### 1. QR-Code-Generierung (Server-Seite)

Der Server generiert QR-Codes über das Admin-Interface oder die API. Diese QR-Codes enthalten **alle notwendigen Verbindungsinformationen** im JSON-Format:

**API-Endpunkt:** `POST /api/devices/registration-token`

**Generierter QR-Code enthält:**
```json
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "serverUrl": "https://ihre-domain.de:3000"
}
```

**Implementierung (server/src/routes/devices.ts):**
```typescript
router.post('/registration-token', async (req: Request, res: Response) => {
  const deviceToken = uuidv4();
  
  // Registrierungsdaten mit Server-URL
  const registrationData = {
    token: deviceToken,
    serverUrl: process.env.SERVER_URL || 'http://localhost:3000',
  };
  
  // QR-Code als Data URL generieren
  const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(registrationData));
  
  res.json({
    deviceToken,
    qrCode: qrCodeDataUrl,
    registrationData,
  });
});
```

### 2. QR-Code-Scannen (Mobile App)

Die Mobile App scannt den QR-Code und extrahiert automatisch:
- **deviceToken**: Eindeutige Kennung für dieses Gerät
- **serverUrl**: Die vollständige Server-URL inkl. Port

**Implementierung (mobile/src/screens/RegistrationScreen.tsx):**
```typescript
const onQRCodeRead = async (e: any) => {
  try {
    // QR-Code-Daten parsen
    const data = JSON.parse(e.data);
    const { token, serverUrl } = data;

    // Server-URL speichern
    await storageService.saveServerUrl(serverUrl);
    setApiBaseUrl(serverUrl);

    // Gerät mit den erhaltenen Informationen registrieren
    const device = await deviceService.register(token, fcmToken, platform);
    
    // Device-Informationen lokal speichern
    await storageService.saveDeviceToken(token);
    await storageService.saveDeviceId(device.id);
  } catch (error) {
    console.error('Registration error:', error);
  }
};
```

### 3. Server-URL-Speicherung

Die Mobile App speichert die Server-URL **persistent** im lokalen Speicher:

**Implementierung (mobile/src/services/storage.ts):**
```typescript
const STORAGE_KEYS = {
  SERVER_URL: '@alarm_messenger_server_url',
  DEVICE_TOKEN: '@alarm_messenger_device_token',
  DEVICE_ID: '@alarm_messenger_device_id',
};

export const storageService = {
  async saveServerUrl(url: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SERVER_URL, url);
  },
  
  async getServerUrl(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.SERVER_URL);
  },
};
```

### 4. API-Konfiguration

Die Mobile App konfiguriert ihren HTTP-Client mit der gespeicherten Server-URL:

**Implementierung (mobile/src/services/api.ts):**
```typescript
// Standard-URL für Entwicklung
const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Funktion zum Aktualisieren der Server-URL
export const setApiBaseUrl = (url: string) => {
  api.defaults.baseURL = `${url}/api`;
};
```

## Server-URL-Konfiguration

### Umgebungsvariable SERVER_URL

Die Server-URL wird über die Umgebungsvariable `SERVER_URL` konfiguriert:

**Entwicklungsumgebung:**
```bash
# server/.env
SERVER_URL=http://localhost:3000
```

**Produktionsumgebung:**
```bash
# .env (für Docker)
SERVER_URL=https://ihre-domain.de
```

**Wichtig:**
- Die URL sollte **die vollständige Basis-URL** enthalten
- Port nur angeben, wenn nicht Standard (80/443)
- Protokoll (http/https) muss angegeben werden
- **HTTPS zwingend im Produktivbetrieb**

### Beispiele für SERVER_URL-Konfiguration

```bash
# Lokale Entwicklung
SERVER_URL=http://localhost:3000

# Produktiv mit Standard-HTTPS-Port (443)
SERVER_URL=https://alarm.feuerwehr-beispiel.de

# Produktiv mit Custom-Port
SERVER_URL=https://alarm.feuerwehr-beispiel.de:8443

# Lokales Netzwerk (für Tests)
SERVER_URL=http://192.168.1.100:3000
```

## Kommunikationswege

### 1. HTTP/HTTPS (REST API)

**Verwendung:**
- Geräteregistrierung
- Einsätze abrufen
- Rückmeldungen absenden

**Endpunkte:**
- `POST /api/devices/register` - Gerät registrieren
- `GET /api/emergencies` - Einsätze abrufen
- `GET /api/emergencies/:id` - Spezifischen Einsatz abrufen
- `POST /api/emergencies/:id/responses` - Rückmeldung absenden

**Mobile App Konfiguration:**
```typescript
// Nach QR-Code-Scan wird die Base-URL gesetzt
setApiBaseUrl('https://ihre-domain.de');

// Alle API-Aufrufe verwenden dann diese URL
await emergencyService.getEmergencies();
// → GET https://ihre-domain.de/api/emergencies
```

### 2. WebSocket (Push-Benachrichtigungen)

**Verwendung:**
- Echtzeit-Einsatzbenachrichtigungen
- Bidirektionale Kommunikation

**Verbindung:**
```typescript
// Mobile App (mobile/src/services/websocket.ts)
const serverUrl = await storageService.getServerUrl();
const ws = new WebSocket(`${serverUrl}/ws`);
```

**Server-Implementierung:**
- WebSocket-Server läuft auf der gleichen URL wie die REST API
- Endpunkt: `ws://server-url/ws` oder `wss://server-url/ws` (HTTPS)
- Authentifizierung über registrationToken

## Vollständiger Registrierungsablauf

```
┌─────────────┐                           ┌─────────────┐                           ┌─────────────┐
│   Admin     │                           │   Server    │                           │ Mobile App  │
└──────┬──────┘                           └──────┬──────┘                           └──────┬──────┘
       │                                         │                                          │
       │ 1. Admin ruft Admin-Interface auf       │                                          │
       │─────────────────────────────────────────>                                          │
       │                                         │                                          │
       │ 2. Admin klickt "QR-Code generieren"    │                                          │
       │─────────────────────────────────────────>                                          │
       │                                         │                                          │
       │                                         │ 3. Server generiert:                     │
       │                                         │    - deviceToken (UUID)                  │
       │                                         │    - QR-Code mit JSON:                   │
       │                                         │      {token, serverUrl}                  │
       │                                         │                                          │
       │<─────────────────────────────────────────                                          │
       │ 4. QR-Code wird angezeigt               │                                          │
       │                                         │                                          │
       │                                         │        5. Benutzer startet Mobile App    │
       │                                         │           und scannt QR-Code            │
       │                                         │<─────────────────────────────────────────│
       │                                         │                                          │
       │                                         │        6. App extrahiert:                │
       │                                         │           - deviceToken                  │
       │                                         │           - serverUrl                    │
       │                                         │                                          │
       │                                         │        7. App speichert serverUrl lokal  │
       │                                         │                                          │
       │                                         │        8. App sendet Registrierung:      │
       │                                         │<─────────────────────────────────────────│
       │                                         │   POST {serverUrl}/api/devices/register  │
       │                                         │   Body: {deviceToken, registrationToken} │
       │                                         │                                          │
       │                                         │ 9. Server speichert Gerät                │
       │                                         │                                          │
       │                                         │─────────────────────────────────────────>│
       │                                         │        10. Registrierung erfolgreich     │
       │                                         │            Device-ID zurück              │
       │                                         │                                          │
       │                                         │        11. App speichert Device-ID       │
       │                                         │                                          │
       │                                         │        12. App öffnet WebSocket:         │
       │                                         │<─────────────────────────────────────────│
       │                                         │   WSS {serverUrl}/ws                     │
       │                                         │                                          │
       │                                         │ 13. WebSocket-Verbindung etabliert       │
       │                                         │─────────────────────────────────────────>│
       │                                         │                                          │
       │                                         │ 14. App ist bereit für Benachrichtigungen│
       │                                         │                                          │
```

## Netzwerk-Konfiguration

### Firewall-Regeln

**Server muss erreichbar sein auf:**
- Port 3000 (oder konfigurierter Port) für HTTP/HTTPS
- Gleicher Port für WebSocket-Verbindungen

**Für Docker mit Reverse Proxy:**
- Port 80 (HTTP)
- Port 443 (HTTPS)

```bash
# Beispiel: ufw (Ubuntu)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Oder spezifischer Port
sudo ufw allow 3000/tcp
```

### Docker Deployment

**docker-compose.yml:**
```yaml
services:
  alarm-messenger:
    environment:
      - SERVER_URL=https://ihre-domain.de
      - PORT=3000
    ports:
      - "3000:3000"
```

**Mit Caddy Reverse Proxy:**
```yaml
services:
  alarm-messenger:
    environment:
      - SERVER_URL=https://ihre-domain.de
      # Interner Port
      - PORT=3000

  caddy:
    ports:
      - "80:80"
      - "443:443"
```

Die `SERVER_URL` sollte die **externe URL** sein, die von den mobilen Geräten erreichbar ist.

### Lokales Netzwerk

Für Tests im lokalen Netzwerk:

1. **Server-IP ermitteln:**
```bash
# Linux/Mac
ip addr show
# oder
ifconfig

# Windows
ipconfig
```

2. **SERVER_URL konfigurieren:**
```bash
SERVER_URL=http://192.168.1.100:3000
```

3. **Firewall auf Server öffnen:**
```bash
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

## Fehlerbehandlung

### Problem: Mobile App kann Server nicht erreichen

**Checkliste:**

1. ✓ **Server-URL im QR-Code korrekt?**
   - QR-Code neu generieren mit korrekter SERVER_URL
   
2. ✓ **Server läuft und ist erreichbar?**
   ```bash
   curl http://ihre-server-url:3000/health
   ```

3. ✓ **Firewall-Regeln korrekt?**
   - Port muss von außen erreichbar sein
   
4. ✓ **DNS auflösbar?** (bei Domain-Namen)
   ```bash
   nslookup ihre-domain.de
   ```

5. ✓ **HTTPS-Zertifikat gültig?** (im Produktivbetrieb)
   - Selbst-signierte Zertifikate werden von mobilen Apps oft abgelehnt
   - Let's Encrypt verwenden (automatisch mit Caddy)

6. ✓ **Mobile App Logs prüfen:**
   ```bash
   # React Native
   npx react-native log-android
   npx react-native log-ios
   ```

### Problem: WebSocket-Verbindung schlägt fehl

**Mögliche Ursachen:**

1. **Reverse Proxy nicht richtig konfiguriert**
   - WebSocket-Upgrade muss unterstützt werden
   - Siehe Caddy/Nginx-Konfiguration in `/docs/DOCKER.md`

2. **CORS-Konfiguration**
   - WebSocket-Verbindungen werden durch CORS-Policy beeinflusst
   - CORS_ORIGINS korrekt konfigurieren

3. **Timeout-Einstellungen**
   - Reverse Proxy Timeout erhöhen für lange WebSocket-Verbindungen

## Best Practices

### 1. SERVER_URL korrekt setzen

```bash
# ✓ Richtig - Vollständige URL
SERVER_URL=https://alarm.feuerwehr-beispiel.de

# ✗ Falsch - Keine Protokollangabe
SERVER_URL=alarm.feuerwehr-beispiel.de

# ✗ Falsch - Mit /api Pfad
SERVER_URL=https://alarm.feuerwehr-beispiel.de/api

# ✗ Falsch - Mit Trailing Slash
SERVER_URL=https://alarm.feuerwehr-beispiel.de/
```

### 2. HTTPS im Produktivbetrieb

```bash
# Entwicklung
SERVER_URL=http://localhost:3000

# Produktion - IMMER HTTPS
SERVER_URL=https://ihre-domain.de
```

### 3. QR-Codes neu generieren nach URL-Änderung

Wenn sich die SERVER_URL ändert:
1. Neue QR-Codes generieren
2. Geräte müssen neu registriert werden
3. Alte QR-Codes funktionieren nicht mehr korrekt

### 4. Server-URL-Validation

Der Server sollte überprüfen, ob SERVER_URL gesetzt ist:

```bash
# .env
SERVER_URL=${SERVER_URL:-http://localhost:3000}
```

## Zusammenfassung

**Wie Geräte die Server-URL erfahren:**
1. ✅ Admin generiert QR-Code im Admin-Interface
2. ✅ QR-Code enthält serverUrl aus Umgebungsvariable SERVER_URL
3. ✅ Mobile App scannt QR-Code und extrahiert serverUrl
4. ✅ App speichert serverUrl persistent im lokalen Speicher
5. ✅ App verwendet serverUrl für alle API-Aufrufe und WebSocket-Verbindungen

**Konfiguration:**
- ✅ SERVER_URL Umgebungsvariable auf Server setzen
- ✅ Firewall-Regeln für Port öffnen
- ✅ HTTPS im Produktivbetrieb verwenden
- ✅ QR-Codes nach URL-Änderung neu generieren

**Vorteile dieses Ansatzes:**
- 🎯 Keine manuelle Konfiguration in der Mobile App nötig
- 🔒 Zentrale Konfiguration auf Server-Seite
- 🚀 Einfacher Wechsel zwischen Umgebungen (Dev/Prod)
- 📱 Automatische Konfiguration beim Scannen
- ♻️ QR-Code kann für mehrere Geräte verwendet werden
