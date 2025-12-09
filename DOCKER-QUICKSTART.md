# Schnellstart mit Docker

Der schnellste Weg, den Alarm Messenger Server zu betreiben, ist die Verwendung von Docker.

## Inhaltsverzeichnis

- [Voraussetzungen](#voraussetzungen)
- [Schnellstart](#schnellstart)
- [Docker-Befehle](#docker-befehle)
- [Entwicklungsmodus](#entwicklungsmodus)
- [Mit SSL/TLS (Caddy - Empfohlen)](#mit-ssltls-caddy---empfohlen)
- [Mit SSL/TLS (Nginx - Legacy)](#mit-ssltls-nginx---legacy)
- [Dokumentation](#dokumentation)
- [Support](#support)

## Voraussetzungen

- Docker auf Ihrem Linux-System installiert
- Docker Compose (v2.0+)

## Schnellstart

1. **Repository klonen:**
   ```bash
   git clone https://github.com/TimUx/alarm-messenger.git
   cd alarm-messenger
   ```

2. **Umgebung konfigurieren:**
   ```bash
   cp .env.example .env
   nano .env  # Mit API-Schlüsseln bearbeiten (Firebase nicht mehr benötigt!)
   ```

3. **Server starten:**
   ```bash
   docker compose up -d
   ```

4. **Prüfen ob Server läuft:**
   ```bash
   curl http://localhost:3000/health
   ```

Das war's! Der Server läuft jetzt auf Port 3000.

## Docker-Befehle

```bash
# Server starten
docker compose up -d

# Logs anzeigen
docker compose logs -f

# Server stoppen
docker compose down

# Server neu starten
docker compose restart

# Aktualisieren und neu bauen
docker compose up -d --build
```

## Entwicklungsmodus

Für die Entwicklung mit Hot-Reload:

```bash
docker compose -f docker-compose.dev.yml up
```

## Mit SSL/TLS (Caddy - Empfohlen)

### Lokales Testen

```bash
# Mit Caddy starten (keine weitere Konfiguration nötig)
docker compose --profile with-caddy up -d
```

### Produktiv mit echter Domain

```bash
# 1. Caddyfile bearbeiten
nano caddy/Caddyfile
# - Lokalen Block auskommentieren (:80)
# - Produktiv-Block aktivieren und 'ihre-domain.de' ersetzen

# 2. Firewall-Ports öffnen
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Mit Caddy starten
docker compose --profile with-caddy up -d
```

Caddy holt automatisch ein Let's Encrypt Zertifikat - keine manuelle Zertifikatsverwaltung nötig!

## Mit SSL/TLS (Nginx - Legacy)

```bash
# Selbstsigniertes Zertifikat generieren (nur zum Testen)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"

# Mit Nginx starten
docker compose --profile with-nginx up -d
```

## Dokumentation

Für vollständige Dokumentation, siehe:
- [docs/DOCKER.md](docs/DOCKER.md) - Vollständige Docker-Deployment-Anleitung
- [docs/SETUP.md](docs/SETUP.md) - Native Linux-Einrichtung
- [docs/API.md](docs/API.md) - API-Dokumentation

## Support

- Logs prüfen: `docker compose logs -f`
- Probleme melden: https://github.com/TimUx/alarm-messenger/issues
