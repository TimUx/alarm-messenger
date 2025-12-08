# SSL-Zertifikat-Dateien

Platzieren Sie Ihre SSL-Zertifikate hier:

- `cert.pem` - SSL-Zertifikat
- `key.pem` - Privater Schlüssel

## Selbstsignierte Zertifikate generieren (zum Testen)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/CN=localhost"
```

## Let's Encrypt verwenden

Für den Produktivbetrieb verwenden Sie Let's Encrypt Zertifikate:

```bash
# Certbot installieren
sudo apt-get install certbot

# Zertifikat generieren
sudo certbot certonly --standalone -d ihre-domain.de

# Zertifikate kopieren
sudo cp /etc/letsencrypt/live/ihre-domain.de/fullchain.pem nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/ihre-domain.de/privkey.pem nginx/ssl/key.pem
```

## Sicherheit

**Wichtig:** SSL-Zertifikate nicht in die Versionskontrolle einchecken!
