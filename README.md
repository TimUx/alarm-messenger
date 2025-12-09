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
- ✅ **Base64-Kodierung für Secrets** (optional, mit Plain-Text Fallback)
- ✅ **Erweiterte Geräte-/Einsatzkraft-Informationsspeicherung**

### Admin Web-Interface (NEU)
- ✅ Passwortgeschützter Admin-Login
- ✅ QR-Code-Generierung und Anzeige
- ✅ **QR-Code Persistenz** - Gespeicherte QR-Codes können jederzeit erneut abgerufen werden
- ✅ Geräte-/Einsatzkraft-Verwaltungs-Dashboard
- ✅ Bearbeitung von Einsatzkraft-Informationen (Name, Qualifikationen, Führungsrolle)
- ✅ **Einsatz-Historie** - Übersicht aller eingegangenen Einsätze mit Detailansicht
- ✅ **Detail-Ansicht** - Vollständige Einsatzinformationen inkl. Rückmeldungen aller Einsatzkräfte
- ✅ **Navigation** - Menüstruktur für einfachen Zugriff auf alle Funktionen
- ✅ **CSV Import** - Eigene Seite für Gruppen-Import
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
    ├── API.md                        # API-Referenz
    ├── API.en.md                     # API-Referenz (Englisch)
    ├── AUTHENTIFIZIERUNG.md          # Authentifizierungsleitfaden
    ├── RUECKMELDUNGEN-API.md         # Rückmeldungen und Einsatzkraft-Details API
    ├── SERVER-KONFIGURATION.md       # Server-Konfiguration und URL-Setup
    ├── SETUP.md                      # Setup-Anleitung
    ├── DOCKER.md                     # Docker-Deployment
    └── MOBILE.md                     # Mobile App Setup
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

**📚 Detaillierte Informationen:**
- Siehe [docs/AUTHENTIFIZIERUNG.md](docs/AUTHENTIFIZIERUNG.md) für vollständige Authentifizierungsdokumentation
- Siehe [docs/BASE64-SECRETS.md](docs/BASE64-SECRETS.md) für Base64-Kodierung von Secrets (NEU)
- Siehe [docs/SERVER-KONFIGURATION.md](docs/SERVER-KONFIGURATION.md) für Server-Setup und URL-Konfiguration

## Admin-Interface

Das Admin-Interface ist erreichbar unter `http://dein-server:3000/admin/` und bietet:
- Hell/Dunkel Theme-Umschaltung (Hell-Modus ist Standard)
- Persistente Theme-Einstellung
- Am alarm-monitor inspiriertes Design
- QR-Code-Generierung für Geräteregistrierung
- Verwaltung von Einsatzkräften mit Qualifikationen und Führungsrollen
- **Alarmierungsgruppen-Verwaltung** (NEU)
- CSV-Import für Gruppen

### Login

| Hell-Modus | Dunkel-Modus |
|------------|--------------|
| <img src="screenshots/admin-login-light.png" width="400"> | <img src="screenshots/admin-login-dark.png" width="400"> |

### Dashboard mit Einsatzkräften und Gruppen

| Hell-Modus | Dunkel-Modus |
|------------|--------------|
| <img src="screenshots/admin-dashboard-light.png" width="400"> | <img src="screenshots/admin-dashboard-dark.png" width="400"> |

Das Dashboard zeigt:
- QR-Code-Generierung
- Liste registrierter Einsatzkräfte mit Qualifikationen
- Alarmierungsgruppen-Verwaltung

### QR-Code-Generierung

| Hell-Modus | Dunkel-Modus |
|------------|--------------|
| <img src="screenshots/admin-qr-code-light.png" width="400"> | <img src="screenshots/admin-qr-code-dark.png" width="400"> |

### Einsatzkraft bearbeiten

| Hell-Modus | Dunkel-Modus |
|------------|--------------|
| <img src="screenshots/admin-edit-device-light.png" width="400"> | <img src="screenshots/admin-edit-device-dark.png" width="400"> |

Modal zum Bearbeiten von Einsatzkraft-Informationen:
- Name
- Qualifikationen (Maschinist, AGT, Sanitäter)
- Führungsrolle (Gruppenführer, Zugführer)
- **Gruppenzuordnungen** (NEU)

