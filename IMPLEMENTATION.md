# Alarm Messenger - Implementierungsübersicht

## Zusammenfassung

Das Alarm Messenger System wurde vollständig implementiert gemäß den Anforderungen. Es besteht aus einer Backend-Server-Komponente und einer mobilen App für iOS und Android.

## Implementierte Funktionen

### ✅ Backend Server (Node.js/Express)

1. **API-Endpunkte für Einsatzdaten**
   - `POST /api/emergencies` - Einsatz erstellen mit:
     - Einsatznummer
     - Einsatzdatum
     - Einsatzstichwort
     - Einsatzbeschreibung
     - Einsatzort
   
2. **Push-Benachrichtigungen**
   - Automatische Alarmierung aller registrierten Geräte bei Einsatzerstellung
   - Firebase Cloud Messaging (FCM) Integration
   - Verschlüsselte Übertragung über HTTPS/TLS
   
3. **Geräteregistrierung**
   - QR-Code-Generierung: `POST /api/devices/registration-token`
   - Geräteregistrierung: `POST /api/devices/register`
   - Token-basierte Authentifizierung
   
4. **Rückmeldefunktion**
   - Teilnahme-Tracking: `POST /api/emergencies/:id/responses`
   - Abruf teilnehmender Kräfte: `GET /api/emergencies/:id/participants`
   - Speicherung in SQLite-Datenbank

### ✅ Mobile App (React Native)

1. **Geräteregistrierung**
   - QR-Code-Scanner für einfache Registrierung
   - Automatische Verbindung zum Server
   - Speicherung der Registrierungsdaten lokal
   
2. **Push-Benachrichtigungen**
   - Empfang von Einsatz-Alarmen
   - Automatisches Öffnen der App
   - Anzeige der Einsatzinformationen
   
