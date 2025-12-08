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

## Caddy Reverse Proxy verwenden

Um SSL/TLS-Unterstützung mit Caddy hinzuzufügen:

### Warum Caddy?

Caddy bietet gegenüber anderen Reverse Proxies wie nginx folgende Vorteile:
- **Automatisches HTTPS**: Let's Encrypt Zertifikate werden automatisch geholt und erneuert
- **Einfache Konfiguration**: Sehr einfach zu lesen und zu schreiben
- **WebSocket-Unterstützung**: Funktioniert out-of-the-box ohne zusätzliche Konfiguration
- **HTTP/2 und HTTP/3**: Automatisch aktiviert
- **Moderne Features**: Eingebautes Rate Limiting, Health Checks, und mehr

### 1. Lokales Testen (ohne Domain)

Für lokales Testen ist keine weitere Konfiguration nötig:

```bash
# Mit Caddy starten
docker compose --profile with-caddy up -d
```

Der Server ist verfügbar unter:
- HTTP: `http://localhost:80`

### 2. Produktiv-Deployment mit echter Domain

#### Schritt 1: Domain vorbereiten

Stellen Sie sicher, dass:
- Ihre Domain mit einem A-Record auf die IP-Adresse Ihres Servers zeigt
- Port 80 und 443 in Ihrer Firewall geöffnet sind

```bash
# Firewall-Ports öffnen
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

#### Schritt 2: Caddyfile bearbeiten

```bash
# Caddyfile bearbeiten
nano caddy/Caddyfile
```

1. **Lokalen Block auskommentieren** (die Zeilen mit `:80 { ... }`)
2. **Produktiv-Block aktivieren**:
   - Entfernen Sie die Kommentarzeichen vor dem Block `ihre-domain.de { ... }`
   - Ersetzen Sie `ihre-domain.de` mit Ihrer tatsächlichen Domain (z.B. `alarm.example.com`)
   - Optional: Setzen Sie Ihre E-Mail-Adresse in der `tls` Direktive für Let's Encrypt Benachrichtigungen

**Beispiel-Konfiguration**:
```
# In caddy/Caddyfile
alarm.example.com {
    # Automatisches HTTPS mit Let's Encrypt
    tls admin@example.com
    
    # Reverse Proxy zum Backend Server
    reverse_proxy alarm-messenger-server:3000 {
        # WebSocket-Unterstützung ist automatisch aktiviert
        
        # Health Check
        health_uri /health
        health_interval 30s
        health_timeout 10s
    }
}
```

#### Schritt 3: Caddy starten

```bash
# Mit Caddy-Profil starten
docker compose --profile with-caddy up -d

# Logs überwachen
docker compose logs -f caddy
```

Caddy holt automatisch ein Let's Encrypt Zertifikat und konfiguriert HTTPS!

**Wichtig**: Beim ersten Start kann es 1-2 Minuten dauern, bis das Zertifikat geholt wurde. Beobachten Sie die Logs mit `docker compose logs -f caddy`.

Jetzt ist der Server verfügbar unter:
- HTTP: `http://ihre-domain.de` (wird automatisch zu HTTPS umgeleitet)
- HTTPS: `https://ihre-domain.de`

### 3. Erweiterte Konfiguration

#### WebSocket-Unterstützung

WebSockets funktionieren automatisch ohne zusätzliche Konfiguration. Caddy erkennt WebSocket-Upgrades und leitet sie korrekt weiter.

#### Rate Limiting aktivieren

Um Rate Limiting zum Schutz vor Missbrauch zu aktivieren, entkommentieren Sie im Caddyfile den `rate_limit` Block:

```
rate_limit {
    zone dynamic {
        key {remote_host}
        events 100
        window 1s
    }
}
```

#### Mehrere Domains

Sie können mehrere Domains im Caddyfile konfigurieren:

```
alarm.example.com {
    reverse_proxy alarm-messenger-server:3000
}

admin.example.com {
    # Nur Admin-Interface
    reverse_proxy alarm-messenger-server:3000
}
```

#### Subdomain für Admin-Interface

Für erhöhte Sicherheit können Sie das Admin-Interface auf einer separaten Subdomain bereitstellen:

```
admin.example.com {
    # Automatisches HTTPS
    tls admin@example.com
    
    # Nur Admin-Pfade erlauben
    @admin {
        path /admin/*
    }
    
    reverse_proxy @admin alarm-messenger-server:3000
    
    # Alle anderen Anfragen blockieren
    respond 404
}
```

### 4. Zertifikatsverwaltung

#### Automatische Erneuerung

Caddy erneuert Let's Encrypt Zertifikate automatisch bevor sie ablaufen. Sie müssen nichts tun!

#### Zertifikate prüfen

```bash
# Caddy Container Shell aufrufen
docker compose exec caddy sh

# Zertifikate anzeigen
ls -la /data/caddy/certificates/

# Container verlassen
exit
```

#### Zertifikate manuell erneuern (optional)

```bash
# Caddy neu laden (holt neue Zertifikate falls nötig)
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

## Docker-Befehle

### Services starten
```bash
# Alle Services starten
docker compose up -d

# Spezifischen Service starten
docker compose up -d alarm-messenger-server

# Mit Caddy starten (empfohlen)
docker compose --profile with-caddy up -d

# Mit Nginx starten (Legacy)
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
- [ ] SSL/TLS mit Caddy einrichten (automatisch mit Let's Encrypt)
- [ ] Firewall-Regeln konfigurieren (Port 80 und 443 öffnen)
- [ ] Automatisierte Backups einrichten
- [ ] Log-Rotation konfigurieren
- [ ] Monitoring und Alerts einrichten
- [ ] Einsatzbenachrichtigungs-Ablauf testen
- [ ] Automatischen Container-Neustart bei Fehler einrichten
- [ ] Deployment für Team dokumentieren
- [ ] Reverse Proxy (Caddy) konfigurieren
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
- [Caddy-Dokumentation](https://caddyserver.com/docs/)
- [Caddy Caddyfile-Syntax](https://caddyserver.com/docs/caddyfile)
