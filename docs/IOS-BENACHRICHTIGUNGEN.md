# iOS Hintergrund-Benachrichtigungen

Dieses Dokument beschreibt, wie die automatischen Push-Benachrichtigungen auf iOS funktionieren und was für eine zuverlässige Alarmierung erforderlich ist.

## Problem

iOS hat strikte Einschränkungen für Hintergrund-Aktivitäten, um die Akkulaufzeit zu verlängern. Dies betrifft:

- WebSocket-Verbindungen werden im Hintergrund oft unterbrochen
- Apps werden nach kurzer Zeit in den Ruhezustand versetzt
- Benachrichtigungen müssen explizit konfiguriert werden

## Lösung

Die App verwendet mehrere Mechanismen, um zuverlässige Benachrichtigungen auf iOS zu gewährleisten:

### 1. iOS Hintergrund-Modi

Die App ist für folgende Hintergrund-Modi konfiguriert (`Info.plist`):

```xml
<key>UIBackgroundModes</key>
<array>
    <string>audio</string>
    <string>fetch</string>
    <string>processing</string>
    <string>remote-notification</string>
</array>
```

**Funktionen:**

- **audio**: Ermöglicht das Abspielen von Alarmtönen im Hintergrund
- **fetch**: Erlaubt periodisches Abrufen von Daten im Hintergrund
- **processing**: Ermöglicht Hintergrund-Verarbeitung
- **remote-notification**: Aktiviert Push-Benachrichtigungen

### 2. Lokale Benachrichtigungen

Die App verwendet `flutter_local_notifications` mit kritischen Benachrichtigungen:

```dart
const iosDetails = DarwinNotificationDetails(
  presentAlert: true,
  presentBadge: true,
  presentSound: true,
  interruptionLevel: InterruptionLevel.critical,
  presentList: true,
  presentBanner: true,
);
```

**Vorteile:**

- Kritische Benachrichtigungen umgehen "Nicht Stören"-Modus
- Benachrichtigungen werden auch angezeigt, wenn die App im Vordergrund ist
- Banner und Ton werden immer abgespielt

### 3. WebSocket-Verbindung mit Heartbeat

Die WebSocket-Verbindung sendet alle 30 Sekunden einen Ping:

```dart
Timer.periodic(const Duration(seconds: 30), (timer) {
  if (_isConnected) {
    sendMessage({'type': 'ping'});
  }
});
```

**Funktionen:**

- Hält die Verbindung aktiv
- Erkennt Verbindungsabbrüche frühzeitig
- Automatische Wiederverbindung mit exponentieller Verzögerung

### 4. App-Lebenszyklus-Management

Die App überwacht den Lebenszyklus und stellt die Verbindung wieder her:

```dart
void didChangeAppLifecycleState(AppLifecycleState state) {
  if (state == AppLifecycleState.resumed) {
    WebSocketService.ensureConnected();
  }
}
```

**Vorteile:**

- Verbindung wird wiederhergestellt, wenn die App in den Vordergrund kommt
- Verpasste Alarme werden beim Öffnen der App angezeigt

### 5. Aktive Alarm-Erkennung beim Start

Beim App-Start werden alle aktiven Alarme überprüft:

```dart
void _checkForActiveEmergency() {
  final activeEmergencies = _emergencies.where((e) => e.active).toList();
  if (activeEmergencies.isNotEmpty) {
    // Zeige den neuesten aktiven Alarm
    _currentEmergency = activeEmergencies.first;
    AlarmService.playAlarm();
  }
}
```

**Vorteile:**

- Verpasste Alarme werden automatisch angezeigt
- Benutzer wird auch bei geschlossener App über aktive Alarme informiert

## Workflow

### App im Vordergrund

1. WebSocket empfängt Alarm-Nachricht
2. Lokale Benachrichtigung wird angezeigt
3. Alarmton wird abgespielt
4. Dialog erscheint automatisch

### App im Hintergrund

1. WebSocket empfängt Alarm-Nachricht (falls Verbindung noch aktiv)
2. Lokale kritische Benachrichtigung wird angezeigt
3. iOS weckt die App kurz auf
4. Alarmton wird abgespielt
5. Beim Antippen der Benachrichtigung öffnet sich die App
6. Dialog erscheint automatisch

### App geschlossen

1. Benutzer öffnet die App (manuell oder durch andere Benachrichtigung)
2. App lädt aktive Alarme vom Server
3. Falls ein aktiver Alarm existiert, wird dieser automatisch angezeigt
4. Alarmton wird abgespielt
5. Dialog erscheint automatisch

## Einschränkungen

### iOS-Beschränkungen

Trotz aller Optimierungen gibt es einige iOS-Beschränkungen:

1. **WebSocket im Hintergrund**: iOS kann WebSocket-Verbindungen nach einigen Minuten im Hintergrund beenden
2. **Batteriesparmodus**: Im Low-Power-Modus sind Hintergrund-Aktivitäten stark eingeschränkt
3. **Systemressourcen**: Bei Speicher- oder CPU-Druck kann iOS die App beenden

### Empfohlene Workarounds

Für kritische Alarmierungssysteme sollten Sie zusätzlich:

1. **APNs (Apple Push Notification Service)** integrieren:
   - Erfordert Apple Developer Account
   - Serverseite muss APNs-Tokens verwalten
   - Garantiert Zustellung auch bei geschlossener App

