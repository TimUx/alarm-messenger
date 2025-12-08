# Base64-Kodierung für Secrets und Keys

## Übersicht

Das Alarm Messenger System unterstützt jetzt Base64-kodierte Secrets für `API_SECRET_KEY` und `JWT_SECRET`. Diese Funktion bietet eine zusätzliche Sicherheitsebene durch Verschleierung der Secrets in Konfigurationsdateien.

## Warum Base64-Kodierung?

### Vorteile

1. **Verschleierung**: Secrets sind nicht sofort lesbar in Konfigurationsdateien
2. **Reduziertes Risiko**: Minimiert versehentliche Offenlegung in:
   - Server-Logs
   - Screenshots
   - Bildschirmfreigaben bei Support-Sessions
   - Code-Reviews (wenn .env versehentlich exponiert wird)
3. **Zusätzliche Sicherheit**: Bietet eine Barriere gegen einfaches Auslesen
4. **Rückwärtskompatibilität**: Plain-Text Secrets funktionieren weiterhin

### Wichtige Hinweise

⚠️ **Base64 ist KEINE Verschlüsselung!**
- Base64 ist eine Kodierung, keine kryptografische Verschlüsselung
- Base64-kodierte Secrets können leicht dekodiert werden
- HTTPS ist weiterhin zwingend im Produktivbetrieb erforderlich
- Secrets müssen weiterhin sicher aufbewahrt werden (nicht in Git committen, etc.)

Base64-Kodierung ist eine **Verschleierungs-** und **Convenience-Funktion**, keine vollständige Sicherheitslösung.

## Verwendung

### Neue Installation

Bei einer neuen Installation können Sie direkt Base64-kodierte Secrets verwenden:

```bash
# 1. Secret generieren (bereits als Base64)
openssl rand -base64 32

# Oder mit Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 2. In .env eintragen
API_SECRET_KEY=U3VwZXJTZWNyZXRBcGlLZXlGb3JQcm9kdWN0aW9u
JWT_SECRET=U3VwZXJTZWNyZXRKV1RLZXlGb3JQcm9kdWN0aW9u
```

### Bestehende Installation

#### Option 1: Secrets zu Base64 konvertieren (empfohlen)

Wenn Sie bereits laufende Secrets haben und diese zu Base64 konvertieren möchten:

**Schritt 1: Aktuelle Secrets sichern**
```bash
# Backup Ihrer aktuellen .env erstellen
cp .env .env.backup
```

**Schritt 2: Secrets zu Base64 kodieren**
```bash
# Linux/Mac
echo -n "ihr-aktuelles-api-secret" | base64
echo -n "ihr-aktuelles-jwt-secret" | base64

# Windows PowerShell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("ihr-aktuelles-api-secret"))
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("ihr-aktuelles-jwt-secret"))

# Node.js (plattformunabhängig)
node -e "console.log(Buffer.from('ihr-aktuelles-api-secret', 'utf-8').toString('base64'))"
node -e "console.log(Buffer.from('ihr-aktuelles-jwt-secret', 'utf-8').toString('base64'))"
```

**Schritt 3: .env aktualisieren**
```bash
# Ersetzen Sie in Ihrer .env:
API_SECRET_KEY=aWhyLWFrdHVlbGxlcy1hcGktc2VjcmV0    # Base64-kodiert
JWT_SECRET=aWhyLWFrdHVlbGxlcy1qd3Qtc2VjcmV0        # Base64-kodiert
```

**Schritt 4: Server neu starten**
```bash
# Docker
docker compose restart

# Oder manuell
npm run build
npm start
```

**Schritt 5: Funktionalität testen**
Testen Sie, ob die Authentifizierung weiterhin funktioniert.

#### Option 2: Plain-Text beibehalten

Sie müssen nichts ändern! Das System unterstützt weiterhin Plain-Text Secrets:

```bash
# Diese funktionieren weiterhin ohne Änderung
API_SECRET_KEY=my-plain-text-secret
JWT_SECRET=another-plain-text-secret
```

## Beispiele

### Base64-Kodierung erstellen

