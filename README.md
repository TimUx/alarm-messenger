# Alarm Messenger System

Alarmierungs System für Einsätze auf Mobile Devices mit Rückmeldefunktion

## System-Übersicht

Das Alarm Messenger System ist eine vollständige Alarmierungslösung bestehend aus:

1. **Backend Server** - Node.js/Express API zur Verwaltung von Einsätzen und Geräteregistrierungen
2. **Mobile App** - React Native App für iOS und Android mit Push-Benachrichtigungen

## Funktionen

### Backend Server
- ✅ RESTful API zur Einsatzverwaltung
- ✅ Geräteregistrierung mit QR-Code-Generierung
- ✅ **WebSocket-basierte Push-Benachrichtigungen** (keine externen Abhängigkeiten)
- ✅ Verschlüsselte HTTPS/TLS-Kommunikation
- ✅ SQLite-Datenbank zur Datenpersistenz
- ✅ Rückmelde-Tracking (Teilnahme ja/nein)
- ✅ API-Endpunkt zum Abrufen teilnehmender Einsatzkräfte
- ✅ **API-Key-Authentifizierung für Einsatzerstellung**
- ✅ **JWT-basierte Admin-Authentifizierung**
- ✅ **Erweiterte Geräte-/Einsatzkraft-Informationsspeicherung**