2. **Regelmäßige manuelle Überprüfung**:
   - Benutzer sollten die App regelmäßig öffnen
   - Aktive Alarme werden automatisch erkannt und angezeigt

3. **Alternative Alarmierungswege**:
   - SMS als Backup-Kanal
   - Pager für kritische Einsatzkräfte

## Berechtigungen

### Erforderliche iOS-Berechtigungen

Die App benötigt folgende Berechtigungen:

1. **Benachrichtigungen** (`POST_NOTIFICATIONS`):
   - Wird beim ersten Start automatisch angefordert
   - Kritisch für Alarm-Benachrichtigungen

2. **Kamera** (`NSCameraUsageDescription`):
   - Für QR-Code-Scanner bei der Registrierung

3. **Mikrofon** (`NSMicrophoneUsageDescription`):
   - Für Alarmton-Wiedergabe

### Berechtigungen prüfen

Benutzer können Berechtigungen in den iOS-Einstellungen überprüfen:

1. Einstellungen → Alarm Messenger
2. Benachrichtigungen aktivieren
3. Kritische Warnungen aktivieren (wichtig!)
4. Töne aktivieren

## Fehlerbehebung

### Keine Benachrichtigungen erhalten

**Prüfen Sie:**

1. ✅ Sind Benachrichtigungen in den iOS-Einstellungen aktiviert?
2. ✅ Sind kritische Warnungen aktiviert?
3. ✅ Ist die App registriert (QR-Code gescannt)?
4. ✅ Ist das Gerät mit dem Internet verbunden?
5. ✅ Ist der Server erreichbar?

### Benachrichtigungen kommen verzögert

**Mögliche Ursachen:**

1. WebSocket-Verbindung wurde im Hintergrund beendet
2. iOS hat die App in den Ruhezustand versetzt
3. Low-Power-Modus ist aktiv

**Lösungen:**

1. App kurz öffnen, um Verbindung wiederherzustellen
2. Low-Power-Modus deaktivieren (Einstellungen → Batterie)
3. APNs-Integration für garantierte Zustellung

### Dialog erscheint nicht

**Prüfen Sie:**

1. Ist ein aktiver Alarm vorhanden? (Prüfen Sie die Einsatz-Liste)
2. Wurde bereits auf den Alarm reagiert?
3. Öffnen Sie die App neu, um aktive Alarme zu laden

## Best Practices für Benutzer

### Für zuverlässige Alarmierung:

1. **App im Hintergrund laufen lassen**:
   - App nach Benutzung nicht schließen (nicht aus dem App-Switcher entfernen)
   - iOS hält die App dann länger im Speicher

2. **Regelmäßig die App öffnen**:
   - Mindestens einmal täglich kurz öffnen
   - Aktive Alarme werden automatisch angezeigt

3. **Benachrichtigungseinstellungen optimieren**:
   - Kritische Warnungen aktivieren
   - Töne aktivieren
   - Banner-Stil wählen

4. **Batteriesparmodus bei Bereitschaft vermeiden**:
   - Low-Power-Modus deaktivieren
   - Oder Ausnahme für Alarm Messenger App erstellen (iOS 16+)

5. **Internetverbindung sicherstellen**:
   - WLAN oder mobile Daten aktiv
   - Flugmodus deaktivieren

## Technische Details

### Implementierte Dateien

- `mobile/ios/Runner/Info.plist`: iOS Hintergrund-Modi
- `mobile/ios/Runner/AppDelegate.swift`: Hintergrund-Task-Verwaltung
- `mobile/lib/services/notification_service.dart`: Benachrichtigungs-Service
- `mobile/lib/services/websocket_service.dart`: WebSocket mit Heartbeat
- `mobile/lib/main.dart`: App-Lebenszyklus-Überwachung
- `mobile/lib/providers/app_state.dart`: Alarm-Verwaltung

### Logs und Debugging

Für Entwickler: Die App loggt alle wichtigen Ereignisse:

```dart
developer.log('Message', name: 'ServiceName');
```

Um Logs anzuzeigen:

```bash
flutter logs
```

Oder in Xcode: Window → Devices and Simulators → View Device Logs

## Zukünftige Verbesserungen

Mögliche Erweiterungen für noch zuverlässigere Benachrichtigungen:

1. **APNs-Integration**:
   - Server sendet Push-Benachrichtigungen über Apple's APNs
   - Garantiert Zustellung auch bei geschlossener App

2. **Background Fetch**:
   - Periodisches Abrufen neuer Alarme im Hintergrund
   - iOS entscheidet, wann die App aufgeweckt wird

3. **Silent Notifications**:
   - Server kann App im Hintergrund wecken
   - Erfordert APNs-Integration

4. **Notification Service Extension**:
   - Verarbeitung von Benachrichtigungen bevor sie angezeigt werden
   - Ermöglicht Anpassung und Gruppierung

## Support

Bei Problemen mit iOS-Benachrichtigungen:

1. GitHub Issues öffnen
2. Folgende Informationen bereitstellen:
   - iOS-Version
   - App-Version
   - Logs (wenn möglich)
   - Beschreibung des Problems

## Referenzen

- [Apple Documentation - Background Execution](https://developer.apple.com/documentation/uikit/app_and_environment/scenes/preparing_your_ui_to_run_in_the_background)
- [Flutter Local Notifications](https://pub.dev/packages/flutter_local_notifications)
- [WebSocket on iOS](https://developer.apple.com/documentation/foundation/urlsessionwebsockettask)