**Beispiel 1: Einfaches Secret kodieren**
```bash
$ echo -n "my-secret-key" | base64
bXktc2VjcmV0LWtleQ==
```

**Beispiel 2: Starkes Random Secret generieren und kodieren**
```bash
# Zufälliges Secret generieren und zu Base64 kodieren
$ openssl rand -base64 32
U3VwZXJTZWNyZXRBcGlLZXlGb3JQcm9kdWN0aW9u
```

**Beispiel 3: Mit Node.js**
```javascript
// Secret zu Base64 kodieren
const secret = "my-secret-key";
const base64 = Buffer.from(secret, 'utf-8').toString('base64');
console.log(base64); // bXktc2VjcmV0LWtleQ==

// Base64 zurück dekodieren (zum Testen)
const decoded = Buffer.from(base64, 'base64').toString('utf-8');
console.log(decoded); // my-secret-key
```

### Konfigurationsbeispiele

**Development (.env)**
```bash
NODE_ENV=development
PORT=3000

# Base64-kodierte Secrets
API_SECRET_KEY=bXktZGV2LWFwaS1rZXk=
JWT_SECRET=bXktZGV2LWp3dC1zZWNyZXQ=

SERVER_URL=http://localhost:3000
```

**Production (.env)**
```bash
NODE_ENV=production
PORT=3000

# Starke, zufällige, Base64-kodierte Secrets
API_SECRET_KEY=N2ZhYjE3ODkzYWI0ZGU1NjdmODljMDEyMzQ1Njc4OTA=
JWT_SECRET=OGFiYzE4OTAyYWI0ZGU1NjdmODljMDEyMzQ1Njc4OTA=

SERVER_URL=https://ihre-domain.de
```

## Technische Details

### Automatische Erkennung

Das System erkennt automatisch, ob ein Secret Base64-kodiert ist:

1. **Prüfung auf gültige Base64-Zeichen**: `A-Z`, `a-z`, `0-9`, `+`, `/`, `=`
2. **Länge muss durch 4 teilbar sein**: Base64 verwendet 4-Zeichen-Blöcke
3. **Dekodierung versuchen**: Wenn erfolgreich, wird dekodierter Wert verwendet
4. **Fallback zu Plain-Text**: Bei Fehlschlag wird Original-Wert verwendet

### Code-Implementierung

Die Base64-Dekodierung ist in `server/src/utils/secrets.ts` implementiert:

```typescript
export function decodeSecret(secret: string | undefined): string | undefined {
  if (!secret) {
    return undefined;
  }
  
  // Prüfen, ob Base64-kodiert
  if (isBase64(secret)) {
    try {
      return Buffer.from(secret, 'base64').toString('utf-8');
    } catch (error) {
      console.warn('⚠️  WARNING: Failed to decode Base64 secret, using as plain text');
    }
  }
  
  // Rückwärtskompatibilität: Plain-Text zurückgeben
  return secret;
}
```

Die Middleware (`server/src/middleware/auth.ts`) verwendet automatisch die Dekodierung:

```typescript
import { decodeSecret } from '../utils/secrets';

const JWT_SECRET = decodeSecret(process.env.JWT_SECRET) || 'change-this-secret-in-production';
const API_SECRET_KEY = decodeSecret(process.env.API_SECRET_KEY) || 'change-me-in-production';
```

## Häufig gestellte Fragen (FAQ)

### Muss ich meine bestehenden Secrets ändern?

**Nein.** Das System ist vollständig rückwärtskompatibel. Plain-Text Secrets funktionieren weiterhin ohne jegliche Änderung.

### Ist Base64 sicher?

**Base64 allein ist KEINE Sicherheit.** Es ist eine Verschleierung, keine Verschlüsselung. Sie müssen weiterhin:
- HTTPS verwenden (zwingend im Produktivbetrieb)
- Secrets nicht in Git committen
- .env-Dateien mit restriktiven Berechtigungen schützen
- Starke, zufällige Secrets verwenden

### Kann ich zwischen Plain-Text und Base64 wechseln?

