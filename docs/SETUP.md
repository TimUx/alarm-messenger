# Server-Setup-Anleitung

## Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Installation](#installation)
  - [Schritt 1: Abhängigkeiten installieren](#schritt-1-abhängigkeiten-installieren)
  - [Schritt 2: Umgebungsvariablen konfigurieren](#schritt-2-umgebungsvariablen-konfigurieren)
  - [Schritt 3: Anwendung bauen](#schritt-3-anwendung-bauen)
  - [Schritt 4: Server starten](#schritt-4-server-starten)
  - [Schritt 5: Admin-Benutzer erstellen](#schritt-5-admin-benutzer-erstellen)
  - [Schritt 6: Installation verifizieren](#schritt-6-installation-verifizieren)
- [Produktiv-Deployment](#produktiv-deployment)
  - [Systemd Service](#systemd-service)
  - [PM2 Process Manager](#pm2-process-manager)
- [Sicherheit](#sicherheit)
- [Wartung](#wartung)

## Voraussetzungen

- Node.js 18 oder höher
- npm oder yarn
- SQLite3 (in Abhängigkeiten enthalten)

## Schritt 1: Abhängigkeiten installieren

```bash
cd server
npm install
```

## Schritt 2: Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

Bearbeiten Sie die `.env`-Datei mit Ihrer Konfiguration:

```env
# Server-Konfiguration
PORT=3000
NODE_ENV=production

# Datenbank
DATABASE_PATH=./data/alarm-messenger.db

# Sicherheit
API_SECRET_KEY=ihr-geheim-schlüssel-hier
JWT_SECRET=ihr-jwt-geheim-schlüssel-hier

# Server-URL für QR-Codes
SERVER_URL=http://localhost:3000

# CORS-Konfiguration
CORS_ORIGINS=*
```

**Wichtig:** 
- Halten Sie Ihre API-Schlüssel sicher
- Checken Sie niemals die `.env`-Datei in die Versionskontrolle ein
- Verwenden Sie starke, zufällige Werte für API_SECRET_KEY und JWT_SECRET

## Schritt 3: Anwendung bauen

```bash
npm run build
```

Dies kompiliert TypeScript zu JavaScript im `dist`-Verzeichnis.

## Schritt 4: Server starten

### Entwicklungsmodus
```bash
npm run dev
```

### Produktivmodus
```bash
npm start
```

Der Server startet auf dem in `.env` angegebenen Port (Standard: 3000).

**Hinweis:** Das System verwendet WebSocket für Push-Benachrichtigungen. FCM (Firebase) und APNs sind optional konfigurierbar, aber nicht erforderlich.

## Schritt 5: Admin-Benutzer erstellen

Beim ersten Start gibt es noch keine Admin-Benutzer. Erstellen Sie den ersten Administrator mit dem Init-Endpunkt:

```bash
curl -X POST http://localhost:3000/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "ihr-sicheres-passwort"
  }'
```

Dieser Endpunkt ist nur aufrufbar, wenn noch **keine** Admin-Benutzer existieren. Danach kann der Admin weitere Benutzer über `POST /api/admin/users` anlegen.

## Schritt 6: Installation verifizieren

Testen Sie den Gesundheitsendpunkt:

```bash
curl http://localhost:3000/health
```

Erwartete Antwort:
```json
{
  "status": "ok",
  "timestamp": "2024-12-07T19:00:00.000Z"
}
```

## Datenbank

Die SQLite-Datenbank wird beim ersten Start automatisch im `data`-Verzeichnis erstellt.

### Datenbankschema

**emergencies**
- `id` (TEXT, PRIMARY KEY)
- `emergency_number` (TEXT)
- `emergency_date` (TEXT)
- `emergency_keyword` (TEXT)
- `emergency_description` (TEXT)
- `emergency_location` (TEXT)
- `created_at` (TEXT)
- `active` (INTEGER)
- `groups` (TEXT, optional – kommagetrennte Gruppen-Codes)

**devices**
- `id` (TEXT, PRIMARY KEY)
- `device_token` (TEXT, UNIQUE)
- `registration_token` (TEXT)
- `platform` (TEXT)
- `registered_at` (TEXT)
- `active` (INTEGER)
- `first_name` (TEXT)
- `last_name` (TEXT)
- `qual_machinist` (INTEGER)
- `qual_agt` (INTEGER)
- `qual_paramedic` (INTEGER)
- `leadership_role` (TEXT)
- `fcm_token` (TEXT)
- `apns_token` (TEXT)
- `qr_code_data` (TEXT)
- `registration_expires_at` (TEXT)

**responses**
- `id` (TEXT, PRIMARY KEY)
- `emergency_id` (TEXT, FOREIGN KEY)
- `device_id` (TEXT, FOREIGN KEY)
- `participating` (INTEGER)
- `responded_at` (TEXT)

**admin_users**
- `id` (TEXT, PRIMARY KEY)
- `username` (TEXT, UNIQUE)
- `password_hash` (TEXT)
- `full_name` (TEXT)
- `role` (TEXT – `"admin"` oder `"operator"`)
- `created_at` (TEXT)

**groups**
- `code` (TEXT, PRIMARY KEY)
- `name` (TEXT)
- `description` (TEXT)
- `created_at` (TEXT)

**device_groups**
- `device_id` (TEXT, FOREIGN KEY)
- `group_code` (TEXT, FOREIGN KEY)
- `assigned_at` (TEXT)

**notification_outbox** (Benachrichtigungs-Tracking pro Gerät)
- `id` (TEXT, PRIMARY KEY)
- `emergency_id` (TEXT, FOREIGN KEY)
- `device_id` (TEXT, FOREIGN KEY)
- `channel` (TEXT – `"fcm"`, `"apns"` oder `"websocket"`)
- `status` (TEXT – `"pending"`, `"delivered"` oder `"failed"`)
- `retry_count` (INTEGER)
- `last_error` (TEXT)
- `created_at` (TEXT)
- `updated_at` (TEXT)

**revoked_tokens** (JWT-Blacklist)
- `token_hash` (TEXT, PRIMARY KEY)
- `expires_at` (TEXT)

### Datenbank sichern

```bash
cp data/alarm-messenger.db data/alarm-messenger.db.backup
```

## Produktiv-Deployment

### PM2 verwenden

```bash
# PM2 global installieren
npm install -g pm2

# Server mit PM2 starten
pm2 start dist/index.js --name alarm-messenger

# PM2-Konfiguration speichern
pm2 save

# PM2 für Autostart beim Booten einrichten
pm2 startup
```

### Docker verwenden

`Dockerfile` erstellen:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Bauen und ausführen:

```bash
docker build -t alarm-messenger-server .
docker run -p 3000:3000 --env-file .env -v $(pwd)/data:/app/data alarm-messenger-server
```

### systemd verwenden

Erstellen Sie `/etc/systemd/system/alarm-messenger.service`:

```ini
[Unit]
Description=Alarm Messenger Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/alarm-messenger/server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:

```bash
sudo systemctl enable alarm-messenger
sudo systemctl start alarm-messenger
sudo systemctl status alarm-messenger
```

## HTTPS/SSL-Setup

### Nginx als Reverse Proxy verwenden

Nginx installieren:
```bash
sudo apt-get install nginx
```

Erstellen Sie `/etc/nginx/sites-available/alarm-messenger`:

```nginx
server {
    listen 80;
    server_name ihre-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Site aktivieren:
```bash
sudo ln -s /etc/nginx/sites-available/alarm-messenger /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

SSL mit Let's Encrypt einrichten:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d ihre-domain.de
```

### Caddy verwenden

`Caddyfile` erstellen:

```
ihre-domain.de {
    reverse_proxy localhost:3000
}
```

Caddy ausführen:
```bash
caddy run
```

## Monitoring

### Logs

Logs anzeigen:
```bash
# PM2
pm2 logs alarm-messenger

# systemd
sudo journalctl -u alarm-messenger -f

# Docker
docker logs -f container-name
```

### Gesundheitsprüfungen

Cronjob einrichten um Server-Gesundheit zu prüfen:

```bash
# Zu crontab hinzufügen
*/5 * * * * curl -f http://localhost:3000/health || echo "Server down" | mail -s "Alert" admin@example.com
```

## Performance-Tuning

### Node.js-Optionen

```bash
# Speicherlimit erhöhen
NODE_OPTIONS="--max-old-space-size=4096" npm start
```

### Datenbankoptimierung

```bash
# Datenbank periodisch bereinigen
sqlite3 data/alarm-messenger.db "VACUUM;"
```

## Sicherheits-Checkliste

- [ ] HTTPS im Produktivbetrieb verwenden
- [ ] API-Schlüssel sicher aufbewahren
- [ ] Firewall-Regeln aktivieren
- [ ] API-Authentifizierung implementieren
- [ ] Regelmäßige Sicherheitsupdates
- [ ] Zugriffsprotokolle überwachen
- [ ] Datenbank regelmäßig sichern
- [ ] Starken API_SECRET_KEY und JWT_SECRET verwenden
- [ ] CORS-Origins im Produktivbetrieb begrenzen
- [ ] Rate Limiting aktivieren

## Problembehandlung

### Server startet nicht

1. Node.js-Version prüfen: `node --version`
2. Prüfen ob Port verfügbar ist: `lsof -i :3000`
3. Umgebungsvariablen prüfen: `cat .env`
4. Logs auf Fehler prüfen

### Datenbankfehler

1. Sicherstellen dass `data`-Verzeichnis existiert und beschreibbar ist
2. Dateiberechtigungen der Datenbank prüfen
3. SQLite3 ist installiert überprüfen

### Push-Benachrichtigungen funktionieren nicht

1. WebSocket-Verbindung überprüfen
2. Prüfen dass Geräte mit dem WebSocket-Server verbunden sind
3. Server-Logs auf WebSocket-Fehler prüfen
4. Sicherstellen dass Geräte korrekt registriert sind

## Aktualisieren

```bash
# Neueste Änderungen pullen
git pull

# Abhängigkeiten installieren
npm install

# Neu bauen
npm run build

# Server neu starten
pm2 restart alarm-messenger
```

## Support

Bei Problemen prüfen Sie:
1. Server-Logs
2. Datenbankintegrität
3. Netzwerkverbindung
4. WebSocket-Verbindung
5. GitHub-Issues

## Nächste Schritte

Nach dem Setup:
1. API-Endpunkte testen
2. QR-Codes für Geräteregistrierung generieren
3. Monitoring einrichten
4. Backups konfigurieren
5. Mobile Apps einrichten
