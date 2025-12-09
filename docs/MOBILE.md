# Mobile App - Build und Installation Guide

Dieses Dokument erklärt detailliert, wie die Android und iOS Apps kompiliert, installiert und über GitHub Actions als Release bereitgestellt werden können.

## Inhaltsverzeichnis

- [Übersicht](#übersicht)
- [Voraussetzungen](#voraussetzungen)
  - [Für beide Plattformen](#für-beide-plattformen)
  - [Für iOS Development](#für-ios-development)
  - [Für Android Development](#für-android-development)
- [Installation der Dependencies](#installation-der-dependencies)
- [iOS Build und Installation](#ios-build-und-installation)
- [Android Build und Installation](#android-build-und-installation)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Troubleshooting](#troubleshooting)

## Übersicht

Die Alarm Messenger Mobile App ist eine React Native Anwendung, die:
- **Keine externen Dienste** wie Firebase benötigt
- Über **WebSocket** direkt mit dem Server kommuniziert
- Vollständig **lokal kompilierbar** ist
- Auf iOS und Android läuft

## Voraussetzungen

### Für beide Plattformen
- Node.js 18 oder höher
- npm oder yarn
- Git

### Für iOS Development
- **macOS** (iOS Apps können nur auf macOS entwickelt werden)
- Xcode 14 oder höher
- CocoaPods (`sudo gem install cocoapods`)
- iOS Simulator (in Xcode enthalten) oder physisches iOS-Gerät
- Apple Developer Account (nur für physische Geräte und App Store)

### Für Android Development
- Android Studio
- Android SDK (API Level 33 oder höher)
- Android Emulator (in Android Studio enthalten) oder physisches Android-Gerät
- Java Development Kit (JDK) 11 oder höher

## Installation der Dependencies

```bash
cd mobile
npm install
```

## iOS Build und Installation

### Schritt 1: iOS Dependencies installieren

```bash
cd ios
pod install
cd ..
```

### Schritt 2: Berechtigungen konfigurieren

Die App benötigt Kamera-Zugriff für den QR-Code-Scanner. Dies ist bereits in `ios/AlarmMessenger/Info.plist` konfiguriert:

```xml
<key>NSCameraUsageDescription</key>
<string>Diese App benötigt Kamerazugriff zum Scannen von QR-Codes für die Geräteregistrierung.</string>
```

### Schritt 3: Development Build

**Option A: Via React Native CLI**
```bash
npm run ios
```

**Option B: Via Xcode**
1. Öffne `ios/AlarmMessenger.xcworkspace` in Xcode (NICHT .xcodeproj!)
2. Wähle einen Simulator oder verbinde ein iPhone
3. Klicke auf Run (⌘R) oder Product > Run

### Schritt 4: Auf physischem iPhone installieren

1. Verbinde dein iPhone per USB
2. Öffne Xcode
3. Wähle dein iPhone als Ziel aus
4. Unter "Signing & Capabilities":
   - Team: Wähle dein Apple Developer Team (oder erstelle ein kostenloses Personal Team)
   - Bundle Identifier: Ändere bei Bedarf (z.B. `com.deinname.alarmmessenger`)
5. Klicke Run (⌘R)
6. Auf dem iPhone: Einstellungen > Allgemein > VPN & Geräteverwaltung > Vertraue dem Entwickler

**Hinweis:** Ohne Apple Developer Account (99€/Jahr) läuft die App nur 7 Tage auf dem Gerät.

### Schritt 5: Production Build für App Store

```bash
# In Xcode:
1. Product > Scheme > Edit Scheme > Run > Build Configuration > Release
2. Product > Archive
3. Window > Organizer > Wähle dein Archiv > Distribute App
4. Wähle "App Store Connect" oder "Ad Hoc" für Test-Distribution
```

Für Ad-Hoc Distribution (ohne App Store):
```bash
# IPA-Datei wird erstellt, die per E-Mail/Link verteilt werden kann
# Empfänger müssen ihre UDID in deinem Developer Account registrieren
```

## Android Build und Installation

### Schritt 1: Berechtigungen prüfen

Die erforderlichen Berechtigungen sind bereits in `android/app/src/main/AndroidManifest.xml` konfiguriert:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

### Schritt 2: Development Build

**Option A: Via React Native CLI**
```bash
npm run android
```

**Option B: Via Android Studio**
1. Öffne den `android` Ordner in Android Studio
2. Wähle einen Emulator oder verbinde ein Android-Gerät
3. Klicke Run

### Schritt 3: Debug APK erstellen

```bash
cd android
./gradlew assembleDebug
```

Die APK findest du unter:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

Diese APK kannst du direkt auf Android-Geräten installieren:
```bash
# Per USB verbundenes Gerät
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Oder APK-Datei per E-Mail/Cloud teilen und auf Gerät öffnen
# (Erlaube "Installation aus unbekannten Quellen" in den Einstellungen)
```

### Schritt 4: Release APK erstellen (signiert)

#### Signing Key generieren (einmalig)

```bash
keytool -genkey -v -keystore android/app/alarm-messenger.keystore \
  -alias alarm-messenger \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**WICHTIG:** Bewahre das Keystore-Passwort sicher auf! Es wird für alle zukünftigen Updates benötigt.

#### Signing konfigurieren

Erstelle `android/gradle.properties` (lokal, nicht committen!):
```properties
MYAPP_RELEASE_STORE_FILE=alarm-messenger.keystore
MYAPP_RELEASE_KEY_ALIAS=alarm-messenger
MYAPP_RELEASE_STORE_PASSWORD=dein-passwort
MYAPP_RELEASE_KEY_PASSWORD=dein-passwort
```

Oder setze Umgebungsvariablen:
```bash
export MYAPP_RELEASE_STORE_FILE=alarm-messenger.keystore
export MYAPP_RELEASE_KEY_ALIAS=alarm-messenger
export MYAPP_RELEASE_STORE_PASSWORD=dein-passwort
export MYAPP_RELEASE_KEY_PASSWORD=dein-passwort
```

In `android/app/build.gradle` ist bereits konfiguriert:
```gradle
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

#### Release APK bauen

```bash
cd android
./gradlew assembleRelease
```

Die signierte Release-APK findest du unter:
```
android/app/build/outputs/apk/release/app-release.apk
```

#### APK direkt installieren

```bash
# Per USB
adb install android/app/build/outputs/apk/release/app-release.apk

# Oder Datei teilen und auf Gerät installieren
```

### Schritt 5: Android App Bundle (AAB) für Play Store

```bash
cd android
./gradlew bundleRelease
```

Die AAB-Datei findest du unter:
```
android/app/build/outputs/bundle/release/app-release.aab
```

Diese Datei wird für den Upload zum Google Play Store verwendet.

## Alarm-Sound hinzufügen

Die App benötigt eine `alarm.mp3` Datei für den Alarmton.

### iOS
```bash
# 1. Füge alarm.mp3 zu ios/AlarmMessenger/ hinzu
# 2. Öffne Xcode
# 3. Rechtsklick auf Projekt > Add Files to "AlarmMessenger"
# 4. Wähle alarm.mp3
# 5. Aktiviere "Copy items if needed"
# 6. Wähle Target "AlarmMessenger"
```

### Android
```bash
# Erstelle Verzeichnis und füge Datei hinzu
mkdir -p android/app/src/main/res/raw/
cp /pfad/zu/alarm.mp3 android/app/src/main/res/raw/
```

Kostenlose Alarm-Sounds:
- https://freesound.org/
- https://www.zapsplat.com/

## App-Anpassungen

### App-Name ändern

**iOS:** `ios/AlarmMessenger/Info.plist`
```xml
<key>CFBundleDisplayName</key>
<string>Dein App Name</string>
```

**Android:** `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Dein App Name</string>
```

### App-Icon ändern

Nutze einen Generator wie [App Icon Generator](https://appicon.co/).

**iOS:** Ersetze Icons in `ios/AlarmMessenger/Images.xcassets/AppIcon.appiconset/`

**Android:** Ersetze Icons in `android/app/src/main/res/mipmap-*/`

### Bundle Identifier / Package Name ändern

**iOS:** In Xcode unter "General" > "Identity" > "Bundle Identifier"

**Android:** In `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.deinname.alarmmessenger"
}
```

## GitHub Actions für automatische Releases

### Ja, es ist möglich! Hier ist die Lösung:

Erstelle `.github/workflows/mobile-release.yml`:

```yaml
name: Mobile App Release

on:
  push:
    tags:
      - 'mobile-v*'
  workflow_dispatch:

jobs:
  android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Setup Java
        uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '11'
          
      - name: Install dependencies
        working-directory: mobile
        run: npm ci
        
      - name: Decode Keystore
        env:
          KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          echo "$KEYSTORE_BASE64" | base64 --decode > mobile/android/app/alarm-messenger.keystore
          
      - name: Build Release APK
        working-directory: mobile/android
        env:
          MYAPP_RELEASE_STORE_FILE: alarm-messenger.keystore
          MYAPP_RELEASE_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          MYAPP_RELEASE_STORE_PASSWORD: ${{ secrets.ANDROID_STORE_PASSWORD }}
          MYAPP_RELEASE_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: ./gradlew assembleRelease
        
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-release.apk
          path: mobile/android/app/build/outputs/apk/release/app-release.apk
          
      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: mobile/android/app/build/outputs/apk/release/app-release.apk
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        working-directory: mobile
        run: npm ci
        
      - name: Install CocoaPods
        working-directory: mobile/ios
        run: pod install
        
      - name: Build iOS App
        working-directory: mobile/ios
        run: |
          xcodebuild -workspace AlarmMessenger.xcworkspace \
            -scheme AlarmMessenger \
            -configuration Release \
            -archivePath $PWD/build/AlarmMessenger.xcarchive \
            archive
            
      - name: Export IPA
        working-directory: mobile/ios
        run: |
          xcodebuild -exportArchive \
            -archivePath $PWD/build/AlarmMessenger.xcarchive \
            -exportPath $PWD/build \
            -exportOptionsPlist ExportOptions.plist
            
      - name: Upload IPA
        uses: actions/upload-artifact@v4
        with:
          name: AlarmMessenger.ipa
          path: mobile/ios/build/AlarmMessenger.ipa
          
      - name: Create Release
        uses: softprops/action-gh-release@v1
        if: startsWith(github.ref, 'refs/tags/')
        with:
          files: mobile/ios/build/AlarmMessenger.ipa
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### GitHub Secrets einrichten

Für Android in Repository Settings > Secrets:

1. **ANDROID_KEYSTORE_BASE64**: 
   ```bash
   base64 -i android/app/alarm-messenger.keystore | pbcopy
   # Oder unter Linux:
   base64 -w 0 android/app/alarm-messenger.keystore
   ```
   
2. **ANDROID_KEY_ALIAS**: `alarm-messenger`
3. **ANDROID_STORE_PASSWORD**: Dein Keystore-Passwort
4. **ANDROID_KEY_PASSWORD**: Dein Key-Passwort

### Release erstellen

```bash
# Tag erstellen und pushen
git tag mobile-v1.0.0
git push origin mobile-v1.0.0

# GitHub Actions baut automatisch APK/IPA und erstellt einen Release
```

Die Apps werden dann unter "Releases" zum Download bereitgestellt!

### iOS Code Signing in GitHub Actions

Für iOS ist es komplexer wegen Code Signing. Optionen:

1. **Fastlane Match**: Zertifikate in privatem Git-Repo speichern
2. **App Store Connect API**: Vollautomatischer Upload
3. **Ad-Hoc Distribution**: Für interne Tests ohne App Store

Beispiel mit Fastlane Match:
```yaml
- name: Setup Fastlane
  run: gem install fastlane

- name: Fastlane Build & Sign
  env:
    MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
    FASTLANE_USER: ${{ secrets.APPLE_ID }}
    FASTLANE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
  working-directory: mobile/ios
  run: fastlane beta
```

## Testing

### Test auf Simulator/Emulator

**iOS Simulator:**
```bash
npm run ios
# Oder wähle einen spezifischen Simulator:
npm run ios -- --simulator="iPhone 14 Pro"
```

**Android Emulator:**
```bash
npm run android
# Stelle sicher, dass ein Emulator läuft
```

### Test auf physischem Gerät

1. Backend Server starten
2. QR-Code generieren:
   ```bash
   curl -X POST http://DEINE-SERVER-IP:3000/api/devices/registration-token
   ```
3. App öffnen und QR-Code scannen
4. Test-Alarm senden:
   ```bash
   curl -X POST http://DEINE-SERVER-IP:3000/api/emergencies \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{
       "emergencyNumber": "TEST-001",
       "emergencyDate": "2024-12-07T19:00:00Z",
       "emergencyKeyword": "TEST ALARM",
       "emergencyDescription": "Test Benachrichtigung",
       "emergencyLocation": "Test Standort"
     }'
   ```

## Troubleshooting

### iOS

**"pod install" schlägt fehl:**
```bash
cd ios
pod deintegrate
pod install --repo-update
```

**Build-Fehler in Xcode:**
```bash
# Build Folder löschen
Product > Clean Build Folder (⇧⌘K)

# Derived Data löschen
rm -rf ~/Library/Developer/Xcode/DerivedData
```

**App startet nicht auf physischem Gerät:**
- Prüfe Bundle Identifier
- Prüfe Signing & Capabilities
- Vertraue dem Entwickler in iOS-Einstellungen

### Android

**Gradle Build schlägt fehl:**
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

**"Unable to load script":**
```bash
npm start -- --reset-cache
```

**App installiert, aber startet nicht:**
```bash
# Prüfe Logs
adb logcat *:E
```

### Allgemein

**Metro Bundler Fehler:**
```bash
# Cache löschen
npm start -- --reset-cache

# Node Modules neu installieren
rm -rf node_modules
npm install
```

## Distribution

### Ad-Hoc Distribution (empfohlen für Tests)

**Android:**
- APK per E-Mail, Cloud oder eigener Website verteilen
- Nutzer müssen "Installation aus unbekannten Quellen" erlauben

**iOS:**
- TestFlight (kostenlos, bis zu 10.000 Tester)
- Ad-Hoc IPA (max. 100 Geräte, UDIDs müssen registriert sein)

### App Stores

**Google Play Store:**
- Einmalig 25$ Registrierungsgebühr
- AAB-Upload erforderlich
- Review-Zeit: 1-3 Tage

**Apple App Store:**
- 99€/Jahr Apple Developer Program
- IPA-Upload via Xcode oder Transporter
- Review-Zeit: 1-3 Tage

### Enterprise Distribution

Für interne Firmen-Apps ohne Store:
- **Android**: MDM (Mobile Device Management)
- **iOS**: Apple Enterprise Program (299€/Jahr)

## Best Practices

✅ Versionsnummer in `package.json` erhöhen
✅ Changelogs pflegen
✅ Apps auf mehreren Geräten testen
✅ Performance mit React Native Profiler prüfen
✅ App-Größe optimieren
✅ Keystore sicher aufbewahren (Backup!)
✅ Unterschiedliche Signing Keys für Debug/Release
✅ Server-URL über QR-Code konfigurieren (nicht hardcoden)

## Weitere Ressourcen

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Xcode Help](https://developer.apple.com/xcode/)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Fastlane](https://fastlane.tools/)

## Support

Bei Problemen:
1. Prüfe diese Dokumentation
2. Prüfe React Native Troubleshooting Guide
3. Prüfe Device Logs (Xcode Console / adb logcat)
4. Öffne ein GitHub Issue
