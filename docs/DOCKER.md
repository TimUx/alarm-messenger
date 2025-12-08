# Docker-Deployment-Anleitung

Diese Anleitung erklärt, wie der Alarm Messenger Server auf Linux mittels Docker und docker-compose deployed wird.

## Voraussetzungen

### Systemanforderungen
- Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+ oder ähnlich)
- Docker 20.10+
- Docker Compose 2.0+
- 1GB RAM minimum
- 10GB Festplattenspeicher

### Docker installieren

#### Ubuntu/Debian
```bash
# Paket-Index aktualisieren
sudo apt-get update

# Abhängigkeiten installieren
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Docker's offiziellen GPG-Schlüssel hinzufügen
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Stabiles Repository einrichten
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker Engine installieren
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Installation überprüfen
docker --version
docker compose version
```

#### CentOS/RHEL
```bash
# Abhängigkeiten installieren
sudo yum install -y yum-utils

# Docker-Repository hinzufügen
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Docker Engine installieren
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Docker starten
sudo systemctl start docker
sudo systemctl enable docker

# Installation überprüfen
docker --version
docker compose version
```

#### Benutzer zur Docker-Gruppe hinzufügen
```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Schnellstart

### 1. Repository klonen
```bash
git clone https://github.com/TimUx/alarm-messenger.git
cd alarm-messenger
```

### 2. Umgebung konfigurieren
```bash
# Beispiel-Umgebungsdatei kopieren
cp .env.example .env

# Mit Ihrer Konfiguration bearbeiten
nano .env
```

**Wichtig:** Konfigurieren Sie Firebase-Zugangsdaten in `.env` damit Push-Benachrichtigungen funktionieren.

### 3. Server starten (Produktiv)
```bash
# Bauen und starten
docker compose up -d

# Logs anzeigen
docker compose logs -f

# Status prüfen
docker compose ps
```

Der Server ist verfügbar unter `http://localhost:3000`

### 4. Deployment verifizieren
```bash
# Gesundheitsprüfung
curl http://localhost:3000/health

# Erwartete Ausgabe:
# {"status":"ok","timestamp":"2024-12-07T19:00:00.000Z"}
```

## Entwicklungsmodus

Für Entwicklung mit Hot-Reload:

```bash
# Im Entwicklungsmodus starten
docker compose -f docker-compose.dev.yml up

# Der Server startet automatisch neu wenn Sie Dateien in server/src/ bearbeiten
```

## Nginx Reverse Proxy verwenden

Um SSL/TLS-Unterstützung mit Nginx hinzuzufügen:

### 1. SSL-Zertifikate konfigurieren

#### Selbstsigniert (Zum Testen)
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

#### Let's Encrypt (Produktiv)
```bash
# Certbot installieren
sudo apt-get install certbot

# Zertifikat generieren (docker-compose zuerst stoppen)
docker compose down
sudo certbot certonly --standalone -d ihre-domain.de

# Zertifikate kopieren
sudo cp /etc/letsencrypt/live/ihre-domain.de/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/ihre-domain.de/privkey.pem nginx/ssl/key.pem
sudo chmod 644 nginx/ssl/*.pem
```

### 2. Nginx in docker-compose.yml aktivieren
```bash
# HTTPS-Konfiguration in nginx/nginx.conf auskommentieren
nano nginx/nginx.conf

# Mit Nginx-Profil starten
docker compose --profile with-nginx up -d
```

Jetzt ist der Server verfügbar unter:
- HTTP: `http://localhost:80`
- HTTPS: `https://localhost:443`

## Docker-Befehle

### Services starten
```bash
# Alle Services starten
docker compose up -d

# Spezifischen Service starten
docker compose up -d alarm-messenger-server

# Mit Nginx starten
docker compose --profile with-nginx up -d
```

### Services stoppen
```bash
# Alle Services stoppen
docker compose down

# Stoppen aber Volumes behalten
docker compose stop

# Stoppen und Volumes entfernen (WARNUNG: löscht Datenbank)
docker compose down -v
```

### Logs anzeigen
```bash
# Alle Services
docker compose logs -f

# Spezifischer Service
docker compose logs -f alarm-messenger-server

# Letzte 100 Zeilen
docker compose logs --tail=100 alarm-messenger-server
```

### Services neu starten
```bash
# Alle neu starten
docker compose restart

# Spezifischen Service neu starten
docker compose restart alarm-messenger-server
```

### Anwendung aktualisieren
```bash
# Neuesten Code pullen
git pull

# Neu bauen und neu starten
docker compose up -d --build
```

## Datenbankverwaltung

### Datenbank sichern
```bash
# Backup erstellen
docker compose exec alarm-messenger-server cp /app/data/alarm-messenger.db /app/data/backup-$(date +%Y%m%d-%H%M%S).db

# Backup auf Host kopieren
docker cp alarm-messenger-server:/app/data/backup-*.db ./backups/
```

### Datenbank wiederherstellen
```bash
# Backup in Container kopieren
docker cp ./backups/backup-20240101-120000.db alarm-messenger-server:/app/data/alarm-messenger.db

# Service neu starten
docker compose restart alarm-messenger-server
```

