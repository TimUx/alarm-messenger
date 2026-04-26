# Release-Prozess

Diese Dokumentation beschreibt den aktuellen Release-Prozess fuer das Alarm Messenger System.

## Uebersicht

Der Release-Prozess besteht aus zwei getrennten Workflows:

- `/.github/workflows/release.yml`
  - startet **nur manuell** (`workflow_dispatch`)
  - erstellt/aktualisiert ein GitHub Release
  - baut Mobile Release-Artefakte (Android; iOS Build-Info)
- `/.github/workflows/build-and-push.yml`
  - baut/pusht das Server-Docker-Image nach GHCR
  - kann separat ausgefuehrt werden (manuell oder ueber seine eigenen Trigger)

Fuer signierte iOS-IPA und optionalen TestFlight-Upload wird der dedizierte Workflow verwendet:

- `/.github/workflows/flutter-mobile-build.yml` (manuell)

Siehe dazu auch: [`docs/MOBILE-CI.md`](./MOBILE-CI.md)

## Release erstellen (manuell)

### 1) Version vorbereiten

Vor dem Release Versionsnummern aktualisieren:

- `server/package.json` (Server-Version)
- `mobile/pubspec.yaml` (Mobile Version im Format `MAJOR.MINOR.PATCH+BUILD`)

Beispiel:

```yaml
version: 1.2.0+12
```

### 2) Aenderungen committen und pushen

```bash
git add server/package.json mobile/pubspec.yaml
git commit -m "chore: bump version to v1.2.0"
git push origin main
```

### 3) Release-Workflow starten

1. GitHub -> **Actions**
2. Workflow **Create Release with Mobile Builds** waehlen
3. **Run workflow** klicken
4. Input `version` setzen (z. B. `v1.2.0`)
5. Starten

## Was der Release-Workflow erzeugt

`release.yml` erzeugt im Regelfall:

- GitHub Release mit Tag `vX.Y.Z`
- Android `app-debug.apk`
- Android `app-release.apk` (wenn Signing verfuegbar)
- Android `app-release.aab` (wenn Signing verfuegbar)
- iOS Build-Info-Datei (kein automatisch signiertes IPA in diesem Workflow)

## iOS Distribution (IPA/TestFlight)

Fuer iOS-Distribution nutze den manuellen Workflow:

- `/.github/workflows/flutter-mobile-build.yml`

Empfohlene Inputs:

- `build_ios=true`
- optional `upload_to_testflight=true`

Der Workflow erstellt auf macOS:

- signed IPA (wenn iOS Signing konfiguriert ist), oder
- unsigned IPA (Fallback)

Optional kann eine signed IPA direkt nach TestFlight hochgeladen werden.

Details inkl. Secrets und Device-Installation:

- [`docs/MOBILE-CI.md`](./MOBILE-CI.md)  
  (Abschnitte **"IPA nach TestFlight hochladen"** und **"Installation auf dem Geraet"**)

## Android Signing Secrets

Fuer signierte Android-Artefakte:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEY_ALIAS`
- `ANDROID_STORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`

Keystore-Beispiel:

```bash
keytool -genkey -v -keystore alarm-messenger.keystore \
  -alias alarm-messenger -keyalg RSA -keysize 2048 -validity 10000
base64 -w 0 alarm-messenger.keystore > keystore.base64
```

## Docker Image Deployment

Beispiel fuer GHCR Pull:

```bash
docker pull ghcr.io/timux/alarm-messenger:v1.2.0
docker pull ghcr.io/timux/alarm-messenger:latest
```

Hinweis fuer Forks: `timux/alarm-messenger` durch `<owner>/<repo>` ersetzen.

## Checkliste

- [ ] Version in `server/package.json` aktualisiert
- [ ] Version in `mobile/pubspec.yaml` aktualisiert
- [ ] Tests erfolgreich
- [ ] Release-Workflow manuell gestartet
- [ ] GitHub Release und Artefakte geprueft
- [ ] Android Artefakte getestet
- [ ] iOS bei Bedarf ueber `flutter-mobile-build.yml` (inkl. TestFlight) gebaut/getestet
- [ ] Doku aktualisiert

## Troubleshooting

### Workflow fehlgeschlagen

- Logs im jeweiligen GitHub-Action-Run pruefen
- Typische Ursachen:
  - fehlende Android Signing-Secrets
  - Build-Fehler im Code
  - inkonsistente Versionsangaben

### Android Release-Artefakte fehlen

- Pruefen, ob Android Signing-Secrets gesetzt sind
- Ohne Signing wird ggf. nur Debug-Artefakt bereitgestellt

### iOS IPA fehlt im Release-Workflow

- Erwartetes Verhalten: `release.yml` erzeugt keine vollstaendig signierte IPA-Pipeline
- Fuer IPA/TestFlight den Workflow `flutter-mobile-build.yml` verwenden

## Weitere Ressourcen

- [GitHub Releases Dokumentation](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Flutter Deployment](https://docs.flutter.dev/deployment)
- [Semantic Versioning](https://semver.org/)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Apple TestFlight](https://developer.apple.com/testflight/)
