# Release-Prozess

Diese Dokumentation beschreibt, wie neue Releases für das Alarm Messenger System erstellt werden.

## Übersicht

Das Alarm Messenger System verwendet einen automatisierten Release-Workflow, der bei jedem neuen Version-Tag ausgelöst wird und folgende Komponenten erstellt:

- **Server Docker Image** - Automatisch gebaut und zu GitHub Container Registry gepusht
- **Android APK (Debug & Release)** - Für direkte Installation
- **Android App Bundle (AAB)** - Für Google Play Store
- **iOS Build** - Ohne Code-Signatur (muss manuell signiert werden)

## Release erstellen

### 1. Version vorbereiten

Vor dem Erstellen eines Releases sollten die Versionsnummern in den Dateien aktualisiert werden:

**Server-Version (`server/package.json`):**
```json
{
  "version": "1.0.0"
}
```

**Mobile App Version (`mobile/pubspec.yaml`):**
```yaml
version: 1.0.0+1
```

> **Format:** `MAJOR.MINOR.PATCH+BUILDNUMBER`
> - MAJOR.MINOR.PATCH = Semantische Version
> - BUILDNUMBER = Build-Nummer (wird bei jedem Build erhöht)

### 2. Änderungen committen

```bash
git add server/package.json mobile/pubspec.yaml
git commit -m "chore: bump version to 1.0.0"
git push origin main
```

### 3. Tag erstellen

```bash
# Version-Tag erstellen
git tag -a v1.0.0 -m "Release v1.0.0"

# Tag zu GitHub pushen
git push origin v1.0.0
```

### 4. Automatischer Build

Nach dem Pushen des Tags:

1. **Release-Workflow startet automatisch** (`.github/workflows/release.yml`)
   - Erstellt GitHub Release
   - Baut Android APK (Debug & Release)
   - Baut Android App Bundle (AAB)
   - Baut iOS App (ohne Code-Signatur)
   - Lädt alle Artifacts zum Release hoch

2. **Docker-Build-Workflow startet** (`.github/workflows/build-and-push.yml`)
   - Baut Server Docker Image
   - Pusht zu GitHub Container Registry
   - Taggt mit Version und `latest`

### 5. Release bearbeiten (optional)

Nach Abschluss der Workflows:

1. Gehe zu GitHub Releases (Repository → Releases Tab)
2. Öffne das neu erstellte Release
3. Bearbeite die Release Notes:
   - Beschreibe neue Features
   - Liste Breaking Changes auf
   - Erwähne wichtige Bugfixes
   - Füge Upgrade-Hinweise hinzu

## Manueller Release (Workflow Dispatch)

Falls nötig, kann ein Release auch manuell über GitHub Actions ausgelöst werden:

1. Gehe zu Actions (Repository → Actions Tab)
2. Wähle "Create Release with Mobile Builds"
3. Klicke auf "Run workflow"
4. Gib die Version ein (z.B., `v1.0.0`)
5. Klicke auf "Run workflow"

## Android Signing Secrets

Für signierte Android-Releases müssen folgende GitHub Secrets konfiguriert sein:

- `ANDROID_KEYSTORE_BASE64` - Base64-kodierter Android Keystore
- `ANDROID_KEY_ALIAS` - Key Alias aus dem Keystore
- `ANDROID_STORE_PASSWORD` - Keystore-Passwort
- `ANDROID_KEY_PASSWORD` - Key-Passwort

### Keystore erstellen

```bash
# Neuen Keystore erstellen
keytool -genkey -v -keystore alarm-messenger.keystore \
  -alias alarm-messenger -keyalg RSA -keysize 2048 -validity 10000

# Zu Base64 konvertieren für GitHub Secret
base64 -w 0 alarm-messenger.keystore > keystore.base64
```

### Secrets konfigurieren

1. Gehe zu Repository Settings > Secrets and variables > Actions
2. Füge die Secrets hinzu:
   - `ANDROID_KEYSTORE_BASE64`: Inhalt von `keystore.base64`
   - `ANDROID_KEY_ALIAS`: Key Alias (z.B., `alarm-messenger`)
   - `ANDROID_STORE_PASSWORD`: Keystore-Passwort
   - `ANDROID_KEY_PASSWORD`: Key-Passwort

> **⚠️ Sicherheitshinweis:** 
> - Keystore-Datei sicher aufbewahren (Backup!)
> - Passwörter nie im Code speichern
> - Secrets nur über GitHub Actions Secrets verwenden

## iOS Code-Signatur

iOS Builds werden ohne Code-Signatur erstellt. Für iOS Distribution:

