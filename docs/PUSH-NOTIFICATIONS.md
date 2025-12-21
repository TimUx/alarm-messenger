# Push Notifications mit FCM und APNs

## Übersicht

Das Alarm Messenger System unterstützt jetzt native Push-Benachrichtigungen über Firebase Cloud Messaging (FCM) für Android und Apple Push Notification service (APNs) für iOS. Diese sind **optional** und ergänzen die bestehenden WebSocket-Benachrichtigungen für eine zuverlässigere Alarmierung im Hintergrund.

## Problem mit reinen WebSocket-Benachrichtigungen

WebSocket-Verbindungen haben Einschränkungen, besonders bei mobilen Geräten:

- **iOS**: Verbindungen werden nach wenigen Minuten im Hintergrund unterbrochen
- **Android**: Aggressive Energiesparmaßnahmen können Verbindungen beenden
- **App geschlossen**: Keine Benachrichtigungen möglich
- **Stromsparmodus**: WebSocket-Verbindungen werden priorisiert beendet

## Lösung: Hybrid-Ansatz

Das System verwendet nun einen **Hybrid-Ansatz**:

1. **Native Push Notifications** (FCM/APNs) - Primär für Hintergrund-Benachrichtigungen
2. **WebSocket** - Backup und für Echtzeit-Updates wenn App aktiv ist

### Vorteile

- ✅ Zuverlässige Benachrichtigungen auch bei geschlossener App
- ✅ Funktioniert im Hintergrund und bei aktivem Stromsparmodus
- ✅ Keine Cloud-Abhängigkeit - Server bleibt lokal
- ✅ Optional - funktioniert auch ohne FCM/APNs (nur WebSocket)
- ✅ Graceful Fallback zu WebSocket wenn Push-Tokens nicht verfügbar

## Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    Lokaler Server                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Push Notification Service                             │ │
│  │  - FCM Admin SDK (lokal)                               │ │
│  │  - APNs Provider (lokal)                               │ │
│  │  - Credentials lokal gespeichert                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Notification Logic                                     │ │
│  │  1. Versuche Push (FCM/APNs)                           │ │
│  │  2. Sende auch via WebSocket (Redundanz)               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          ↓
         ┌────────────────┴────────────────┐
         ↓                                  ↓
┌─────────────────┐              ┌─────────────────┐
│  FCM Service    │              │  APNs Service   │
│  (Google Cloud) │              │  (Apple)        │
└────────┬────────┘              └────────┬────────┘
         ↓                                ↓
┌─────────────────┐              ┌─────────────────┐
│  Android App    │              │    iOS App      │
└─────────────────┘              └─────────────────┘
```

**Wichtig**: Der Server nutzt nur FCM/APNs als **Zustellmechanismus**. Alle Logik und Credentials bleiben lokal. Es werden keine Daten in der Cloud gespeichert.

## Setup

### Voraussetzungen

- Lokaler Alarm Messenger Server
- Für FCM: Firebase-Projekt (kostenlos)
- Für APNs: Apple Developer Account ($99/Jahr)

### 1. Firebase Cloud Messaging (FCM) Setup - Android

#### 1.1 Firebase-Projekt erstellen

1. Gehe zu [Firebase Console](https://console.firebase.google.com/)
2. Erstelle ein neues Projekt oder wähle ein bestehendes
3. Füge eine Android-App hinzu:
   - Package name: `com.alarmmessenger`
   - Nickname: "Alarm Messenger"
   - Debug signing certificate (optional für Entwicklung)

#### 1.2 Service Account Key herunterladen

1. Firebase Console → Projekt-Einstellungen → Service Accounts
2. Klicke auf "Neuen privaten Schlüssel generieren"
3. Lade die JSON-Datei herunter (z.B. `firebase-service-account.json`)
4. Speichere sie auf dem Server (z.B. `/opt/alarm-messenger/credentials/`)

#### 1.3 Server konfigurieren

Bearbeite `.env` auf dem Server:

```bash
# FCM aktivieren
ENABLE_FCM=true