**Ja, jederzeit.** Das System erkennt automatisch das Format. Sie können:
- Von Plain-Text zu Base64 wechseln
- Von Base64 zu Plain-Text wechseln
- Verschiedene Formate für verschiedene Secrets verwenden

### Was passiert, wenn ich ein ungültiges Base64-Secret verwende?

Das System gibt eine Warnung aus und verwendet den Wert als Plain-Text:
```
⚠️  WARNING: Failed to decode Base64 secret, using as plain text
```

### Kann ich beide Formate mischen?

**Ja.** Sie können z.B. `API_SECRET_KEY` in Base64 und `JWT_SECRET` in Plain-Text verwenden:
```bash
API_SECRET_KEY=bXktYXBpLWtleQ==      # Base64
JWT_SECRET=my-jwt-secret           # Plain-Text
```

### Muss ich meine API-Clients aktualisieren?

**Nein.** Die Änderung ist komplett server-seitig. Clients (z.B. alarm-monitor) senden weiterhin den Plain-Text API-Key im `X-API-Key` Header. Der Server dekodiert sein gespeichertes Secret automatisch für den Vergleich.

### Was ist mit Docker/Docker Compose?

Base64-kodierte Secrets funktionieren genauso in Docker:

```yaml
# docker-compose.yml
services:
  alarm-messenger-server:
    environment:
      - API_SECRET_KEY=bXktYXBpLWtleQ==
      - JWT_SECRET=bXktand0LXNlY3JldA==
```

Oder in einer `.env`-Datei, die von Docker Compose gelesen wird.

## Best Practices

### 1. Starke Secrets generieren

```bash
# Empfohlen: Kryptografisch sichere Zufallswerte
openssl rand -base64 32

# Nicht empfohlen: Schwache oder vorhersagbare Secrets
API_SECRET_KEY=password123
```

### 2. Secrets niemals in Git committen

```bash
# .gitignore sollte enthalten:
.env
.env.local
.env.*.local
```

### 3. Unterschiedliche Secrets für verschiedene Umgebungen

```bash
# Development
API_SECRET_KEY=bXktZGV2LWtleQ==

# Production (anderes Secret!)
API_SECRET_KEY=cHJvZC1zZWNyZXQta2V5LTEyMzQ1Njc4OTA=
```

### 4. Secrets regelmäßig rotieren

Erstellen Sie neue Secrets:
```bash
# Neues Secret generieren
NEW_SECRET=$(openssl rand -base64 32)
echo "API_SECRET_KEY=$NEW_SECRET"

# In .env aktualisieren und Server neu starten
```

### 5. Zugriff auf .env-Dateien beschränken

```bash
# Linux/Mac: Nur Owner kann lesen/schreiben
chmod 600 .env

# Überprüfen
ls -la .env
# Sollte zeigen: -rw------- (600)
```

## Zusammenfassung

✅ **Was Base64-Kodierung bietet:**
- Verschleierung von Secrets in Konfigurationsdateien
- Schutz vor versehentlicher Offenlegung durch einfaches Ablesen
- Rückwärtskompatibilität mit bestehenden Installationen
- Einfache Migration

❌ **Was Base64-Kodierung NICHT bietet:**
- Verschlüsselung (Base64 kann leicht dekodiert werden)
- Ersatz für HTTPS
- Schutz bei kompromittierten Servern
- Sicherheit bei unsicheren Berechtigungen

🔒 **Für echte Sicherheit benötigen Sie:**
- HTTPS im Produktivbetrieb (zwingend)
- Starke, zufällige Secrets
- Sichere Aufbewahrung (nicht in Git, restriktive Berechtigungen)
- Regelmäßige Secret-Rotation
- Zugriffskontrolle auf Server-Ebene

## Weitere Ressourcen

- [AUTHENTIFIZIERUNG.md](./AUTHENTIFIZIERUNG.md) - Vollständige Authentifizierungsdokumentation
- [SERVER-KONFIGURATION.md](./SERVER-KONFIGURATION.md) - Server-Konfiguration
- [DOCKER.md](./DOCKER.md) - Docker Deployment mit Secrets
- [SETUP.md](./SETUP.md) - Allgemeines Setup