1. Öffne das Projekt in Xcode
2. Konfiguriere Signing & Capabilities
3. Wähle dein Developer Team
4. Erstelle ein Provisioning Profile
5. Archive und exportiere IPA für Distribution

**Alternativen:**
- Fastlane für automatisiertes iOS Signing
- GitHub Actions macOS Runner mit Signing Certificates

Siehe [Flutter iOS Deployment Guide](https://docs.flutter.dev/deployment/ios) für Details.

## Versionierungs-Schema

Das Projekt folgt [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

MAJOR: Breaking Changes (API-Änderungen, Datenbankschema-Änderungen)
MINOR: Neue Features (rückwärtskompatibel)
PATCH: Bugfixes (rückwärtskompatibel)
```

**Beispiele:**
- `1.0.0` - Erste stabile Version
- `1.1.0` - Neue Features hinzugefügt
- `1.1.1` - Bugfixes
- `2.0.0` - Breaking Changes

## Docker Image Deployment

Nach einem erfolgreichen Release:

```bash
# Image mit spezifischer Version pullen
docker pull ghcr.io/<your-username>/<repository-name>:v1.0.0

# Oder latest Version
docker pull ghcr.io/<your-username>/<repository-name>:latest

# In docker-compose.yml verwenden
services:
  server:
    image: ghcr.io/<your-username>/<repository-name>:v1.0.0
    # ... weitere Konfiguration
```

> **Hinweis:** Ersetze `<your-username>` mit deinem GitHub-Benutzernamen und `<repository-name>` mit dem Repository-Namen.

## Mobile App Distribution

### Android

**APK (Direct Install):**
1. Download `alarm-messenger-v1.0.0-release.apk` von GitHub Release
2. Übertrage auf Android-Gerät
3. Installiere (erfordert "Unbekannte Quellen" in Einstellungen)

**Google Play Store:**
1. Download `alarm-messenger-v1.0.0-release.aab` von GitHub Release
2. Login zu [Google Play Console](https://play.google.com/console)
3. Gehe zu App > Release > Production
4. Erstelle neues Release
5. Lade AAB-Datei hoch
6. Füge Release Notes hinzu
7. Review und Rollout

### iOS

iOS Deployment erfordert:
1. Apple Developer Account ($99/Jahr)
2. Code-Signatur-Zertifikate
3. Xcode auf macOS

**TestFlight Distribution:**
1. In Xcode: Product > Archive
2. Distribute App > App Store Connect
3. Upload zu App Store Connect
4. Konfiguriere TestFlight
5. Lade Tester ein

**App Store Release:**
1. Wie TestFlight, aber als "App Store" Distribution
2. Füge Screenshots und Metadaten hinzu
3. Submit für Review
4. Nach Approval: Release

## Workflow-Dateien

**Release-Workflow:** `.github/workflows/release.yml`
- Erstellt GitHub Releases
- Baut Mobile Apps
- Lädt Artifacts hoch

**Docker-Build:** `.github/workflows/build-and-push.yml`
- Baut Server Docker Image
- Pusht zu GitHub Container Registry

**Mobile-Build:** `.github/workflows/flutter-mobile-build.yml`
- Kontinuierliche Builds bei Code-Änderungen
- Separate Workflow für Development-Builds

## Checkliste für Releases

- [ ] Versionsnummern in `server/package.json` und `mobile/pubspec.yaml` aktualisiert
- [ ] Alle Tests laufen erfolgreich
- [ ] CHANGELOG.md aktualisiert (falls vorhanden)
- [ ] Breaking Changes dokumentiert
- [ ] Tag erstellt und gepusht
- [ ] Workflows erfolgreich abgeschlossen
- [ ] Release Notes ausgefüllt
- [ ] Docker Image verifiziert
- [ ] Mobile Apps getestet (mindestens auf einem Gerät)
- [ ] Dokumentation aktualisiert (falls nötig)

## Troubleshooting

### Workflow schlägt fehl

1. Prüfe Workflow-Logs in GitHub Actions
2. Häufige Probleme:
   - Fehlende Signing Secrets (Android)
   - Flutter Version inkompatibel
   - Build-Fehler im Code

### Release-Tag existiert bereits

```bash
# Tag lokal löschen
git tag -d v1.0.0

# Tag remote löschen
git push origin :refs/tags/v1.0.0

# Neuen Tag erstellen
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### Docker Image nicht verfügbar

- Warte bis `build-and-push` Workflow abgeschlossen ist
- Prüfe GitHub Container Registry Permissions
- Verifiziere GITHUB_TOKEN Permissions

## Weitere Ressourcen

- [GitHub Releases Dokumentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Flutter Deployment Guide](https://docs.flutter.dev/deployment)
- [Semantic Versioning](https://semver.org/)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [iOS App Distribution](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