# Pfad zur Service Account JSON-Datei
FCM_SERVICE_ACCOUNT_PATH=/opt/alarm-messenger/credentials/firebase-service-account.json
```

**Sicherheit**: Stelle sicher, dass die Datei nur für den Server-Benutzer lesbar ist:

```bash
chmod 600 /opt/alarm-messenger/credentials/firebase-service-account.json
```

### 2. Apple Push Notification service (APNs) Setup - iOS

#### 2.1 APNs Authentication Key erstellen

1. Gehe zu [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Klicke auf "+" um einen neuen Key zu erstellen
3. Name: "Alarm Messenger APNs"
4. Aktiviere "Apple Push Notifications service (APNs)"
5. Klicke auf "Continue" und dann "Register"
6. **Wichtig**: Lade den Key herunter (`.p8` Datei) - kann nur einmal heruntergeladen werden!
7. Notiere die **Key ID** (10 Zeichen, z.B. `AB12CD34EF`)

#### 2.2 Team ID finden

1. Apple Developer Portal → Membership
2. Kopiere die **Team ID** (10 Zeichen, z.B. `XY98ZW76VU`)

#### 2.3 Bundle Identifier

- Standard: `com.alarmmessenger`
- Oder deine eigene Bundle ID aus Xcode/Info.plist

#### 2.4 Server konfigurieren

Bearbeite `.env` auf dem Server:

```bash
# APNs aktivieren
ENABLE_APNS=true

# Pfad zum APNs .p8 Key
APNS_KEY_PATH=/opt/alarm-messenger/credentials/AuthKey_AB12CD34EF.p8

# Key ID (aus Apple Developer Portal)
APNS_KEY_ID=AB12CD34EF

# Team ID (aus Apple Developer Portal)
APNS_TEAM_ID=XY98ZW76VU

# Bundle Identifier
APNS_TOPIC=com.alarmmessenger

# Umgebung (false = Development/Sandbox, true = Production)
APNS_PRODUCTION=false
```

**Sicherheit**: Stelle sicher, dass die Datei nur für den Server-Benutzer lesbar ist:

```bash
chmod 600 /opt/alarm-messenger/credentials/AuthKey_AB12CD34EF.p8
```

**Hinweis**: Für Production-Builds setze `APNS_PRODUCTION=true`

### 3. Server neu starten

```bash
# Docker
docker compose restart server

# PM2
pm2 restart alarm-messenger

# Systemd
systemctl restart alarm-messenger
```

### 4. Logs prüfen

Prüfe, ob FCM/APNs erfolgreich initialisiert wurden:

```bash
# Docker
docker compose logs server | grep -E "FCM|APNs"

