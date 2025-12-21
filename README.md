# Alarm Messenger System

Ein vollständiges Alarmierungssystem für Feuerwehren und Rettungsdienste mit Echtzeit-Push-Benachrichtigungen, Rückmeldefunktion und umfangreicher Verwaltung.

## 📋 Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Funktionen](#funktionen)
- [Architektur](#architektur)
- [Screenshots](#screenshots)
- [Schnellstart](#schnellstart)
- [Admin-Interface](#admin-interface)
- [Mobile App](#mobile-app)
- [Push Notifications](#push-notifications)
- [API-Integration](#api-integration)
- [Deployment](#deployment)
- [Dokumentation](#dokumentation)
- [FAQ](#faq)

## Übersicht

Das Alarm Messenger System ist eine moderne, eigenständige Lösung zur Alarmierung von Einsatzkräften. Es besteht aus drei Hauptkomponenten:

- **🖥️ Backend Server** - Node.js/Express API mit WebSocket- und Push-Notification-Unterstützung
- **📱 Mobile App** - Flutter App für iOS und Android
- **👤 Admin-Interface** - Webbasiertes Verwaltungsportal

### Warum Alarm Messenger?

- ✅ **Keine externen Abhängigkeiten** - Vollständig eigenständig, keine Cloud-Dienste erforderlich
- ✅ **Zuverlässige Push-Benachrichtigungen** - WebSocket + optional FCM/APNs für Hintergrund-Benachrichtigungen
- ✅ **Umfassende Einsatzkraftverwaltung** - Qualifikationen, Führungsrollen, Gruppenzuordnungen
- ✅ **Alarmierungsgruppen** - Gezielte Alarmierung nach Gruppen
- ✅ **Vollständige API** - Integration mit bestehenden Systemen (z.B. alarm-monitor)
- ✅ **Einsatz-Historie** - Lückenlose Dokumentation aller Einsätze und Rückmeldungen
- ✅ **Sicher** - API-Key und JWT-Authentifizierung, HTTPS/TLS-Verschlüsselung
- ✅ **Open Source** - MIT-Lizenz

## Funktionen

### Backend Server

- RESTful API zur Einsatzverwaltung
- **Hybrid Push-Benachrichtigungen**:
  - WebSocket für Echtzeit-Benachrichtigungen (immer aktiv)
  - Optional: Firebase Cloud Messaging (FCM) für Android
  - Optional: Apple Push Notification service (APNs) für iOS
  - Graceful Fallback zu WebSocket wenn Push nicht verfügbar
- SQLite-Datenbank zur Datenpersistenz
- Geräteregistrierung mit QR-Code-Generierung und Persistenz
- API-Key-Authentifizierung für Einsatzerstellung
- JWT-basierte Admin-Authentifizierung mit rollenbasierter Zugriffskontrolle
- Benutzerverwaltung mit zwei Rollen (Administrator und Operator)
- Base64-Kodierung für Secrets (optional)
- Alarmierungsgruppen-System mit CSV-Import
- Einsatz-Historie mit vollständiger Rückmeldedokumentation

### Admin Web-Interface

Das Admin-Interface bietet fünf Hauptbereiche:

#### 1. **Dashboard** 
- Statistik-Übersicht (Geräte, Gruppen, Einsätze)
- QR-Code-Generierung für neue Geräte
- Schnellzugriff auf wichtige Funktionen

#### 2. **Einsatzkräfte** (Geräte-Verwaltung)
- Übersicht aller registrierten Geräte
- Bearbeitung von Einsatzkraft-Informationen:
  - Vorname und Nachname
  - Qualifikationen (Maschinist, AGT, Sanitäter)
  - Führungsrolle (Keine, Gruppenführer, Zugführer)
  - Gruppenzuordnungen
- QR-Code erneut anzeigen und herunterladen
- Geräte deaktivieren

#### 3. **Alarm-Gruppen**
- Verwaltung von Alarmierungsgruppen
- Gruppen erstellen, bearbeiten und löschen
- CSV-Import für Massen-Import von Gruppen
- Zuordnung von Einsatzkräften zu Gruppen

#### 4. **Einsatz-Historie**
- Chronologische Liste aller Einsätze
- Detailansicht mit vollständigen Einsatzinformationen
- Alle Rückmeldungen mit Einsatzkraft-Details
- Statistiken (Teilnehmer, Absagen)
- Pagination für große Datenmengen

#### 5. **Benutzerverwaltung**
- Verwaltung von Admin-Benutzern
- Zwei Rollen: Administrator (Vollzugriff) und Operator (Nur-Lesen)
- Benutzer erstellen, bearbeiten und löschen
- Passwort-Änderung für alle Benutzer
- Rollenbasierte Zugriffskontrolle auf alle Admin-Funktionen

**Design:**
- Hell/Dunkel-Theme-Umschaltung
- Responsives Design für Desktop und Mobile
- Dunkles Theme im alarm-monitor Stil
- Persistente Theme-Einstellung

### Mobile App

- QR-Code-Scanner zur Geräteregistrierung
- WebSocket-basierte Echtzeit-Benachrichtigungen
- Einsatzalarm-Anzeige mit Alarmtönen
- Zwei-Button-Rückmeldung (Teilnehmen/Ablehnen)
- Einsatzverlaufs-Ansicht
- Hell/Dunkel/Auto Theme-Modi
- Plattformübergreifend (iOS & Android)
- Entwickelt mit Flutter für optimale Performance
- **Informationsanzeige:** Feuerwehrname, Einsatzkraftname und Details (Qualifikationen, Gruppen, Server-Infos) werden in der App angezeigt

**📱 Mobile App Build:**
- 📖 [Flutter Mobile App Dokumentation](mobile/README.md) - Setup, Entwicklung & Deployment
- 🔨 [Legacy React Native Build-Anleitung](docs/BUILD-ANLEITUNG-LINUX.md) - Schritt-für-Schritt Android APK erstellen
- 📖 [Legacy Mobile Dokumentation](docs/MOBILE.md) - iOS & Android, GitHub Actions
- ⚙️ Automatische Builds via GitHub Actions bei Code-Änderungen

**🚀 Releases:**
- 📦 [Release-Dokumentation](docs/RELEASE.md) - Releases erstellen mit Mobile App Builds
- 🏷️ Automatischer Release-Workflow bei Version-Tags (z.B., `v1.0.0`)
- 📱 Inkludiert Android APK/AAB und iOS Builds
- 🐳 Docker Images automatisch auf GitHub Container Registry

## Architektur

```
┌──────────────────────┐
│  Externes System     │  (z.B. alarm-mail)
│  Einsatzerstellung   │
└──────────┬───────────┘
           │ POST /api/emergencies
           │ (mit API-Key)
           ▼
┌──────────────────────┐
│   Backend Server     │
│   (Node.js/Express)  │
│                      │
│   ┌──────────────┐   │
│   │  REST API    │   │  ← Admin-Interface (Browser)
│   ├──────────────┤   │
│   │  WebSocket   │   │  ← Mobile Geräte (Push)
│   ├──────────────┤   │
│   │   SQLite DB  │   │
│   └──────────────┘   │
└──────────┬───────────┘
           │ WebSocket Push
           ▼
┌──────────────────────┐
│   Mobile Geräte      │
│   (iOS/Android)      │
│                      │
│   ┌──────────────┐   │
│   │ Alarm-Ansicht│   │
│   │  Rückmeldung │   │
│   └──────────────┘   │
└──────────────────────┘
```

### Ablauf einer Alarmierung

1. **Externes System** (z.B. alarm-mail) erstellt Einsatz via API
2. **Backend** empfängt Einsatz und speichert in Datenbank
3. **Backend** ermittelt betroffene Geräte (alle oder nach Gruppen gefiltert)
4. **Backend** sendet Push-Benachrichtigungen via WebSocket
5. **Mobile App** empfängt Benachrichtigung und zeigt Alarm an
6. **Einsatzkraft** antwortet (Teilnehmen/Ablehnen)
7. **Backend** speichert Rückmeldung mit Zeitstempel und Einsatzkraft-Details
8. **Externes System** kann Rückmeldungen über API abrufen

## Screenshots

### Admin-Interface

Das Admin-Interface ist unter `https://ihr-server/admin/` erreichbar und bietet alle Verwaltungsfunktionen in einem übersichtlichen Design.

#### Login

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-login-light.png" width="400"> | <img src="screenshots/admin-login-dark.png" width="400"> |

#### Dashboard

Dashboard mit Statistiken, QR-Code-Generierung und Schnellzugriff.

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-dashboard-light.png" width="400"> | <img src="screenshots/admin-dashboard-dark.png" width="400"> |

#### Einsatzkräfte-Verwaltung

Verwaltung aller registrierten Geräte und Einsatzkräfte unter `/admin/devices.html`.

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-devices-light.png" width="400"> | <img src="screenshots/admin-devices-dark.png" width="400"> |

**Funktionen:**
- Liste aller Einsatzkräfte mit Qualifikationen und Rollen
- Bearbeiten von Einsatzkraft-Informationen
- QR-Code erneut anzeigen
- Geräte deaktivieren

#### Einsatzkraft bearbeiten

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-edit-device-light.png" width="400"> | <img src="screenshots/admin-edit-device-dark.png" width="400"> |

#### Alarm-Gruppen-Verwaltung

Verwaltung von Alarmierungsgruppen unter `/admin/groups.html`.

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-groups-light.png" width="400"> | <img src="screenshots/admin-groups-dark.png" width="400"> |

#### Gruppe hinzufügen/bearbeiten

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-add-group-light.png" width="400"> | <img src="screenshots/admin-add-group-dark.png" width="400"> |

#### CSV-Import für Gruppen

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-import-csv-light.png" width="400"> | <img src="screenshots/admin-import-csv-dark.png" width="400"> |

CSV-Format: `code,name,description`

#### Einsatz-Historie

Vollständige Übersicht aller Einsätze mit Detailansicht unter `/admin/history.html`.

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-history-light.png" width="400"> | <img src="screenshots/admin-history-dark.png" width="400"> |

**Funktionen:**
- Chronologische Liste aller Einsätze
- Detailansicht mit allen Rückmeldungen
- Anzeige von Qualifikationen und Führungsrollen
- Pagination

#### Benutzerverwaltung

Verwaltung von Admin-Benutzern und Zugriffskontrolle unter `/admin/users.html`.

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/user-management-light.png" width="400"> | <img src="screenshots/user-management-dark.png" width="400"> |

**Funktionen:**
- Benutzer anlegen, bearbeiten und löschen
- Zwei Rollen: **Administrator** (Vollzugriff) und **Operator** (Nur-Lesen)
- Passwort-Änderung für alle Benutzer
- Eigenes Passwort selbst ändern
- Anzeige des aktuellen Benutzers im Header mit Rolle
- Vollständige Zugriffskontrolle auf alle Admin-Funktionen

**Rollen:**
- **Administrator:** Kann alle Funktionen nutzen (Geräte registrieren, Gruppen erstellen, Benutzer verwalten, Daten bearbeiten)
- **Operator:** Hat nur Lesezugriff und kann keine Änderungen vornehmen

#### QR-Code mit Persistenz

QR-Codes werden in der Datenbank gespeichert und können jederzeit erneut abgerufen werden.

| Hell-Modus | Dunkel-Modus |
|:----------:|:------------:|
| <img src="screenshots/admin-qr-code-light.png" width="400"> | <img src="screenshots/admin-qr-code-dark.png" width="400"> |

**Vorteile:**
- Neuregistrierung bei Gerätewechsel ohne Datenverlust
- Token bleibt gleich
- Alle Einsatzkraft-Informationen bleiben erhalten

### Mobile App

> **Hinweis:** Screenshots der Mobile App werden noch hinzugefügt. Die App kann auf einem Gerät oder Emulator ausgeführt werden, um Screenshots zu erstellen.

**Geplante Screenshots:**
- Registrierungsbildschirm (QR-Code-Scanner)
- Startbildschirm (Hell/Dunkel-Modus)
- Theme-Auswahl-Modal
- Einsatzalarm-Bildschirm
- Einsatzverlauf

## Schnellstart

### Voraussetzungen

- **Docker & Docker Compose** (empfohlen) ODER
- **Node.js 18+** und npm/yarn für native Installation
- Für Mobile App Entwicklung:
  - Flutter SDK 3.27.1+
  - Xcode (iOS)
  - Android Studio (Android)

### Backend mit Docker (Empfohlen)

```bash
# Repository klonen
git clone https://github.com/TimUx/alarm-messenger.git
cd alarm-messenger

# Umgebungsvariablen konfigurieren
cp .env.example .env
nano .env  # API-Schlüssel anpassen!

# Server starten
docker compose --profile with-caddy up -d
```

Der Server ist nun erreichbar unter `http://localhost:3000`

**Weitere Details:** Siehe [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md)

### Backend Nativ

```bash
cd server
npm install
cp .env.example .env
nano .env  # API-Schlüssel anpassen!
npm run build
npm start
```

### Erster Admin-Benutzer

Vor der ersten Verwendung muss ein Admin-Benutzer erstellt werden:

```bash
curl -X POST http://localhost:3000/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ihr-sicheres-passwort"}'
```

Danach können Sie sich unter `http://localhost:3000/admin/login.html` anmelden.

### Mobile App Setup

```bash
cd mobile

# Flutter dependencies installieren
flutter pub get

# Für iOS (nur auf macOS)
cd ios && pod install && cd ..
flutter run

# Für Android
flutter run
```

**Weitere Details:** Siehe [mobile/README.md](mobile/README.md)

## Admin-Interface

### Zugriff

Das Admin-Interface ist unter `http://ihr-server:3000/admin/` erreichbar.

### Hauptfunktionen

1. **Dashboard** (`/admin/`) - Übersicht und QR-Code-Generierung
2. **Einsatzkräfte** (`/admin/devices.html`) - Geräte- und Personenverwaltung
3. **Alarm-Gruppen** (`/admin/groups.html`) - Gruppenverwaltung
4. **Einsatz-Historie** (`/admin/history.html`) - Einsatzdokumentation

### Workflow

1. **Anmelden** unter `/admin/login.html`
2. **QR-Code generieren** im Dashboard
3. **Einsatzkraft-Informationen eingeben** (Name, Qualifikationen, Rolle)
4. **Gruppen zuordnen** (optional)
5. **QR-Code scannen** mit Mobile App
6. **Gerät ist registriert** und empfangsbereit

## Mobile App

### Registrierung

1. Mobile App öffnen
2. QR-Code scannen (vom Admin-Interface generiert)
3. Gerät wird automatisch registriert
4. WebSocket-Verbindung wird hergestellt

Der QR-Code enthält:
- `deviceToken` - Eindeutige Geräte-ID
- `serverUrl` - URL des Backend-Servers

Diese Informationen werden lokal gespeichert und für alle weiteren Verbindungen verwendet.

### Benachrichtigungen

Das System verwendet einen **Hybrid-Ansatz** für zuverlässige Alarmierung:

#### WebSocket (Standard)
- Keine Firebase-Konfiguration erforderlich
- Direkte Verbindung zum Server
- Sofortige Zustellung bei aktiver Verbindung
- Automatische Wiederverbindung bei Verbindungsabbruch
- Funktioniert hervorragend wenn App aktiv ist

#### Native Push Notifications (Optional)
- **Firebase Cloud Messaging (FCM)** für Android
- **Apple Push Notification service (APNs)** für iOS
- Zuverlässige Benachrichtigungen im Hintergrund
- Funktioniert auch bei geschlossener App
- Credentials lokal auf Server gespeichert
- Keine Cloud-Abhängigkeiten

**Vorteile des Hybrid-Ansatzes**:
- ✅ Doppelte Absicherung (Push + WebSocket)
- ✅ Graceful Fallback wenn Push nicht verfügbar
- ✅ Optional - funktioniert auch ohne FCM/APNs
- ✅ Server bleibt lokal gehostet

**Siehe**: [Push Notifications Dokumentation](docs/PUSH-NOTIFICATIONS.md)

### Theme-Modi

Die App unterstützt drei Theme-Modi:
- **Hell** - Heller Hintergrund für Tageslicht
- **Dunkel** - Dunkler Hintergrund für Nachteinsätze
- **Auto** - Folgt System-Einstellung

Die Theme-Auswahl wird lokal gespeichert und bleibt erhalten.

## Push Notifications

### Übersicht

Das Alarm Messenger System bietet einen **flexiblen Hybrid-Ansatz** für Push-Benachrichtigungen:

1. **WebSocket** (Standard, immer aktiv)
   - Keine zusätzliche Konfiguration erforderlich
   - Funktioniert sofort nach Installation
   - Ideal für aktive App-Nutzung

2. **Native Push** (Optional, empfohlen für Produktion)
   - Firebase Cloud Messaging (FCM) für Android
   - Apple Push Notification service (APNs) für iOS
   - Zuverlässige Hintergrund-Benachrichtigungen
   - Funktioniert auch bei geschlossener App

### Warum Hybrid-Ansatz?

WebSocket alleine hat Einschränkungen bei mobilen Geräten:
- **iOS**: Verbindungen werden im Hintergrund nach ~5-10 Minuten unterbrochen
- **Android**: Aggressive Energiesparmaßnahmen können Verbindungen beenden
- **App geschlossen**: Keine WebSocket-Verbindung möglich

**Lösung**: Kombiniere WebSocket mit nativen Push-Benachrichtigungen für maximale Zuverlässigkeit.

### Quick Start: WebSocket-only (Standard)

Keine zusätzliche Konfiguration erforderlich - funktioniert sofort:

```bash
# Server starten
docker compose up -d

# Mobile App installieren
# Fertig! WebSocket-Benachrichtigungen funktionieren
```

**Einschränkung**: Benachrichtigungen nur bei aktiver App oder kürzlich aktivem Hintergrund.

### Quick Start: Mit FCM/APNs (Empfohlen)

Für zuverlässige Hintergrund-Benachrichtigungen:

#### Server-Seite

1. **FCM Setup** (Android):
   ```bash
   # Firebase Service Account JSON herunterladen
   # Siehe docs/PUSH-NOTIFICATIONS.md für Details
   
   # .env konfigurieren
   ENABLE_FCM=true
   FCM_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
   ```

2. **APNs Setup** (iOS):
   ```bash
   # APNs .p8 Key herunterladen
   # Siehe docs/PUSH-NOTIFICATIONS.md für Details
   
   # .env konfigurieren
   ENABLE_APNS=true
   APNS_KEY_PATH=/path/to/AuthKey_XXXXXXXXXX.p8
   APNS_KEY_ID=XXXXXXXXXX
   APNS_TEAM_ID=XXXXXXXXXX
   APNS_TOPIC=com.alarmmessenger
   APNS_PRODUCTION=false
   ```

3. **Server neu starten**:
   ```bash
   docker compose restart server
   ```

#### Mobile App

Die Mobile App funktioniert standardmäßig im WebSocket-only-Modus. Für Push Notifications siehe [mobile/PUSH-NOTIFICATIONS.md](mobile/PUSH-NOTIFICATIONS.md).

### Features

- ✅ **Lokal gehostet**: Credentials bleiben auf Ihrem Server
- ✅ **Keine Cloud-Abhängigkeit**: FCM/APNs nur als Zustellmechanismus
- ✅ **Optional**: Funktioniert auch ohne - nur WebSocket
- ✅ **Graceful Fallback**: Automatischer Wechsel zu WebSocket wenn Push nicht verfügbar
- ✅ **Redundanz**: Beide Wege parallel für doppelte Absicherung
- ✅ **Kostenlos**: FCM ist kostenlos, APNs erfordert Apple Developer Account ($99/Jahr)

### Dokumentation

- **[docs/PUSH-NOTIFICATIONS.md](docs/PUSH-NOTIFICATIONS.md)** - Server-seitige Konfiguration
- **[mobile/PUSH-NOTIFICATIONS.md](mobile/PUSH-NOTIFICATIONS.md)** - Mobile App Konfiguration

## API-Integration

### Einsatz erstellen

```javascript
const response = await fetch('https://ihr-server/api/emergencies', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'ihr-api-key'  // Erforderlich!
  },
  body: JSON.stringify({
    emergencyNumber: '2024-001',
    emergencyDate: '2024-12-09T10:30:00Z',
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt',
    groups: 'WIL26,SWA11'  // Optional: Nur diese Gruppen alarmieren
  })
});
```

### Rückmeldungen abrufen

```javascript
const participants = await fetch(
  `https://ihr-server/api/emergencies/${emergencyId}/participants`,
  {
    headers: { 'X-API-Key': 'ihr-api-key' }
  }
).then(r => r.json());

// Teilnehmer mit vollständigen Details
participants.forEach(p => {
  console.log(`${p.responder.firstName} ${p.responder.lastName}`);
  console.log(`Rolle: ${p.responder.leadershipRole}`);
  console.log(`Qualifikationen: ${p.responder.qualifications.join(', ')}`);
});
```

### Wichtige API-Endpunkte

**Admin-Authentifizierung:**
- `POST /api/admin/init` - Ersten Admin-Benutzer erstellen
- `POST /api/admin/login` - Anmelden (JWT-Token erhalten)
- `GET /api/admin/profile` - Eigenes Profil abrufen (benötigt JWT)

**Benutzerverwaltung (nur Administratoren):**
- `GET /api/admin/users` - Alle Benutzer auflisten (benötigt JWT + Admin-Rolle)
- `POST /api/admin/users` - Neuen Benutzer erstellen (benötigt JWT + Admin-Rolle)
- `PUT /api/admin/users/:id` - Benutzer bearbeiten (benötigt JWT + Admin-Rolle)
- `DELETE /api/admin/users/:id` - Benutzer löschen (benötigt JWT + Admin-Rolle)
- `PUT /api/admin/users/:id/password` - Passwort ändern (benötigt JWT)

**Einsätze:**
- `POST /api/emergencies` - Einsatz erstellen (benötigt API-Key)
- `GET /api/emergencies` - Alle Einsätze abrufen
- `GET /api/emergencies/:id` - Einsatz-Details
- `GET /api/emergencies/:id/participants` - Teilnehmer abrufen (benötigt API-Key)
- `GET /api/emergencies/:id/responses` - Alle Rückmeldungen abrufen (benötigt API-Key)
- `POST /api/emergencies/:id/responses` - Rückmeldung absenden (Mobile App)

**Geräte:**
- `POST /api/devices/registration-token` - QR-Code generieren (benötigt JWT)
- `POST /api/devices/register` - Gerät registrieren (Mobile App)
- `GET /api/devices` - Alle Geräte abrufen (benötigt JWT)
- `PUT /api/admin/devices/:id` - Geräte-/Einsatzkraft-Informationen aktualisieren (benötigt JWT + Admin-Rolle)
- `DELETE /api/devices/:id` - Gerät deaktivieren (benötigt JWT + Admin-Rolle)

**Gruppen:**
- `GET /api/groups` - Alle Gruppen abrufen (benötigt JWT)
- `POST /api/groups` - Gruppe erstellen (benötigt JWT + Admin-Rolle)
- `PUT /api/groups/:code` - Gruppe aktualisieren (benötigt JWT + Admin-Rolle)
- `DELETE /api/groups/:code` - Gruppe löschen (benötigt JWT + Admin-Rolle)
- `POST /api/groups/import` - CSV-Import (benötigt JWT + Admin-Rolle)
- `PUT /api/groups/device/:deviceId` - Gerät zu Gruppen zuordnen (benötigt JWT + Admin-Rolle)

**📚 Vollständige API-Dokumentation:** [docs/API.md](docs/API.md)

### Integration mit alarm-monitor

Das System ist für die Integration mit [alarm-monitor](https://github.com/TimUx/alarm-monitor) konzipiert. Vollständige Integration-Beispiele und Code-Snippets finden Sie in:

- [docs/RUECKMELDUNGEN-API.md](docs/RUECKMELDUNGEN-API.md) - Rückmeldungs-API mit Einsatzkraft-Details
- [docs/ALARMGRUPPEN.md](docs/ALARMGRUPPEN.md) - Alarmierungsgruppen-System

## Deployment

### Docker mit Caddy (Empfohlen)

Caddy bietet automatisches HTTPS via Let's Encrypt:

```bash
# .env konfigurieren
cp .env.example .env
nano .env

# Caddy-Konfiguration anpassen
nano caddy/Caddyfile

# Starten
docker compose --profile with-caddy up -d
```

### Docker mit Nginx (Legacy)

```bash
docker compose --profile with-nginx up -d
```

### Native Installation

```bash
# Server bauen
cd server
npm install
npm run build

# PM2 für Prozessmanagement
npm install -g pm2
pm2 start dist/index.js --name alarm-messenger

# Automatischer Start
pm2 startup
pm2 save
```

### Systemd Service

Für Produktion wird ein systemd Service empfohlen. Siehe [docs/SETUP.md](docs/SETUP.md) für Details.

### Sicherheitshinweise

- ✅ HTTPS/TLS verwenden (zwingend für Produktion!)
- ✅ Starke, zufällige Secrets verwenden (API_SECRET_KEY, JWT_SECRET)
- ✅ Firewall-Regeln konfigurieren
- ✅ Regelmäßige Backups einrichten
- ✅ Regelmäßige Updates durchführen
- ✅ Starke Admin-Passwörter verwenden

**Vollständige Deployment-Dokumentation:** [docs/DOCKER.md](docs/DOCKER.md)

## Dokumentation

Alle Dokumentation ist im `/docs` Verzeichnis verfügbar:

### Setup & Deployment
- [SETUP.md](docs/SETUP.md) - Native Installation und Konfiguration
- [DOCKER.md](docs/DOCKER.md) - Docker-Deployment mit Caddy/Nginx
- [RELEASE.md](docs/RELEASE.md) - Release-Prozess und Versionierung
- [mobile/README.md](mobile/README.md) - 🆕 Flutter Mobile App Setup und Entwicklung
- [MOBILE.md](docs/MOBILE.md) - Legacy React Native Mobile App Dokumentation
- [BUILD-ANLEITUNG-LINUX.md](docs/BUILD-ANLEITUNG-LINUX.md) - Legacy Android Build unter Linux

### API & Integration
- [API.md](docs/API.md) - Vollständige API-Referenz
- [AUTHENTIFIZIERUNG.md](docs/AUTHENTIFIZIERUNG.md) - Authentifizierung und Sicherheit
- [RUECKMELDUNGEN-API.md](docs/RUECKMELDUNGEN-API.md) - Rückmeldungs-API für alarm-monitor
- [ALARMGRUPPEN.md](docs/ALARMGRUPPEN.md) - Alarmierungsgruppen-System

### Konfiguration
- [SERVER-KONFIGURATION.md](docs/SERVER-KONFIGURATION.md) - Server-URL und Umgebungsvariablen
- [BASE64-SECRETS.md](docs/BASE64-SECRETS.md) - Base64-Kodierung für Secrets
- [QUALIFIKATIONEN.md](docs/QUALIFIKATIONEN.md) - Qualifikationen und Führungsrollen

### Quickstart
- [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) - Schnellstart mit Docker

## FAQ

### Allgemein

**F: Benötige ich Firebase oder andere Cloud-Dienste?**

A: Nein! Das System ist vollständig eigenständig und verwendet WebSocket für Push-Benachrichtigungen. Keine externen Abhängigkeiten erforderlich.

**F: Welche Datenbank wird verwendet?**

A: SQLite - eine eingebettete Datenbank ohne separaten Server. Alle Daten werden in einer einzigen Datei gespeichert (`data/alarm-messenger.db`).

**F: Ist das System produktionsreif?**

A: Ja, wenn korrekt konfiguriert (HTTPS, starke Secrets, Firewall, Backups).

### Authentifizierung

**F: Wie funktioniert die Authentifizierung?**

A: Das System verwendet zwei Methoden:
- **API-Key** (Header `X-API-Key`) für Einsatzerstellung und Rückmeldungen
- **JWT-Token** für Admin-Interface

**F: Benötigen Mobile Geräte Authentifizierung?**

A: Geräte authentifizieren sich über ihren `deviceToken` aus dem QR-Code. Keine zusätzliche Authentifizierung erforderlich.

**F: Wie setze ich die API-Keys?**

A: In der `.env` Datei:
```bash
API_SECRET_KEY=ihr-sicherer-api-key
JWT_SECRET=ihr-jwt-geheimnis
```

**Mehr Details:** [docs/AUTHENTIFIZIERUNG.md](docs/AUTHENTIFIZIERUNG.md)

### Server-Konfiguration

**F: Wie erfahren Mobile Geräte die Server-URL?**

A: Automatisch über den QR-Code. Der QR-Code enthält die `serverUrl` aus der Umgebungsvariable `SERVER_URL`.

**F: Was passiert bei Server-URL-Änderung?**

A: Neue QR-Codes müssen generiert werden. Bereits registrierte Geräte müssen neu registriert werden.

**Mehr Details:** [docs/SERVER-KONFIGURATION.md](docs/SERVER-KONFIGURATION.md)

### Alarmierungsgruppen

**F: Was sind Alarmierungsgruppen?**

A: Gruppen ermöglichen gezielte Alarmierung. Beispiel: Nur "WIL26" und "SWA11" alarmieren statt alle Geräte.

**F: Wie verwende ich Gruppen?**

A:
1. Gruppen im Admin-Interface erstellen
2. Einsatzkräfte Gruppen zuordnen
3. Bei Einsatzerstellung Gruppen angeben: `groups: 'WIL26,SWA11'`

**Mehr Details:** [docs/ALARMGRUPPEN.md](docs/ALARMGRUPPEN.md)

### Mobile App

**F: Funktionieren Push-Benachrichtigungen im Hintergrund?**

A: Ja, aber es hängt von der Konfiguration ab:
- **Mit WebSocket alleine**: Begrenzt im Hintergrund, vor allem auf iOS
- **Mit FCM/APNs**: Zuverlässig auch im Hintergrund und bei geschlossener App
- **Empfehlung**: Aktiviere FCM/APNs für produktive Einsätze

**F: Benötige ich Firebase oder Apple Developer Account?**

A: Nein für die Grundfunktion. Die App funktioniert vollständig mit WebSocket.
Ja für zuverlässige Hintergrund-Benachrichtigungen:
- FCM (Android): Kostenlos, Firebase-Projekt erforderlich
- APNs (iOS): Apple Developer Account ($99/Jahr) erforderlich

**Siehe**: [docs/PUSH-NOTIFICATIONS.md](docs/PUSH-NOTIFICATIONS.md) und [mobile/PUSH-NOTIFICATIONS.md](mobile/PUSH-NOTIFICATIONS.md)

**F: Wie baue ich die Mobile App unter Linux?**

A: Vollständige Schritt-für-Schritt-Anleitung in [docs/BUILD-ANLEITUNG-LINUX.md](docs/BUILD-ANLEITUNG-LINUX.md). Android APK kann komplett unter Linux gebaut werden.

**F: Kann ich iOS Apps unter Linux bauen?**

A: Nein, iOS benötigt macOS und Xcode. Nutze GitHub Actions für automatische iOS-Builds auf macOS-Runnern.

**F: Wie funktionieren automatische Builds mit GitHub Actions?**

A: Der Workflow `.github/workflows/flutter-mobile-build.yml` baut automatisch:
- Debug APK bei jedem Push in `mobile/`
- Release APK/AAB bei Git Tags (z.B. `mobile-v1.0.0`)
- GitHub Release mit Download-Links

**Mehr Details:** [mobile/README.md](mobile/README.md)

**F: Welche Betriebssysteme werden unterstützt?**

A: iOS (12.0+) und Android (5.0+/API 21+)

**F: Kann ich die App umbenennen/rebranden?**

A: Ja, alle Texte und Farben können in der App angepasst werden.

### Deployment

**F: Docker oder native Installation?**

A: Docker wird empfohlen für einfacheres Deployment und Updates. Native Installation bietet mehr Kontrolle.

**F: Welchen Reverse Proxy soll ich verwenden?**

A: Caddy wird empfohlen (automatisches HTTPS). Nginx ist als Legacy-Option verfügbar.

**F: Wie mache ich Backups?**

A: Die SQLite-Datenbank ist eine einzige Datei: `data/alarm-messenger.db`. Einfach diese Datei regelmäßig kopieren/sichern.

**Mehr Details:** [docs/DOCKER.md](docs/DOCKER.md)

### Weitere Hilfe

Für weitere Fragen:
- 📖 Vollständige Dokumentation in `/docs` lesen
- 🐛 Issue auf GitHub öffnen
- 💬 Diskussionen auf GitHub

## Projektstruktur

```
alarm-messenger/
├── server/                     # Backend Server
│   ├── src/
│   │   ├── index.ts           # Server-Einstiegspunkt
│   │   ├── models/            # Datenmodelle
│   │   ├── routes/            # API-Routen
│   │   │   ├── admin.ts       # Admin-Authentifizierung
│   │   │   ├── emergencies.ts # Einsatz-API
│   │   │   ├── devices.ts     # Geräte-API
│   │   │   └── groups.ts      # Gruppen-API
│   │   ├── services/          # Business-Logik
│   │   │   ├── database.ts    # Datenbank-Service
│   │   │   └── websocket.ts   # WebSocket-Service
│   │   ├── middleware/        # Express-Middleware
│   │   │   └── auth.ts        # Authentifizierung
│   │   └── utils/             # Hilfsfunktionen
│   ├── public/
│   │   └── admin/             # Admin-Interface (HTML/JS/CSS)
│   │       ├── index.html     # Dashboard
│   │       ├── devices.html   # Einsatzkräfte
│   │       ├── groups.html    # Alarm-Gruppen
│   │       ├── history.html   # Einsatz-Historie
│   │       └── login.html     # Login
│   └── data/                  # SQLite-Datenbank
│
├── mobile/                     # Mobile App
│   ├── src/
│   │   ├── App.tsx            # Haupt-App-Komponente
│   │   ├── screens/           # UI-Screens
│   │   │   ├── RegistrationScreen.tsx
│   │   │   ├── HomeScreen.tsx
│   │   │   └── EmergencyAlertScreen.tsx
│   │   ├── services/          # Services
│   │   │   ├── api.ts         # API-Client
│   │   │   ├── notifications.ts # WebSocket-Client
│   │   │   └── storage.ts     # Lokale Speicherung
│   │   ├── context/           # React Context
│   │   │   └── ThemeContext.tsx
│   │   └── types/             # TypeScript-Typen
│   ├── android/               # Android-spezifischer Code
│   └── ios/                   # iOS-spezifischer Code
│
├── docs/                       # Dokumentation
│   ├── API.md
│   ├── AUTHENTIFIZIERUNG.md
│   ├── DOCKER.md
│   └── ...
│
├── caddy/                      # Caddy Reverse Proxy
│   ├── Caddyfile
│   └── README.md
│
├── nginx/                      # Nginx Reverse Proxy (Legacy)
│   └── ...
│
├── docker-compose.yml          # Docker Compose Konfiguration
├── .env.example               # Beispiel-Umgebungsvariablen
└── README.md                  # Diese Datei
```

## Lizenz

MIT License - Siehe [LICENSE](LICENSE) Datei für Details.

## Support & Beiträge

- **Issues:** [GitHub Issues](https://github.com/TimUx/alarm-messenger/issues)
- **Discussions:** [GitHub Discussions](https://github.com/TimUx/alarm-messenger/discussions)
- **Pull Requests:** Willkommen!

### Entwicklung

```bash
# Server (mit Hot-Reload)
cd server
npm run dev

# Mobile App (mit Metro Bundler)
cd mobile
npm start
```

## Credits

Entwickelt für Feuerwehren und Rettungsdienste.

Konzipiert zur Integration mit [alarm-monitor](https://github.com/TimUx/alarm-monitor).