### Gruppe hinzufügen/bearbeiten

| Hell-Modus | Dunkel-Modus |
|------------|--------------|
| <img src="screenshots/admin-add-group-light.png" width="400"> | <img src="screenshots/admin-add-group-dark.png" width="400"> |

Erstellen oder Bearbeiten von Alarmierungsgruppen mit:
- Gruppen-Kürzel (z.B. WIL26)
- Name (z.B. WIL Steina M)
- Optionale Beschreibung

### CSV-Import für Gruppen

| Hell-Modus | Dunkel-Modus |
|------------|--------------|
| <img src="screenshots/admin-import-csv-light.png" width="400"> | <img src="screenshots/admin-import-csv-dark.png" width="400"> |

Massenimport von Gruppen im CSV-Format: `code,name,description`

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

// Teilnehmer mit vollständigen Einsatzkraft-Informationen abrufen
const participants = await fetch(
  `http://alarm-messenger-server:3000/api/emergencies/${emergencyId}/participants`,
  {
    headers: { 'X-API-Key': 'ihr-api-geheim-schlüssel' }  // Erforderlich für Authentifizierung
  }
).then(r => r.json());

// participants enthält nun vollständige Einsatzkraft-Details:
// - responder.firstName, responder.lastName
// - responder.qualifications (machinist, agt, paramedic)
// - responder.leadershipRole (none, groupLeader, platoonLeader)
// Beispiel:
participants.forEach(p => {
  console.log(`${p.responder.firstName} ${p.responder.lastName} - ${p.responder.leadershipRole}`);
});
```

**📚 Detaillierte Dokumentation:**
- Siehe [docs/RUECKMELDUNGEN-API.md](docs/RUECKMELDUNGEN-API.md) für vollständige Rückmeldungs-API-Dokumentation
- Siehe [docs/API.md](docs/API.md) für vollständige API-Referenz
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
- Docker mit Caddy Reverse Proxy für automatisches SSL/TLS verwenden (empfohlen)
- Docker mit Nginx Reverse Proxy für SSL/TLS verwenden (legacy)
- Systemd für automatischen Start konfigurieren
- Automatisierte Backups einrichten
- PM2 für Prozessmanagement verwenden (native Installation)

Siehe [docs/DOCKER.md](docs/DOCKER.md) für vollständige Deployment-Anweisungen.

## Screenshots

### Admin Interface

#### Dashboard mit Navigation
Das Admin Dashboard bietet eine übersichtliche Navigation zu allen wichtigen Funktionen:
- QR-Code Generierung für neue Geräte
- Verwaltung registrierter Einsatzkräfte
- Verwaltung von Alarmierungsgruppen

![Admin Dashboard](https://github.com/user-attachments/assets/a25fabc6-ce62-44be-9039-fb3a8e693294)

#### QR-Code Generierung
QR-Codes werden automatisch gespeichert und können jederzeit erneut abgerufen werden. Dies ermöglicht eine einfache Neuregistrierung bei Gerätewechsel ohne Datenverlust.

![QR-Code Generierung](https://github.com/user-attachments/assets/ec8c073c-ed06-4393-a3f9-81986f1ba526)

#### Einsatz Historie
Die neue Einsatz-Historie zeigt alle eingegangenen Einsätze mit den wichtigsten Informationen auf einen Blick:
- Datum und Uhrzeit
- Einsatzstichwort
- Einsatzort
- Einsatznummer und Beschreibung

![Einsatz Historie](https://github.com/user-attachments/assets/9e50b691-b7e1-4a32-ac43-3384d8d325ce)

#### CSV Import
Der CSV-Import wurde auf eine eigene Seite ausgelagert für bessere Übersichtlichkeit:

![CSV Import](https://github.com/user-attachments/assets/aea28810-f4a4-4205-8ad9-dbee5249b3ec)

### Features der neuen Historie-Funktion
- **Übersichtliche Liste**: Alle Einsätze chronologisch sortiert
- **Pagination**: Seitenweise Navigation durch große Einsatzzahlen
- **Detail-Ansicht**: Klick auf "Details anzeigen" zeigt vollständige Einsatzinformationen
- **Rückmeldungen**: Anzeige aller Einsatzkraft-Rückmeldungen mit Namen und Qualifikationen
- **Statistiken**: Zusammenfassung der Teilnehmer und Absagen

### QR-Code Persistenz
- QR-Codes werden automatisch in der Datenbank gespeichert
- "QR-Code anzeigen" Button bei jedem registrierten Gerät
- Ermöglicht Neuregistrierung ohne Datenverlust
- Token bleibt gleich, alle Einsatzkraft-Informationen bleiben erhalten

## Häufig gestellte Fragen (FAQ)

### Authentifizierung

**Q: Ist Authentifizierung im System implementiert?**

A: **Ja, Authentifizierung ist vollständig implementiert.** Das System verwendet zwei verschiedene Authentifizierungsmethoden:
- **API-Key-Authentifizierung** für Einsatzerstellung (POST /api/emergencies)
- **JWT-Token-Authentifizierung** für das Admin-Interface

Siehe [docs/AUTHENTIFIZIERUNG.md](docs/AUTHENTIFIZIERUNG.md) für Details.

**Q: Brauche ich Authentifizierung für die Mobile App?**

A: **Nein**, die Mobile App benötigt keine zusätzliche Authentifizierung. Geräte authentifizieren sich durch:
- Das deviceToken vom QR-Code
- Die registrationToken (WebSocket-ID)

**Q: Wie konfiguriere ich die API-Keys?**

A: Setzen Sie die Umgebungsvariablen in der `.env` Datei:
```bash
API_SECRET_KEY=ihr-sicherer-api-key
JWT_SECRET=ihr-jwt-geheimnis
```

Siehe [docs/AUTHENTIFIZIERUNG.md](docs/AUTHENTIFIZIERUNG.md) für vollständige Anleitung.

### Server-Konfiguration

**Q: Wie erfahren Mobile Geräte die Server-URL?**

A: **Automatisch über den QR-Code.** Der Ablauf:
1. Admin generiert QR-Code im Admin-Interface
2. QR-Code enthält `serverUrl` (aus `SERVER_URL` Umgebungsvariable)
3. Mobile App scannt QR-Code und extrahiert automatisch die Server-URL
4. App speichert URL lokal und verwendet sie für alle Verbindungen

Siehe [docs/SERVER-KONFIGURATION.md](docs/SERVER-KONFIGURATION.md) für Details.

**Q: Wo setze ich die SERVER_URL?**

A: In der `.env` Datei:
```bash
# Entwicklung
SERVER_URL=http://localhost:3000

