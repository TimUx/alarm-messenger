# Caddy Konfiguration für Alarm Messenger

Dieses Verzeichnis enthält die Caddy-Konfigurationsdateien für den Alarm Messenger Reverse Proxy.

## Was ist Caddy?

Caddy ist ein moderner, leistungsstarker und benutzerfreundlicher Webserver mit automatischem HTTPS. Caddy bietet gegenüber nginx folgende Vorteile:

- **Automatisches HTTPS**: Let's Encrypt Zertifikate werden automatisch geholt und erneuert
- **Einfache Konfiguration**: Caddyfile ist sehr einfach zu lesen und zu schreiben
- **WebSocket-Unterstützung**: Funktioniert out-of-the-box ohne zusätzliche Konfiguration
- **HTTP/2 und HTTP/3**: Automatisch aktiviert
- **Moderne Features**: Eingebautes Rate Limiting, Health Checks, und mehr

## Caddyfile

Das `Caddyfile` enthält zwei Konfigurationsblöcke:

### 1. Lokales Testen (Port 80)
```
:80 {
    reverse_proxy alarm-messenger-server:3000
}
```

Dieser Block ist standardmäßig aktiv und eignet sich für:
- Lokale Entwicklung
- Testing ohne Domain
- Deployment hinter einem anderen Reverse Proxy

### 2. Produktiv-Deployment (mit Domain)
Der zweite, auskommentierte Block ist für Produktiv-Deployments mit einer echten Domain:
```
ihre-domain.de {
    # Automatisches HTTPS mit Let's Encrypt
    reverse_proxy alarm-messenger-server:3000
}
```

## Verwendung

### Lokales Testen

Standardmäßig ist die Konfiguration für lokales Testen eingerichtet. Starten Sie einfach mit:

```bash
docker compose --profile with-caddy up -d
```

Der Server ist dann verfügbar unter `http://localhost:80`

### Produktiv-Deployment mit Domain

1. **Caddyfile bearbeiten**:
   ```bash
   nano caddy/Caddyfile
   ```

2. **Lokalen Block auskommentieren** (Zeilen mit `:80`)

3. **Produktiv-Block aktivieren**:
   - Entfernen Sie die Kommentarzeichen vor `ihre-domain.de {`
   - Ersetzen Sie `ihre-domain.de` mit Ihrer tatsächlichen Domain
   - Optional: Setzen Sie Ihre E-Mail-Adresse für Let's Encrypt Benachrichtigungen

4. **DNS konfigurieren**:
   - Erstellen Sie einen A-Record für Ihre Domain, der auf die IP-Adresse Ihres Servers zeigt
   - Warten Sie bis die DNS-Propagierung abgeschlossen ist (kann bis zu 24h dauern)

5. **Firewall konfigurieren**:
   ```bash
   # Ports 80 und 443 öffnen
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

6. **Caddy starten**:
   ```bash
   docker compose --profile with-caddy up -d
   ```

Caddy holt automatisch ein Let's Encrypt Zertifikat und konfiguriert HTTPS!

## Features

### WebSocket-Unterstützung

Caddy unterstützt WebSockets automatisch ohne zusätzliche Konfiguration. Die WebSocket-Verbindungen für Push-Benachrichtigungen funktionieren out-of-the-box.

### Automatische HTTPS

Wenn Sie eine echte Domain verwenden, holt Caddy automatisch ein Let's Encrypt Zertifikat:
- Keine manuelle Zertifikatserstellung nötig
- Automatische Erneuerung vor Ablauf
- Unterstützt mehrere Domains
- HTTPS-Redirect automatisch aktiviert

### Health Checks

Caddy prüft regelmäßig die Gesundheit des Backend-Servers über den `/health` Endpunkt.

### Rate Limiting

Optional können Sie Rate Limiting aktivieren um vor Missbrauch zu schützen (im produktiven Block auskommentiert).

### Sicherheits-Header

Die Produktiv-Konfiguration setzt automatisch wichtige Sicherheits-Header:
- X-Frame-Options
- X-Content-Type-Options
- Content-Security-Policy
- HSTS (HTTP Strict Transport Security)
- und mehr

## Logging

Caddy protokolliert alle Zugriffe. Die Logs können Sie mit Docker Compose einsehen:

```bash
# Alle Logs anzeigen
docker compose logs -f caddy

# Nur die letzten 100 Zeilen
docker compose logs --tail=100 caddy
```

## Daten-Persistenz

Caddy speichert Let's Encrypt Zertifikate und andere Daten in einem Docker Volume:
- `caddy-data`: Enthält Zertifikate und andere Caddy-Daten
- `caddy-config`: Enthält Caddy-Konfigurationsdaten

Diese Volumes werden automatisch von Docker Compose erstellt und bleiben erhalten, auch wenn der Container gestoppt wird.

## Subdomain-Konfiguration

Sie können auch eine separate Subdomain für das Admin-Interface verwenden. Im Caddyfile ist ein Beispiel enthalten:

```
admin.ihre-domain.de {
    reverse_proxy alarm-messenger-server:3000
}
```

Damit ist das Admin-Interface unter `https://admin.ihre-domain.de/admin/` erreichbar.

## Troubleshooting

### Zertifikat-Fehler

Wenn Caddy kein Zertifikat holen kann:
- Prüfen Sie, ob Port 80 und 443 von außen erreichbar sind
- Prüfen Sie die DNS-Einträge Ihrer Domain
- Schauen Sie in die Caddy-Logs: `docker compose logs caddy`
- Let's Encrypt hat Rate Limits - zu viele fehlgeschlagene Versuche können zu temporären Sperren führen

### WebSocket-Verbindungen funktionieren nicht

- WebSockets sollten automatisch funktionieren
- Prüfen Sie, ob eine Firewall WebSocket-Verbindungen blockiert
- Schauen Sie in die Backend-Logs: `docker compose logs alarm-messenger-server`

### Port bereits in Verwendung

```bash
# Prüfen Sie, was Port 80/443 verwendet
sudo lsof -i :80
sudo lsof -i :443

# Stoppen Sie andere Webserver (z.B. nginx oder apache)
sudo systemctl stop nginx
sudo systemctl stop apache2
```

## Vergleich mit nginx

| Feature | Caddy | nginx |
|---------|-------|-------|
| Automatisches HTTPS | ✅ Eingebaut | ❌ Manuell mit Certbot |
| Konfiguration | ✅ Sehr einfach | ⚠️ Komplex |
| WebSocket | ✅ Automatisch | ⚠️ Manuelle Konfiguration |
| HTTP/2 | ✅ Automatisch | ⚠️ Manuelle Konfiguration |
| HTTP/3 | ✅ Automatisch | ⚠️ Komplex |
| Performance | ✅ Sehr gut | ✅ Excellent |
| Speicherverbrauch | ✅ Niedrig | ✅ Sehr niedrig |

## Weitere Ressourcen

- [Caddy Dokumentation](https://caddyserver.com/docs/)
- [Caddyfile Syntax](https://caddyserver.com/docs/caddyfile)
- [Caddy im Docker](https://hub.docker.com/_/caddy)