### Admin Web-Interface (NEU)
- ✅ Passwortgeschützter Admin-Login
- ✅ QR-Code-Generierung und Anzeige
- ✅ Geräte-/Einsatzkraft-Verwaltungs-Dashboard
- ✅ Bearbeitung von Einsatzkraft-Informationen (Name, Qualifikationen, Führungsrolle)
- ✅ Dunkles Theme passend zum alarm-monitor Design (#1a1a1a Hintergrund, #dc3545 Akzente)
- ✅ Responsives Design für Desktop und Mobil

### Einsatzkraft-Informationsverwaltung (NEU)
- ✅ Namens-Speicherung für jedes registrierte Gerät
- ✅ Tracking von Ausbildungsqualifikationen:
  - Maschinist
  - AGT (Atemschutzgeräteträger)
  - Sanitäter
  - TH-VU (Technische Hilfeleistung - Verkehrsunfall)
  - TH-BAU (Technische Hilfeleistung - Bau)
- ✅ Führungsrollen-Festlegung (Fahrzeugführer)

### Mobile App
- ✅ QR-Code-Scanner zur Geräteregistrierung
- ✅ **WebSocket-basierte Echtzeit-Benachrichtigungen**
- ✅ Einsatzalarm-UI mit Alarmtönen
- ✅ Zwei Antwort-Buttons (Teilnehmen/Ablehnen)
- ✅ Einsatzverlaufs-Ansicht
- ✅ Plattformübergreifende Unterstützung (iOS & Android)
- ✅ **Hell/Dunkel/Auto Theme-Modi**
- ✅ **Keine externen Abhängigkeiten** - vollständig eigenständig

## Architektur

```
┌─────────────────┐
│  Externe API    │ (z.B. Alarm Monitor)
│  (POST)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Backend Server │
│  (Node.js)      │
│  - API Routes   │
│  - Datenbank    │
│  - WebSocket    │
└────────┬────────┘
         │ WebSocket Push-Benachrichtigungen
         ▼
┌─────────────────┐
│  Mobile Geräte  │
│  (iOS/Android)  │
│  - Alarm UI     │
│  - Rückmeldung  │
└─────────────────┘
```

## Projektstruktur

```
alarm-messenger/
├── server/              # Backend Server
│   ├── src/
│   │   ├── index.ts    # Haupteinstiegspunkt des Servers
│   │   ├── models/     # Datenmodelle
│   │   ├── routes/     # API-Routen
│   │   ├── services/   # Geschäftslogik
│   │   └── utils/      # Hilfsfunktionen
│   ├── data/           # SQLite-Datenbank
│   ├── package.json
│   └── tsconfig.json
│
├── mobile/             # Mobile App
│   ├── src/
│   │   ├── App.tsx     # Haupt-App-Komponente
│   │   ├── screens/    # UI-Bildschirme
│   │   ├── services/   # API & Benachrichtigungsdienste
│   │   ├── components/ # Wiederverwendbare Komponenten
│   │   └── types/      # TypeScript-Typen
│   ├── android/        # Android Native-Code
│   ├── ios/           # iOS Native-Code
│   ├── package.json
│   └── tsconfig.json
│
└── docs/              # Dokumentation
    ├── API.md
    ├── SETUP.md
    └── MOBILE.md
```

## Schnellstart

### Voraussetzungen
- Node.js 18+
- npm oder yarn
- **Für Docker:** Docker und Docker Compose
- Für Mobile-Entwicklung:
  - Xcode (für iOS)
  - Android Studio (für Android)
  - React Native CLI

**Hinweis:** Firebase wird nicht mehr benötigt! Das System verwendet jetzt WebSocket für Push-Benachrichtigungen.

### Backend-Setup

#### Option 1: Docker (Empfohlen für Linux)

```bash
cd alarm-messenger
cp .env.example .env
# .env mit API-Schlüsseln bearbeiten (Firebase nicht mehr benötigt!)
docker compose up -d
```

Der Server startet auf `http://localhost:3000`

Siehe [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) für weitere Details.

#### Option 2: Native Installation

```bash
cd server
npm install
cp .env.example .env
# .env mit API-Schlüsseln bearbeiten (Firebase nicht mehr benötigt!)
npm run build
npm start
```

Der Server startet auf `http://localhost:3000`

### Mobile App Setup

```bash
cd mobile
npm install

# Für iOS
cd ios && pod install && cd ..
npm run ios

# Für Android
npm run android
```

## API-Endpunkte

### Admin-Authentifizierung

- `POST /api/admin/init` - Ersten Admin-Benutzer initialisieren (ungeschützt, funktioniert nur wenn keine Benutzer existieren)
- `POST /api/admin/login` - Admin-Login (gibt JWT-Token zurück)
- `POST /api/admin/users` - Zusätzliche Admin-Benutzer erstellen (benötigt JWT-Token)
- `PUT /api/admin/devices/:id` - Geräte-/Einsatzkraft-Informationen aktualisieren (benötigt JWT-Token)

### Einsätze

- `POST /api/emergencies` - Neuen Einsatz erstellen (benötigt API-Key über X-API-Key Header)
- `GET /api/emergencies` - Alle Einsätze abrufen
- `GET /api/emergencies/:id` - Spezifischen Einsatz abrufen
- `POST /api/emergencies/:id/responses` - Rückmeldung absenden
- `GET /api/emergencies/:id/participants` - Teilnehmer abrufen
- `GET /api/emergencies/:id/responses` - Alle Rückmeldungen abrufen

### Geräte

- `POST /api/devices/registration-token` - QR-Code generieren
- `POST /api/devices/register` - Gerät registrieren (mit optionalen Einsatzkraft-Infos)
- `GET /api/devices` - Alle Geräte abrufen
- `GET /api/devices/:id` - Spezifisches Gerät abrufen
- `DELETE /api/devices/:id` - Gerät deaktivieren

## Verwendungsablauf

1. **Admin initialisiert Konto** über `POST /api/admin/init` (nur beim ersten Mal)
2. **Admin meldet sich an** unter `/admin/login.html`
3. **Admin generiert QR-Code** über das Admin-Dashboard
4. **Admin gibt Einsatzkraft-Informationen ein** für das Gerät (Name, Qualifikationen, Führungsrolle)
5. **Benutzer scannt QR-Code** in der Mobile App
6. **Gerät registriert sich** beim Server und stellt WebSocket-Verbindung her
7. **Externes System erstellt Einsatz** über `POST /api/emergencies` mit API-Key
8. **Server sendet Push-Benachrichtigungen** an alle registrierten Geräte über WebSocket
9. **Mobile App zeigt Alarm an** mit Alarmton
10. **Benutzer antwortet** (Teilnehmen oder Ablehnen)
11. **Antwort wird gespeichert** in der Datenbank mit Einsatzkraft-Informationen
12. **Externes System ruft Teilnehmer ab** über `GET /api/emergencies/:id/participants` mit vollständigen Einsatzkraft-Details

## Sicherheit

- HTTPS/TLS-Verschlüsselung für alle API-Kommunikation
- API-Key-Authentifizierung für Einsatzerstellung (X-API-Key Header)
- JWT-basierte Authentifizierung für Admin-Interface
- Passwort-Hashing mit bcrypt für Admin-Benutzer
- **WebSocket-basierte Push-Benachrichtigungen** (keine externen Abhängigkeiten)
- Rate Limiting zur Verhinderung von Missbrauch
- Helmet-Middleware für Sicherheits-Header
- Geräte-Token-Validierung

## Admin-Interface

Das Admin-Interface ist erreichbar unter `http://dein-server:3000/admin/` und bietet:
- Hell/Dunkel Theme-Umschaltung (Hell-Modus ist Standard)
- Persistente Theme-Einstellung
- Am alarm-monitor inspiriertes Design

### Login - Hell-Modus (Standard)
![Admin Login Light](https://github.com/user-attachments/assets/4e31daa6-e7c9-4056-92c9-f76eea14a1c5)

### Login - Dunkel-Modus
![Admin Login Dark](https://github.com/user-attachments/assets/4879ddf7-62b2-497b-9562-87ae9c5ede5b)

### Dashboard mit QR-Code-Generierung - Hell-Modus
![Admin Dashboard Light](https://github.com/user-attachments/assets/6a4b9baf-c02d-4682-9494-99f0d36a851c)

### Dashboard - Dunkel-Modus
![Admin Dashboard Dark](https://github.com/user-attachments/assets/72ec7d0a-edc2-4ea8-b45c-68eb1fd9f0c3)

### QR-Code-Anzeige
![QR Code Generation](https://github.com/user-attachments/assets/4c3b4cc3-fedd-4f6b-9892-d95aabc55f2d)

### Einsatzkraft-Informationsverwaltung
![Edit Responder](https://github.com/user-attachments/assets/14457c74-b918-44e3-aba2-8e22532ae3e0)

### Initiale Admin-Einrichtung

Vor der Verwendung des Admin-Interfaces, erstellen Sie den ersten Admin-Benutzer:

```bash
curl -X POST http://localhost:3000/api/admin/init \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ihr-sicheres-passwort"}'
```

Dieser Endpunkt funktioniert nur wenn noch keine Admin-Benutzer existieren. Danach verwenden Sie die Login-Seite unter `/admin/login.html`.

## Integration mit Alarm Monitor

Das System ist für die Integration mit dem [alarm-monitor](https://github.com/TimUx/alarm-monitor) Projekt konzipiert:

```javascript
// Beispiel: Einsatz von alarm-monitor erstellen
const response = await fetch('http://alarm-messenger-server:3000/api/emergencies', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-API-Key': 'ihr-api-geheim-schlüssel'  // Erforderlich für Authentifizierung
  },
  body: JSON.stringify({
    emergencyNumber: '2024-001',
    emergencyDate: '2024-12-07T19:00:00Z',
    emergencyKeyword: 'BRAND 3',
    emergencyDescription: 'Wohnungsbrand im 2. OG',
    emergencyLocation: 'Hauptstraße 123, 12345 Stadt'
  })
});

// Teilnehmer mit Einsatzkraft-Informationen abrufen
const participants = await fetch(
  `http://alarm-messenger-server:3000/api/emergencies/${emergencyId}/participants`,
  {
    headers: { 'X-API-Key': 'ihr-api-geheim-schlüssel' }
  }
).then(r => r.json());

// participants enthält nun Einsatzkraft-Details:
// - name
// - qualifications (machinist, agt, paramedic, thVu, thBau)
// - isSquadLeader
```

## Design

### Mobile App

Das Design der Mobile App basiert auf dem alarm-monitor Projekt mit:
- Dunkles Theme (#1a1a1a Hintergrund)
- Helles Theme (#f5f5f5 Hintergrund)
- Auto Theme-Modus (folgt System-Einstellung)
- Theme-Umschaltung in Einstellungen vom Startbildschirm aus zugänglich
- Persistente Theme-Einstellung lokal gespeichert
- Hoher Kontrast für Einsatzinformationen
- Große, gut sichtbare Action-Buttons
- Rote Akzentfarbe (#dc3545) für Notfälle
- Material Icons für konsistente Ikonographie

Die Mobile App beinhaltet:
- QR-Code-Scanner zur Registrierung
- Push-Benachrichtigungs-Unterstützung
- Einsatzalarm-Bildschirm mit Alarmton
- Antwort-Buttons (Teilnehmen/Ablehnen)
- Einsatzverlaufs-Ansicht
- Theme-Auswahl (Hell/Dunkel/Auto-Modi)

#### Mobile App Screenshots

> **Hinweis**: Um Screenshots der Mobile App hinzuzufügen, führen Sie bitte die App auf einem Gerät oder Emulator aus und erstellen Screenshots von:
> - Registrierungsbildschirm (QR-Code-Scanner)
> - Startbildschirm im Hell-Modus
> - Startbildschirm im Dunkel-Modus
> - Theme-Auswahl-Modal
> - Einsatzalarm-Bildschirm
> 
> Laden Sie Screenshots auf GitHub hoch und ersetzen Sie die Platzhalter unten mit tatsächlichen Bild-Links.

**Startbildschirm - Hell-Modus**
<!-- ![Mobile Home Light](screenshot-url-here) -->
*Screenshot-Platzhalter: Startbildschirm zeigt Einsatzliste im hellen Theme*

**Startbildschirm - Dunkel-Modus**
<!-- ![Mobile Home Dark](screenshot-url-here) -->
*Screenshot-Platzhalter: Startbildschirm zeigt Einsatzliste im dunklen Theme*

**Theme-Auswahl**
<!-- ![Mobile Theme Selector](screenshot-url-here) -->
*Screenshot-Platzhalter: Modal zeigt Hell/Dunkel/Auto Theme-Optionen*

**Einsatzalarm-Bildschirm**
<!-- ![Mobile Emergency Alert](screenshot-url-here) -->
*Screenshot-Platzhalter: Einsatzalarm mit Teilnehmen/Ablehnen-Buttons*

**Registrierungsbildschirm**
<!-- ![Mobile Registration](screenshot-url-here) -->
*Screenshot-Platzhalter: QR-Code-Scanner zur Geräteregistrierung*

### Admin Web-Interface

Das Admin-Interface folgt dem alarm-monitor Design-Stil mit umschaltbaren Themes:

**Hell-Modus (Standard)**
- Sauberes, modernes Erscheinungsbild mit hellen Hintergründen
- Hoher Kontrast für einfache Lesbarkeit
- Professionelle Farbpalette

**Dunkel-Modus**
- Dunkles Theme (#1a1a1a Hintergrund) passend zum alarm-monitor Standby
- Rote Akzentfarbe (#dc3545) zur Hervorhebung
- Reduzierte Augenbelastung für Umgebungen mit wenig Licht

**Gemeinsame Funktionen**
- Theme-Umschalt-Button (🌙/☀️) für sofortiges Umschalten
- Persistente Theme-Einstellung im Browser gespeichert
- Weiche Übergänge zwischen Themes
- Responsives Design für alle Bildschirmgrößen
- Intuitive Navigation und Bedienung
- Kartenbasiertes Layout für Inhalts-Organisation

## Deployment-Optionen

### Linux Nativ
Direkt auf Linux mit Node.js ausführen. Siehe [docs/SETUP.md](docs/SETUP.md)

### Docker Container
In Docker Container mit docker-compose ausführen. Siehe [DOCKER-QUICKSTART.md](DOCKER-QUICKSTART.md) oder [docs/DOCKER.md](docs/DOCKER.md)

### Produktiv-Deployment
- Docker mit Nginx Reverse Proxy für SSL/TLS verwenden
- Systemd für automatischen Start konfigurieren
- Automatisierte Backups einrichten
- PM2 für Prozessmanagement verwenden (native Installation)

Siehe [docs/DOCKER.md](docs/DOCKER.md) für vollständige Deployment-Anweisungen.

## Lizenz

MIT

## Support

Für Probleme und Fragen öffnen Sie bitte ein Issue auf GitHub.
