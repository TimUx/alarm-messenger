# App Icons and Assets

This directory should contain the app icons and assets.

## Required Files

### Icons
For proper app icon support, you need to provide launcher icons:

- Android: Use Android Studio's Asset Studio or `flutter pub run flutter_launcher_icons`
- iOS: Use Xcode's asset catalog or the same tool

### Alarm Sound
- `alarm.mp3` - The alarm sound file (replace this placeholder)
  - Recommended: Clear, loud alarm tone
  - Format: MP3, 44.1kHz, mono or stereo
  - Duration: 3-10 seconds (will loop)

## Quick Setup

### Using flutter_launcher_icons

1. Add to `pubspec.yaml`:
```yaml
dev_dependencies:
  flutter_launcher_icons: ^0.13.1

flutter_launcher_icons:
  android: true
  ios: true
  image_path: "assets/icon/icon.png"
```

2. Create a 1024x1024 PNG icon at `assets/icon/icon.png`

3. Run:
```bash
flutter pub get
flutter pub run flutter_launcher_icons
```

### Manual Icon Setup

**Android:**
- Place icons in `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Sizes: hdpi (72x72), mdpi (48x48), xhdpi (96x96), xxhdpi (144x144), xxxhdpi (192x192)

**iOS:**
- Use Xcode to add icons to Assets.xcassets/AppIcon.appiconset
- Required sizes: 20x20, 29x29, 40x40, 60x60, 76x76, 83.5x83.5, 1024x1024 (various @2x and @3x versions)

## Current Status

⚠️ **Placeholder files** - Replace these with actual assets before building for production!
