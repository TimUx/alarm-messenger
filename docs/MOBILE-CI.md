# Mobile CI/CD (manuelle Builds)

Diese Dokumentation beschreibt den manuellen Mobile-Build-Workflow in GitHub Actions.

## Workflow

- Datei: `.github/workflows/flutter-mobile-build.yml`
- Start: nur manuell ueber **Run workflow** (`workflow_dispatch`)
- Keine automatischen Trigger bei Push, Pull Request, Merge oder Tag

## Verfuegbare Workflow-Inputs

- `build_linux` (boolean, default: `true`)
  - Baut Linux-Desktop Artifact (`tar.gz`)
- `build_android` (boolean, default: `true`)
  - Baut Android Debug APK
  - Baut zusaetzlich Release APK + AAB, wenn Signing-Secrets vorhanden sind
- `build_ios` (boolean, default: `true`)
  - Baut iOS auf macOS-Runner
  - Signed IPA bei konfiguriertem Signing, sonst unsigned IPA
- `upload_to_testflight` (boolean, default: `false`)
  - Laedt die signed IPA zu TestFlight hoch
  - Wird nur ausgefuehrt, wenn iOS-Signing erfolgreich konfiguriert ist

## Runner pro Plattform

- Linux: `ubuntu-latest`
- Android: `ubuntu-latest`
- iOS: `macos-14` (erforderlich fuer Xcode/IPA-Erstellung)

## Build-Artefakte

- Linux:
  - `alarm-messenger-linux-x64.tar.gz`
- Android:
  - `app-debug.apk`
  - `app-release.apk` (nur mit Signing)
  - `app-release.aab` (nur mit Signing)
- iOS:
  - `alarm-messenger-signed.ipa` (mit Signing)
  - `alarm-messenger-unsigned.ipa` (ohne Signing)

## Erforderliche Secrets und Variablen

### Android Signing

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

### iOS Signing

- Repo-Variable:
  - `IOS_SIGNING_ENABLED=true`
- Secrets:
  - `IOS_SIGNING_CERT` (Base64 des `.p12`)
  - `IOS_PROVISIONING_PROFILE` (Base64 des `.mobileprovision`)
  - `IOS_SIGNING_CERT_PASSWORD`

### TestFlight Upload

- `APP_STORE_CONNECT_ISSUER_ID`
- `APP_STORE_CONNECT_KEY_ID`
- `APP_STORE_CONNECT_API_PRIVATE_KEY`

## Typische Build-Szenarien

- Nur Android testen:
  - `build_android=true`, `build_linux=false`, `build_ios=false`
- Voller Plattform-Build ohne Store-Upload:
  - `build_linux=true`, `build_android=true`, `build_ios=true`, `upload_to_testflight=false`
- iOS Build inkl. TestFlight:
  - `build_ios=true`, `upload_to_testflight=true`
  - iOS-Signing und App Store Connect Secrets muessen vorhanden sein

## IPA nach TestFlight hochladen

Es gibt zwei Wege:

- Automatisch ueber den Workflow:
  - Beim manuellen Start `build_ios=true` und `upload_to_testflight=true` setzen
  - Voraussetzung: gueltige iOS-Signing-Secrets und App-Store-Connect-API-Secrets
  - Der Workflow laedt die erstellte signed IPA direkt zu TestFlight hoch
- Manuell ueber Apple-Tools:
  - Signed IPA aus den GitHub-Workflow-Artefakten herunterladen
  - In **Xcode -> Window -> Organizer** oder mit der App **Transporter** zu App Store Connect hochladen

Nach dem Upload wird der Build in App Store Connect verarbeitet (typisch einige Minuten bis laenger).

## TestFlight-Release fuer Tester freigeben

1. In App Store Connect die App oeffnen.
2. Zu **TestFlight** wechseln und den neuen Build auswaehlen.
3. Falls erforderlich:
   - Export-Compliance/Encryption-Fragen beantworten
   - Build-Metadaten ergaenzen
4. Tester hinzufuegen:
   - **Interne Tester** (Teammitglieder in App Store Connect)
   - **Externe Tester** (oeffentliche E-Mail-Adressen/Testgruppen, ggf. Beta App Review noetig)
5. Build fuer die jeweilige Testgruppe aktivieren.

## Installation auf dem Geraet (iPhone/iPad)

1. Auf dem Geraet die App **TestFlight** aus dem App Store installieren.
2. Tester-Einladung akzeptieren:
   - per E-Mail-Link oder
   - per Public Link der Testgruppe
3. In TestFlight die App auswaehlen und auf **Install** tippen.
4. Bei neuen Builds in TestFlight auf **Update** tippen.

Hinweise:

- Das Geraet muss mit der Apple-ID angemeldet sein, die als Tester eingeladen wurde.
- Externe Tester sehen Builds erst nach Freigabe und ggf. erfolgreichem Beta App Review.
- Alte Builds koennen in TestFlight ablaufen; dann muss ein neuer Build verteilt werden.

## Hinweis zu Release-Workflow

`/.github/workflows/release.yml` ist ebenfalls auf manuellen Start umgestellt (`workflow_dispatch`).