### Datenbank anzeigen
```bash
# SQLite CLI aufrufen
docker compose exec alarm-messenger-server sh -c "cd /app/data && sqlite3 alarm-messenger.db"

# Beispiel-Abfragen
sqlite> .tables
sqlite> SELECT * FROM emergencies;
sqlite> .exit
```

## Monitoring

### Gesundheitsprüfung
```bash
# Container-Gesundheit prüfen
docker compose ps

# Manuelle Gesundheitsprüfung
curl http://localhost:3000/health
```

### Ressourcennutzung
```bash
# Ressourcennutzung anzeigen
docker stats alarm-messenger-server

# Festplattennutzung anzeigen
docker system df
```

### Container-Shell-Zugriff
```bash
# Container-Shell aufrufen
docker compose exec alarm-messenger-server sh

# Dateien anzeigen
ls -la /app
cat /app/data/alarm-messenger.db

# Beenden
exit
```

## Problembehandlung

### Container startet nicht
```bash
# Logs prüfen
docker compose logs alarm-messenger-server

# Container-Status prüfen
docker compose ps -a

# Image neu bauen
docker compose build --no-cache
docker compose up -d
```

### Port bereits in Verwendung
```bash
# Prüfen was den Port verwendet
sudo lsof -i :3000

# Prozess beenden oder Port in docker-compose.yml ändern
```

### Berechtigungsfehler
```bash
# Volume-Berechtigungen korrigieren
sudo chown -R 1000:1000 ./server/data

# Oder als root ausführen (nicht empfohlen)
docker compose run --user root alarm-messenger-server sh
```

### Datenbank gesperrt
```bash
# Alle Container stoppen
docker compose down

# Veraltete Sperre entfernen
sudo rm ./server/data/*.db-shm ./server/data/*.db-wal

# Neu starten
docker compose up -d
```

### Firebase funktioniert nicht
```bash
# Umgebungsvariablen prüfen
docker compose exec alarm-messenger-server env | grep FIREBASE

# Zugangsdaten-Format überprüfen
# Privater Schlüssel muss \n durch tatsächliche Zeilenumbrüche in .env ersetzt haben
```

## Produktiv-Deployment-Checkliste

- [ ] Ordnungsgemäße `.env`-Datei mit Firebase-Zugangsdaten konfigurieren
- [ ] SSL/TLS-Zertifikate einrichten
- [ ] Firewall-Regeln konfigurieren
- [ ] Automatisierte Backups einrichten
- [ ] Log-Rotation konfigurieren
- [ ] Monitoring und Alerts einrichten
- [ ] Einsatzbenachrichtigungs-Ablauf testen
- [ ] Automatischen Container-Neustart bei Fehler einrichten
- [ ] Deployment für Team dokumentieren
- [ ] Reverse Proxy (Nginx) konfigurieren
- [ ] Domainnamen und DNS einrichten

## Systemd-Service (Optional)

Um docker-compose automatisch beim Booten zu starten:

Erstellen Sie `/etc/systemd/system/alarm-messenger.service`:

```ini
[Unit]
Description=Alarm Messenger Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/alarm-messenger
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Aktivieren und starten:
```bash
sudo systemctl enable alarm-messenger
sudo systemctl start alarm-messenger
sudo systemctl status alarm-messenger
```

## Performance-Tuning

### Container-Ressourcen erhöhen
`docker-compose.yml` bearbeiten:

```yaml
services:
  alarm-messenger-server:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 512M
```

### Logging-Rotation aktivieren
`docker-compose.yml` bearbeiten:

```yaml
services:
  alarm-messenger-server:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Sicherheits-Best-Practices

1. **Secrets für sensible Daten verwenden:**
   ```bash
   # Docker Secret erstellen
   echo "your-api-key" | docker secret create api_secret_key -
   ```

2. **Als Nicht-Root-Benutzer ausführen:**
   Zu Dockerfile hinzufügen:
   ```dockerfile
   USER node
   ```

3. **Images auf Schwachstellen scannen:**
   ```bash
   docker scan alarm-messenger-server
   ```

4. **Docker aktuell halten:**
   ```bash
   sudo apt-get update
   sudo apt-get upgrade docker-ce docker-ce-cli containerd.io
   ```

5. **Netzwerkisolierung verwenden:**
   - Datenbank in internem Netzwerk halten
   - Nur notwendige Ports freigeben

## Support

Bei Problemen:
1. Logs prüfen: `docker compose logs -f`
2. Konfiguration überprüfen: `docker compose config`
3. Gesundheitsendpunkt testen: `curl http://localhost:3000/health`
4. GitHub-Issues prüfen
5. Dokumentation durchsehen

## Zusätzliche Ressourcen

- [Docker-Dokumentation](https://docs.docker.com/)
- [Docker Compose-Dokumentation](https://docs.docker.com/compose/)
- [Linux-Server-Administration](https://ubuntu.com/server/docs)
- [Nginx-Dokumentation](https://nginx.org/en/docs/)