3. **Alarm-UI**
   - Design basierend auf alarm-monitor Repository
   - Dunkles Theme (#1a1a1a)
   - Rote Akzentfarbe (#dc3545) für Notfälle
   - Anhaltende Alarmtöne
   - Große, gut sichtbare Buttons
   
4. **Rückmelde-Buttons**
   - ✅ "TEILNEHMEN" (grün)
   - ❌ "NICHT VERFÜGBAR" (grau)
   - Sofortige Übermittlung an Server

### ✅ Linux-Deployment

1. **Native Installation**
   - Node.js 18+ auf Ubuntu/Debian/CentOS
   - Systemd-Service für automatischen Start
   - PM2-Integration für Prozessmanagement
   
2. **Docker-Container**
   - Production Dockerfile mit Multi-Stage-Build
   - Development Dockerfile mit Hot-Reload
   - docker-compose.yml für einfaches Deployment
   - docker-compose.dev.yml für Entwicklung
   
3. **Nginx Reverse Proxy**
   - SSL/TLS-Terminierung
   - Rate Limiting
   - Optional mit docker-compose --profile with-nginx

## Architektur

```
┌─────────────────────────────────────────┐
│   Externes System (z.B. Alarm Monitor)  │
│          POST /api/emergencies          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────┐
│        Backend Server (Node.js)          │
│  ┌────────────────────────────────────┐  │
│  │  Express API Routes                │  │
│  │  - Emergencies                     │  │
│  │  - Devices                         │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │  Services                          │  │
│  │  - Firebase (Push Notifications)  │  │
│  │  - Database (SQLite)               │  │
│  └────────────────────────────────────┘  │
└──────────────────┬───────────────────────┘
                   │ FCM Push
                   ▼
┌──────────────────────────────────────────┐
│     Mobile Devices (iOS/Android)         │
│  ┌────────────────────────────────────┐  │
│  │  React Native App                  │  │
│  │  - QR Scanner (Registrierung)      │  │
│  │  - Alert UI (Alarmierung)          │  │
│  │  - Response Buttons (Rückmeldung)  │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

## Sicherheit

- ✅ HTTPS/TLS-Verschlüsselung (via Nginx)
- ✅ Firebase Cloud Messaging (Ende-zu-Ende-verschlüsselt)
- ✅ Rate Limiting (100 Anfragen / 15 Minuten)
- ✅ Helmet Security Headers
- ✅ Token-basierte Geräteregistrierung
- ✅ Keine Secrets im Repository
- ✅ CodeQL-Scan: 0 Schwachstellen gefunden

## Verzeichnisstruktur

```
alarm-messenger/
├── server/                    # Backend Server
│   ├── src/
│   │   ├── index.ts          # Server-Einstiegspunkt
│   │   ├── routes/           # API-Routen
│   │   │   ├── emergencies.ts
│   │   │   └── devices.ts
│   │   ├── services/         # Business Logic
│   │   │   ├── database.ts   # SQLite
│   │   │   └── firebase.ts   # FCM
│   │   └── models/           # TypeScript-Typen
│   ├── Dockerfile            # Production
│   ├── Dockerfile.dev        # Development
│   └── package.json
│
├── mobile/                    # Mobile App
│   ├── src/
│   │   ├── App.tsx           # Haupt-App-Komponente
│   │   ├── screens/          # UI-Bildschirme
│   │   │   ├── RegistrationScreen.tsx
│   │   │   ├── EmergencyAlertScreen.tsx
│   │   │   └── HomeScreen.tsx
│   │   ├── services/         # API & Dienste
│   │   │   ├── api.ts
│   │   │   ├── notifications.ts
│   │   │   ├── alarm.ts
│   │   │   └── storage.ts
│   │   └── types/            # TypeScript-Typen
│   ├── android/              # Android Native
│   ├── ios/                  # iOS Native
│   └── package.json
│
├── docs/                      # Dokumentation
│   ├── API.md                # API-Referenz
│   ├── SETUP.md              # Native Installation
│   ├── DOCKER.md             # Docker Deployment
│   └── MOBILE.md             # Mobile App Setup
│
├── nginx/                     # Nginx Reverse Proxy
│   ├── nginx.conf
│   └── ssl/
│
├── docker-compose.yml         # Production
├── docker-compose.dev.yml     # Development
└── README.md
```

## Deployment-Optionen

### Option 1: Docker (Empfohlen für Linux)

```bash
# Klonen
git clone https://github.com/TimUx/alarm-messenger.git
cd alarm-messenger

# Konfigurieren
cp .env.example .env
nano .env  # Firebase-Credentials eintragen

# Starten
docker compose up -d

# Testen
curl http://localhost:3000/health
```

### Option 2: Native Installation

```bash
# Server
cd server
npm install
npm run build
npm start

# Mobile App (iOS)
cd mobile
npm install
cd ios && pod install && cd ..
npm run ios

# Mobile App (Android)
npm run android
```

### Option 3: Mit SSL/TLS (Nginx)

```bash
# SSL-Zertifikate generieren
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem

# Mit Nginx starten
docker compose --profile with-nginx up -d
```

## API-Beispiele

### Einsatz erstellen

```bash
curl -X POST http://localhost:3000/api/emergencies \
  -H "Content-Type: application/json" \
  -d '{
    "emergencyNumber": "2024-001",
    "emergencyDate": "2024-12-07T19:00:00Z",
    "emergencyKeyword": "BRAND 3",
    "emergencyDescription": "Wohnungsbrand im 2. OG",
    "emergencyLocation": "Hauptstraße 123, 12345 Stadt"
  }'
```

### QR-Code generieren

```bash
curl -X POST http://localhost:3000/api/devices/registration-token
```

### Teilnehmer abrufen

```bash
curl http://localhost:3000/api/emergencies/{emergency-id}/participants
```

## Integration mit Alarm Monitor

Das System kann einfach mit dem [alarm-monitor](https://github.com/TimUx/alarm-monitor) integriert werden:

```javascript
// Einsatz erstellen
const response = await fetch('http://alarm-server:3000/api/emergencies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(emergencyData)
});

// Teilnehmer abrufen
const participants = await fetch(
  `http://alarm-server:3000/api/emergencies/${id}/participants`
).then(r => r.json());
```

## Getestete Funktionen

✅ Server-Build erfolgreich  
✅ API-Endpunkte funktional  
✅ Emergency-Erstellung  
✅ Geräteregistrierung  
✅ QR-Code-Generierung  
✅ Response-Tracking  
✅ Teilnehmer-Abruf  
✅ Docker-Build  
✅ CodeQL-Security-Scan (0 Schwachstellen)

## Nächste Schritte

1. **Firebase-Konfiguration**
   - Firebase-Projekt erstellen
   - Service Account Key generieren
   - In .env eintragen

2. **Mobile App Deployment**
   - Firebase für iOS/Android konfigurieren
   - Alarmton-Datei hinzufügen (alarm.mp3)
   - Apps für App Store/Play Store vorbereiten

3. **Produktiv-Deployment**
   - SSL-Zertifikate (Let's Encrypt) einrichten
   - Domain konfigurieren
   - Backup-Strategie implementieren
   - Monitoring aufsetzen

4. **Integration**
   - Mit alarm-monitor verbinden
   - API-Aufrufe testen
   - End-to-End-Tests durchführen

## Support

- **Dokumentation:** Siehe `/docs` Verzeichnis
- **Docker:** [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md)
- **API:** [docs/API.md](docs/API.md)
- **GitHub Issues:** https://github.com/TimUx/alarm-messenger/issues

## Lizenz

MIT License - Siehe LICENSE-Datei für Details.