# Produktion
SERVER_URL=https://ihre-domain.de
```

**Q: Was passiert, wenn sich die Server-URL ändert?**

A: Sie müssen neue QR-Codes generieren. Bereits registrierte Geräte müssen neu registriert werden, da sie die alte URL gespeichert haben.

### Sicherheit

**Q: Ist das System sicher für Produktivbetrieb?**

A: **Ja**, wenn korrekt konfiguriert:
- ✅ Verwenden Sie HTTPS (zwingend!)
- ✅ Ändern Sie API_SECRET_KEY und JWT_SECRET
- ✅ Verwenden Sie starke Passwörter
- ✅ Aktivieren Sie Firewall-Regeln
- ✅ Regelmäßige Updates durchführen

Siehe [docs/AUTHENTIFIZIERUNG.md](docs/AUTHENTIFIZIERUNG.md) für Best Practices.

**Q: Werden Passwörter sicher gespeichert?**

A: **Ja**, Admin-Passwörter werden mit bcrypt gehasht gespeichert.

### Integration

**Q: Wie integriere ich mit alarm-monitor?**

A: Senden Sie Einsätze mit API-Key:
```javascript
fetch('https://ihr-server/api/emergencies', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'ihr-api-key'
  },
  body: JSON.stringify({ /* Einsatzdaten */ })
});
```

Siehe [docs/API.md](docs/API.md) für vollständige API-Dokumentation.

### Weitere Hilfe

Für weitere Fragen:
- 📖 Lesen Sie die vollständige Dokumentation in `/docs`
- 🐛 Öffnen Sie ein Issue auf GitHub
- 💬 Kontaktieren Sie den Support

## Lizenz

MIT

## Support

Für Probleme und Fragen öffnen Sie bitte ein Issue auf GitHub.
