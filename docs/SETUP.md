# Server-Setup-Anleitung

## Voraussetzungen

- Node.js 18 oder höher
- npm oder yarn
- Firebase-Projekt (für Push-Benachrichtigungen)
- SQLite3 (in Abhängigkeiten enthalten)

## Schritt 1: Abhängigkeiten installieren

```bash
cd server
npm install
```

## Schritt 2: Firebase konfigurieren

1. Gehen Sie zur [Firebase Console](https://console.firebase.google.com/)
2. Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes aus
3. Gehen Sie zu Projekteinstellungen > Service-Konten
4. Klicken Sie auf "Neuen privaten Schlüssel generieren"
5. Speichern Sie die JSON-Datei sicher

## Schritt 3: Umgebungsvariablen konfigurieren

```bash
cp .env.example .env
```

Bearbeiten Sie die `.env`-Datei mit Ihrer Konfiguration:

```env
# Server-Konfiguration
PORT=3000
NODE_ENV=production

# Firebase-Konfiguration
FIREBASE_PROJECT_ID=ihr-projekt-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nIhr privater Schlüssel hier\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ihr-projekt-id.iam.gserviceaccount.com

# Datenbank
DATABASE_PATH=./data/alarm-messenger.db

# Sicherheit
API_SECRET_KEY=ihr-geheim-schlüssel-hier

# Optional: Server-URL für QR-Codes
SERVER_URL=http://localhost:3000
```

**Wichtig:** 
- Halten Sie Ihre Firebase-Zugangsdaten sicher
- Committen Sie niemals die `.env`-Datei in die Versionskontrolle
- Ersetzen Sie Zeilenumbrüche in `FIREBASE_PRIVATE_KEY` durch `\n`

## Schritt 4: Anwendung bauen

```bash
npm run build
```

Dies kompiliert TypeScript zu JavaScript im `dist`-Verzeichnis.

## Schritt 5: Server starten

### Entwicklungsmodus
```bash
npm run dev
```

### Produktivmodus
```bash
npm start
```

Der Server startet auf dem in `.env` angegebenen Port (Standard: 3000).

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

**devices**
- `id` (TEXT, PRIMARY KEY)
- `device_token` (TEXT, UNIQUE)
- `registration_token` (TEXT)
- `platform` (TEXT)
- `registered_at` (TEXT)
- `active` (INTEGER)

**responses**
- `id` (TEXT, PRIMARY KEY)
- `emergency_id` (TEXT, FOREIGN KEY)
- `device_id` (TEXT, FOREIGN KEY)
- `participating` (INTEGER)
- `responded_at` (TEXT)

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
- [ ] Firebase-Zugangsdaten sicher aufbewahren
- [ ] Firewall-Regeln aktivieren
- [ ] API-Authentifizierung implementieren
- [ ] Regelmäßige Sicherheitsupdates
- [ ] Zugriffsprotokolle überwachen
- [ ] Datenbank regelmäßig sichern
- [ ] Starken API_SECRET_KEY verwenden
- [ ] CORS-Origins im Produktivbetrieb begrenzen
- [ ] Rate Limiting aktivieren

## Problembehandlung

### Server startet nicht

1. Node.js-Version prüfen: `node --version`
2. Prüfen ob Port verfügbar ist: `lsof -i :3000`
3. Umgebungsvariablen prüfen: `cat .env`
4. Logs auf Fehler prüfen

### Firebase-Fehler

1. Firebase-Zugangsdaten sind korrekt überprüfen
2. Sicherstellen dass Cloud Messaging im Firebase-Projekt aktiviert ist
3. Service-Konto-Berechtigungen prüfen

### Datenbankfehler

1. Sicherstellen dass `data`-Verzeichnis existiert und beschreibbar ist
2. Dateiberechtigungen der Datenbank prüfen
3. SQLite3 ist installiert überprüfen

### Push-Benachrichtigungen funktionieren nicht

1. Firebase-Konfiguration überprüfen
2. Prüfen dass Geräte-FCM-Tokens gültig sind
3. Sicherstellen dass Cloud Messaging in Firebase aktiviert ist
4. Server-Logs auf FCM-Fehler prüfen

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
4. Firebase-Status
5. GitHub-Issues

## Nächste Schritte

Nach dem Setup:
1. API-Endpunkte testen
2. QR-Codes für Geräteregistrierung generieren
3. Monitoring einrichten
4. Backups konfigurieren
5. Mobile Apps einrichten