# PM2
pm2 logs alarm-messenger | grep -E "FCM|APNs"
```

Erwartete Ausgabe:
```
✓ Firebase Cloud Messaging (FCM) initialized
✓ Apple Push Notification service (APNs) initialized (development)
```

Oder bei deaktiviert:
```
ℹ️  FCM push notifications disabled (set ENABLE_FCM=true to enable)
ℹ️  APNs push notifications disabled (set ENABLE_APNS=true to enable)
```

## Mobile App Konfiguration

### Android (Flutter)

Die Android-App benötigt keine Änderungen, wenn FCM deaktiviert ist. Bei aktiviertem FCM:

1. `google-services.json` in `android/app/` platzieren (aus Firebase Console)
2. Firebase Messaging Dependency in `pubspec.yaml`
3. FCM-Token bei Registrierung an Server senden

**Siehe**: Separate Mobile-App-Dokumentation für Details

### iOS (Flutter)

Die iOS-App benötigt keine Änderungen, wenn APNs deaktiviert ist. Bei aktiviertem APNs:

1. APNs-Capability in Xcode aktivieren
2. Push Notification Entitlement hinzufügen
3. APNs-Token bei Registrierung an Server senden

**Siehe**: Separate Mobile-App-Dokumentation für Details

## Funktionsweise

### Ablauf einer Alarmierung

1. **Einsatz wird erstellt** (via API)
2. **Server ermittelt Geräte** (alle oder nach Gruppen gefiltert)
3. **Für jedes Gerät**:
   - Versuche zuerst **Native Push** (FCM für Android, APNs für iOS)
   - Sende auch via **WebSocket** (Redundanz)
4. **Gerät empfängt Benachrichtigung**:
   - Bei geschlossener App: Über Push-Service
   - Bei aktiver WebSocket-Verbindung: Über WebSocket
   - Im besten Fall: Beide (doppelte Absicherung)

### Notification Summary

Nach jeder Alarmierung zeigt der Server eine Zusammenfassung:

```
✓ Push notifications sent to 15/20 devices
✓ WebSocket notifications sent to 12/20 connected devices
📊 Notification summary: Push=15, WebSocket=12, Total devices=20
```

**Interpretation**:
- 15 Geräte haben Push-Benachrichtigung erhalten
- 12 Geräte waren via WebSocket verbunden
- 7 Geräte waren vermutlich im Hintergrund (nur Push)
- 5 Geräte ohne Push-Token oder Fehler (nur WebSocket möglich)

## Kosten

### Firebase Cloud Messaging (FCM)

- **Kostenlos** für unbegrenzte Nachrichten
- Keine Begrenzung für Alarmierungen
- Firebase Spark Plan (kostenlos) ist ausreichend

### Apple Push Notification service (APNs)

- **Kostenlos** für unbegrenzte Nachrichten
- Erfordert Apple Developer Account: **$99/Jahr**
- Keine zusätzlichen Kosten pro Nachricht

## Datenschutz und Sicherheit

### Was wird an Google/Apple gesendet?

**Nur Zustellinformationen**:
- FCM/APNs Token (vom Gerät generiert)
- Notification Payload (Title, Body, Custom Data)

**Nicht gesendet**:
- Keine Benutzer-IDs
- Keine persönlichen Daten außer denen in der Notification
- Keine Standortdaten

### Datenspeicherung

- **Google/Apple**: Speichern nur Zustellstatus (temporär)
- **Ihr Server**: Speichert FCM/APNs Tokens (erforderlich)
- **Credentials**: Bleiben lokal auf dem Server

### Sicherheit

- ✅ Credentials lokal auf Server gespeichert
- ✅ TLS-verschlüsselte Kommunikation zu FCM/APNs
- ✅ Tokens werden nur bei Registrierung übertragen
- ✅ Keine Daten in der Cloud gespeichert

## Fehlerbehebung

### FCM: "Failed to initialize"

**Prüfen**:
1. Ist die Service Account JSON-Datei vorhanden?
   ```bash
   ls -la /opt/alarm-messenger/credentials/firebase-service-account.json
   ```
2. Ist die Datei gültig? (JSON-Format)
3. Hat der Server-Benutzer Leserechte?
4. Stimmt der Pfad in `.env`?

### APNs: "Failed to initialize"

**Prüfen**:
1. Ist die .p8 Key-Datei vorhanden?
2. Sind Key ID und Team ID korrekt?
3. Ist der Bundle Identifier korrekt?
4. Ist `APNS_PRODUCTION` richtig gesetzt?

### Keine Push-Benachrichtigungen empfangen

**Android (FCM)**:
1. Ist FCM auf dem Server aktiviert?
2. Hat die App FCM-Token an Server gesendet?
3. Ist das Gerät mit dem Internet verbunden?
4. Prüfe Server-Logs nach FCM-Fehlern

**iOS (APNs)**:
1. Ist APNs auf dem Server aktiviert?
2. Hat die App APNs-Token an Server gesendet?
3. Sind Push-Berechtigungen in iOS erlaubt?
4. Stimmt Development/Production mit dem Build überein?
5. Prüfe Server-Logs nach APNs-Fehlern

### Push-Token nicht registriert

**Prüfen in der Datenbank**:
```bash
sqlite3 data/alarm-messenger.db "SELECT id, platform, fcm_token, apns_token FROM devices LIMIT 5;"
```

Erwartete Ausgabe:
- Android: `fcm_token` sollte gesetzt sein
- iOS: `apns_token` sollte gesetzt sein

Falls leer: App sendet Tokens nicht - Mobile-App-Konfiguration prüfen

## Migration von WebSocket-only

### Bestehende Installation

Bestehende Installationen funktionieren **ohne Änderungen**:
- WebSocket-Benachrichtigungen bleiben aktiv
- FCM/APNs sind optional
- Keine Breaking Changes

### Schrittweise Migration

1. **Server aktualisieren** (neue Version mit FCM/APNs Support)
2. **Optional**: FCM/APNs konfigurieren
3. **Mobile App aktualisieren** (neue Version mit Push-Token-Support)
4. **Testen**: Beide Benachrichtigungswege funktionieren parallel

### Rückwärtskompatibilität

- Alte Mobile Apps ohne Push-Token-Support funktionieren weiterhin
- Server erkennt automatisch, ob Push-Tokens verfügbar sind
- Fallback zu WebSocket wenn keine Push-Tokens vorhanden

## Best Practices

### Für Administratoren

1. **Aktiviere beide Dienste** (FCM + APNs) für volle Abdeckung
2. **Sichere Credentials** mit restriktiven Dateiberechtigungen
3. **Überwache Logs** auf Fehler bei der Push-Zustellung
4. **Teste regelmäßig** beide Notification-Wege

### Für Entwickler

1. **Teste mit beiden Wegen** (Push + WebSocket)
2. **Handle Token-Aktualisierungen** in der Mobile App
3. **Implementiere Error Handling** für fehlgeschlagene Token-Registrierungen
4. **Nutze Development-APNs** für Tests, Production für Releases

### Für Benutzer

1. **Erlaube Push-Benachrichtigungen** in der App
2. **Halte App aktuell** für neueste Push-Features
3. **Prüfe Benachrichtigungseinstellungen** in iOS/Android-Systemeinstellungen

## Vergleich: WebSocket vs. Push Notifications

| Feature | WebSocket | FCM/APNs |
|---------|-----------|----------|
| **App aktiv** | ✅ Hervorragend | ✅ Hervorragend |
| **App im Hintergrund** | ⚠️ Begrenzt | ✅ Zuverlässig |
| **App geschlossen** | ❌ Nicht möglich | ✅ Funktioniert |
| **Stromsparmodus** | ❌ Eingeschränkt | ✅ Funktioniert |
| **iOS Do Not Disturb** | ❌ Keine Lösung | ✅ Critical Alerts |
| **Latenz** | ⚡ < 1s | ⚡ 1-5s |
| **Setup-Aufwand** | ✅ Minimal | ⚠️ Mittel |
| **Kosten** | ✅ Kostenlos | ✅ Kostenlos* |
| **Abhängigkeiten** | ✅ Keine | ⚠️ Google/Apple |
| **Datenschutz** | ✅ Vollständig lokal | ⚠️ Zustellung via Cloud |

*APNs erfordert Apple Developer Account ($99/Jahr)

## Empfehlung

Für **produktive Alarmierungssysteme** empfehlen wir:

- ✅ **FCM aktivieren** für Android-Geräte
- ✅ **APNs aktivieren** für iOS-Geräte  
- ✅ **WebSocket beibehalten** als Backup und für Echtzeit-Updates
- ✅ **Hybrid-Ansatz** für maximale Zuverlässigkeit

Für **Test-/Entwicklungsumgebungen**:

- ✅ Nur WebSocket ist ausreichend
- ✅ Keine zusätzliche Konfiguration erforderlich

## Weitere Ressourcen

- [Firebase Cloud Messaging Dokumentation](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service Dokumentation](https://developer.apple.com/documentation/usernotifications)
- [iOS Benachrichtigungen (lokale Dokumentation)](IOS-BENACHRICHTIGUNGEN.md)

## Support

Bei Fragen oder Problemen:
- GitHub Issues: https://github.com/TimUx/alarm-messenger/issues
- Dokumentation: https://github.com/TimUx/alarm-messenger/tree/main/docs
